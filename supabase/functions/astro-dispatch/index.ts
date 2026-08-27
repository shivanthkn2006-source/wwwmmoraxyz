/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ASTRO DISPATCH — M'Mora Zoe daily alignment engine (fully sandboxed)
 *
 * Actions (POST body { action }):
 *   "run"     — bounded batch dispatch. Called by pg_cron every 15 minutes.
 *   "preview" — dry run for the admin harness. Writes nothing.
 *   "status"  — returns dispatch state (admin harness health panel).
 *   "resume"  — clears a 402/403 pause (admin only).
 *
 * Hardening implemented here:
 *   • bounded batch (MAX_USERS_PER_RUN) — never unbounded fan-out
 *   • single-flight DB lease with expiry — concurrent runs exit immediately
 *   • idempotency key {user}_{date}_{slot} enforced by a UNIQUE constraint
 *   • circuit breaker: 402/403 pauses the engine, repeated 429 parks the run
 *   • paused-state guard at entry, with a single probe item per run
 *   • evergreen fallback vault — a slot never publishes empty
 *   • shadow mode — rows are written with status 'shadow' and not published
 *   • strict UTC math; local slot windows resolved per member timezone
 * ═══════════════════════════════════════════════════════════════════════════
 */
import {
  julianDay, calculateTransits, zonedTimeToUtc, localDateIn, localHourMinute,
} from '../_shared/astro-engine.ts';
import {
  SLOT_LOCAL_TIME, generatePrediction, renderPoster, pickFallback, type Slot,
} from '../_shared/astro-content.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_USERS_PER_RUN = 25;
const LEASE_MS = 4 * 60_000;
const SLOT_WINDOW_MIN = 75;      // a slot stays claimable this long after its local time
const RATE_LIMIT_PARK = 3;       // consecutive 429s before parking the run
const SLOTS: Slot[] = ['morning', 'noon', 'evening', 'night'];

// ───────────────────────── tiny PostgREST helper ─────────────────────────
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
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { ok: res.ok, status: res.status, data: json };
}

async function getState() {
  const r = await db('astro_dispatch_state?id=eq.singleton&select=*');
  if (Array.isArray(r.data) && r.data.length) return r.data[0];
  const created = await db('astro_dispatch_state', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify({ id: 'singleton' }),
  });
  return Array.isArray(created.data) ? created.data[0] : { id: 'singleton', shadow_mode: true, paused: false };
}

async function patchState(patch: Record<string, unknown>) {
  await db('astro_dispatch_state?id=eq.singleton', {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

/** Single-flight: only succeeds when no live lease exists. */
async function acquireLease(owner: string): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const expires = new Date(Date.now() + LEASE_MS).toISOString();
  const r = await db(
    `astro_dispatch_state?id=eq.singleton&or=(lease_expires_at.is.null,lease_expires_at.lt.${encodeURIComponent(nowIso)})`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ lease_owner: owner, lease_expires_at: expires }),
    },
  );
  if (!r.ok) return false;
  if (Array.isArray(r.data) && r.data.length > 0) return r.data[0].lease_owner === owner;
  // Some PostgREST configs answer with an empty body — confirm by re-reading.
  const check = await db('astro_dispatch_state?id=eq.singleton&select=lease_owner');
  return Array.isArray(check.data) && check.data[0]?.lease_owner === owner;
}

async function releaseLease(summary: Record<string, unknown>) {
  await patchState({
    lease_owner: null,
    lease_expires_at: null,
    last_run_at: new Date().toISOString(),
    last_run_summary: summary,
  });
}

/** Append this run to the dashboard's run history (best effort — never throws). */
async function logRun(summary: Record<string, unknown>, results: unknown[], error: string | null) {
  try {
    await db('astro_dispatch_runs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        engine: 'astro-dispatch',
        finished_at: new Date().toISOString(),
        summary,
        results: (results ?? []).slice(0, 50),
        failed_count: (results as any[] ?? []).filter((r) => r?.status === 'failed').length,
        error,
      }),
    });
  } catch { /* history is diagnostic only */ }
}

// ───────────────────── missing-morning alert fan-out ─────────────────────
interface AffectedMember {
  user_id: string;
  target_date: string;
  timezone: string;
  missing_slots: string[];
}

