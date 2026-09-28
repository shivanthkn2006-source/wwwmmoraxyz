/**
 * Zoe vision journal — while M'Mora is open on screen (active or idle), Zoe
 * takes a short camera look every 15 minutes and saves what she saw, so she
 * can answer "what have I been doing the last couple of hours?".
 *
 * Rules: only when the member already granted the camera (never prompts),
 * vision is not turned off ("Zoe stop your vision"), no call is on screen and
 * no other feature is already using the camera. The camera is opened for about
 * a second and closed again. Browsers stop the camera when the app is hidden,
 * so nothing is captured in the background.
 */
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { isZoeVisionPreferred } from '@/lib/zoeVisionPreference';

const INTERVAL_MS = 15 * 60_000;
const LAST_KEY = 'mmora:zoe-vision-journal:last';

async function cameraGranted(): Promise<boolean> {
  try {
    const s = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return s.state === 'granted';
  } catch {
    return false;
  }
}

function cameraBusy(): boolean {
  return Array.from(document.querySelectorAll('video')).some((v) => {
    const s = (v as HTMLVideoElement).srcObject as MediaStream | null;
    return !!s?.getVideoTracks().some((t) => t.readyState === 'live');
  });
}

async function grabFrame(): Promise<string | null> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await new Promise((r) => setTimeout(r, 700)); // let exposure settle
    if (!video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

export async function captureVisionJournalEntry(userId: string): Promise<boolean> {
  if (!isZoeVisionPreferred() || document.visibilityState !== 'visible' || cameraBusy()) return false;
  if (!(await cameraGranted())) return false;
  const frame = await grabFrame();
  if (!frame) return false;
  const { data } = await supabase.functions.invoke('zoe-sovereign', { body: { action: 'vision', frame } });
  const a = data?.success ? data.analysis : null;
  const summary = String(a?.summary ?? '').trim();
  if (!summary) return false;
  const { error } = await supabase.from('zoe_vision_journal' as any).insert({
    user_id: userId,
    summary: summary.slice(0, 600),
    attire: a?.attire ? String(a.attire).slice(0, 300) : null,
    mood: a?.mood ? String(a.mood).slice(0, 80) : null,
    provider: data?.provider ?? null,
  });
  if (error) {
    console.warn('[VisionJournal] save failed', error.message);
    return false;
  }
  try { localStorage.setItem(LAST_KEY, String(Date.now())); } catch { /* ignore */ }
  return true;
}

export default function ZoeVisionJournalHost() {
  const { user } = useAuth();
  useEffect(() => {
    const uid = user?.id;
    if (!uid || typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    let callOnScreen = false;
    const onCall = (e: Event) => { callOnScreen = Boolean((e as CustomEvent<{ visible?: boolean }>).detail?.visible); };
    window.addEventListener('quantum-call-visibility', onCall);
    const tick = async () => {
      if (callOnScreen) return;
      let last = 0;
      try { last = Number(localStorage.getItem(LAST_KEY) || 0); } catch { /* ignore */ }
      if (Date.now() - last < INTERVAL_MS) return;
      try { await captureVisionJournalEntry(uid); } catch (err) { console.warn('[VisionJournal] look failed', err); }
    };
    const first = window.setTimeout(tick, 60_000);
    const id = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      window.removeEventListener('quantum-call-visibility', onCall);
    };
  }, [user?.id]);
  return null;
}
