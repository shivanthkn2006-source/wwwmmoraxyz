// Persist the loop-section sound preference across reloads. Default = muted.
const KEY = 'mmora.loops.soundEnabled';

export function readLoopSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeLoopSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore quota / privacy-mode errors
  }
}