/** Human-readable alert body shared by Slack and email. */
function alertLines(a: {
  correlationId: string;
  auditRunId: string;
  affected: AffectedMember[];
  summary: Record<string, unknown>;
}) {
  const rows = a.affected
    .slice(0, 50)
    .map((m) => `• ${m.user_id} — ${m.target_date} (${m.timezone}) — missing: ${(m.missing_slots ?? []).join(', ') || 'morning'}`);
  return [
    `*Astro audit alert — ${a.affected.length} member(s) with no morning prompt*`,
    `audit_run_id: \`${a.auditRunId}\``,
    `correlation_id: \`${a.correlationId}\``,
    `members: ${a.summary.members} · missing morning: ${a.summary.missing_morning} · with gaps: ${a.summary.members_with_gaps}`,
    '',
    ...rows,
    a.affected.length > 50 ? `…and ${a.affected.length - 50} more` : '',
  ].filter(Boolean).join('\n');
}

/** Slack via incoming webhook or the Lovable connector gateway. Never throws. */
async function notifySlack(text: string): Promise<{ sent: boolean; via?: string; error?: string }> {
  const webhook = Deno.env.get('ASTRO_ALERT_SLACK_WEBHOOK_URL');
  try {
    if (webhook) {
      const r = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) return { sent: false, via: 'webhook', error: `${r.status}: ${(await r.text()).slice(0, 200)}` };
      return { sent: true, via: 'webhook' };
    }
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const slackKey = Deno.env.get('SLACK_API_KEY');
    const channel = Deno.env.get('ASTRO_ALERT_SLACK_CHANNEL');
    if (!lovableKey || !slackKey || !channel) return { sent: false, error: 'slack not configured' };
    const r = await fetch('https://connector-gateway.lovable.dev/slack/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': slackKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, text, mrkdwn: true }),
    });
    const body = await r.text();
    let parsed: any = null;
    try { parsed = JSON.parse(body); } catch { /* non-JSON */ }
    if (!r.ok || parsed?.ok === false) {
      return { sent: false, via: 'gateway', error: `${r.status}: ${(parsed?.error ?? body).toString().slice(0, 200)}` };
    }
    return { sent: true, via: 'gateway' };
  } catch (e) {
    return { sent: false, error: String((e as Error)?.message ?? e).slice(0, 200) };
  }
}

