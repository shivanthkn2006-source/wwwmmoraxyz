/**
 * ZOE DAILY MOTIVATION — isolated engine, separate from the astrology engine.
 *
 * Actions:
 *   "ensure" (default) — guarantees TODAY's motivation exists for the caller.
 *                        Works for every signed-in member, birth data or not.
 *   "run"              — nightly batch: pre-generates for recently active users.
 *
 * Guarantees:
 *   • one row per user per local date (unique constraint = no duplicates)
 *   • content always present (model → evergreen vault)
 *   • image always present (Pollinations ladder → local SVG poster)
 */
import { renderImage } from '../_shared/image-engine.ts';
import {
  generateMotivation, pickMotivationFallback, themeFor, sceneFor, paletteFor,
} from '../_shared/motivation-content.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'astro-posters';
const MAX_BATCH = 50;
const GENERATION_BUDGET = 5;   // new images per run; the hourly cron finishes the rest


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
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

function localDateIn(now: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function weekdayIn(now: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
  }
}

async function ensureForUser(userId: string, tz: string, now: Date, force = false) {
  const targetDate = localDateIn(now, tz);
  const existing = await db(
    `zoe_daily_motivations?user_id=eq.${userId}&target_date=eq.${targetDate}&select=*`,
  );
  if (Array.isArray(existing.data) && existing.data.length && !force) {
    const row = existing.data[0];
    if (row.poster_path && row.image_status === 'generated') return { status: 'exists', row };

    // Row exists without real art (older run / provider outage) — re-render.
    const theme = row.theme || themeFor(targetDate, userId);
    const img = await renderImage({
      prompt: row.image_prompt || sceneFor(theme),
      storagePath: `${userId}/motivation_${targetDate}.jpg`,
      bucket: BUCKET,
      supabaseUrl: SUPABASE_URL,
      serviceKey: SERVICE_KEY,
      palette: paletteFor(theme),
    });
    if (img.path) {
      const patched = await db(`zoe_daily_motivations?id=eq.${row.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          poster_path: img.path,
          image_prompt: img.prompt,
          image_provider: img.provider,
          image_status: img.status,
          image_attempts: img.attempts,
          image_retries: (row.image_retries ?? 0) + img.retries,
          image_cost_usd: img.costUsd,
          image_attempt_log: img.log,
        }),
      });
      return { status: 'repaired', row: patched.data?.[0] ?? { ...row, poster_path: img.path }, image: img.provider };
    }
    return { status: 'exists', row };
  }

  const theme = themeFor(targetDate, userId);
  const seed = force ? `${userId}_${targetDate}_${Date.now()}` : `${userId}_${targetDate}`;
  const gen = await generateMotivation({
    theme, weekday: weekdayIn(now, tz), localDate: targetDate, seed,
  });
  const content = gen.content ?? pickMotivationFallback(seed, theme);

  const img = await renderImage({
    prompt: content.scene || sceneFor(theme),
    storagePath: `${userId}/motivation_${targetDate}${force ? `_${Date.now()}` : ''}.jpg`,
    bucket: BUCKET,
    supabaseUrl: SUPABASE_URL,
    serviceKey: SERVICE_KEY,
    palette: paletteFor(theme),
  });

  const payload = {
    user_id: userId,
    target_date: targetDate,
    theme: content.theme,
    headline: content.headline,
    body: content.body,
    action_step: content.actionStep,
    quote: content.quote,
    poster_path: img.path,
    image_prompt: img.prompt,
    image_provider: img.provider,
    image_status: img.status,
    image_attempts: img.attempts,
    image_retries: img.retries,
    image_cost_usd: img.costUsd,
    image_attempt_log: img.log,
    source: content.source,
  };

  // A forced regeneration replaces today's row in place instead of inserting.
  if (force && Array.isArray(existing.data) && existing.data.length) {
    const rowId = existing.data[0].id;
    const patched = await db(`zoe_daily_motivations?id=eq.${rowId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    return {
      status: 'regenerated',
      row: patched.data?.[0] ?? null,
      image: img.provider,
      text: content.source,
      diagnostics: gen.error ?? null,
    };
  }

  const insert = await db('zoe_daily_motivations', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(payload),
  });

  if (!insert.ok) {
    // Lost a race with a concurrent call — read the winner back.
    const again = await db(`zoe_daily_motivations?user_id=eq.${userId}&target_date=eq.${targetDate}&select=*`);
    return { status: 'duplicate', row: again.data?.[0] ?? null, image: img.provider };
  }

  return {
    status: 'created',
    row: Array.isArray(insert.data) ? insert.data[0] : insert.data,
    image: img.provider,
    text: content.source,
    diagnostics: gen.error ?? null,
  };

}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, error: 'engine not configured' }, 500);

  let body: any = {};
  try { body = await req.json(); } catch { /* cron posts empty bodies */ }
  const action = body.action ?? 'ensure';
  const now = body.simulateNow ? new Date(body.simulateNow) : new Date();

  try {
    if (action === 'run') {
      // Every account gets a profile row first — nobody is skipped because a
      // profile was never provisioned for them.
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/ensure_profiles_for_all_users`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }).catch(() => {});

      // Motivation needs no birth data — iterate every member, not just the
      // ones with an astro profile.
      const profRes = await db(
        `profiles?select=user_id&order=created_at.asc&limit=${MAX_BATCH}`,
      );
      const rows: Array<{ user_id: string }> = Array.isArray(profRes.data) ? profRes.data : [];

      // Timezone hints where we have them; UTC otherwise.
      const tzRes = await db('astro_profiles?select=user_id,display_timezone');
      const tzMap = new Map<string, string>(
        (Array.isArray(tzRes.data) ? tzRes.data : []).map((r: any) => [r.user_id, r.display_timezone || 'UTC']),
      );

      const out: any[] = [];
      let generated = 0;
      for (const p of rows) {
        // Bounded generation budget per run — the hourly cron picks up the rest.
        if (generated >= GENERATION_BUDGET) {
          out.push({ user_id: p.user_id, status: 'deferred' });
          continue;
        }
        const r = await ensureForUser(p.user_id, tzMap.get(p.user_id) || body.timezone || 'UTC', now);
        if (r.status === 'created' || r.status === 'repaired') generated++;
        out.push({ user_id: p.user_id, ...r });
      }
      return json({ ok: true, processed: out.length, generated, results: out.map((r) => ({ user_id: r.user_id, status: r.status })) });
    }


    // ensure — identify the caller from their JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ ok: false, error: 'unauthenticated' }, 401);

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
    });
    if (!userRes.ok) return json({ ok: false, error: 'invalid session' }, 401);
    const user = await userRes.json();
    if (!user?.id) return json({ ok: false, error: 'invalid session' }, 401);

    const tz = typeof body.timezone === 'string' && body.timezone ? body.timezone : 'UTC';
    const result = await ensureForUser(user.id, tz, now, body.force === true || action === 'regenerate');
    return json({ ok: true, ...result });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 200);
  }
});
