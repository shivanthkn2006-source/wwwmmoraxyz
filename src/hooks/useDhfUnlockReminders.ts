/**
 * ZOE'S DHF — SCHEDULED UNLOCK PRE-NOTICES
 *
 * A few minutes before each of the ten local-time DHF slots unlocks, the user
 * hears the rising "something is arriving" cue and sees a heads-up toast, so
 * the sound always precedes the actual notification. Purely client-side and
 * local-clock based, so it works identically in preview and production for
 * every user regardless of which page they are on.
 */
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { COMPASS_SLOTS, slotMinutes } from '@/lib/dhfCompass';
import { deviceTimeZone, localDateIn, localHourMinute } from '@/lib/growthSlot';
import { playIncomingCue } from '@/utils/notificationSounds';
import { formatAlertStamp } from '@/lib/notificationFeatureMap';

/** Minutes before the slot that the pre-notice fires. */
export const UNLOCK_PRENOTICE_MINUTES = 3;
const TICK_MS = 30_000;
const STORAGE_KEY = 'mmora.dhf.unlock-prenotices';

type SeenMap = Record<string, true>;

function readSeen(): SeenMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SeenMap) : {};
  } catch {
    return {};
  }
}

function writeSeen(map: SeenMap) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* privacy mode / quota */
  }
}

/**
 * Pure: which slot (if any) should raise a pre-notice right now.
 * Fires inside the window [slot - lead, slot).
 */
export function duePrenotice(
  nowMinutes: number,
  lead = UNLOCK_PRENOTICE_MINUTES,
): { time: string; label: string; category: string } | null {
  return (
    COMPASS_SLOTS.find((slot) => {
      const start = slotMinutes(slot.time) - lead;
      return nowMinutes >= start && nowMinutes < slotMinutes(slot.time);
    }) ?? null
  );
}

export function useDhfUnlockReminders(enabled = true) {
  const seen = useRef<SeenMap>({});

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    seen.current = readSeen();

    const tick = () => {
      try {
        const zone = deviceTimeZone();
        const now = new Date();
        const today = localDateIn(now, zone);
        const { hour, minute } = localHourMinute(now, zone);
        const slot = duePrenotice(hour * 60 + minute);
        if (!slot) return;

        const key = `${today}:${slot.time}`;
        if (seen.current[key]) return;
        seen.current[key] = true;
        // Keep only today's keys so the store never grows.
        const pruned: SeenMap = {};
        Object.keys(seen.current)
          .filter((k) => k.startsWith(`${today}:`))
          .forEach((k) => { pruned[k] = true; });
        seen.current = pruned;
        writeSeen(pruned);

        try { playIncomingCue(); } catch { /* sound is best-effort */ }
        toast(`Zoe's DHF unlocks at ${slot.label}`, {
          description: `${slot.category} · arriving in ${UNLOCK_PRENOTICE_MINUTES} min · ${formatAlertStamp(now)}`,
          duration: 8000,
        });
      } catch (error) {
        console.warn('[useDhfUnlockReminders] tick failed', error);
      }
    };

    tick();
    const timer = window.setInterval(tick, TICK_MS);
    const onWake = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onWake);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [enabled]);
}

export default useDhfUnlockReminders;
