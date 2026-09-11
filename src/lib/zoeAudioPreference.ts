/**
 * Zoe Audio master preference.
 *
 * Owner rule: Zoe's audio link (headset routing + hands-free listening) is ON
 * by default the moment the platform starts. Nobody has to visit a settings
 * page to switch it on. The settings page only exists to switch it OFF.
 *
 * Stored as an explicit tri-state so "never chosen" (default ON) is distinct
 * from "the user deliberately turned it off".
 */
const KEY = 'mmora.audio.zoeAudioEnabled';

export const ZOE_AUDIO_PREF_EVENT = 'mmora-zoe-audio-pref';

/** True unless the user explicitly disabled Zoe audio. */
export function isZoeAudioEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(KEY) !== '0';
  } catch {
    // Private mode / storage blocked: keep the default-on behaviour.
    return typeof window !== 'undefined';
  }
}

/** True only when the user has made an explicit choice at least once. */
export function hasZoeAudioChoice(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function setZoeAudioEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    /* private mode */
  }
  try {
    window.dispatchEvent(new CustomEvent(ZOE_AUDIO_PREF_EVENT, { detail: { enabled } }));
  } catch {
    /* noop */
  }
}
