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
  sanitizeFocusAreas, sanitizeStyles, styleForSlot, elapsedSlots, missingElapsedSlots,
  type GrowthSlot,
  FIGURE_HISTORY_WINDOW,
  TITLE_HISTORY_WINDOW,
} from '../_shared/growth-content.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_USERS_PER_RUN = 25;
/** Nightly reconciliation ceilings — bounded so a sweep can never run away. */
const SWEEP_MAX_USERS = 500;
const MAX_SLOTS_PER_USER = 5;
const LEASE_MS = 4 * 60_000;
const SLOT_WINDOW_MIN = 75;
const RATE_LIMIT_PARK = 3;
const REGEN_COOLDOWN_MS = 60_000;
const REGEN_DAILY_CAP = 5;
const BACKFILL_MAX_ITEMS = 200;
/** Bumped on every worker change so admin UIs can prove they hit the latest deploy. */
const WORKER_VERSION = '2026-08-28.4';
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
  last_digest_at?: string | null;
}

const PREF_SELECT =
  'user_id,focus_areas,reflection_style,reflection_styles,delivery_frequency,paused,timezone,' +
  'notify_on_new_insight,notify_push,notify_email,notify_digest,last_digest_at,onboarded_at';

async function candidates(limit: number, afterUserId?: string | null): Promise<PrefRow[]> {
  const base = 'growth_preferences?paused=eq.false&onboarded_at=not.is.null' +
    `&select=${PREF_SELECT}&order=user_id.asc&limit=${limit * 8}`;
  const first = await db(afterUserId ? `${base}&user_id=gt.${afterUserId}` : base);
  const rows: PrefRow[] = Array.isArray(first.data) ? first.data : [];
  if (rows.length > 0 || !afterUserId) return rows;
  const wrapped = await db(base);
  return Array.isArray(wrapped.data) ? wrapped.data : [];
}

/**
 * Nightly reconciliation candidate set: pages through every eligible member in
 * stable user_id order so nobody can be starved by the rotating cursor.
 */
async function allCandidates(maxUsers: number): Promise<PrefRow[]> {
  const page = 200;
  const out: PrefRow[] = [];
  let after: string | null = null;
  while (out.length < maxUsers) {
    const batch = await candidates(Math.min(page, maxUsers - out.length) / 8 || 1, after);
    if (batch.length === 0) break;
    out.push(...batch);
    const next = batch[batch.length - 1]?.user_id ?? null;
    if (!next || next === after) break;
    after = next;
  }
  return out.slice(0, maxUsers);
}

async function deliveredSlots(userId: string, localDate: string): Promise<Set<string>> {
  const r = await db(
    `growth_feed_items?user_id=eq.${userId}&local_date=eq.${localDate}&select=slot`,
  );
  return new Set(Array.isArray(r.data) ? r.data.map((x: { slot: string }) => x.slot) : []);
}

/**
 * The historical figures this member has seen most recently. Bounded by
 * FIGURE_HISTORY_WINDOW, which is deliberately smaller than the roster so the
 * candidate pool can never empty out.
 */
