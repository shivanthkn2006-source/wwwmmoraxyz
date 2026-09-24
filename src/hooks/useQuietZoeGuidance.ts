import { useEffect, useState } from 'react';

export interface QuietZoeGuidance {
  title: string;
  message: string;
  surface: string;
}

const IDLE_MS = 90_000;
const COOLDOWN_MS = 6 * 60 * 60 * 1000;

export function useQuietZoeGuidance(surface: string): QuietZoeGuidance | null {
  const [guidance, setGuidance] = useState<QuietZoeGuidance | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      timer = window.setTimeout(() => {
        const last = Number(localStorage.getItem('mmora.quietZoe.last') || 0);
        if (Date.now() - last < COOLDOWN_MS) return;
        localStorage.setItem('mmora.quietZoe.last', String(Date.now()));
        setGuidance({
          title: 'A quiet note from Zoe',
          message: surface === 'global'
            ? 'Your next guidance, planetary moments and plans are waiting here in Home.'
            : `When you’re ready, check Home for your next guidance after ${surface}.`,
          surface,
        });
      }, IDLE_MS);
    };
    const activity = () => schedule();
    ['pointerdown', 'keydown', 'scroll'].forEach((name) => window.addEventListener(name, activity, { passive: true }));
    document.addEventListener('visibilitychange', schedule);
    schedule();
    return () => {
      window.clearTimeout(timer);
      ['pointerdown', 'keydown', 'scroll'].forEach((name) => window.removeEventListener(name, activity));
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [surface]);
  return guidance;
}