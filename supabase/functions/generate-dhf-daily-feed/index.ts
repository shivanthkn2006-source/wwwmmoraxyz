/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GENERATE DHF DAILY FEED — the "generate once, read forever" Oracle engine.
 *
 * Actions (POST body { action }):
 *   "ensure"  — (default) make sure the caller has today's 10 cards.
 *   "status"  — how many cards exist for the caller today (no generation).
 *
 * Hardening contract:
 *   • Existence check first: if rows for (user, post_date) already exist the
 *     function RETURNS IMMEDIATELY — a page reload costs $0 in model calls.
 *   • UNIQUE(user_id, post_date, slot_time) is the idempotency key; inserts use
 *     Prefer: resolution=ignore-duplicates so a retry can never duplicate/bill twice.
 *   • Single-flight lease per (user, date) in memory + DB uniqueness at the edge.
 *   • Bounded work per invocation: exactly 10 slots, sequential, never fan-out.
 *   • Circuit breaker: 402/403 stops the run immediately and fills the rest of
 *     the day from the evergreen vault so no slot is ever empty.
 *   • Every failure path degrades to vault content — the feed never breaks.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import {
  COMPASS_SLOTS, astroContextFor, compassImageUrl, generateCompassPost,
  lifePhaseFor, referralCodeFor, referralCta, seedFrom, vaultContent,
} from '../_shared/dhf-compass.ts';
import { localDateIn } from '../_shared/astro-engine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WORKER_VERSION = '2026-08-30.1';
/** Per-isolate single-flight guard: key = `${userId}:${date}`. */
const inFlight = new Map<string, number>();
const LEASE_MS = 120_000;

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

interface ProfileRow {
  id: string;
  dob: string | null;
  birth_time: string | null;
  birth_place: string | null;
  dhf_life_phase: number | null;
  referral_code: string | null;
}

/** Load (or lazily create) the caller's DHF profile, seeding from `profiles`. */
async function ensureProfile(userId: string): Promise<ProfileRow> {
  const existing = await db(
    `user_dhf_profiles?id=eq.${userId}&select=id,dob,birth_time,birth_place,dhf_life_phase,referral_code&limit=1`,
  );
  if (Array.isArray(existing.data) && existing.data.length) {
    const row = existing.data[0] as ProfileRow;
    if (!row.referral_code) {
      await db(`user_dhf_profiles?id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ referral_code: referralCodeFor(userId) }),
      });
      row.referral_code = referralCodeFor(userId);
    }
    return row;
  }

  // Seed birth data from the existing platform profile when available.
  const src = await db(`profiles?user_id=eq.${userId}&select=birth_date,birth_time,birth_place&limit=1`);
  const seed = Array.isArray(src.data) && src.data.length ? src.data[0] : {};
  const row: Record<string, unknown> = {
    id: userId,
    dob: seed.birth_date ?? null,
    birth_time: seed.birth_time ?? null,
    birth_place: seed.birth_place ?? null,
    dhf_life_phase: lifePhaseFor(seed.birth_date ?? null),
    referral_code: referralCodeFor(userId),
  };
  const created = await db('user_dhf_profiles', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(row),
  });
  if (Array.isArray(created.data) && created.data.length) return created.data[0] as ProfileRow;
  return row as unknown as ProfileRow;
}

async function countForDate(userId: string, date: string): Promise<number> {
  const r = await db(`dhf_daily_posts?user_id=eq.${userId}&post_date=eq.${date}&select=slot_time`);
  return Array.isArray(r.data) ? r.data.length : 0;
}

function sanitizeDate(value: unknown, tz: string): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : localDateIn(new Date(), tz);
}

function sanitizeZone(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 64) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return 'UTC';
  }
}

async function generateDay(profile: ProfileRow, date: string) {
  const code = profile.referral_code || referralCodeFor(profile.id);
  const phase = profile.dhf_life_phase ?? lifePhaseFor(profile.dob);
  const astro = astroContextFor(profile.dob, profile.birth_time, new Date(`${date}T12:00:00Z`));
  const cta = referralCta(code);

  const rows: Record<string, unknown>[] = [];
  let breaker: { status: number; message: string } | null = null;
  let rateLimited = 0;
  let vaultUsed = 0;

  for (let i = 0; i < COMPASS_SLOTS.length; i++) {
    const slot = COMPASS_SLOTS[i];
    const seed = seedFrom(`${profile.id}:${date}:${slot.time}`);
    let result;
    if (breaker) {
      result = { content: vaultContent(i) };
    } else {
      result = await generateCompassPost({
        slotIndex: i,
        postDate: date,
        astro,
        lifePhase: phase,
        birthPlace: profile.birth_place,
        seed,
      });
      if (result.circuitBreak) breaker = result.circuitBreak;
      if (result.rateLimited) rateLimited++;
    }
    if (result.content.source === 'vault') vaultUsed++;

    rows.push({
      user_id: profile.id,
      post_date: date,
      slot_time: slot.time,
      category: result.content.category,
      headline: result.content.headline,
      short_summary: result.content.shortSummary,
      full_story_content: result.content.fullStory,
      image_url: compassImageUrl(result.content.headline, i, seed),
      referral_cta: cta,
      astrological_context: astro.summary.slice(0, 400),
      source: result.content.source,
    });
  }

  // Single batch insert. Duplicates (a concurrent run) are ignored, never billed twice.
  const insert = await db('dhf_daily_posts', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });

  return {
    inserted: insert.ok ? rows.length : 0,
    insertError: insert.ok ? null : `db ${insert.status}`,
    vaultUsed,
    rateLimited,
    circuitBreak: breaker,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify({ worker: WORKER_VERSION, ...(body as object) }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const user = await authUser(req);
    if (!user) return json({ error: 'unauthorized' }, 401);

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    const tz = sanitizeZone(body.timezone);
    const date = sanitizeDate(body.date, tz);
    const action = body.action === 'status' ? 'status' : 'ensure';

    const existing = await countForDate(user.id, date);
    if (action === 'status') return json({ ok: true, date, existing, complete: existing >= COMPASS_SLOTS.length });

    // Zero token bleed: any existing coverage short-circuits the whole pipeline.
    if (existing >= COMPASS_SLOTS.length) {
      return json({ ok: true, date, existing, generated: 0, cached: true });
    }

    const key = `${user.id}:${date}`;
    const lease = inFlight.get(key);
    if (lease && Date.now() - lease < LEASE_MS) {
      return json({ ok: true, date, existing, generated: 0, inFlight: true });
    }
    inFlight.set(key, Date.now());

    try {
      const profile = await ensureProfile(user.id);
      const result = await generateDay(profile, date);
      const after = await countForDate(user.id, date);
      return json({
        ok: true,
        date,
        existing: after,
        generated: result.inserted,
        vaultUsed: result.vaultUsed,
        rateLimited: result.rateLimited,
        paused: Boolean(result.circuitBreak),
        error: result.insertError,
      });
    } finally {
      inFlight.delete(key);
    }
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
