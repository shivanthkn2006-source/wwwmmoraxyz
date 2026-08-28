/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GROWTH DISPATCH — isolated personal-growth habit & content engine.
 *
 * Actions (POST body { action }):
 *   "run"        — bounded batch dispatch. Called by pg_cron every 15 minutes.
 *   "preview"    — dry run (writes nothing).
 *   "status"     — engine health for the admin harness.
 *   "resume"     — clears a 402/403 pause (admin only).
 *   "me-status"  — per-user schedule + delivery state (signed-in caller).
 *   "regenerate" — re-runs the caller's current window and UPDATES that row.
 *   "backfill"   — admin-only throttled backfill of past dates/windows.
 *   "backfill-jobs" — admin-only recent backfill run history.
 *
 * Hardening (mirrors the proven astro-dispatch contract):
 *   • bounded batch per run — never unbounded fan-out
 *   • single-flight DB lease with expiry — concurrent runs exit immediately
 *   • idempotency key (user, local_date, slot) enforced by a UNIQUE constraint
 *   • circuit breaker: 402/403 pauses the engine, repeated 429 parks the run
 *   • paused-state guard at entry, with a single probe item per paused run
 *   • evergreen vault — a delivery window never publishes empty
 *   • shadow mode — rows written with status 'shadow' and not shown in the feed
 *   • every run is written to growth_dispatch_runs for end-to-end tracing
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
const REGEN_COOLDOWN_MS = 60_000;
const REGEN_DAILY_CAP = 5;
const BACKFILL_MAX_ITEMS = 200;
const BACKFILL_MIN_THROTTLE_MS = 100;
const BACKFILL_MAX_THROTTLE_MS = 5_000;
const BACKFILL_BUDGET_MS = 50_000;

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

/** Structured run log — never throws, never blocks a dispatch. */
async function logRun(row: Record<string, unknown>) {
  try {
    await db('growth_dispatch_runs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
  } catch { /* logging must never break the worker */ }
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
  notify_on_new_insight?: boolean | null;
  notify_push?: boolean | null;
  notify_email?: boolean | null;
  notify_digest?: string | null;
  last_digest_date?: string | null;
}

const PREF_SELECT =
  'user_id,focus_areas,reflection_style,reflection_styles,delivery_frequency,paused,timezone,' +
  'notify_on_new_insight,notify_push,notify_email,notify_digest,last_digest_date,onboarded_at';

async function candidates(limit: number): Promise<PrefRow[]> {
  const r = await db(
    'growth_preferences?paused=eq.false&onboarded_at=not.is.null' +
    `&select=${PREF_SELECT}&limit=${limit * 4}`,
  );
  return Array.isArray(r.data) ? r.data : [];
}

async function deliveredSlots(userId: string, localDate: string): Promise<Set<string>> {
  const r = await db(
    `growth_feed_items?user_id=eq.${userId}&local_date=eq.${localDate}&select=slot`,
  );
  return new Set(Array.isArray(r.data) ? r.data.map((x: { slot: string }) => x.slot) : []);
}

/** Auth email for a user id. Best-effort; empty string when unavailable. */
async function authEmail(userId: string): Promise<string> {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!r.ok) return '';
    const u = await r.json();
    return typeof u?.email === 'string' ? u.email : '';
  } catch { return ''; }
}

/** Transactional email for a new insight. No-op when Resend is not configured. */
async function emailInsight(userId: string, slot: GrowthSlot, title: string, body: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return;
  const to = await authEmail(userId);
  if (!to) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('GROWTH_EMAIL_FROM') ?? 'insights@resend.dev',
        to: [to],
        subject: `Your ${SLOT_LOCAL_TIME[slot].label.toLowerCase()} insight: ${String(title).slice(0, 80)}`,
        text: `${title}\n\n${String(body).slice(0, 1200)}`,
      }),
    });
  } catch { /* email never blocks generation */ }
}

/**
 * Delivery fan-out for a freshly published card, honouring the user's channel
 * and digest preferences. Every branch is best-effort — a failed notification
 * must never roll back or block a generated insight.
 *
 * digest: instant → every card | daily → first card of the local day | off → none
 */