async function recentFigureNames(userId: string): Promise<string[]> {
  try {
    const r = await db(
      `growth_used_figures?user_id=eq.${userId}&select=figure_name` +
      `&order=created_at.desc&limit=${FIGURE_HISTORY_WINDOW}`,
    );
    return Array.isArray(r.data)
      ? r.data.map((x: { figure_name: string }) => x.figure_name).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

/**
 * Recent headlines for this member. The figure ledger cannot catch this class
 * of repetition: "Midday Focus Reset" was delivered four times to one member on
 * four different days, all non-biographical, so no figure was ever involved.
 */
async function recentTitles(userId: string): Promise<string[]> {
  try {
    const r = await db(
      `growth_feed_items?user_id=eq.${userId}&select=title` +
      `&order=created_at.desc&limit=${TITLE_HISTORY_WINDOW}`,
    );
    return Array.isArray(r.data)
      ? r.data.map((x: { title: string }) => x.title).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

/**
 * Birth date drives the "at exactly your age…" / shared-birth-month resonance.
 * Reads `birth_date`, which a database trigger keeps identical to
 * `date_of_birth`, so either onboarding path is picked up.
 */
async function birthDateFor(userId: string): Promise<string | null> {
  try {
    const r = await db(`profiles?user_id=eq.${userId}&select=birth_date&limit=1`);
    const row = Array.isArray(r.data) ? r.data[0] : null;
    const value = row?.birth_date ?? null;
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  } catch {
    return null;
  }
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

interface DeliveryResult { sent: boolean; error?: string; transport?: string }

/** Transactional email for a new insight. */
async function emailInsight(userId: string, slot: GrowthSlot, title: string, body: string): Promise<DeliveryResult> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return { sent: false, error: 'email not configured' };
  const to = await authEmail(userId);
  if (!to) return { sent: false, error: 'recipient email unavailable' };
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('GROWTH_EMAIL_FROM') ?? 'insights@resend.dev',
        to: [to],
        subject: `Your ${SLOT_LOCAL_TIME[slot].label.toLowerCase()} insight: ${String(title).slice(0, 80)}`,
        text: `${title}\n\n${String(body).slice(0, 1200)}`,
      }),
    });
    if (!response.ok) return { sent: false, error: `${response.status}: ${await response.text()}` };
    return { sent: true, transport: 'resend' };
  } catch (error) {
    return { sent: false, error: String((error as Error)?.message ?? error) };
  }
}

const NOTIFICATION_RETRY_DELAYS = [0, 400, 1_200, 3_600];

async function deliverWithRetry(
  channel: 'push' | 'email',
  subject: string,
  send: () => Promise<DeliveryResult>,
): Promise<DeliveryResult> {
  const auditRunId = crypto.randomUUID();
  let last: DeliveryResult = { sent: false, error: 'not attempted' };
  for (let index = 0; index < NOTIFICATION_RETRY_DELAYS.length; index++) {
    if (NOTIFICATION_RETRY_DELAYS[index] > 0) {
      await new Promise((resolve) => setTimeout(resolve, NOTIFICATION_RETRY_DELAYS[index]));
    }
    const started = Date.now();
    last = await send().catch((error) => ({
      sent: false,
      error: String((error as Error)?.message ?? error),
    }));
    await db('notification_attempts', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        audit_run_id: auditRunId,
        correlation_id: subject,
        channel,
        attempt: index + 1,
        max_attempts: NOTIFICATION_RETRY_DELAYS.length,
        succeeded: last.sent,
        transport: last.transport ?? null,
        error: last.error?.slice(0, 500) ?? null,
        duration_ms: Date.now() - started,
        subject,
        source: 'growth-dispatch',
      }),
    }).catch(() => undefined);
    if (last.sent || /not configured|unavailable/i.test(last.error ?? '')) break;
  }
  return last;
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
  const previousDigestAt = pref.last_digest_at ?? null;
  let digestClaimAt: string | null = null;
  if (digest === 'daily') {
    const enabled = slotsForFrequency(pref.delivery_frequency ?? 5);
    const finalSlot = enabled[enabled.length - 1];
    if (slot !== finalSlot) return;
    // One alert per local day: compare the last digest against the user's own
    // wall-clock date, not UTC, so timezones never double- or under-notify.
    const last = pref.last_digest_at
      ? localDateIn(new Date(pref.last_digest_at), pref.timezone || 'UTC')
      : null;
    if (last === localDate) return;
    digestClaimAt = new Date().toISOString();
    const priorFilter = previousDigestAt
      ? `last_digest_at=eq.${encodeURIComponent(previousDigestAt)}`
      : 'last_digest_at=is.null';
    const claim = await db(`growth_preferences?user_id=eq.${pref.user_id}&${priorFilter}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ last_digest_at: digestClaimAt }),
    });
    if (!Array.isArray(claim.data) || claim.data.length === 0) return;

    const cards = await db(
      `growth_feed_items?user_id=eq.${pref.user_id}&local_date=eq.${localDate}` +
      '&status=eq.published&select=slot,title,content&order=created_at.asc',
    );
    const rows = Array.isArray(cards.data) ? cards.data : [];
    if (rows.length > 0) {
      title = `Your ${localDate} Growth digest`;
      body = rows.map((row: Record<string, unknown>) =>
        `${SLOT_LOCAL_TIME[String(row.slot) as GrowthSlot]?.label ?? row.slot}: ${row.title}\n${row.content}`,
      ).join('\n\n');
    }
  }

  const results: DeliveryResult[] = [];
  if (pref.notify_on_new_insight !== false && pref.notify_push !== false) {
    results.push(await deliverWithRetry(
      'push', `growth:${pref.user_id}:${localDate}:${digest === 'daily' ? 'daily' : slot}`,
      () => notifyNewInsight(pref.user_id, slot, title),
    ));
  }
  if (pref.notify_email === true) {
    results.push(await deliverWithRetry(
      'email', `growth:${pref.user_id}:${localDate}:${digest === 'daily' ? 'daily' : slot}`,
      () => emailInsight(pref.user_id, slot, title, body),
    ));
  }

  // A daily digest is complete only when at least one selected channel really
  // accepted it. Release a failed claim so the next worker run can retry.
  if (digest === 'daily' && digestClaimAt && !results.some((result) => result.sent)) {
    await db(
      `growth_preferences?user_id=eq.${pref.user_id}&last_digest_at=eq.${encodeURIComponent(digestClaimAt)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ last_digest_at: previousDigestAt }),
      },
    ).catch(() => undefined);
  }
}

