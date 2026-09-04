/**
 * Zoe's search-bar voice — Deepgram only.
 *
 * M'Mora rule: every word Zoe speaks is Deepgram Aura (a human-sounding
 * persona voice). The browser Web Speech API is never used here — if Deepgram
 * cannot speak, Zoe stays silent rather than switching to a robotic fallback.
 *
 * Speaking always goes through the voice arbiter so only one Zoe voice is
 * audible at a time (search never clashes with growth/DHF card narration).
 */
import { speakWithDeepgram, stopDeepgramSpeech } from '@/utils/deepgramTTS';
import { claimVoice, registerVoiceChannel, releaseVoice } from '@/lib/zoeVoiceArbiter';

let registered = false;

function ensureRegistered() {
  if (registered || typeof window === 'undefined') return;
  registered = true;
  registerVoiceChannel('search', () => {
    stopDeepgramSpeech();
  });
}

/** Deepgram runs through the backend, so it is available in any browser. */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined';
}

/** Stop whatever the search companion is currently saying. */
export function stopSearchVoice(): void {
  if (typeof window === 'undefined') return;
  stopDeepgramSpeech();
  releaseVoice('search');
}

/**
 * Speak one short companion line with Zoe's Deepgram voice.
 * Any other Zoe voice (card narration, notifications) is silenced first.
 */
export function speakSearchLine(text: string, enabled: boolean): void {
  if (!enabled || !text.trim() || !isSpeechSupported()) return;
  ensureRegistered();
  // The user is actively searching — this outranks ambient narration.
  claimVoice('search');
  void speakWithDeepgram(
    text,
    undefined,
    () => releaseVoice('search'),
    () => releaseVoice('search'),
  );
}
