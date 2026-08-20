// Extracted from HomePage.tsx — feed post typing, media validation and upload helpers.
import { inferMediaType, makeFallbackVideoPoster } from '@/lib/mediaUtils';

export interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_preview_url?: string | null;
  full_media_url?: string | null;
  media_type: string | null;
  updated_at?: string | null;
  has_deferred_media?: boolean;
  media_size?: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  visibility: string;
  profile?: {
    display_name: string;
    username: string;
    profile_photo_url?: string;
  };
  user_liked?: boolean;
}

export const DATA_URL_PREVIEW_LIMIT = 900_000;

// Loops upload whitelist
export const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const prepareFeedPostMedia = (post: any): Post => {
  const mediaUrl = typeof post.media_url === 'string' ? post.media_url : null;
  const realType = inferMediaType(mediaUrl, post.media_type);
  const isHeavyDataUrl = post.has_deferred_media || (!!mediaUrl && mediaUrl.startsWith('data:') && mediaUrl.length > DATA_URL_PREVIEW_LIMIT);

  return {
    ...post,
    media_type: realType ?? post.media_type,
    full_media_url: null,
    media_url: isHeavyDataUrl ? null : mediaUrl,
    has_deferred_media: !!isHeavyDataUrl,
  };
};

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const validateBrowserCanPreviewFile = (file: File, mediaType: 'video' | 'image') =>
  new Promise<void>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`${mediaType === 'video' ? 'Video' : 'Image'} preview timed out. Please export it again and retry.`));
    }, 10000);
    const done = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
    };

    if (mediaType === 'video') {
      const video = document.createElement('video');
      if (file.type && video.canPlayType(file.type) === '') {
        done();
        reject(new Error('This video format is not previewable here. Export as MP4/H.264, WebM, or MOV/H.264.'));
        return;
      }
      // Do not require a full local decode here: the Lovable preview browser can lack
      // proprietary MP4 codecs even when user browsers play the same H.264 file.
      // MIME + canPlayType prevents obvious bypasses; the Loop tile still hides rows
      // that fail after upload so broken media does not poison the rail.
      done();
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      done();
      img.naturalWidth > 0 && img.naturalHeight > 0
        ? resolve()
        : reject(new Error('This image has no readable pixels. Export it again and retry.'));
    };
    img.onerror = () => {
      done();
      reject(new Error('This image cannot be decoded for preview. Use JPG, PNG, WebP, or GIF.'));
    };
    img.src = objectUrl;
  });

export const captureVideoPreview = (file: File) =>
  new Promise<string | null>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    const finish = (value: string | null) => {
      cleanup();
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(makeFallbackVideoPoster()), 5000);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      try {
        video.currentTime = Math.min(0.2, Math.max(0.01, (Number.isFinite(video.duration) ? video.duration : 1) / 20));
      } catch {
        window.clearTimeout(timer);
        finish(makeFallbackVideoPoster());
      }
    };
    video.onseeked = () => {
      try {
        const width = video.videoWidth || 360;
        const height = video.videoHeight || 640;
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(360, width);
        canvas.height = Math.round((canvas.width / width) * height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No canvas context');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        window.clearTimeout(timer);
        finish(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        window.clearTimeout(timer);
        finish(makeFallbackVideoPoster());
      }
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      finish(makeFallbackVideoPoster());
    };
    video.src = objectUrl;
  });

export async function withRetry<T>(fn: (attempt: number) => Promise<T>, attempts = 3, baseDelay = 800): Promise<T> {
  let lastErr: any;
  for (let i = 1; i <= attempts; i++) {
    try { return await fn(i); }
    catch (e) {
      lastErr = e;
      if (i < attempts) await sleep(baseDelay * Math.pow(2, i - 1));
    }
  }
  throw lastErr;
}

/**
 * Upload a file to the `posts` storage bucket via XHR to expose real progress.
 * Falls back to Supabase JS SDK if session token isn't available.
 */
export function xhrUploadToPosts(
  file: File,
  path: string,
  accessToken: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/posts/${path.split('/').map(encodeURIComponent).join('/')}`;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText?.slice(0, 200) || 'unknown'}`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.send(file);
  });
}