/** Self-notification for a freshly published card. Best-effort only. */
async function notifyNewInsight(userId: string, slot: GrowthSlot, title: string): Promise<DeliveryResult> {
  try {
    const response = await db('notifications', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        from_user_id: userId,
        type: 'growth_insight',
        context_data: { slot, title: String(title).slice(0, 120), window: SLOT_LOCAL_TIME[slot].label },
      }),
    });
    return response.ok
      ? { sent: true, transport: 'in-app-push-queue' }
      : { sent: false, error: `${response.status}: notification queue rejected` };
  } catch (error) {
    return { sent: false, error: String((error as Error)?.message ?? error) };
  }
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

async function runBatch(opts: {
  dryRun: boolean;
  probeOnly: boolean;
  targetUserId?: string;
  /** Nightly reconciliation: page through EVERY eligible user, ignore the cursor. */
  sweep?: boolean;
  sweepCap?: number;
}): Promise<RunSummary> {
  const state = await getState();
  const shadow = state?.shadow_mode !== false;
  const summary: RunSummary = {
    processed: 0, written: 0, skipped: 0, vault: 0, catchups: 0,
    paused: false, parked: false, errors: [],
  };

  const now = new Date();
  const targetedPref = opts.targetUserId ? await loadPref(opts.targetUserId) : null;
  const rows = opts.targetUserId
    ? (targetedPref && !targetedPref.paused ? [targetedPref] : [])
    : opts.sweep
      ? await allCandidates(opts.sweepCap ?? SWEEP_MAX_USERS)
      : await candidates(MAX_USERS_PER_RUN, state?.last_candidate_user_id ?? null);
  const cap = opts.targetUserId
    ? 5
    : opts.sweep
      ? (opts.sweepCap ?? SWEEP_MAX_USERS) * MAX_SLOTS_PER_USER
      : opts.probeOnly ? 1 : MAX_USERS_PER_RUN;
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

    // Fill every elapsed missing window in chronological order in this run.
    // The global item cap and unique key keep this bounded and idempotent.
    const missing = missingElapsedSlots(hour * 60 + minute, enabled, delivered);
    if (missing.length === 0) { summary.skipped++; continue; }

    // Names this member has already been shown. Without this the model
    // converged on the same few famous people for every user, every day.
    const recentFigures = await recentFigureNames(pref.user_id);
    // Two more anti-repetition inputs, both per member: the headlines they have
    // already seen, and their birth date for genuine age/month resonance.
    const [priorTitles, birthDate] = await Promise.all([
      recentTitles(pref.user_id),
      birthDateFor(pref.user_id),
    ]);

    for (const slot of missing) {
      if (summary.processed >= cap) break;
      const isCatchup = dueSlot(now, tz, enabled) !== slot;
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
        avoidFigures: recentFigures,
        avoidTitles: priorTitles,
        birthDate,
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
        if (rateLimitStreak >= RATE_LIMIT_PARK) summary.parked = true;
        if (summary.parked) break;
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
        delivered.add(slot);
        // Later windows in this same run must also avoid the title just used.
        priorTitles.unshift(result.content.title);
        if (result.figure) {
          // Ledger write is best-effort: the card is already published, and the
          // unique key makes a retry a no-op rather than a duplicate.
          recentFigures.push(result.figure.name);
          await db('growth_used_figures', {
            method: 'POST',
            headers: { Prefer: 'return=minimal,resolution=ignore-duplicates' },
            body: JSON.stringify({
              user_id: pref.user_id,
              figure_slug: result.figure.slug,
              figure_name: result.figure.name,
              local_date: localDate,
              slot,
            }),
          }).catch(() => {});
        }
        if (!shadow) {
          await deliverInsightNotifications(
            pref, slot, localDate, result.content.title, result.content.content,
          );
        }
      } else {
        summary.errors.push(`db ${ins.status}`);
      }
    }
    if (summary.paused || summary.parked) break;
  }

  if (!opts.dryRun) {
    await patchState({
      consecutive_rate_limits: summary.parked ? rateLimitStreak : 0,
      last_run_at: new Date().toISOString(),
      last_run_processed: summary.processed,
      last_error: summary.errors[0] ?? null,
      ...(opts.targetUserId || rows.length === 0
        ? {}
        : { last_candidate_user_id: rows[rows.length - 1].user_id }),
    });
  }

  return summary;
}

