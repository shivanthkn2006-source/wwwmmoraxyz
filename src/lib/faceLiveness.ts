/**
 * Live-person check before any face fingerprint is used (setup and sign-in).
 * The server hands out a one-time challenge (random order of: blink, turn
 * left, turn right). The member does each step in front of the camera while
 * the device measures eye openness and head turn from the face landmarks and
 * collects several fingerprints along the way. A printed photo can't blink or
 * turn, and a recorded video can't follow a random order it has never seen.
 * Runs fully on the device (works the same in the iOS/Android app shell).
 */
import { supabase } from '@/integrations/supabase/client';
import { getApi } from '@/lib/onDeviceFace';

export type LivenessStep = 'blink' | 'turn_left' | 'turn_right';
export interface LivenessChallenge { nonce: string; steps: LivenessStep[]; expiresAt: string }
export interface LivenessProof {
  nonce: string;
  descriptors: number[][];
  trace: { step: LivenessStep; ear: number[]; yaw: number[] }[];
}

export const STEP_PROMPT: Record<LivenessStep, string> = {
  blink: 'Blink slowly',
  turn_left: 'Turn your head a little to your left',
  turn_right: 'Turn your head a little to your right',
};

type Pt = { x: number; y: number };
const d = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
// Eye Aspect Ratio: small when the eye is closed.
const ear = (e: Pt[]) => (d(e[1], e[5]) + d(e[2], e[4])) / (2 * d(e[0], e[3]));

export async function beginLiveness(purpose: 'login' | 'enroll', email?: string): Promise<LivenessChallenge> {
  const { data, error } = await supabase.functions.invoke('face-verification', {
    body: { operation: 'begin_liveness', purpose, email },
  });
  if (error || !data?.nonce) {
    let msg = 'Could not start the live check. Try again in a moment.';
    try { const b = await (error as any)?.context?.json?.(); if (b?.error) msg = b.error; } catch { /* keep */ }
    throw new Error(msg);
  }
  return data as LivenessChallenge;
}

/** Walks the member through each step. Throws a friendly message on failure. */
export async function runLiveness(
  video: HTMLVideoElement,
  challenge: LivenessChallenge,
  onPrompt: (text: string, stepIndex: number, total: number) => void,
): Promise<LivenessProof> {
  const faceapi = await getApi();
  const opts = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
  const canvas = document.createElement('canvas');
  const descriptors: number[][] = [];
  const trace: LivenessProof['trace'] = [];

  for (let i = 0; i < challenge.steps.length; i++) {
    const step = challenge.steps[i];
    onPrompt(STEP_PROMPT[step], i, challenge.steps.length);
    const t = { step, ear: [] as number[], yaw: [] as number[] };
    let baseEar = 0; let closed = false; let done = false;
    const start = Date.now();
    while (Date.now() - start < 7000 && !done) {
      if (!video.videoWidth) { await new Promise((r) => setTimeout(r, 100)); continue; }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const all = await faceapi.detectAllFaces(canvas, opts).withFaceLandmarks().withFaceDescriptors();
      if (all.length > 1) throw new Error('Only one face should be in view. Try again.');
      if (all.length === 1) {
        const lm = all[0].landmarks;
        const e = (ear(lm.getLeftEye()) + ear(lm.getRightEye())) / 2;
        const le = lm.getLeftEye()[0]; const re = lm.getRightEye()[3]; const nose = lm.getNose()[3];
        const mid = (le.x + re.x) / 2; const width = Math.abs(re.x - le.x) || 1;
        // Camera image is mirrored to the member: their left = nose moves to image right.
        const yaw = (nose.x - mid) / width;
        t.ear.push(Math.round(e * 1000) / 1000); t.yaw.push(Math.round(yaw * 1000) / 1000);
        if (descriptors.length < 8 && (t.ear.length % 2 === 1)) {
          descriptors.push(Array.from(all[0].descriptor).map((n) => Math.round(n * 1e5) / 1e5));
        }
        if (step === 'blink') {
          if (!baseEar && e > 0.24) baseEar = e;
          if (baseEar && e < baseEar * 0.7) closed = true;
          if (closed && e > baseEar * 0.85) done = true;
        } else if (step === 'turn_left' ? yaw > 0.18 : yaw < -0.18) done = true;
      }
    }
    trace.push(t);
    if (!done) throw new Error(`We didn't see that. ${STEP_PROMPT[step]} when asked, in good light.`);
  }
  if (descriptors.length < 3) throw new Error('Keep your face in the oval and try again.');
  return { nonce: challenge.nonce, descriptors, trace };
}

export function averageDescriptor(list: number[][]): number[] {
  return list[0].map((_, i) => Math.round((list.reduce((s, x) => s + x[i], 0) / list.length) * 1e5) / 1e5);
}
