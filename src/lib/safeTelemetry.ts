// ═══════════════════════════════════════════════════════════════════════════════
// SAFE TELEMETRY WRITER
// Fire-and-forget analytics/audit rows (behavioral_events, zoe_settings,
// platform_health_logs, dhf_soul_codex, zoe_black_box_ledger,
// feed_diagnostics_log) must never throw, never spam the console, and never be
// attempted with a stale/absent session — that is what produces the RLS
// (42501 / "new row violates row-level security policy") error storms.
//
// Contract:
//  • the live auth uid is resolved from the session, not from cached React state
//  • when signed out, the write is dropped locally instead of hitting the API
//  • user_id is always stamped from the live uid (never trusted from callers)
//  • failures resolve to { ok:false } — callers stay on the happy path
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

export type TelemetryTable =
  | 'behavioral_events'
  | 'zoe_settings'
  | 'platform_health_logs'
  | 'dhf_soul_codex'
  | 'zoe_black_box_ledger'
  | 'feed_diagnostics_log';

export interface TelemetryResult {
  ok: boolean;
  /** 'signed-out' when the row was dropped before any network call. */
  skipped?: 'signed-out';
  error?: string;
}

const UID_TTL_MS = 30_000;
let cachedUid: string | null = null;
let cachedAt = 0;

/** Live auth uid (short TTL cache so bursty telemetry doesn't hammer auth). */
export async function resolveAuthUid(): Promise<string | null> {
  const now = Date.now();
  if (cachedUid && now - cachedAt < UID_TTL_MS) return cachedUid;
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id ?? null;
    cachedUid = uid;
    cachedAt = now;
    return uid;
  } catch {
    return null;
  }
}

/** Test seam — clears the memoised uid. */
export function __resetTelemetryAuthCache() {
  cachedUid = null;
  cachedAt = 0;
}

const warned = new Set<string>();
const warnOnce = (key: string, message: string, detail?: unknown) => {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[safeTelemetry] ${message}`, detail ?? '');
};

/**
 * Insert one telemetry row. Resolves to { ok:false } instead of throwing.
 * `user_id` supplied by the caller is ignored in favour of the live session uid.
 */
export async function logTelemetry(
  table: TelemetryTable,
  row: Record<string, unknown>,
): Promise<TelemetryResult> {
  const uid = await resolveAuthUid();
  if (!uid) return { ok: false, skipped: 'signed-out' };

  try {
    const { error } = await (supabase as unknown as {
      from: (t: string) => { insert: (v: unknown) => Promise<{ error: { message: string; code?: string } | null }> };
    })
      .from(table)
      .insert({ ...row, user_id: uid });

    if (error) {
      // An RLS denial means the session no longer matches the row owner —
      // drop the cached uid so the next write re-resolves it.
      if (error.code === '42501') {
        __resetTelemetryAuthCache();
        warnOnce(`rls:${table}`, `write to ${table} denied by row-level security`, error.message);
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

/** Convenience wrapper for behavioural analytics rows. */
export const logBehavioralEvent = (row: Record<string, unknown>) =>
  logTelemetry('behavioral_events', row);

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH SNAPSHOT THROTTLE
// Six independent hooks (platform monitor, self-healer, feature scanner, shadow
// sentinel, ASI repair, Zoe core) each wrote a `platform_health_logs` row on
// their own timer. Measured cost: ~3,300 rows per user per day — 16M rows/day at
// 5,000 members, and 93 MB of table for three test accounts.
//
// Every health write now funnels through `logHealthSnapshot`, which keeps one
// row per source per window and skips writes when nothing changed. Genuine
// state changes (status flips, new critical issues) always get through, so
// signal is preserved while volume drops by ~2 orders of magnitude.
// ═══════════════════════════════════════════════════════════════════════════════

/** Minimum gap between two rows from the same source when nothing changed. */
export const HEALTH_SNAPSHOT_WINDOW_MS = 15 * 60_000;

export interface HealthSnapshot {
  /** Hook/subsystem writing the row — used as the throttle key. */
  source: string;
  score: number;
  status: string;
  issues_count?: number;
  critical_issues?: number;
  scan_data?: unknown;
  /** Bypass the throttle for one-off events worth keeping (e.g. a patch). */
  force?: boolean;
}

interface LastWrite {
  at: number;
  fingerprint: string;
}

const lastHealthWrite = new Map<string, LastWrite>();

/** Test seam. */
export function __resetHealthSnapshotThrottle() {
  lastHealthWrite.clear();
}

/**
 * True when this snapshot should reach the database.
 * Exported so the behaviour is unit-testable without a Supabase client.
 */
export function shouldWriteHealthSnapshot(
  snapshot: HealthSnapshot,
  now: number = Date.now(),
): boolean {
  if (snapshot.force) return true;
  const fingerprint = [
    snapshot.status,
    Math.round((snapshot.score ?? 0) / 10) * 10,
    snapshot.issues_count ?? 0,
    snapshot.critical_issues ?? 0,
  ].join('|');
  const previous = lastHealthWrite.get(snapshot.source);
  const changed = !previous || previous.fingerprint !== fingerprint;
  const stale = !previous || now - previous.at >= HEALTH_SNAPSHOT_WINDOW_MS;
  if (!changed && !stale) return false;
  lastHealthWrite.set(snapshot.source, { at: now, fingerprint });
  return true;
}

/** Throttled, RLS-safe writer for `platform_health_logs`. */
export async function logHealthSnapshot(snapshot: HealthSnapshot): Promise<TelemetryResult> {
  if (!shouldWriteHealthSnapshot(snapshot)) return { ok: true };
  const { source, force: _force, ...row } = snapshot;
  return logTelemetry('platform_health_logs', {
    ...row,
    scan_data: { ...(typeof row.scan_data === 'object' && row.scan_data ? row.scan_data : { value: row.scan_data }), source },
  });
}
