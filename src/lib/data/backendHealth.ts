// ═══════════════════════════════════════════════════════════════════════════════
// BACKEND CONNECTIVITY HEALTH CHECK
// Single source of truth for "is the backend reachable right now". Every data
// path can ask before writing, and every transport failure feeds back in, so a
// database timeout or a paused backend becomes visible immediately instead of
// surfacing as 40 unrelated component errors.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import { reportPlatformError } from '@/lib/enterpriseTelemetry';

export type BackendStatus = 'unknown' | 'online' | 'degraded' | 'offline';

export interface BackendHealth {
  status: BackendStatus;
  /** Consecutive failed probes/transports since the last success. */
  failures: number;
  lastCheckedAt: number | null;
  lastOkAt: number | null;
  latencyMs: number | null;
  reason: string | null;
}

type Listener = (health: BackendHealth) => void;

/** Probe target: a HEAD on the REST root. Cheap, needs no table, no auth row. */
const PROBE_TIMEOUT_MS = 6000;
const MIN_PROBE_INTERVAL_MS = 5000;
const DEGRADED_AFTER = 1;
const OFFLINE_AFTER = 3;

const state: BackendHealth = {
  status: 'unknown',
  failures: 0,
  lastCheckedAt: null,
  lastOkAt: null,
  latencyMs: null,
  reason: null,
};

const listeners = new Set<Listener>();
let inFlight: Promise<BackendHealth> | null = null;
let lastReportedStatus: BackendStatus = 'unknown';

const snapshot = (): BackendHealth => ({ ...state });

function emit() {
  const snap = snapshot();
  for (const listener of listeners) {
    try {
      listener(snap);
    } catch {
      /* a bad subscriber must never break health tracking */
    }
  }
}

/** Telemetry only on transitions — never once per failed query. */
function reportTransition(previous: BackendStatus, reason: string | null) {
  if (state.status === previous) return;
  lastReportedStatus = state.status;

  if (state.status === 'offline' || state.status === 'degraded') {
    reportPlatformError({
      errorType: 'BackendUnreachable',
      message: `Backend ${state.status}: ${reason ?? 'no response'}`,
      severity: state.status === 'offline' ? 'critical' : 'high',
      source: 'backend-health',
      metadata: {
        failures: state.failures,
        latencyMs: state.latencyMs,
        previous,
        lastOkAt: state.lastOkAt,
      },
    });
  } else if (state.status === 'online' && (previous === 'offline' || previous === 'degraded')) {
    reportPlatformError({
      errorType: 'BackendRecovered',
      message: `Backend recovered from ${previous}`,
      severity: 'low',
      source: 'backend-health',
      metadata: { latencyMs: state.latencyMs, previous },
    });
  }
}

function markOk(latencyMs: number) {
  const previous = state.status;
  state.status = 'online';
  state.failures = 0;
  state.latencyMs = latencyMs;
  state.lastCheckedAt = Date.now();
  state.lastOkAt = state.lastCheckedAt;
  state.reason = null;
  reportTransition(previous, null);
  emit();
}

function markFailure(reason: string) {
  const previous = state.status;
  state.failures += 1;
  state.lastCheckedAt = Date.now();
  state.reason = reason;
  state.status = state.failures >= OFFLINE_AFTER ? 'offline' : 'degraded';
  if (state.failures < DEGRADED_AFTER) state.status = previous;
  reportTransition(previous, reason);
  emit();
}

/**
 * Classifies an arbitrary data-layer error and folds it into health state.
 * Only transport-shaped failures count — an RLS denial means the backend is
 * very much alive.
 */
export function recordBackendOutcome(outcome: { ok: boolean; code?: string; message?: string }) {
  if (outcome.ok) {
    markOk(state.latencyMs ?? 0);
    return;
  }
  if (!isTransportFailure(outcome.code, outcome.message)) return;
  markFailure(outcome.message ?? outcome.code ?? 'transport failure');
}

const TRANSPORT_CODES = new Set(['TRANSPORT', '503', '504', '544', '', undefined as never]);

export function isTransportFailure(code?: string, message?: string): boolean {
  if (code && TRANSPORT_CODES.has(code)) return true;
  const m = (message ?? '').toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed') ||
    m.includes('connection terminated') ||
    m.includes('connection timeout') ||
    m.includes('timeout') ||
    m.includes('paused') ||
    m.includes('502') ||
    m.includes('503') ||
    m.includes('504') ||
    m.includes('544')
  );
}

/** True when the browser itself reports no network. */
export const isBrowserOffline = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

/** Current cached health without issuing a request. */
export const getBackendHealth = (): BackendHealth => snapshot();

export const isBackendUsable = (): boolean =>
  !isBrowserOffline() && state.status !== 'offline';

export function subscribeBackendHealth(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot());
  return () => listeners.delete(listener);
}

/**
 * Actively probes the backend. Coalesces concurrent callers and throttles to
 * one real request per MIN_PROBE_INTERVAL_MS so a burst of failing writes can
 * never turn into a probe storm.
 */
export async function checkBackendHealth(force = false): Promise<BackendHealth> {
  if (inFlight) return inFlight;
  if (
    !force &&
    state.lastCheckedAt !== null &&
    Date.now() - state.lastCheckedAt < MIN_PROBE_INTERVAL_MS
  ) {
    return snapshot();
  }
  if (isBrowserOffline()) {
    markFailure('browser reports offline');
    return snapshot();
  }

  inFlight = (async () => {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      // Auth session endpoint: reachable without any table grant, and it fails
      // the moment the database/auth layer is paused or timing out.
      const { error } = await supabase.auth.getSession();
      if (error) throw new Error(error.message);
      markOk(Date.now() - started);
    } catch (e) {
      markFailure(String((e as Error)?.message ?? e));
    } finally {
      clearTimeout(timer);
      inFlight = null;
    }
    return snapshot();
  })();

  return inFlight;
}

/** Test hook — resets the module-level health state. */
export function __resetBackendHealth() {
  state.status = 'unknown';
  state.failures = 0;
  state.lastCheckedAt = null;
  state.lastOkAt = null;
  state.latencyMs = null;
  state.reason = null;
  lastReportedStatus = 'unknown';
  inFlight = null;
  listeners.clear();
}

export const __lastReportedStatus = () => lastReportedStatus;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void checkBackendHealth(true));
  window.addEventListener('offline', () => markFailure('browser reports offline'));
}
