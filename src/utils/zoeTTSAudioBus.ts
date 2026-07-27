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

export interface TTSAudioMetadata {
  /** Absolute character offset of this audio chunk inside the spoken text. */
  charStart: number;
  /** Absolute character end offset of this audio chunk inside the spoken text. */
  charEnd: number;
  chunkText?: string;
  chunkIndex?: number;
  totalChunks?: number;
}

type Listener = (audio: HTMLAudioElement | null, metadata: TTSAudioMetadata | null) => void;

const listeners = new Set<Listener>();
let current: HTMLAudioElement | null = null;
let currentMetadata: TTSAudioMetadata | null = null;

export function publishTTSAudio(audio: HTMLAudioElement, metadata: TTSAudioMetadata | null = null) {
  current = audio;
  currentMetadata = metadata;
  listeners.forEach((l) => {
    try { l(audio, currentMetadata); } catch (err) { console.warn('[zoeTTSAudioBus] listener error', err); }
  });
}

export function clearTTSAudio(audio?: HTMLAudioElement) {
  if (audio && audio !== current) return;
  current = null;
  currentMetadata = null;
  listeners.forEach((l) => {
    try { l(null, null); } catch (err) { console.warn('[zoeTTSAudioBus] listener error', err); }
  });
}

export function getCurrentTTSAudio(): HTMLAudioElement | null {
  return current;
}

export function getCurrentTTSAudioMetadata(): TTSAudioMetadata | null {
  return currentMetadata;
}

export function subscribeTTSAudio(listener: Listener): () => void {
  listeners.add(listener);
  // Replay current value
  if (current) {
    try { listener(current, currentMetadata); } catch { /* noop */ }
  }
  return () => listeners.delete(listener);
}