interface BackfillRequest {
  fromDate: string;
  toDate: string;
  slots: GrowthSlot[];
  userIds: string[];
  maxItems: number;
  throttleMs: number;
  dryRun: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Inclusive list of ISO dates, capped so a typo cannot fan out for years. */
function dateRange(from: string, to: string, cap = 31): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = start; d <= end && out.length < cap; d = new Date(d.getTime() + 86_400_000)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function parseBackfill(body: any): { req?: BackfillRequest; error?: string } {
  const fromDate = String(body?.fromDate ?? '');
  const toDate = String(body?.toDate ?? fromDate);
  if (!DATE_RE.test(fromDate) || !DATE_RE.test(toDate)) return { error: 'fromDate/toDate must be YYYY-MM-DD' };
  if (toDate < fromDate) return { error: 'toDate must not be before fromDate' };
  if (dateRange(fromDate, toDate, 100).length > 31) return { error: 'range is limited to 31 days' };

  const rawSlots = Array.isArray(body?.slots) ? body.slots.map(String) : [];
  const slots = (rawSlots.length ? rawSlots : [...GROWTH_SLOTS])
    .filter((s: string): s is GrowthSlot => (GROWTH_SLOTS as readonly string[]).includes(s));
  if (!slots.length) return { error: 'no valid slots selected' };

  const userIds = (Array.isArray(body?.userIds) ? body.userIds.map(String) : [])
    .filter((id: string) => /^[0-9a-f-]{36}$/i.test(id))
    .slice(0, 200);

  return {
    req: {
      fromDate, toDate, slots, userIds,
      maxItems: Math.min(Math.max(Number(body?.maxItems ?? 50) || 50, 1), BACKFILL_MAX_ITEMS),
      throttleMs: Math.min(
        Math.max(Number(body?.throttleMs ?? 400) || 400, BACKFILL_MIN_THROTTLE_MS),
        BACKFILL_MAX_THROTTLE_MS,
      ),
      dryRun: body?.dryRun === true,
    },
  };
}

/**
 * Admin backfill / bulk retry. Fills ONLY missing (user, date, slot) rows — an
 * existing insight is never overwritten, so a repeated run is a safe no-op.
 * Bounded three ways: item cap, wall-clock budget, and a per-item throttle so a
 * backfill can never starve the live 15-minute dispatch of provider capacity.
 */
async function runBackfill(req: BackfillRequest, jobId: string, triggeredBy: string | null) {
  const startedAt = Date.now();
  /** Per-(user, date, slot) decision log — powers the downloadable dry-run report. */
  const plan: Array<{
    userId: string; localDate: string; slot: string; decision: string; reason: string;
  }> = [];
  const PLAN_CAP = 1000;
  const note = (userId: string, localDate: string, slot: string, decision: string, reason: string) => {
    if (plan.length < PLAN_CAP) plan.push({ userId, localDate, slot, decision, reason });
  };
  const state = await getState();
  const shadow = state?.shadow_mode !== false;
  const dates = dateRange(req.fromDate, req.toDate);
  const errors: string[] = [];
  let scanned = 0;
  let written = 0;
  let skipped = 0;

  const rows = req.userIds.length
    ? (await db(
        `growth_preferences?user_id=in.(${req.userIds.join(',')})&select=${PREF_SELECT}`,
      )).data
    : (await db(
        `growth_preferences?onboarded_at=not.is.null&select=${PREF_SELECT}&limit=${BACKFILL_MAX_ITEMS}`,
      )).data;
  const prefs: PrefRow[] = Array.isArray(rows) ? rows : [];

  outer:
  for (const pref of prefs) {
    const enabled = slotsForFrequency(pref.delivery_frequency ?? 5);
    for (const localDate of dates) {
      const delivered = await deliveredSlots(pref.user_id, localDate);
      for (const slot of req.slots) {
        if (written >= req.maxItems) break outer;
        if (Date.now() - startedAt > BACKFILL_BUDGET_MS) { errors.push('time budget reached'); break outer; }
        scanned++;
        if (!enabled.includes(slot)) {
          skipped++; note(pref.user_id, localDate, slot, 'skip', 'window not in the member frequency'); continue;
        }
        if (delivered.has(slot)) {
          skipped++; note(pref.user_id, localDate, slot, 'skip', 'insight already delivered'); continue;
        }
        if (req.dryRun) {
          written++; note(pref.user_id, localDate, slot, 'would-write', 'missing insight'); continue;
        }
        note(pref.user_id, localDate, slot, 'write', 'missing insight');

        const result = await generateInsight({
          slot,
          focusAreas: sanitizeFocusAreas(pref.focus_areas),
          style: styleForSlot(
            slot,
            sanitizeStyles(pref.reflection_styles?.length ? pref.reflection_styles : [pref.reflection_style]),
          ),
          localDate,
          seed: `${pref.user_id}_${localDate}_${slot}`,
        });
        if (result.circuitBreak) { errors.push(`circuit break ${result.circuitBreak.status}`); break outer; }
        if (result.rateLimited) { errors.push('rate limited'); skipped++; continue; }

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
            correlation_id: jobId,
          }),
        });
        if (ins.ok) written++; else { skipped++; errors.push(`db ${ins.status}`); }