async function deliverInsightNotifications(
  pref: PrefRow, slot: GrowthSlot, localDate: string, title: string, body: string,
) {
  const digest = pref.notify_digest ?? 'instant';
  if (digest === 'off') return;
  if (digest === 'daily') {
    if (pref.last_digest_date === localDate) return;
    await db(`growth_preferences?user_id=eq.${pref.user_id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ last_digest_date: localDate }),
    }).catch(() => undefined);
  }

  if (pref.notify_on_new_insight !== false || pref.notify_push !== false) {
    await notifyNewInsight(pref.user_id, slot, title);
  }
  if (pref.notify_email === true) {
    await emailInsight(pref.user_id, slot, title, body);
  }
}

/** Self-notification for a freshly published card. Best-effort only. */
async function notifyNewInsight(userId: string, slot: GrowthSlot, title: string) {
  try {
    await db('notifications', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        from_user_id: userId,
        type: 'growth_insight',
        context_data: { slot, title: String(title).slice(0, 120), window: SLOT_LOCAL_TIME[slot].label },
      }),
    });
  } catch { /* notifications never block generation */ }
}

interface RunSummary {
  processed: number;
  written: number;
  skipped: number;
  vault: number;
  catchups: number;
  paused: boolean;
  parked: boolean;
  errors: string[];
}

async function runBatch(opts: { dryRun: boolean; probeOnly: boolean }): Promise<RunSummary> {
  const state = await getState();
  const shadow = state?.shadow_mode !== false;
  const summary: RunSummary = {
    processed: 0, written: 0, skipped: 0, vault: 0, catchups: 0,
    paused: false, parked: false, errors: [],
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

    // One read per user instead of one per slot: the delivered set answers both
    // the due-window check and the catch-up scan.
    const delivered = await deliveredSlots(pref.user_id, localDate);

    // Primary: the window that is due right now. Fallback: the most recent
    // window that already passed today but was never delivered (worker gap,
    // signup mid-day, provider outage). At most ONE catch-up per user per run,
    // so the batch stays bounded.
    let slot = dueSlot(now, tz, enabled);
    let isCatchup = false;
    if (slot && delivered.has(slot)) slot = null;
    if (!slot) {
      const passed = elapsedSlots(hour * 60 + minute, enabled);
      for (let i = passed.length - 1; i >= 0; i--) {
        if (!delivered.has(passed[i])) { slot = passed[i]; isCatchup = true; break; }
      }
    }
    if (!slot) { summary.skipped++; continue; }

    summary.processed++;
    if (isCatchup) summary.catchups++;

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
    if (ins.ok) {
      summary.written++;
      if (!shadow) {
        await deliverInsightNotifications(
          pref, slot, localDate, result.content.title, result.content.content,
        );
      }
    } else {
      summary.errors.push(`db ${ins.status}`);
    }
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

async function authUser(req: Request): Promise<{ id: string } | null> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: auth },
    });
    if (!r.ok) return null;
    const user = await r.json();
    return user?.id ? { id: String(user.id) } : null;
  } catch {
    return null;
  }
}

async function isAdmin(req: Request): Promise<boolean> {
  const user = await authUser(req);
  if (!user) return false;
  const roles = await db(`user_roles?user_id=eq.${user.id}&role=eq.admin&select=role&limit=1`);
  return Array.isArray(roles.data) && roles.data.length > 0;
}

async function loadPref(userId: string): Promise<PrefRow | null> {
  const r = await db(`growth_preferences?user_id=eq.${userId}&select=${PREF_SELECT}&limit=1`);
  return Array.isArray(r.data) && r.data.length ? r.data[0] : null;
}

/**
 * Per-user schedule with the delivery state of every enabled window today.
 * Statuses: delivered | pending (window passed, not written yet) | scheduled.
 */
async function meStatus(userId: string) {
  const state = await getState();
  const pref = await loadPref(userId);
  const tz = pref?.timezone || 'UTC';
  const now = new Date();
  const localDate = localDateIn(now, tz);
  const { hour, minute } = localHourMinute(now, tz);
  const nowMin = hour * 60 + minute;
  const enabled = slotsForFrequency(pref?.delivery_frequency ?? 5);

  const itemsRes = await db(
    `growth_feed_items?user_id=eq.${userId}&local_date=eq.${localDate}` +
    '&select=id,slot,title,category,status,source,created_at,updated_at,regen_count',
  );
  const items: Array<Record<string, unknown>> = Array.isArray(itemsRes.data) ? itemsRes.data : [];
  const bySlot = new Map(items.map((i) => [String(i.slot), i]));

  const schedule = enabled.map((slot) => {
    const t = SLOT_LOCAL_TIME[slot];
    const slotMin = t.hour * 60 + t.minute;
    const item = bySlot.get(slot) ?? null;
    const passed = slotMin <= nowMin;
    const status = item
      ? (item.status === 'published' ? 'delivered' : 'shadow')
      : passed ? 'pending' : 'scheduled';
    return {
      slot,
      label: t.label,
      local_time: `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`,
      passed,
      status,
      item,
    };
  });

  const next = schedule.find((s) => !s.passed) ?? null;
  const failed = Boolean(state?.paused) || Boolean(state?.last_error);

  return {
    timezone: tz,
    local_date: localDate,
    paused_by_user: Boolean(pref?.paused),
    engine_paused: Boolean(state?.paused),
    engine_paused_reason: state?.paused_reason ?? null,
    shadow_mode: state?.shadow_mode !== false,
    last_run_at: state?.last_run_at ?? null,
    last_error: state?.last_error ?? null,
    next_status: pref?.paused
      ? 'paused'
      : failed
        ? 'failed'
        : schedule.some((s) => s.status === 'pending')
          ? 'pending'
          : next ? 'scheduled' : 'complete',
    next,
    schedule,
    focus_areas: sanitizeFocusAreas(pref?.focus_areas),
    styles: sanitizeStyles(pref?.reflection_styles?.length ? pref?.reflection_styles : [pref?.reflection_style]),
    delivery_frequency: Number(pref?.delivery_frequency ?? 5),
  };
}

/** Re-run the caller's most recent window and update that same row in place. */
async function regenerate(userId: string) {
  const pref = await loadPref(userId);
  if (!pref) return { ok: false, error: 'no preferences yet' };
  if (pref.paused) return { ok: false, error: 'engine paused' };

  const state = await getState();
  const shadow = state?.shadow_mode !== false;
  const tz = pref.timezone || 'UTC';
  const now = new Date();
  const localDate = localDateIn(now, tz);
  const { hour, minute } = localHourMinute(now, tz);
  const enabled = slotsForFrequency(pref.delivery_frequency ?? 5);

  const passed = elapsedSlots(hour * 60 + minute, enabled);
  const slot = dueSlot(now, tz, enabled) ?? passed[passed.length - 1] ?? enabled[0];

  const existingRes = await db(
    `growth_feed_items?user_id=eq.${userId}&local_date=eq.${localDate}&slot=eq.${slot}` +
    '&select=id,updated_at,regen_count&limit=1',
  );
  const existing = Array.isArray(existingRes.data) && existingRes.data.length ? existingRes.data[0] : null;

  if (existing) {
    const age = Date.now() - new Date(String(existing.updated_at ?? 0)).getTime();
    if (Number.isFinite(age) && age < REGEN_COOLDOWN_MS) {
      return { ok: false, error: 'Please wait a minute before regenerating again.' };
    }
    if (Number(existing.regen_count ?? 0) >= REGEN_DAILY_CAP) {
      return { ok: false, error: 'Regeneration limit reached for this window today.' };
    }
  }

  const result = await generateInsight({
    slot,
    focusAreas: sanitizeFocusAreas(pref.focus_areas),
    style: styleForSlot(
      slot,
      sanitizeStyles(pref.reflection_styles?.length ? pref.reflection_styles : [pref.reflection_style]),
    ),
    localDate,
    // A different seed each time so the vault fallback also varies.
    seed: `${userId}_${localDate}_${slot}_${Date.now()}`,
  });

  if (result.circuitBreak) {
    await patchState({
      paused: true,
      paused_reason: `${result.circuitBreak.status}: ${result.circuitBreak.message}`,
      paused_at: new Date().toISOString(),
    });
    return { ok: false, error: 'Generation is temporarily unavailable.' };
  }
  if (result.rateLimited) return { ok: false, error: 'Rate limited — try again shortly.' };

  const payload = {
    title: result.content.title,
    category: result.content.category,
    content: result.content.content,
    actionable_step: result.content.actionableStep,
    source: result.content.source,
    status: shadow ? 'shadow' : 'published',
    updated_at: new Date().toISOString(),
    correlation_id: crypto.randomUUID(),
  };

  if (existing) {
    const upd = await db(`growth_feed_items?id=eq.${existing.id}&user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...payload, regen_count: Number(existing.regen_count ?? 0) + 1 }),
    });
    return upd.ok
      ? { ok: true, slot, updated: true, source: result.content.source }
      : { ok: false, error: `db ${upd.status}` };
  }

  const ins = await db('growth_feed_items', {
    method: 'POST',
    headers: { Prefer: 'return=minimal,resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: userId, slot, local_date: localDate, ...payload }),
  });
  return ins.ok
    ? { ok: true, slot, updated: false, source: result.content.source }
    : { ok: false, error: `db ${ins.status}` };
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

    if (action === 'me-status') {
      const user = await authUser(req);
      if (!user) return json({ ok: false, error: 'sign in required' }, 401);
      return json({ ok: true, status: await meStatus(user.id) });
    }

    if (action === 'regenerate') {
      const user = await authUser(req);
      if (!user) return json({ ok: false, error: 'sign in required' }, 401);
      const started = Date.now();
      const runId = crypto.randomUUID();
      const res = await regenerate(user.id);
      await logRun({
        run_id: runId,
        action: 'regenerate',
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - started,
        processed: 1,
        written: res.ok ? 1 : 0,
        errors: res.ok ? [] : [String(res.error ?? 'unknown')],
      });
      // Always 200 so the client can read the human-readable reason.
      return json(res);
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
    const startedAt = new Date();
    if (!(await acquireLease(owner))) {
      return json({ ok: true, skipped: 'another run holds the lease' });
    }

    try {
      // While paused, at most one probe item runs so out-of-band recovery
      // (credits topped up, limit raised) is detected without spending a batch.
      const summary = await runBatch({ dryRun: false, probeOnly: paused });
      await logRun({
        run_id: owner,
        action: 'run',
        started_at: startedAt.toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt.getTime(),
        processed: summary.processed,
        written: summary.written,
        skipped: summary.skipped,
        vault: summary.vault,
        catchups: summary.catchups,
        paused: summary.paused,
        parked: summary.parked,
        shadow_mode: state?.shadow_mode !== false,
        errors: summary.errors.slice(0, 10),
      });
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
