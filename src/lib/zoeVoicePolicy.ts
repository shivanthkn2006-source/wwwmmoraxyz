/**
 * Zoe voice policy — Deepgram only.
 *
 * M'Mora rule (owner-set): Zoe is a human-like persona, so every word she
 * speaks must come from Deepgram Aura. The robotic browser Web Speech API is
 * NOT an acceptable fallback for Zoe; if Deepgram cannot speak, Zoe stays
 * silent and the failure is logged.
 *
 * The only escape hatch is an explicit opt-in flag the owner can set, so the
 * behaviour can be changed without touching code — never enabled by default.
 */
const OPT_IN_KEY = 'mmora.zoe.allow-browser-tts';

/** True only when the owner explicitly permitted browser TTS for Zoe. */
export function isBrowserTtsAllowedForZoe(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(OPT_IN_KEY) === 'true';
  } catch {
    return false;
  }
}
