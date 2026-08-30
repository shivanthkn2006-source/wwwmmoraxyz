/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DHF DAILY COMPASS RUNNER — the single generation path used by every caller.
 *
 * Used by:
 *   • generate-dhf-daily-feed  (member "ensure", admin backfill/regenerate)
 *   • dhf-compass-dispatch     (cron pre-warm, no login required)
 *
 * Guarantees:
 *   • Read-first: existing coverage short-circuits before any model call.
 *   • UNIQUE(user_id, post_date, slot_time) + ignore-duplicates inserts, so a
 *     retry or a concurrent run can never bill twice.
 *   • Durable images: every Pollinations frame is copied into our own private
 *     `dhf-compass` bucket; the third-party URL is only a fallback.
 *   • Structured logging: one `dhf_generation_runs` row per invocation with
 *     cache hits, fallback counts, image failures and duration.
 *   • Never throws — failures degrade to the evergreen vault.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import {
  COMPASS_SLOTS, astroContextFor, compassImageUrl, generateCompassPost,
  lifePhaseFor, referralCodeFor, referralCta, seedFrom, vaultContent,
} from './dhf-compass.ts';

export const COMPASS_WORKER_VERSION = '2026-08-30.2';
export const COMPASS_BUCKET = 'dhf-compass';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Per-isolate single-flight guard: key = `${userId}:${date}`. */
const inFlight = new Map<string, number>();
const LEASE_MS = 120_000;

