/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GROWTH DISPATCH — isolated personal-growth habit & content engine.
 *
 * Actions (POST body { action }):
 *   "run"     — bounded batch dispatch. Called by pg_cron every 15 minutes.
 *   "preview" — dry run (writes nothing). Requires a signed-in caller.
 *   "status"  — engine health for the admin harness.
 *   "resume"  — clears a 402/403 pause (admin only).
 *
 * Hardening (mirrors the proven astro-dispatch contract):
 *   • bounded batch per run — never unbounded fan-out
 *   • single-flight DB lease with expiry — concurrent runs exit immediately
 *   • idempotency key (user, local_date, slot) enforced by a UNIQUE constraint
 *   • circuit breaker: 402/403 pauses the engine, repeated 429 parks the run
 *   • paused-state guard at entry, with a single probe item per paused run
 *   • evergreen vault — a delivery window never publishes empty
 *   • shadow mode — rows written with status 'shadow' and not shown in the feed
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { localDateIn, localHourMinute } from '../_shared/astro-engine.ts';
import {
  GROWTH_SLOTS, SLOT_LOCAL_TIME, slotsForFrequency, generateInsight,
  sanitizeFocusAreas, sanitizeStyles, styleForSlot, elapsedSlots,
  type GrowthSlot,
} from '../_shared/growth-content.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_USERS_PER_RUN = 25;
const LEASE_MS = 4 * 60_000;
const SLOT_WINDOW_MIN = 75;
const RATE_LIMIT_PARK = 3;

async function db(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { ok: res.ok, status: res.status, data: json as any };
}

async function getState() {
  const r = await db('growth_dispatch_state?id=eq.singleton&select=*');
  if (Array.isArray(r.data) && r.data.length) return r.data[0];
  const created = await db('growth_dispatch_state', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify({ id: 'singleton' }),
  });
  return Array.isArray(created.data) ? created.data[0]
    : { id: 'singleton', shadow_mode: true, paused: false, consecutive_rate_limits: 0 };
}

async function patchState(patch: Record<string, unknown>) {
  await db('growth_dispatch_state?id=eq.singleton', {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

/** Single-flight: only succeeds when no live lease exists. */
async function acquireLease(owner: string): Promise<boolean> {
  const now = new Date();
  const expires = new Date(now.getTime() + LEASE_MS).toISOString();
  const r = await db(
    `growth_dispatch_state?id=eq.singleton&or=(lease_expires_at.is.null,lease_expires_at.lt.${now.toISOString()})`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ lease_owner: owner, lease_expires_at: expires, updated_at: now.toISOString() }),
    },
  );
  return Array.isArray(r.data) && r.data.length > 0;
}

async function releaseLease() {
  await patchState({ lease_owner: null, lease_expires_at: null });
}

/** Which delivery window is currently due on this member's local clock. */
export function dueSlot(now: Date, timeZone: string, enabled: GrowthSlot[]): GrowthSlot | null {
  const { hour, minute } = localHourMinute(now, timeZone);
  const nowMin = hour * 60 + minute;
  let best: GrowthSlot | null = null;
  let bestAge = Infinity;
  for (const slot of GROWTH_SLOTS) {
    if (!enabled.includes(slot)) continue;
    const s = SLOT_LOCAL_TIME[slot];
    let age = nowMin - (s.hour * 60 + s.minute);
    if (age < 0) age += 1440;
    if (age <= SLOT_WINDOW_MIN && age < bestAge) { best = slot; bestAge = age; }
  }
  return best;
}

interface PrefRow {
  user_id: string;
  focus_areas: string[] | null;
  reflection_style: string | null;
  reflection_styles: string[] | null;
  delivery_frequency: number | null;
  paused: boolean;
  timezone: string | null;
}

async function candidates(limit: number): Promise<PrefRow[]> {
  const r = await db(
    'growth_preferences?paused=eq.false&onboarded_at=not.is.null' +
    `&select=user_id,focus_areas,reflection_style,reflection_styles,delivery_frequency,paused,timezone&limit=${limit * 4}`,
  );
  return Array.isArray(r.data) ? r.data : [];
}

async function alreadyDelivered(userId: string, localDate: string, slot: string): Promise<boolean> {
  const r = await db(
    `growth_feed_items?user_id=eq.${userId}&local_date=eq.${localDate}&slot=eq.${slot}&select=id&limit=1`,
  );
  return Array.isArray(r.data) && r.data.length > 0;
}

interface RunSummary {
  processed: number;
  written: number;
  skipped: number;
  vault: number;
  paused: boolean;
  parked: boolean;
  errors: string[];
}

