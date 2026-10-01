/**
 * On-device face matching (no AI service, no tokens).
 * Produces a 128-number face "fingerprint" from a picture using face-api
 * models downloaded once from a public CDN and cached by the browser.
 */
const MODELS = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';

type FaceApi = typeof import('@vladmandic/face-api');
let apiPromise: Promise<FaceApi> | null = null;

function getApi() {
  if (!apiPromise) {
    apiPromise = (async () => {
      const faceapi = await import('@vladmandic/face-api');
      const tf = faceapi.tf as any;
      let ok = false;
      try { ok = await tf.setBackend('webgl'); } catch { ok = false; }
      if (!ok) await tf.setBackend('cpu');
      await tf.ready();
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS),
      ]);
      return faceapi;
    })().catch((e) => { apiPromise = null; throw e; });
  }
  return apiPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load picture'));
    img.src = src;
  });
}

export type FaceDescriptorResult =
  | { ok: true; descriptor: number[]; score: number }
  | { ok: false; reason: 'no_face' | 'many_faces' | 'unavailable' };

/** Returns the face fingerprint for a picture containing exactly one clear face. */
export async function faceDescriptor(src: string | HTMLCanvasElement): Promise<FaceDescriptorResult> {
  try {
    const faceapi = await getApi();
    const input = typeof src === 'string' ? await loadImage(src) : src;
    const opts = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 });
    const all = await faceapi.detectAllFaces(input, opts).withFaceLandmarks().withFaceDescriptors();
    if (all.length === 0) return { ok: false, reason: 'no_face' };
    if (all.length > 1) return { ok: false, reason: 'many_faces' };
    return { ok: true, descriptor: Array.from(all[0].descriptor).map((n) => Math.round(n * 1e5) / 1e5), score: all[0].detection.score };
  } catch (e) {
    console.warn('[onDeviceFace] unavailable', e);
    return { ok: false, reason: 'unavailable' };
  }
}

export function faceDistance(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}