/** Email via Resend. Never throws. */
async function notifyEmail(subject: string, text: string): Promise<{ sent: boolean; error?: string }> {
  const key = Deno.env.get('RESEND_API_KEY');
  const to = (Deno.env.get('ASTRO_ALERT_EMAIL_TO') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const from = Deno.env.get('ASTRO_ALERT_EMAIL_FROM') ?? 'alerts@resend.dev';
  if (!key || !to.length) return { sent: false, error: 'email not configured' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject,
        text,
        html: `<pre style="font-family:ui-monospace,monospace;font-size:13px">${
          text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
        }</pre>`,
      }),
    });
    if (!r.ok) return { sent: false, error: `${r.status}: ${(await r.text()).slice(0, 200)}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: String((e as Error)?.message ?? e).slice(0, 200) };
  }
}


// ───────────────────────── slot resolution ─────────────────────────
/** Which slot is currently due for this member's local clock, if any. */
function dueSlot(now: Date, timeZone: string): Slot | null {
  const { hour, minute } = localHourMinute(now, timeZone);
  const nowMin = hour * 60 + minute;
  let best: Slot | null = null;
  let bestAge = Infinity;
  for (const slot of SLOTS) {
    const s = SLOT_LOCAL_TIME[slot];
    const slotMin = s.hour * 60 + s.minute;
    let age = nowMin - slotMin;
    if (age < 0) age += 1440;               // wrap past midnight
    if (age <= SLOT_WINDOW_MIN && age < bestAge) { best = slot; bestAge = age; }
  }
  return best;
}

// ───────────────── retry + delivery-attempt bookkeeping ─────────────────
type DeliveryResult = { sent: boolean; via?: string; error?: string };

const RETRY_MAX_ATTEMPTS = 4;
const RETRY_BASE_MS = 400;
const RETRY_MAX_DELAY_MS = 8_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pull the HTTP status out of an "`503: body`"-shaped error string. */
function statusFromError(error?: string): number | null {
  const m = /^(\d{3})\b/.exec(error ?? '');
  return m ? Number(m[1]) : null;
}

/**
 * Configuration errors and 4xx client errors are permanent — retrying them
 * only burns time. Everything else (network blips, 429, 5xx) is transient.
 */
function isRetryable(result: DeliveryResult): boolean {
  if (result.sent) return false;
  const err = (result.error ?? '').toLowerCase();
  if (err.includes('not configured')) return false;
  const status = statusFromError(result.error);
  if (status === null) return true;                 // network / unknown → retry
  if (status === 408 || status === 429) return true;
  return status >= 500;
}

/** Exponential backoff with full jitter, capped. */
function backoffDelay(attempt: number): number {
  const exp = Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
  return Math.round(exp / 2 + Math.random() * (exp / 2));
}

interface AttemptContext {
  auditRunId: string;
  correlationId: string;
  source: string;
  subject: string;
}

/** Persist one delivery attempt. Never throws — bookkeeping is diagnostic. */
async function recordAttempt(row: Record<string, unknown>) {
  try {
    await db('notification_attempts', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
  } catch { /* diagnostic only */ }
}

/**
 * Runs a delivery with bounded exponential backoff, recording every attempt
 * (success or failure) against the audit run so transient errors are visible
 * and never silently swallow an alert.
 */
async function deliverWithRetry(
  channel: 'slack' | 'email',
  ctx: AttemptContext,
  send: () => Promise<DeliveryResult>,
): Promise<DeliveryResult & { attempts: number }> {
  let last: DeliveryResult = { sent: false, error: 'not attempted' };

  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    const startedAt = Date.now();
    try {
      last = await send();
    } catch (e) {
      last = { sent: false, error: String((e as Error)?.message ?? e).slice(0, 200) };
    }
    const durationMs = Date.now() - startedAt;

    await recordAttempt({
      audit_run_id: ctx.auditRunId,
      correlation_id: ctx.correlationId,
      channel,
      attempt,
      max_attempts: RETRY_MAX_ATTEMPTS,
      succeeded: last.sent,
      transport: last.via ?? null,
      error: last.sent ? null : (last.error ?? null),
      http_status: statusFromError(last.error),
      duration_ms: durationMs,
      subject: ctx.subject,
      source: ctx.source,
      metadata: { retryable: isRetryable(last) },
    });

    if (last.sent || !isRetryable(last) || attempt === RETRY_MAX_ATTEMPTS) {
      return { ...last, attempts: attempt };
    }
    await sleep(backoffDelay(attempt));
  }

  return { ...last, attempts: RETRY_MAX_ATTEMPTS };
}


interface ProfileRow {
  user_id: string;
  birth_date: string;
  birth_time: string;
  birth_timezone: string;
  display_timezone: string;
}

interface ItemResult {
  user_id: string;
  slot: Slot | null;
  status: 'published' | 'shadow' | 'fallback' | 'skipped' | 'duplicate' | 'failed';
  note?: string;
}

/** Process one member for one slot. Never throws. */
async function processOne(
  profile: ProfileRow,
  slot: Slot,
  targetDate: string,
  shadowMode: boolean,
  now: Date,
): Promise<{ result: ItemResult; circuitBreak?: { status: number; message: string }; rateLimited?: boolean }> {
  const idempotencyKey = `${profile.user_id}_${targetDate}_${slot}`;

  // 1) Idempotency claim FIRST — a retry or a stuttering cron can never double post.
  const claim = await db('astro_predictions', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: profile.user_id,
      target_date: targetDate,
      slot,
      idempotency_key: idempotencyKey,
      prediction_headline: 'pending',
      prediction_body: 'pending',
      motivational_quote: 'pending',
      status: shadowMode ? 'shadow' : 'published',
    }),
  });
  if (!claim.ok) {
    const dup = claim.status === 409 || String(claim.data?.code) === '23505';
    return { result: { user_id: profile.user_id, slot, status: dup ? 'duplicate' : 'failed', note: dup ? undefined : JSON.stringify(claim.data).slice(0, 200) } };
  }
  const predictionId = claim.data?.[0]?.id as string;

  // 2) Deterministic astronomy (UTC only).
  let transits: any[] = [];
  let astroNote: string | undefined;
  try {
    const tz = profile.birth_timezone || 'UTC';
    const natalUtc = zonedTimeToUtc(profile.birth_date, (profile.birth_time || '12:00:00').slice(0, 8), tz);
    transits = calculateTransits(julianDay(natalUtc), julianDay(now));
  } catch (e) {
    astroNote = `ephemeris: ${String((e as Error)?.message ?? e)}`;
  }

  // 3) Latest mood (optional).
  const moodRes = await db(
    `astro_mood_logs?user_id=eq.${profile.user_id}&select=mood_mode,intensity&order=logged_at.desc&limit=1`,
  );
  const mood = moodRes.data?.[0] ?? { mood_mode: 'Balanced', intensity: 3 };

  // 4) Guarded generation with the evergreen vault behind it.
  const gen = transits.length
    ? await generatePrediction({
        slot, transits, mood: mood.mood_mode, intensity: mood.intensity,
        localDate: targetDate, seed: idempotencyKey,
      })
    : { content: pickFallback(slot, idempotencyKey), error: astroNote ?? 'no transits' };

  // 5) Poster (Pollinations, with retries — bytes are persisted to storage).
  const poster = await renderPoster({
    slot, headline: gen.content.headline, userId: profile.user_id,
    storagePath: `${profile.user_id}/${targetDate}_${slot}.jpg`,
    supabaseUrl: SUPABASE_URL, serviceKey: SERVICE_KEY,
  });
  const posterPath = poster.path;

  const finalStatus = shadowMode ? 'shadow' : gen.content.source === 'fallback' ? 'fallback' : 'published';

  await db(`astro_predictions?id=eq.${predictionId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      transits_summary: transits.slice(0, 5),
      prediction_headline: gen.content.headline,
      prediction_body: gen.content.body,
      motivational_quote: gen.content.quote,
      poster_image_url: posterPath,
      status: finalStatus,
      image_prompt: poster.prompt,
      image_provider: poster.provider,
      image_status: poster.status,
      image_attempts: poster.attempts,
      image_retries: poster.retries,
      image_cost_usd: poster.costUsd,
      image_attempt_log: poster.log,
      engine_notes: {
        source: gen.content.source,
        error: (gen as any).error ?? astroNote ?? null,
        poster: posterPath ? 'stored' : 'unavailable',
        transit_count: transits.length,
      },
    }),
  });


  // 6) Publish the feed card (skipped entirely in shadow mode).
  if (!shadowMode) {
    await db('astro_feed_posts', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: profile.user_id,
        prediction_id: predictionId,
        slot,
        content_text: `${gen.content.headline}\n\n${gen.content.body}\n\n"${gen.content.quote}"`,
        media_url: posterPath,
        is_public: false,
        publish_at: now.toISOString(),
      }),
    });
  }

  return {
    result: { user_id: profile.user_id, slot, status: finalStatus as ItemResult['status'], note: (gen as any).error ?? undefined },
    circuitBreak: (gen as any).circuitBreak,
    rateLimited: (gen as any).rateLimited,
  };
}

