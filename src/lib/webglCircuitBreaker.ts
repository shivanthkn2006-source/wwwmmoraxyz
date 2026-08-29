// ═══════════════════════════════════════════════════════════════════════════════
// WEBGL CIRCUIT BREAKER
// A 3D module that fails to initialise (driver loss, OOM, chunk fetch failure,
// context-creation refusal) must never be retried in a hot loop — that is what
// overheats devices and cascades into a blank shell. This breaker trips after a
// small number of failures inside a rolling window and stays open for a cool-off
// period, during which callers render a lightweight safe UI instead of a canvas.
//
// State is per-tab (sessionStorage) so a reload after a real driver crash still
// protects the user, while a fresh session starts optimistic again.
// ═══════════════════════════════════════════════════════════════════════════════

export type BreakerState = 'closed' | 'open' | 'half-open';

export interface BreakerSnapshot {
  state: BreakerState;
  failures: number;
  /** Epoch ms when the breaker last tripped, or 0. */
  openedAt: number;
  lastError?: string;
}

export interface BreakerConfig {
  /** Consecutive failures inside `windowMs` that trip the breaker. */
  threshold: number;
  /** Rolling window for counting failures. */
  windowMs: number;
  /** How long the breaker stays open before allowing one probe render. */
  cooldownMs: number;
}

export const DEFAULT_BREAKER_CONFIG: BreakerConfig = {
  threshold: 2,
  windowMs: 60_000,
  cooldownMs: 5 * 60_000,
};

interface Record_ {
  failures: number;
  firstFailureAt: number;
  openedAt: number;
  lastError?: string;
}

const STORAGE_KEY = 'mmora.webgl.breaker.v1';

const memory = new Map<string, Record_>();
let hydrated = false;
const listeners = new Set<() => void>();

const now = () => Date.now();

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  if (typeof sessionStorage === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Record_>;
    if (parsed && typeof parsed === 'object') {
      for (const [key, value] of Object.entries(parsed)) {
        if (value && typeof value.failures === 'number') memory.set(key, value);
      }
    }
  } catch {
    // Corrupt payload — start clean rather than crashing the render path.
  }
}

function persist() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(memory)));
  } catch {
    // Storage full / disabled — in-memory state is still authoritative.
  }
}

function notify() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // A bad subscriber must never break the breaker.
    }
  }
}

/** Subscribe to breaker transitions (used by React wrappers to re-render). */
export function subscribeBreaker(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBreakerState(
  moduleName: string,
  config: BreakerConfig = DEFAULT_BREAKER_CONFIG,
): BreakerSnapshot {
  hydrate();
  const record = memory.get(moduleName);
  if (!record) return { state: 'closed', failures: 0, openedAt: 0 };

  if (record.openedAt > 0) {
    const elapsed = now() - record.openedAt;
    // Cool-off elapsed: allow exactly one probe render before re-tripping.
    const state: BreakerState = elapsed >= config.cooldownMs ? 'half-open' : 'open';
    return { state, failures: record.failures, openedAt: record.openedAt, lastError: record.lastError };
  }

  // Expire stale failures so an isolated glitch hours ago never trips later.
  if (now() - record.firstFailureAt > config.windowMs) {
    return { state: 'closed', failures: 0, openedAt: 0, lastError: record.lastError };
  }
  return { state: 'closed', failures: record.failures, openedAt: 0, lastError: record.lastError };
}

/** True when a 3D module is allowed to attempt initialisation right now. */
export function canAttemptWebGL(
  moduleName: string,
  config: BreakerConfig = DEFAULT_BREAKER_CONFIG,
): boolean {
  return getBreakerState(moduleName, config).state !== 'open';
}

/** Record an initialisation/runtime failure; trips the breaker at threshold. */
export function recordWebGLFailure(
  moduleName: string,
  error?: unknown,
  config: BreakerConfig = DEFAULT_BREAKER_CONFIG,
): BreakerSnapshot {
  hydrate();
  const at = now();
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
  const existing = memory.get(moduleName);

  const withinWindow = existing && at - existing.firstFailureAt <= config.windowMs;
  const record: Record_ = withinWindow
    ? { ...existing!, failures: existing!.failures + 1, lastError: message }
    : { failures: 1, firstFailureAt: at, openedAt: 0, lastError: message };

  // A failure while half-open (or already open) re-trips immediately.
  if (record.failures >= config.threshold || (existing?.openedAt ?? 0) > 0) {
    record.openedAt = at;
  }

  memory.set(moduleName, record);
  persist();
  notify();

  if (record.openedAt > 0) {
    console.warn(
      `[webgl-breaker] "${moduleName}" tripped after ${record.failures} failure(s) — falling back to safe UI.`,
      message ?? '',
    );
  }
  return getBreakerState(moduleName, config);
}

/** Record a healthy render; closes the breaker and clears the failure history. */
export function recordWebGLSuccess(moduleName: string): void {
  hydrate();
  if (!memory.has(moduleName)) return;
  memory.delete(moduleName);
  persist();
  notify();
}

/** Manual user-initiated retry ("Try 3D again") — clears the open state. */
export function resetWebGLBreaker(moduleName?: string): void {
  hydrate();
  if (moduleName) memory.delete(moduleName);
  else memory.clear();
  persist();
  notify();
}

/** Test seam — wipes in-memory + persisted breaker state. */
export function __resetAllBreakers(): void {
  memory.clear();
  hydrated = false;
  listeners.clear();
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
