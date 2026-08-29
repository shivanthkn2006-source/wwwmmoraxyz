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
