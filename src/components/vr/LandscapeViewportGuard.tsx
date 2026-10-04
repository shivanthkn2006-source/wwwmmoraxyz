/**
 * Keeps VR World sideways (landscape) on phones and tablets. Tries the
 * browser's fullscreen + orientation lock; when the browser refuses (iPhone
 * Safari never allows it), an overlay asks the player to turn the phone.
 * Desktops are left alone.
 */
import React, { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';

const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const isPortrait = () => typeof window !== 'undefined' && window.innerHeight > window.innerWidth;

export async function tryLockLandscape(): Promise<boolean> {
  try {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    if (!document.fullscreenElement) await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
  } catch { /* needs a tap */ }
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.('landscape');
    return true;
  } catch { return false; }
}

export const LandscapeViewportGuard: React.FC = () => {
  const [portrait, setPortrait] = useState(() => isTouch() && isPortrait());
  useEffect(() => {
    if (!isTouch()) return;
    void tryLockLandscape();
    const on = () => setPortrait(isPortrait());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  if (!portrait) return null;
  return (
    <div role="dialog" aria-label="Turn your phone sideways"
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-4 surface-warm-tan text-white text-center px-6"
      data-exclude-phantom-tap>
      <RotateCw className="h-10 w-10" />
      <p className="text-base">Turn your phone sideways to play VR World.</p>
      <button type="button" onClick={() => void tryLockLandscape()} className="rounded-full px-5 py-2 text-sm underline">
        Rotate for me
      </button>
    </div>
  );
};

export default LandscapeViewportGuard;
