/**
 * ZOE SPOKEN WORD BUS — Teleprompter sync channel
 * ================================================
 * Lightweight publish/subscribe channel that lets the TTS layer tell the UI
 * which message is currently being spoken and how far into it the voice is.
 *
 * Two independent channels:
 *  - session : which messageId + text is currently being spoken (or null)
 *  - progress: absolute character index inside that text (word boundaries)
 *
 * Mirrors the style of `zoeTTSAudioBus` so both buses behave consistently.
 */

export interface SpokenSession {
  messageId: string;
  text: string;
  startedAt: number;
}

export interface SpokenProgress {
  messageId: string;
  charIndex: number;
  charLength: number;
}

type SessionListener = (session: SpokenSession | null) => void;
type ProgressListener = (progress: SpokenProgress) => void;

const sessionListeners = new Set<SessionListener>();
const progressListeners = new Set<ProgressListener>();

let currentSession: SpokenSession | null = null;

export function startSpokenSession(messageId: string, text: string): void {
  if (!messageId || !text) return;
  currentSession = { messageId, text, startedAt: Date.now() };
  sessionListeners.forEach((l) => {
    try { l(currentSession); } catch (err) { console.warn('[zoeSpokenWordBus] session listener error', err); }
  });
}

export function endSpokenSession(messageId?: string): void {
  if (messageId && currentSession && currentSession.messageId !== messageId) return;
  if (!currentSession) return;
  currentSession = null;
  sessionListeners.forEach((l) => {
    try { l(null); } catch (err) { console.warn('[zoeSpokenWordBus] session listener error', err); }
  });
}

export function publishSpokenProgress(charIndex: number, charLength = 0): void {
  if (!currentSession) return;
  const payload: SpokenProgress = {
    messageId: currentSession.messageId,
    charIndex,
    charLength,
  };
  progressListeners.forEach((l) => {
    try { l(payload); } catch (err) { console.warn('[zoeSpokenWordBus] progress listener error', err); }
  });
}

export function getCurrentSpokenSession(): SpokenSession | null {
  return currentSession;
}

export function subscribeSpokenSession(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  try { listener(currentSession); } catch { /* noop */ }
  return () => { sessionListeners.delete(listener); };
}

export function subscribeSpokenProgress(listener: ProgressListener): () => void {
  progressListeners.add(listener);
  return () => { progressListeners.delete(listener); };
}
