/**
 * MASTER NOTIFICATION VOLUME
 *
 * Single source of truth for how loud platform alerts are. Default is FULL
 * volume (1.0) for every user on every device — users may lower it or mute it
 * from Notification Settings. Stored locally so it survives reloads and works
 * even when the backend is unreachable.
 */
const VOLUME_KEY = 'mmora.notifications.volume';
const MUTE_KEY = 'mmora.notifications.muted';
export const NOTIFICATION_VOLUME_EVENT = 'mmora:notification-volume';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** Master volume 0..1. Defaults to 1 (full) when never configured. */
export function getNotificationVolume(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 1;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clamp(parsed) : 1;
  } catch {
    return 1;
  }
}

export function isNotificationMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Effective gain applied to generated sounds (0 while muted). */
export function effectiveNotificationVolume(): number {
  return isNotificationMuted() ? 0 : getNotificationVolume();
}

function broadcast() {
  try {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_VOLUME_EVENT));
  } catch {
    /* event dispatch must never break settings */
  }
}

export function setNotificationVolume(value: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VOLUME_KEY, String(clamp(value)));
  } catch {
    /* privacy mode / quota */
  }
  broadcast();
}

export function setNotificationMuted(muted: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
  } catch {
    /* privacy mode / quota */
  }
  broadcast();
}
