/**
 * cotWiringBus — lightweight, dependency-free telemetry bus for Zoe's
 * Chain-of-Thought (CoT) pipeline. Any service that participates in a
 * reasoning turn (edge functions, TTS, streaming, local brain) reports here so
 * the orb can surface a real-time wiring status panel.
 */

export type CotStatus = 'idle' | 'active' | 'ok' | 'error';

export interface CotServiceState {
  /** Stable key, e.g. 'zoe-core-intelligence' */
  service: string;
  /** Human label shown in the UI */
  label: string;
  /** Pipeline grouping: brain | chat | voice | stream */
  pipeline: 'brain' | 'chat' | 'voice' | 'stream';
  status: CotStatus;
  /** epoch ms of the last request start */
  lastRequestAt: number | null;
  /** epoch ms of the last completion (ok or error) */
  lastCompletedAt: number | null;
  /** ms duration of the last completed call */
  lastLatencyMs: number | null;
  lastError: string | null;
  okCount: number;
  errorCount: number;
}

type Listener = (states: CotServiceState[]) => void;

const LABELS: Record<string, { label: string; pipeline: CotServiceState['pipeline'] }> = {
  'zoe-core-intelligence': { label: 'Metacognitive Brain', pipeline: 'brain' },
  'zoe-chat': { label: 'Conversational Chat', pipeline: 'chat' },
  'zoe-agent': { label: 'Agent Router', pipeline: 'brain' },
  'zoe-perception': { label: 'Vision / Perception', pipeline: 'brain' },
  'local-brain': { label: 'Local Fast Pass', pipeline: 'brain' },
  'zoe-voice': { label: 'Voice Synthesis', pipeline: 'voice' },
  'spoken-word-sync': { label: 'Teleprompter Sync', pipeline: 'stream' },
};

const states = new Map<string, CotServiceState>();
const listeners = new Set<Listener>();
const pending = new Map<string, { service: string; startedAt: number }>();

let seq = 0;

const ensure = (service: string): CotServiceState => {
  let s = states.get(service);
  if (!s) {
    const meta = LABELS[service] ?? { label: service, pipeline: 'chat' as const };
    s = {
      service,
      label: meta.label,
      pipeline: meta.pipeline,
      status: 'idle',
      lastRequestAt: null,
      lastCompletedAt: null,
      lastLatencyMs: null,
      lastError: null,
      okCount: 0,
      errorCount: 0,
    };
    states.set(service, s);
  }
  return s;
};

const emit = () => {
  const snapshot = getCotWiringSnapshot();
  listeners.forEach((l) => {
    try {
      l(snapshot);
    } catch {
      /* listener errors must never break the pipeline */
    }
  });
};

export const getCotWiringSnapshot = (): CotServiceState[] =>
  Array.from(states.values())
    .map((s) => ({ ...s }))
    .sort((a, b) => (b.lastRequestAt ?? 0) - (a.lastRequestAt ?? 0));

export const subscribeCotWiring = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(getCotWiringSnapshot());
  return () => {
    listeners.delete(listener);
  };
};

/** Mark a service call as started. Returns a token for cotFinish. */
export const cotStart = (service: string): string => {
  const s = ensure(service);
  const startedAt = Date.now();
  s.status = 'active';
  s.lastRequestAt = startedAt;
  s.lastError = null;
  const token = `${service}#${++seq}`;
  pending.set(token, { service, startedAt });
  emit();
  return token;
};

/** Mark a previously started call as finished. */
export const cotFinish = (token: string, result?: { ok?: boolean; error?: unknown }): void => {
  const entry = pending.get(token);
  if (!entry) return;
  pending.delete(token);
  const s = ensure(entry.service);
  const ok = result?.ok !== false && !result?.error;
  const now = Date.now();
  s.status = ok ? 'ok' : 'error';
  s.lastCompletedAt = now;
  s.lastLatencyMs = now - entry.startedAt;
  if (ok) {
    s.okCount += 1;
    s.lastError = null;
  } else {
    s.errorCount += 1;
    const err = result?.error;
    s.lastError =
      err instanceof Error ? err.message : typeof err === 'string' ? err : err ? String(err) : 'Unknown error';
  }
  emit();
};

/** Convenience wrapper: instruments any promise-returning call. */
export const cotTrack = async <T>(service: string, fn: () => Promise<T>): Promise<T> => {
  const token = cotStart(service);
  try {
    const out = await fn();
    cotFinish(token, { ok: true });
    return out;
  } catch (error) {
    cotFinish(token, { error });
    throw error;
  }
};

/** Reset — used by tests only. */
export const resetCotWiring = (): void => {
  states.clear();
  pending.clear();
  emit();
};
