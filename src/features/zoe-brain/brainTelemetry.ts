/**
 * brainTelemetry — real, measured facts about Zoe's brain.
 *
 * Every orb/chat turn reports here: which intent handled it, how long it took,
 * and whether it succeeded. The brain dashboard and the brain scan read this
 * store, so "uptime", "response time" and "failing intents" are measurements,
 * never decoration.
 *
 * Storage is localStorage (per device, last 300 turns) — no schema change, no
 * network cost, and it survives reloads so uptime spans the whole day.
 */

export type TurnOutcome = 'ok' | 'error' | 'empty';

export interface BrainTurn {
  at: number;
  intent: string;
  outcome: TurnOutcome;
  latencyMs: number;
  route?: string | null;
  error?: string | null;
}

export interface IntentStat {
  intent: string;
  total: number;
  ok: number;
  errors: number;
  empty: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  lastAt: number;
  lastError: string | null;
}

export interface BrainStats {
  bootedAt: number;
  sessionStartedAt: number;
  sessionUptimeMs: number;
  trackedSinceMs: number;
  totalTurns: number;
  okTurns: number;
  errorTurns: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  lastTurnAt: number | null;
  intents: IntentStat[];
  failingIntents: IntentStat[];
  recent: BrainTurn[];
}

const KEY = 'mmora.zoe.brain-telemetry.v1';
const BOOT_KEY = 'mmora.zoe.brain-first-seen.v1';
const MAX_TURNS = 300;

const sessionStartedAt = Date.now();
let turns: BrainTurn[] = [];
let bootedAt = sessionStartedAt;

const listeners = new Set<(s: BrainStats) => void>();

function load() {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) turns = parsed.filter((t) => t && typeof t.at === 'number').slice(-MAX_TURNS);
    }
    const boot = Number(localStorage.getItem(BOOT_KEY));
    if (Number.isFinite(boot) && boot > 0) bootedAt = boot;
    else localStorage.setItem(BOOT_KEY, String(sessionStartedAt));
  } catch {
    /* corrupt storage must never break the orb */
  }
}
load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(turns.slice(-MAX_TURNS)));
  } catch {
    /* quota — telemetry is best effort */
  }
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

export function recordBrainTurn(turn: Omit<BrainTurn, 'at'> & { at?: number }): void {
  turns.push({
    at: turn.at ?? Date.now(),
    intent: turn.intent || 'unknown',
    outcome: turn.outcome,
    latencyMs: Math.max(0, Math.round(turn.latencyMs || 0)),
    route: turn.route ?? (typeof window !== 'undefined' ? window.location.pathname : null),
    error: turn.error ?? null,
  });
  if (turns.length > MAX_TURNS) turns = turns.slice(-MAX_TURNS);
  persist();
  const snapshot = getBrainStats();
  listeners.forEach((l) => {
    try {
      l(snapshot);
    } catch {
      /* listener errors never break the pipeline */
    }
  });
}

/** Times an async handler and records the result. Rethrows the original error. */
export async function trackBrainTurn<T>(intent: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  try {
    const out = await fn();
    const empty = out == null || (typeof out === 'string' && out.trim() === '');
    recordBrainTurn({ intent, outcome: empty ? 'empty' : 'ok', latencyMs: Date.now() - t0 });
    return out;
  } catch (err) {
    recordBrainTurn({
      intent,
      outcome: 'error',
      latencyMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export function getBrainStats(): BrainStats {
  const now = Date.now();
  const byIntent = new Map<string, BrainTurn[]>();
  for (const t of turns) {
    const list = byIntent.get(t.intent) ?? [];
    list.push(t);
    byIntent.set(t.intent, list);
  }

  const intents: IntentStat[] = Array.from(byIntent.entries())
    .map(([intent, list]) => {
      const lat = list.map((t) => t.latencyMs);
      const ok = list.filter((t) => t.outcome === 'ok').length;
      const errors = list.filter((t) => t.outcome === 'error').length;
      const empty = list.filter((t) => t.outcome === 'empty').length;
      const lastErrTurn = [...list].reverse().find((t) => t.error);
      return {
        intent,
        total: list.length,
        ok,
        errors,
        empty,
        successRate: list.length ? Math.round((ok / list.length) * 100) : 0,
        avgLatencyMs: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0,
        p95LatencyMs: percentile(lat, 95),
        lastAt: list[list.length - 1].at,
        lastError: lastErrTurn?.error ?? null,
      };
    })
    .sort((a, b) => b.total - a.total);

  const lat = turns.map((t) => t.latencyMs);
  const okTurns = turns.filter((t) => t.outcome === 'ok').length;
  const errorTurns = turns.filter((t) => t.outcome === 'error').length;

  return {
    bootedAt,
    sessionStartedAt,
    sessionUptimeMs: now - sessionStartedAt,
    trackedSinceMs: now - bootedAt,
    totalTurns: turns.length,
    okTurns,
    errorTurns,
    successRate: turns.length ? Math.round((okTurns / turns.length) * 100) : 100,
    avgLatencyMs: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0,
    p95LatencyMs: percentile(lat, 95),
    lastTurnAt: turns.length ? turns[turns.length - 1].at : null,
    intents,
    failingIntents: intents.filter((i) => i.errors > 0 || (i.total >= 3 && i.successRate < 70)),
    recent: turns.slice(-25).reverse(),
  };
}

export function subscribeBrainStats(listener: (s: BrainStats) => void): () => void {
  listeners.add(listener);
  listener(getBrainStats());
  return () => {
    listeners.delete(listener);
  };
}

export function clearBrainTelemetry(): void {
  turns = [];
  persist();
  const snapshot = getBrainStats();
  listeners.forEach((l) => l(snapshot));
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