        // Throttle so a backfill stays a background citizen next to live runs.
        await new Promise((r) => setTimeout(r, req.throttleMs));
      }
    }
  }

  const summary = {
    scanned, written, skipped, dates: dates.length,
    users: prefs.length, errors: errors.slice(0, 10),
    version: WORKER_VERSION,
    // Affected members / windows, so an admin can review before executing.
    plan,
    planTruncated: plan.length >= PLAN_CAP,
    affectedUsers: Array.from(new Set(plan.filter((p) => p.decision !== 'skip').map((p) => p.userId))).length,
  };
  await db('growth_backfill_jobs', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: jobId,
      created_by: triggeredBy,
      from_date: req.fromDate,
      to_date: req.toDate,
      slots: req.slots,
      user_ids: req.userIds,
      dry_run: req.dryRun,
      throttle_ms: req.throttleMs,
      max_items: req.maxItems,
      status: errors.length ? 'failed' : 'done',
      processed: scanned,
      written,
      skipped,
      errors: summary.errors,
      started_at: new Date(startedAt).toISOString(),
      finished_at: new Date().toISOString(),
    }),
  }).catch(() => undefined);

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
  let bodyJson: any = null;
  try {
    bodyJson = await req.json();
    action = String(bodyJson?.action ?? 'run');
  } catch { /* default action */ }

  try {
    if (action === 'status') {
      const state = await getState();
      return json({ ok: true, state, version: WORKER_VERSION });
    }

    if (action === 'me-status') {
      const user = await authUser(req);
      if (!user) return json({ ok: false, error: 'sign in required' }, 401);
      return json({ ok: true, status: await meStatus(user.id), version: WORKER_VERSION });
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

    if (action === 'backfill') {
      if (!(await isAdmin(req))) return json({ ok: false, error: 'admin only' }, 403);
      const { req: parsed, error } = parseBackfill(bodyJson);
      if (!parsed) return json({ ok: false, error }, 400);
      const user = await authUser(req);
      const jobId = crypto.randomUUID();
    const summary = await runBackfill(parsed, jobId, user?.id ?? null);
      await logRun({
        run_id: jobId,
        action: 'backfill',
        finished_at: new Date().toISOString(),
        processed: summary.scanned,
        written: summary.written,
        skipped: summary.skipped,
        errors: summary.errors,
      });
      return json({
        ok: true, jobId, version: WORKER_VERSION,
        window: { fromDate: parsed.fromDate, toDate: parsed.toDate, slots: parsed.slots, dryRun: parsed.dryRun },
        summary,
      });
    }

    if (action === 'backfill-jobs') {
      if (!(await isAdmin(req))) return json({ ok: false, error: 'admin only' }, 403);
      const r = await db('growth_backfill_jobs?select=*&order=created_at.desc&limit=25');
      return json({ ok: true, jobs: Array.isArray(r.data) ? r.data : [] });
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

    // Nightly reconciliation: recheck every timezone window for every eligible
    // member and fill any gap the 15-minute rotation missed. Idempotent — the
    // unique (user, local_date, slot) key makes a repeat run a no-op.
    if (action === 'reconcile') {
      const owner = crypto.randomUUID();
      const startedAt = new Date();
      if (!(await acquireLease(owner))) {
        return json({ ok: true, skipped: 'another run holds the lease', version: WORKER_VERSION });
      }
      try {
        const summary = await runBatch({ dryRun: false, probeOnly: false, sweep: true });
        await logRun({
          run_id: owner,
          action: 'reconcile',
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
          errors: summary.errors.slice(0, 10),
        });
        return json({ ok: true, summary, version: WORKER_VERSION });
      } finally {
        await releaseLease();
      }
    }

    if (action === 'catchup-me') {
      const user = await authUser(req);
      if (!user) return json({ ok: false, error: 'sign in required' }, 401);
      const owner = crypto.randomUUID();
      if (!(await acquireLease(owner))) {
        return json({ ok: true, skipped: 'another run holds the lease', version: WORKER_VERSION });
      }
      try {
        const summary = await runBatch({ dryRun: false, probeOnly: false, targetUserId: user.id });
        return json({ ok: true, summary, version: WORKER_VERSION });
      } finally {
        await releaseLease();
      }
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
