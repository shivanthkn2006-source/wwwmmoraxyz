/**
 * Face ID opt-in + quiet refresh.
 * Consent is stored per member on this device. With consent, a 5-second scan
 * enrolls Face ID, and later camera frames refresh the saved face fingerprint
 * (server only accepts a refresh when it matches the existing face).
 */
import { supabase } from '@/integrations/supabase/client';
import { faceDescriptor } from '@/lib/onDeviceFace';

const CONSENT = (uid: string) => `mmora-faceid-consent-${uid}`;
const LAST_REFRESH = (uid: string) => `mmora-faceid-refresh-${uid}`;
const REFRESH_EVERY_MS = 7 * 24 * 60 * 60_000;

export type FaceConsent = 'yes' | 'no' | null;
export const getFaceConsent = (uid: string): FaceConsent => {
  try { return (localStorage.getItem(CONSENT(uid)) as FaceConsent) ?? null; } catch { return null; }
};
export const setFaceConsent = (uid: string, v: 'yes' | 'no') => {
  try { localStorage.setItem(CONSENT(uid), v); } catch { /* ignore */ }
};

function average(list: number[][]) {
  return list[0].map((_, i) => Math.round((list.reduce((s, d) => s + d[i], 0) / list.length) * 1e5) / 1e5);
}

/** Samples the live video for ~5 seconds and returns an averaged fingerprint. */
export async function scanFiveSeconds(video: HTMLVideoElement, onProgress?: (p: number) => void): Promise<number[] | null> {
  const canvas = document.createElement('canvas');
  const found: number[][] = [];
  const start = Date.now();
  while (Date.now() - start < 5000) {
    if (video.videoWidth) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const r = await faceDescriptor(canvas);
      if (r.ok) found.push(r.descriptor);
    }
    onProgress?.(Math.min(1, (Date.now() - start) / 5000));
    await new Promise((res) => setTimeout(res, 400));
  }
  return found.length >= 2 ? average(found) : null;
}

/** Enrolls Face ID with the scan, linked to the identity photo when one is saved. */
export async function enrollWithIdentity(uid: string, descriptor: number[]): Promise<{ ok: boolean; message: string }> {
  let identityDescriptor: number[] | undefined;
  try {
    const { getVaultStatus, refreshIdentitySignedUrl } = await import('@/services/zoeIdentityVault');
    const status = await getVaultStatus(uid);
    const url = status.hasVaultPhoto ? await refreshIdentitySignedUrl(uid) : null;
    if (url) { const r = await faceDescriptor(url); if (r.ok) identityDescriptor = r.descriptor; }
  } catch { /* identity photo optional */ }
  const { data, error } = await supabase.functions.invoke('face-verification', {
    body: { operation: 'enroll_face', descriptor, identityDescriptor },
  });
  if (error || !data?.success) {
    let msg = 'Face ID setup failed. Try again in good light.';
    try { const b = await (error as any)?.context?.json?.(); if (b?.error) msg = b.error; } catch { /* keep */ }
    return { ok: false, message: msg };
  }
  try { localStorage.setItem(LAST_REFRESH(uid), String(Date.now())); } catch { /* ignore */ }
  return { ok: true, message: identityDescriptor ? 'Face ID is on and linked to your identity photo.' : 'Face ID is on. Add a passport-style identity photo to link it.' };
}

/** Called with any camera frame already captured by the app (opt-in members only). */
export async function maybeRefreshFace(uid: string, frame: string | HTMLCanvasElement): Promise<void> {
  if (getFaceConsent(uid) !== 'yes') return;
  try { if (Date.now() - Number(localStorage.getItem(LAST_REFRESH(uid)) || 0) < REFRESH_EVERY_MS) return; } catch { return; }
  const r = await faceDescriptor(frame);
  if (!r.ok) return;
  const { data } = await supabase.functions.invoke('face-verification', { body: { operation: 'refresh_face', descriptor: r.descriptor } });
  if (data?.refreshed) { try { localStorage.setItem(LAST_REFRESH(uid), String(Date.now())); } catch { /* ignore */ } }
}
