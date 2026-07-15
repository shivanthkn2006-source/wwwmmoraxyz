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
  if (!version || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('private://')) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set('v', String(version));
    return parsed.toString();
  } catch {
    const joiner = url.includes('?') ? '&' : '?';
    return `${url}${joiner}v=${encodeURIComponent(String(version))}`;
  }
};

export const parsePrivateStorageUrl = (url: string | null | undefined): { bucket: string; path: string } | null => {
  if (!url?.startsWith('private://')) return null;
  const rest = url.slice('private://'.length);
  const slash = rest.indexOf('/');
  if (slash <= 0 || slash === rest.length - 1) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
};

export const resolvePrivateStorageUrl = async (
  storageClient: { storage: { from: (bucket: string) => { createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl?: string } | null; error: any }> } } },
  url: string | null | undefined,
  expiresIn = 3600,
): Promise<string | undefined> => {
  const ref = parsePrivateStorageUrl(url);
  if (!ref) return url || undefined;
  const { data, error } = await storageClient.storage.from(ref.bucket).createSignedUrl(ref.path, expiresIn);
  if (error) throw error;
  return data?.signedUrl;
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
  gradient.addColorStop(0, '#123047');
  gradient.addColorStop(0.48, '#0f766e');
  gradient.addColorStop(1, '#f59e0b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 360, 640);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let y = -80; y < 720; y += 84) {
    ctx.save();
    ctx.translate(180, y);
    ctx.rotate(-0.35);
    ctx.fillRect(-220, -2, 440, 4);
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(2,6,23,0.28)';
  ctx.fillRect(0, 0, 360, 640);
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  ctx.beginPath();
  ctx.arc(180, 286, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.beginPath();
  ctx.moveTo(162, 250);
  ctx.lineTo(162, 322);
  ctx.lineTo(224, 286);
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

/**
 * Attempt to transcode a large video into a smaller preview variant (max ~480px,
 * ~900kbps) using MediaRecorder + captureStream. Runs in real-time (playback
 * speed) so it's only worthwhile for short clips. Returns the original file if
 * anything fails or produces a bigger result.
 */
export const transcodeVideoForPreview = (file: File, opts?: { maxDurationSec?: number; minBytes?: number; maxHeight?: number; bitrate?: number }): Promise<File> => {
  const maxDurationSec = opts?.maxDurationSec ?? 90;
  const minBytes = opts?.minBytes ?? 5 * 1024 * 1024;
  const maxHeight = opts?.maxHeight ?? 480;
  const bitrate = opts?.bitrate ?? 900_000;

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || file.size < minBytes) return resolve(file);
    const HAS_MR = typeof (window as any).MediaRecorder !== 'undefined';
    if (!HAS_MR) return resolve(file);

    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.preload = 'auto';
    const blobUrl = URL.createObjectURL(file);
    let settled = false;
    const done = (out: File) => {
      if (settled) return;
      settled = true;
      try { URL.revokeObjectURL(blobUrl); } catch {}
      try { video.src = ''; video.load(); } catch {}
      resolve(out);
    };
    const fail = () => done(file);

    video.onerror = fail;
    video.onloadedmetadata = () => {
      const dur = Number.isFinite(video.duration) ? video.duration : 0;
      if (!dur || dur > maxDurationSec) return done(file);

      const srcW = video.videoWidth || 720;
      const srcH = video.videoHeight || 1280;
      const scale = Math.min(1, maxHeight / srcH);
      const w = Math.max(2, Math.round(srcW * scale / 2) * 2);
      const h = Math.max(2, Math.round(srcH * scale / 2) * 2);

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return fail();

      // Pick supported mime
      const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      const mimeType = candidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || '';
      if (!mimeType) return fail();

      let stream: MediaStream;
      try {
        stream = (canvas as any).captureStream(30) as MediaStream;
      } catch { return fail(); }

      // Attach audio track from original if available
      try {
        const anyVid = video as any;
        const aStream: MediaStream | undefined = anyVid.captureStream?.() || anyVid.mozCaptureStream?.();
        aStream?.getAudioTracks().forEach((t) => stream.addTrack(t));
      } catch {}

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
      } catch { return fail(); }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        if (!blob.size || blob.size >= file.size * 0.9) return done(file);
        const base = file.name.replace(/\.[^.]+$/, '') || 'video';
        done(new File([blob], `${base}.preview.webm`, { type: 'video/webm' }));
      };

      let raf = 0;
      const draw = () => {
        try { ctx.drawImage(video, 0, 0, w, h); } catch {}
        if (!video.paused && !video.ended) raf = requestAnimationFrame(draw);
      };

      video.onended = () => {
        cancelAnimationFrame(raf);
        try { recorder.stop(); } catch { fail(); }
      };

      // Safety timeout: never longer than 2x duration
      const guard = window.setTimeout(() => {
        try { recorder.state !== 'inactive' && recorder.stop(); } catch {}
      }, Math.max(15000, dur * 2000));
      const originalOnstop = recorder.onstop!;
      recorder.onstop = (ev) => { window.clearTimeout(guard); (originalOnstop as any)?.(ev); };

      video.play().then(() => {
        try { recorder.start(250); } catch { return fail(); }
        draw();
      }).catch(fail);
    };
    video.src = blobUrl;
  });
};