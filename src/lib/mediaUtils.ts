export type InferredMediaType = 'video' | 'image' | null;

export const inferMediaType = (url: string | null | undefined, declared?: string | null): InferredMediaType => {
  if (!url) return declared === 'video' ? 'video' : declared === 'image' ? 'image' : null;
  if (url.startsWith('data:video/')) return 'video';
  if (url.startsWith('data:image/')) return 'image';
  const clean = url.split('?')[0].toLowerCase();
  if (/\.(mp4|webm|mov|ogg|m4v)$/.test(clean)) return 'video';
  if (/\.(jpe?g|png|webp|gif|avif|heic)$/.test(clean)) return 'image';
  return declared === 'video' ? 'video' : declared === 'image' ? 'image' : null;
};

export const appendMediaVersion = (url: string | null | undefined, version?: string | number | null): string | undefined => {
  if (!url) return undefined;
  if (!version || url.startsWith('data:') || url.startsWith('blob:')) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set('v', String(version));
    return parsed.toString();
  } catch {
    const joiner = url.includes('?') ? '&' : '?';
    return `${url}${joiner}v=${encodeURIComponent(String(version))}`;
  }
};

export const getPostsStorageObjectPath = (url: string | null | undefined): string | null => {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    const marker = '/storage/v1/object/public/posts/';
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
};

export const makeFallbackVideoPoster = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createLinearGradient(0, 0, 360, 640);
  gradient.addColorStop(0, '#020617');
  gradient.addColorStop(0.55, '#111827');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 360, 640);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.arc(180, 320, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.beginPath();
  ctx.moveTo(164, 290);
  ctx.lineTo(164, 350);
  ctx.lineTo(216, 320);
  ctx.closePath();
  ctx.fill();
  return canvas.toDataURL('image/jpeg', 0.72);
};

export const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const [header, body] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
};

export const captureVideoPreviewFromUrl = (src: string) =>
  new Promise<string | null>((resolve) => {
    const video = document.createElement('video');
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      video.removeAttribute('src');
      video.load();
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(makeFallbackVideoPoster()), 7000);

    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      try {
        video.currentTime = Math.min(0.25, Math.max(0.01, (Number.isFinite(video.duration) ? video.duration : 1) / 20));
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
        canvas.width = Math.min(480, width);
        canvas.height = Math.max(1, Math.round((canvas.width / width) * height));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No canvas context');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        window.clearTimeout(timer);
        finish(canvas.toDataURL('image/jpeg', 0.78));
      } catch {
        window.clearTimeout(timer);
        finish(makeFallbackVideoPoster());
      }
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      finish(makeFallbackVideoPoster());
    };
    video.src = src;
  });