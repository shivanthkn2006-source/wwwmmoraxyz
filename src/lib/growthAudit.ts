/**
 * GROWTH AUDIT TRAIL
 *
 * Append-only record of the actions that change Growth Engine behaviour:
 * onboarding dismissals/skips (which silently pause an account), self-service
 * repairs, and admin feature-flag flips or kill switches.
 *
 * Writes are best-effort and always fire-and-forget — an audit failure must
 * never block the action the member or admin just took.
 */
import { supabase } from '@/integrations/supabase/client';

export type GrowthAuditAction =
  | 'onboarding_dismissed'
  | 'onboarding_skipped'
  | 'onboarding_completed'
  | 'engine_turned_on'
  | 'engine_repaired'
  | 'diagnostics_run'
  | 'flag_updated'
  | 'flag_kill_switch'
  | 'backfill_previewed'
  | 'backfill_executed';

export interface GrowthAuditRow {
  id: string;
  user_id: string | null;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * Records one audit entry. `userId` is the member the action affects; the actor
 * is always the signed-in account (RLS requires actor_id = auth.uid()).
 */
export async function logGrowthAudit(
  action: GrowthAuditAction,
  details: Record<string, unknown> = {},
  userId?: string | null,
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const actorId = data.user?.id ?? null;
    if (!actorId) return; // anonymous — nothing to attribute, and RLS would reject
    await supabase.from('growth_audit_log').insert({
      action,
      details,
      actor_id: actorId,
      user_id: userId ?? actorId,
    });
  } catch {
    // Audit is observability, never a hard dependency.
  }
}

/** Reads the most recent audit entries visible to the caller (RLS scoped). */
export async function fetchGrowthAudit(limit = 25): Promise<GrowthAuditRow[]> {
  try {
    const { data, error } = await supabase
      .from('growth_audit_log')
      .select('id, user_id, actor_id, action, details, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as GrowthAuditRow[] | null) ?? [];
  } catch {
    return [];
  }
}

export default logGrowthAudit;
