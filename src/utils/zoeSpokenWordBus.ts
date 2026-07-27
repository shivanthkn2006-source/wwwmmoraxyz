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
  isPaused?: boolean;
  pausedAt?: number;
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

/**
 * Current speech rate (1 = normal). The estimator divides its pacing by this
 * so a slower voice highlights words more slowly instead of racing ahead.
 */
let speechRate = 1;

export function setSpokenSpeechRate(rate: number): void {
  if (!Number.isFinite(rate) || rate <= 0) return;
  speechRate = Math.max(0.4, Math.min(2.5, rate));
}

export function getSpokenSpeechRate(): number {
  return speechRate;
}

export function startSpokenSession(messageId: string, text: string): void {
  if (!messageId || !text) return;
  currentSession = { messageId, text, startedAt: Date.now(), isPaused: false };
  sessionListeners.forEach((l) => {
    try { l(currentSession); } catch (err) { console.warn('[zoeSpokenWordBus] session listener error', err); }
  });
}

export function setSpokenSessionPaused(paused: boolean): void {
  if (!currentSession) return;
  const now = Date.now();

  if (paused) {
    if (currentSession.isPaused) return;
    currentSession = { ...currentSession, isPaused: true, pausedAt: now };
  } else {
    if (!currentSession.isPaused) return;
    const pausedAt = currentSession.pausedAt ?? now;
    currentSession = {
      ...currentSession,
      isPaused: false,
      pausedAt: undefined,
      // Shift the start time forward by the paused duration so estimator
      // progress freezes instead of jumping ahead after resume.
      startedAt: currentSession.startedAt + Math.max(0, now - pausedAt),
    };
  }

  sessionListeners.forEach((l) => {
    try { l(currentSession); } catch (err) { console.warn('[zoeSpokenWordBus] session listener error', err); }
  });
}

export function pauseSpokenSession(): void {
  setSpokenSessionPaused(true);
}

export function resumeSpokenSession(): void {
  setSpokenSessionPaused(false);
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