// ───────────────────────── handler ─────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let body: any = {};
  try { body = await req.json(); } catch { /* cron may post an empty body */ }
  const action: string = body.action ?? 'run';
  // Correlation id: supplied by the client for an operation it started, else
  // minted here. Every log line of this invocation carries it, so client
  // traces and server logs for one audit/dispatch run join on a single key.
  const correlationId: string = String(body.correlationId ?? `srv_${crypto.randomUUID().slice(0, 12)}`);
  const now = body.simulateNow ? new Date(body.simulateNow) : new Date();

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'engine not configured' }, 500);

  // ── status ──
  if (action === 'status') {
    const state = await getState();
    return json({ ok: true, state });
  }

  // ── resume ──
  if (action === 'resume') {
    await patchState({ paused: false, pause_reason: null, consecutive_rate_limits: 0 });
    return json({ ok: true, resumed: true });
  }

  // ── preview (dry run, writes nothing) ──
  if (action === 'preview') {
    const tz = body.timezone || 'UTC';
    const slot: Slot = SLOTS.includes(body.slot) ? body.slot : 'morning';
    try {
      const natalUtc = zonedTimeToUtc(
        body.birth_date ?? '1990-01-01',
        (body.birth_time ?? '12:00:00').slice(0, 8),
        body.birth_timezone ?? tz,
      );
      const transits = calculateTransits(julianDay(natalUtc), julianDay(now));
      const gen = await generatePrediction({
        slot, transits, mood: body.mood ?? 'Balanced', intensity: body.intensity ?? 3,
        localDate: localDateIn(now, tz), seed: `preview_${slot}_${localDateIn(now, tz)}`,
      });
      return json({
        ok: true,
        dry_run: true,
        slot,
        target_date: localDateIn(now, tz),
        transits: transits.slice(0, 5),
        transit_count: transits.length,
        content: gen.content,
        diagnostics: { error: (gen as any).error ?? null, circuitBreak: (gen as any).circuitBreak ?? null },
      });
    } catch (e) {
      return json({ ok: false, error: String((e as Error)?.message ?? e) }, 200);
    }
  }

  // ── audit (read-only end-to-end check across every member) ──
  // For each enabled member: resolve their stored timezone, their local date,
  // the slots that should already have fired today, and compare against the
  // rows actually written. Flags missing morning prompts explicitly.
  if (action === 'audit') {
    const auditRunId: string = String(body.auditRunId ?? `aud_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`);
    const source: string = String(body.source ?? 'manual');
    const profRes = await db(
      'astro_profiles?is_enabled=eq.true&select=user_id,display_timezone,birth_timezone&limit=500',
    );
    const profiles: ProfileRow[] = Array.isArray(profRes.data) ? profRes.data : [];
    const members: unknown[] = [];
    let missingMorning = 0;
    let missingAny = 0;

    for (const p of profiles) {
      const tz = p.display_timezone || p.birth_timezone || 'UTC';
      const localDate = localDateIn(now, tz);
      const { hour, minute } = localHourMinute(now, tz);
      const nowMin = hour * 60 + minute;
      const expected = SLOTS.filter((s) => nowMin >= SLOT_LOCAL_TIME[s].hour * 60 + SLOT_LOCAL_TIME[s].minute);

      const rowsRes = await db(
        `astro_predictions?user_id=eq.${p.user_id}&target_date=eq.${localDate}&select=id,slot,status,created_at&order=created_at.desc`,
      );
      const rows: Array<{ id: string; slot: string; status: string }> = Array.isArray(rowsRes.data) ? rowsRes.data : [];
      const present = new Set(rows.map((r) => r.slot));
      const missing = expected.filter((s) => !present.has(s));
      const morningMissing = expected.includes('morning') && !present.has('morning');
      if (morningMissing) missingMorning++;
      if (missing.length) missingAny++;

      const entry = {
        correlation_id: correlationId,
        audit_run_id: auditRunId,
        user_id: p.user_id,
        timezone: tz,
        local_time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        target_date: localDate,
        current_slot: dueSlot(now, tz) ?? expected[expected.length - 1] ?? null,
        expected_slots: expected,
        present_slots: [...present],
        missing_slots: missing,
        missing_morning: morningMissing,
        rows: rows.map((r) => ({ id: r.id, slot: r.slot, status: r.status })),
      };
      console.log('[astro-audit]', JSON.stringify({ correlation_id: correlationId, audit_run_id: auditRunId, ...entry }));
      members.push(entry);
    }

    const summary = {
      at: now.toISOString(),
      correlation_id: correlationId,
      audit_run_id: auditRunId,
      source,
      members: profiles.length,
      missing_morning: missingMorning,
      members_with_gaps: missingAny,
    };
    console.log('[astro-audit:summary]', JSON.stringify(summary));

    // Automatic alert: a missing morning prompt means a member started their
    // day with no alignment card, so it is raised as a platform error event
    // (visible to the ops dashboards) and pushed to Slack + email with the
    // affected members, their local dates and the correlation id.
    const notifications: Record<string, unknown> = {};
    if (missingMorning > 0) {
      const affected = (members as Array<Record<string, unknown>>)
        .filter((m) => m.missing_morning)
        .map((m) => ({
          user_id: String(m.user_id),
          target_date: String(m.target_date),
          timezone: String(m.timezone),
          missing_slots: (m.missing_slots as string[]) ?? [],
        }));
      const alert = {
        error_type: 'astro_missing_morning_prompt',
        severity: 'critical',
        source: `astro-dispatch:audit:${source}`,
        message: `${missingMorning} member(s) have no morning alignment prompt for their local date`,
        metadata: { correlation_id: correlationId, audit_run_id: auditRunId, summary, affected: affected.slice(0, 100) },
      };
      console.error('[astro-audit:alert]', JSON.stringify(alert));
      await db('platform_error_events', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(alert),
      });
      await logRun({ ...summary, alert: 'missing_morning' }, affected, alert.message);

      const text = alertLines({ correlationId, auditRunId, affected, summary });
      const subject = `[M'Mora] ${missingMorning} member(s) missing a morning prompt`;
      const attemptCtx = { auditRunId, correlationId, source: `astro-dispatch:audit:${source}`, subject };
      const [slack, email] = await Promise.all([
        deliverWithRetry('slack', attemptCtx, () => notifySlack(text)),
        deliverWithRetry('email', attemptCtx, () => notifyEmail(subject, text)),
      ]);
      notifications.slack = slack;
      notifications.email = email;
      console.log('[astro-audit:notify]', JSON.stringify({ correlation_id: correlationId, audit_run_id: auditRunId, slack, email }));
    }

    // Persist the run so the dashboard can default to the latest report and
    // diff it against the previous one.
    await db('astro_audit_runs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        audit_run_id: auditRunId,
        correlation_id: correlationId,
        source,
        members_count: profiles.length,
        missing_morning: missingMorning,
        members_with_gaps: missingAny,
        summary,
        members: (members as unknown[]).slice(0, 500),
        notifications,
      }),
    });

    return json({ ok: true, audit: true, correlation_id: correlationId, audit_run_id: auditRunId, summary, members, notifications });
  }





  // ── run ──
  const state = await getState();
  const owner = crypto.randomUUID();

  // Paused guard: at most one probe item per run, no full workload.
  const probeOnly = !!state.paused && !body.force;
  if (probeOnly && state.pause_reason?.startsWith('402')) {
    // still allowed one probe below
  }

  if (!(await acquireLease(owner))) {
    return json({ ok: true, skipped: 'another run holds the lease' });
  }

  const results: ItemResult[] = [];
  let circuitBreak: { status: number; message: string } | undefined;
  let rateLimitHits = 0;

  try {
    const explicitUser: string | undefined = body.userId;
    const filter = explicitUser
      ? `astro_profiles?user_id=eq.${explicitUser}&select=user_id,birth_date,birth_time,birth_timezone,display_timezone`
      : `astro_profiles?is_enabled=eq.true&select=user_id,birth_date,birth_time,birth_timezone,display_timezone&order=updated_at.asc&limit=${probeOnly ? 1 : MAX_USERS_PER_RUN}`;

    const profRes = await db(filter);
    const profiles: ProfileRow[] = Array.isArray(profRes.data) ? profRes.data : [];

    for (const p of profiles) {
      const tz = p.display_timezone || p.birth_timezone || 'UTC';
      const slot: Slot | null = SLOTS.includes(body.slot) ? body.slot : dueSlot(now, tz);
      const clock = localHourMinute(now, tz);
      if (!slot) {
        console.log('[astro-dispatch] skip', JSON.stringify({
          correlation_id: correlationId, user_id: p.user_id, timezone: tz,
          local_time: `${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}`,
          target_date: localDateIn(now, tz), reason: 'no slot due',
        }));
        results.push({ user_id: p.user_id, slot: null, status: 'skipped', note: 'no slot due' });
        continue;
      }

      const targetDate = body.targetDate ?? localDateIn(now, tz);
      console.log('[astro-dispatch] process', JSON.stringify({
        correlation_id: correlationId, user_id: p.user_id, timezone: tz,
        local_time: `${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}`,
        target_date: targetDate, slot, idempotency_key: `${p.user_id}_${targetDate}_${slot}`,
      }));
      const out = await processOne(p, slot, targetDate, !!state.shadow_mode, now);
      console.log('[astro-dispatch] result', JSON.stringify({
        correlation_id: correlationId, user_id: p.user_id, target_date: targetDate, slot, status: out.result.status, note: out.result.note ?? null,
      }));
      results.push(out.result);


      if (out.circuitBreak) { circuitBreak = out.circuitBreak; break; }
      if (out.rateLimited) {
        rateLimitHits++;
        if (rateLimitHits >= RATE_LIMIT_PARK) break;   // park until the next scheduled run
      }
      if (probeOnly) break;                            // paused: exactly one probe
    }

    if (circuitBreak) {
      await patchState({ paused: true, pause_reason: `${circuitBreak.status}: ${circuitBreak.message}` });
    } else if (probeOnly && results.some((r) => r.status === 'published' || r.status === 'shadow')) {
      await patchState({ paused: false, pause_reason: null, consecutive_rate_limits: 0 });
    }

    const summary = {
      at: now.toISOString(),
      correlation_id: correlationId,
      processed: results.length,
      published: results.filter((r) => r.status === 'published').length,
      shadow: results.filter((r) => r.status === 'shadow').length,
      fallback: results.filter((r) => r.status === 'fallback').length,
      duplicates: results.filter((r) => r.status === 'duplicate').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      paused: !!circuitBreak,
      rate_limited: rateLimitHits,
      probe_only: probeOnly,
    };
    await releaseLease(summary);
    await logRun(summary, results, null);
    return json({ ok: true, correlation_id: correlationId, summary, results });
  } catch (e) {
    const message = String((e as Error)?.message ?? e);
    await releaseLease({ at: now.toISOString(), error: message });
    await logRun({ at: now.toISOString(), processed: results.length }, results, message);
    return json({ ok: false, error: message }, 200);
  }

});