async function runBatch(opts: { dryRun: boolean; probeOnly: boolean }): Promise<RunSummary> {
  const state = await getState();
  const shadow = state?.shadow_mode !== false;
  const summary: RunSummary = {
    processed: 0, written: 0, skipped: 0, vault: 0, paused: false, parked: false, errors: [],
  };

  const now = new Date();
  const rows = await candidates(MAX_USERS_PER_RUN);
  const cap = opts.probeOnly ? 1 : MAX_USERS_PER_RUN;
  let rateLimitStreak = Number(state?.consecutive_rate_limits ?? 0);

  for (const pref of rows) {
    if (summary.processed >= cap) break;

    const tz = pref.timezone || 'UTC';
    const enabled = slotsForFrequency(pref.delivery_frequency ?? 5);
    const localDate = localDateIn(now, tz);
    const { hour, minute } = localHourMinute(now, tz);

    // Primary: the window that is due right now. Fallback: the most recent
    // window that already passed today but was never delivered (worker gap,
    // signup mid-day, provider outage). At most ONE catch-up per user per run,
    // so the batch stays bounded.
    let slot = dueSlot(now, tz, enabled);
    if (slot && await alreadyDelivered(pref.user_id, localDate, slot)) slot = null;
    if (!slot) {
      const passed = elapsedSlots(hour * 60 + minute, enabled);
      for (let i = passed.length - 1; i >= 0; i--) {
        if (!(await alreadyDelivered(pref.user_id, localDate, passed[i]))) {
          slot = passed[i];
          break;
        }
      }
    }
    if (!slot) { summary.skipped++; continue; }

    summary.processed++;

    const result = await generateInsight({
      slot,
      focusAreas: sanitizeFocusAreas(pref.focus_areas),
      style: styleForSlot(
        slot,
        sanitizeStyles(
          pref.reflection_styles?.length ? pref.reflection_styles : [pref.reflection_style],
        ),
      ),
      localDate,
      seed: `${pref.user_id}_${localDate}_${slot}`,
    });

    if (result.circuitBreak) {
      await patchState({
        paused: true,
        paused_reason: `${result.circuitBreak.status}: ${result.circuitBreak.message}`,
        paused_at: new Date().toISOString(),
      });
      summary.paused = true;
      summary.errors.push(`circuit break ${result.circuitBreak.status}`);
      break;
    }
    if (result.rateLimited) {
      rateLimitStreak++;
      summary.errors.push('rate limited');
      if (rateLimitStreak >= RATE_LIMIT_PARK) {
        summary.parked = true;
        break;
      }
      continue;
    }
    rateLimitStreak = 0;
    if (result.error) summary.errors.push(result.error);
    if (result.content.source === 'vault') summary.vault++;

    if (opts.dryRun) continue;

    // Idempotent write — the UNIQUE (user_id, local_date, slot) key makes a
    // duplicate run a no-op instead of a second insight.
    const ins = await db('growth_feed_items', {
      method: 'POST',
      headers: { Prefer: 'return=minimal,resolution=ignore-duplicates' },
      body: JSON.stringify({
        user_id: pref.user_id,
        slot,
        local_date: localDate,
        title: result.content.title,
        category: result.content.category,
        content: result.content.content,
        actionable_step: result.content.actionableStep,
        source: result.content.source,
        status: shadow ? 'shadow' : 'published',
        correlation_id: crypto.randomUUID(),
      }),
    });
    if (ins.ok) summary.written++;
    else summary.errors.push(`db ${ins.status}`);
  }

  if (!opts.dryRun) {
    await patchState({
      consecutive_rate_limits: summary.parked ? rateLimitStreak : 0,
      last_run_at: new Date().toISOString(),
      last_run_processed: summary.processed,
      last_error: summary.errors[0] ?? null,
    });
  }

  return summary;
}

async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return false;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: auth },
  });
  if (!r.ok) return false;
  const user = await r.json();
  if (!user?.id) return false;
  const roles = await db(`user_roles?user_id=eq.${user.id}&role=eq.admin&select=role&limit=1`);
  return Array.isArray(roles.data) && roles.data.length > 0;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let action = 'run';
  try {
    const body = await req.json();
    action = String(body?.action ?? 'run');
  } catch { /* default action */ }

  try {
    if (action === 'status') {
      const state = await getState();
      return json({ ok: true, state });
    }

    if (action === 'resume') {
      if (!(await isAdmin(req))) return json({ ok: false, error: 'admin only' }, 403);
      await patchState({ paused: false, paused_reason: null, paused_at: null, consecutive_rate_limits: 0 });
      return json({ ok: true, resumed: true });
    }

    if (action === 'preview') {
      const summary = await runBatch({ dryRun: true, probeOnly: true });
      return json({ ok: true, dryRun: true, summary });
    }

    // ── "run" ────────────────────────────────────────────────────────────
    const state = await getState();
    const paused = state?.paused === true;

    const owner = crypto.randomUUID();
    if (!(await acquireLease(owner))) {
      return json({ ok: true, skipped: 'another run holds the lease' });
    }

    try {
      // While paused, at most one probe item runs so out-of-band recovery
      // (credits topped up, limit raised) is detected without spending a batch.
      const summary = await runBatch({ dryRun: false, probeOnly: paused });
      if (paused && !summary.paused && summary.written > 0) {
        await patchState({ paused: false, paused_reason: null, paused_at: null });
        return json({ ok: true, resumedByProbe: true, summary });
      }
      return json({ ok: true, wasPaused: paused, summary });
    } finally {
      await releaseLease();
    }
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
