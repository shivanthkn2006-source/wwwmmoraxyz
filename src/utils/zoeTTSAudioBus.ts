/**
 * ZOE TTS AUDIO BUS — Non-destructive amplitude tap for lip-sync
 * ===============================================================
 * Lets the 3D avatar hook a Web Audio AnalyserNode onto the currently
 * playing Deepgram Aura-2 HTMLAudioElement, without modifying the
 * existing TTS playback contract.
 *
 * The TTS layer calls `publishTTSAudio(audio)` when a new chunk starts
 * playing and `clearTTSAudio(audio)` when it ends. Subscribers receive
 * the active <audio> element so they can route it through Web Audio.
 */

type Listener = (audio: HTMLAudioElement | null) => void;

const listeners = new Set<Listener>();
let current: HTMLAudioElement | null = null;

export function publishTTSAudio(audio: HTMLAudioElement) {
  current = audio;
  listeners.forEach((l) => {
    try { l(audio); } catch (err) { console.warn('[zoeTTSAudioBus] listener error', err); }
  });
}

export function clearTTSAudio(audio?: HTMLAudioElement) {
  if (audio && audio !== current) return;
  current = null;
  listeners.forEach((l) => {
    try { l(null); } catch (err) { console.warn('[zoeTTSAudioBus] listener error', err); }
  });
}

export function getCurrentTTSAudio(): HTMLAudioElement | null {
  return current;
}

export function subscribeTTSAudio(listener: Listener): () => void {
  listeners.add(listener);
  // Replay current value
  if (current) {
    try { listener(current); } catch { /* noop */ }
  }
  return () => listeners.delete(listener);
}
