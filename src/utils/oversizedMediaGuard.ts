// Convert oversized images/videos into a small thumbnail data URL.
// Returns null when conversion isn't possible (caller should reject).

const MAX_THUMB_DIMENSION = 720;
const TARGET_QUALITY = 0.78;

export const isDataUrlOversized = (dataUrl: string, maxBytes = 2 * 1024 * 1024) =>
  dataUrl.length > maxBytes;

export async function dataUrlToImageThumbnail(
  dataUrl: string,
  maxBytes = 1.5 * 1024 * 1024,
): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });

    const ratio = Math.min(1, MAX_THUMB_DIMENSION / Math.max(img.width, img.height));
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    let quality = TARGET_QUALITY;
    let out = canvas.toDataURL('image/jpeg', quality);
    while (out.length > maxBytes && quality > 0.3) {
      quality -= 0.1;
      out = canvas.toDataURL('image/jpeg', quality);
    }
    return out.length <= maxBytes ? out : null;
  } catch {
    return null;
  }
}

export async function videoFileToPosterThumbnail(file: File, maxBytes = 1.5 * 1024 * 1024): Promise<string | null> {
  try {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((res, rej) => {
      video.onloadeddata = () => res();
      video.onerror = () => rej(new Error('video load failed'));
    });
    video.currentTime = Math.min(0.1, video.duration || 0.1);
    await new Promise<void>(res => { video.onseeked = () => res(); });
    const ratio = Math.min(1, MAX_THUMB_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) { URL.revokeObjectURL(url); return null; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    let q = TARGET_QUALITY;
    let out = canvas.toDataURL('image/jpeg', q);
    while (out.length > maxBytes && q > 0.3) {
      q -= 0.1;
      out = canvas.toDataURL('image/jpeg', q);
    }
    return out.length <= maxBytes ? out : null;
  } catch {
    return null;
  }
}
