/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DHF COMPASS DISPATCH — backend pre-warm, no login required.
 *
 * pg_cron calls this hourly. It gives every member of THIS project their ten
 * cards for their OWN local date before they ever open the app, so the very
 * first sign-in already shows a populated timeline.
 *
 * Background-job contract:
 *   • Bounded work: at most BATCH_SIZE member-days per invocation.
 *   • Single-flight: a lease row in `dhf_dispatch_lease` (job_queue-backed) is
 *     taken before any work; a second concurrent run exits immediately.
 *   • Idempotent: `ensureDayForUser` short-circuits on existing coverage, so a
 *     re-run costs nothing.
 *   • Circuit breaker: a 402/403 from the provider pauses the whole run; the
 *     remaining members are picked up on the next hour with vault fallback.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { COMPASS_SLOTS, countForDate, db, ensureDayForUser } from '../_shared/dhf-compass-runner.ts';
import { localDateIn } from '../_shared/astro-engine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 8;
const LEASE_KEY = 'dhf_compass_dispatch';
const LEASE_MS = 10 * 60 * 1000;

async function takeLease(): Promise<boolean> {
  const now = Date.now();
  const existing = await db(`job_queue?job_type=eq.${LEASE_KEY}&select=id,created_at,status&limit=1`);
  const row = Array.isArray(existing.data) && existing.data.length ? existing.data[0] : null;
  if (row) {
    const age = now - new Date(row.created_at).getTime();
    if (row.status === 'running' && age < LEASE_MS) return false;
    const upd = await db(`job_queue?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'running', created_at: new Date(now).toISOString() }),
    });
    return upd.ok;
  }
  const created = await db('job_queue', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ job_type: LEASE_KEY, status: 'running', payload: {} }),
  });
  return created.ok;
}

async function releaseLease(summary: Record<string, unknown>) {
  await db(`job_queue?job_type=eq.${LEASE_KEY}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'idle', payload: summary }),
  });
}

interface Member { user_id: string; timezone: string }

async function members(): Promise<Member[]> {
  const rows = await db('profiles?select=user_id&limit=500');
  const ids: string[] = Array.isArray(rows.data) ? rows.data.map((r: any) => r.user_id).filter(Boolean) : [];
  const zones = new Map<string, string>();
  const prefs = await db('growth_preferences?select=user_id,timezone&limit=500');
  if (Array.isArray(prefs.data)) {
    for (const p of prefs.data as any[]) if (p?.user_id && p?.timezone) zones.set(p.user_id, p.timezone);
  }
  return ids.map((id) => ({ user_id: id, timezone: zones.get(id) ?? 'UTC' }));
}

function safeZone(tz: string): string {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return 'UTC'; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (!(await takeLease())) return json({ ok: true, skipped: 'in-flight' });

    const summary = { scanned: 0, generated: 0, cached: 0, failed: 0, paused: false };
    try {
      const list = await members();
      summary.scanned = list.length;

      let processed = 0;
      for (const member of list) {
        if (processed >= BATCH_SIZE || summary.paused) break;
        const tz = safeZone(member.timezone);
        const date = localDateIn(new Date(), tz);

        const existing = await countForDate(member.user_id, date);
        if (existing >= COMPASS_SLOTS.length) { summary.cached++; continue; }

        const result = await ensureDayForUser({ userId: member.user_id, date, trigger: 'cron', action: 'ensure' });
        processed++;
        if (result.paused) summary.paused = true;
        if (result.ok) summary.generated += result.generated; else summary.failed++;
      }
    } finally {
      await releaseLease(summary);
    }

    return json({ ok: true, ...summary });
  } catch (e) {
    await releaseLease({ error: String((e as Error)?.message ?? e).slice(0, 200) });
    return json({ ok: false, error: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