export async function db(path: string, init: RequestInit = {}) {
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

export interface ProfileRow {
  id: string;
  dob: string | null;
  birth_time: string | null;
  birth_place: string | null;
  dhf_life_phase: number | null;
  referral_code: string | null;
}

export async function ensureProfile(userId: string): Promise<ProfileRow> {
  const existing = await db(
    `user_dhf_profiles?id=eq.${userId}&select=id,dob,birth_time,birth_place,dhf_life_phase,referral_code&limit=1`,
  );
  if (Array.isArray(existing.data) && existing.data.length) {
    const row = existing.data[0] as ProfileRow;
    if (!row.referral_code) {
      row.referral_code = referralCodeFor(userId);
      await db(`user_dhf_profiles?id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ referral_code: row.referral_code }),
      });
    }
    return row;
  }

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

export async function slotsForDate(userId: string, date: string): Promise<Set<string>> {
  const r = await db(`dhf_daily_posts?user_id=eq.${userId}&post_date=eq.${date}&select=slot_time`);
  const rows = Array.isArray(r.data) ? (r.data as { slot_time: string }[]) : [];
  return new Set(rows.map((row) => String(row.slot_time).slice(0, 8)));
}

export async function countForDate(userId: string, date: string): Promise<number> {
  return (await slotsForDate(userId, date)).size;
}


/**
 * Copy a generated frame into our own bucket so the card never depends on a
 * third-party URL staying alive. Returns the storage path, or null on failure
 * (the caller then keeps the remote URL — the card still renders).
 */
async function storeImage(userId: string, date: string, slotTime: string, remoteUrl: string): Promise<string | null> {
  const path = `${userId}/${date}/${slotTime.replace(/:/g, '-')}.jpg`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    const img = await fetch(remoteUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!img.ok) return null;
    const bytes = new Uint8Array(await img.arrayBuffer());
    if (bytes.byteLength < 1024) return null;

    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${COMPASS_BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': img.headers.get('content-type') || 'image/jpeg',
        'x-upsert': 'true',
        'Cache-Control': '31536000',
      },
      body: bytes,
    });
    return up.ok ? path : null;
  } catch {
    return null;
  }
}

export interface RunOptions {
  userId: string;
  date: string;
  trigger: 'client' | 'cron' | 'admin';
  action?: 'ensure' | 'backfill' | 'regenerate';
  /** Regenerate deletes the day first — only ever reachable through an admin call. */
  regenerate?: boolean;
}

export interface RunResult {
  ok: boolean;
  date: string;
  existing: number;
  generated: number;
  cached: boolean;
  inFlight?: boolean;
  vaultUsed: number;
  rateLimited: number;
  imagesStored: number;
  imageFailures: number;
  paused: boolean;
  error: string | null;
}

async function logRun(options: RunOptions, result: RunResult, durationMs: number, breakStatus: number | null) {
  try {
    await db('dhf_generation_runs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: options.userId,
        post_date: options.date,
        trigger: options.trigger,
        action: options.action ?? 'ensure',
        worker_version: COMPASS_WORKER_VERSION,
        cache_hit: result.cached,
        slots_existing: result.existing,
        slots_generated: result.generated,
        vault_used: result.vaultUsed,
        rate_limited: result.rateLimited,
        images_stored: result.imagesStored,
        image_failures: result.imageFailures,
        circuit_break_status: breakStatus,
        duration_ms: Math.round(durationMs),
        error: result.error,
      }),
    });
  } catch { /* logging must never break generation */ }
}

/** Generate exactly one member-day. Never throws. */
export async function ensureDayForUser(options: RunOptions): Promise<RunResult> {
  const started = Date.now();
  const { userId, date } = options;
  const base: RunResult = {
    ok: true, date, existing: 0, generated: 0, cached: false,
    vaultUsed: 0, rateLimited: 0, imagesStored: 0, imageFailures: 0,
    paused: false, error: null,
  };

  try {
    if (options.regenerate) {
      await db(`dhf_daily_posts?user_id=eq.${userId}&post_date=eq.${date}`, { method: 'DELETE' });
    }

    const existing = await countForDate(userId, date);
    if (!options.regenerate && existing >= COMPASS_SLOTS.length) {
      const result = { ...base, existing, cached: true };
      await logRun(options, result, Date.now() - started, null);
      return result;
    }

    const key = `${userId}:${date}`;
    const lease = inFlight.get(key);
    if (lease && Date.now() - lease < LEASE_MS) {
      return { ...base, existing, inFlight: true };
    }
    inFlight.set(key, Date.now());

    try {
      const profile = await ensureProfile(userId);
      const code = profile.referral_code || referralCodeFor(userId);
      const phase = profile.dhf_life_phase ?? lifePhaseFor(profile.dob);
      const astro = astroContextFor(profile.dob, profile.birth_time, new Date(`${date}T12:00:00Z`));
      const cta = referralCta(code);

      const rows: Record<string, unknown>[] = [];
      let breaker: { status: number; message: string } | null = null;
      let vaultUsed = 0;
      let rateLimited = 0;
      let imagesStored = 0;
      let imageFailures = 0;

      for (let i = 0; i < COMPASS_SLOTS.length; i++) {
        const slot = COMPASS_SLOTS[i];
        const seed = seedFrom(`${userId}:${date}:${slot.time}`);
        const result = breaker
          ? { content: vaultContent(i) }
          : await generateCompassPost({
            slotIndex: i, postDate: date, astro, lifePhase: phase,
            birthPlace: profile.birth_place, seed,
          });
        if ('circuitBreak' in result && result.circuitBreak) breaker = result.circuitBreak;
        if ('rateLimited' in result && result.rateLimited) rateLimited++;
        if (result.content.source === 'vault') vaultUsed++;

        const remoteUrl = compassImageUrl(result.content.headline, i, seed);
        const path = await storeImage(userId, date, slot.time, remoteUrl);
        if (path) imagesStored++; else imageFailures++;

        rows.push({
          user_id: userId,
          post_date: date,
          slot_time: slot.time,
          category: result.content.category,
          headline: result.content.headline,
          short_summary: result.content.shortSummary,
          full_story_content: result.content.fullStory,
          image_url: remoteUrl,
          image_path: path,
          image_source: path ? 'storage' : 'remote',
          referral_cta: cta,
          astrological_context: astro.summary.slice(0, 400),
          source: result.content.source,
        });
      }

      const insert = await db('dhf_daily_posts', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      });

      const after = await countForDate(userId, date);
      const result: RunResult = {
        ok: insert.ok,
        date,
        existing: after,
        generated: insert.ok ? rows.length : 0,
        cached: false,
        vaultUsed,
        rateLimited,
        imagesStored,
        imageFailures,
        paused: Boolean(breaker),
        error: insert.ok ? null : `db ${insert.status}`,
      };
      await logRun(options, result, Date.now() - started, breaker?.status ?? null);
      return result;
    } finally {
      inFlight.delete(key);
    }
  } catch (e) {
    const result = { ...base, ok: false, error: String((e as Error)?.message ?? e).slice(0, 300) };
    await logRun(options, result, Date.now() - started, null);
    return result;
  }
}

export { COMPASS_SLOTS };
