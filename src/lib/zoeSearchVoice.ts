/**
 * Tiny, dependency-free speech channel for the search companion.
 *
 * Uses the browser Web Speech API only — no network, no TTS credits, no
 * latency added to typing. Every new line cancels the previous one so Zoe
 * never talks over herself while the user keeps typing.
 */

let lastSpoken = '';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSearchVoice(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* speech is best-effort and must never break search */
  }
  lastSpoken = '';
}

/**
 * Speak a short companion line. No-ops when disabled, unsupported, or when the
 * exact same line is already the current utterance.
 */
export function speakSearchLine(text: string, enabled: boolean): void {
  if (!enabled || !text || !isSpeechSupported()) return;
  if (text === lastSpoken) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 220));
    utterance.rate = 1.05;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;
    const voices = window.speechSynthesis.getVoices?.() ?? [];
    const preferred = voices.find((voice) =>
      /samantha|zira|google uk english female|karen|victoria/i.test(voice.name),
    );
    if (preferred) utterance.voice = preferred;
    lastSpoken = text;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* never surface speech failures to the search flow */
  }
}
