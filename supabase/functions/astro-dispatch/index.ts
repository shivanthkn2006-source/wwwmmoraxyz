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
    `astro_dispatch_state?id=eq.singleton&or=(lease_expires_at.is.null,lease_expires_at.lt.${nowIso})`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ lease_owner: owner, lease_expires_at: expires }),
    },
  );
  return Array.isArray(r.data) && r.data.length > 0;
}

async function releaseLease(summary: Record<string, unknown>) {
  await patchState({
    lease_owner: null,
    lease_expires_at: null,
    last_run_at: new Date().toISOString(),
    last_run_summary: summary,
  });
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

  // 5) Poster (best effort — bytes are persisted to storage, never a Pollinations URL).
  const posterPath = await renderPoster({
    slot, headline: gen.content.headline, userId: profile.user_id,
    storagePath: `${profile.user_id}/${targetDate}_${slot}.jpg`,
    supabaseUrl: SUPABASE_URL, serviceKey: SERVICE_KEY,
  });

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
      if (!slot) { results.push({ user_id: p.user_id, slot: null, status: 'skipped', note: 'no slot due' }); continue; }

      const targetDate = body.targetDate ?? localDateIn(now, tz);
      const out = await processOne(p, slot, targetDate, !!state.shadow_mode, now);
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
    return json({ ok: true, summary, results });
  } catch (e) {
    await releaseLease({ at: now.toISOString(), error: String((e as Error)?.message ?? e) });
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 200);
  }
});
