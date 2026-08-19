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
const MAX_BATCH = 25;

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

async function ensureForUser(userId: string, tz: string, now: Date) {
  const targetDate = localDateIn(now, tz);
  const existing = await db(
    `zoe_daily_motivations?user_id=eq.${userId}&target_date=eq.${targetDate}&select=*`,
  );
  if (Array.isArray(existing.data) && existing.data.length) {
    const row = existing.data[0];
    if (row.poster_path) return { status: 'exists', row };

    // Row exists without art (older run / provider outage) — repair the image.
    const theme = row.theme || themeFor(targetDate, userId);
    const img = await renderImage({
      prompt: sceneFor(theme),
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
        body: JSON.stringify({ poster_path: img.path }),
      });
      return { status: 'repaired', row: patched.data?.[0] ?? { ...row, poster_path: img.path }, image: img.provider };
    }
    return { status: 'exists', row };
  }

  const theme = themeFor(targetDate, userId);
  const seed = `${userId}_${targetDate}`;
  const gen = await generateMotivation({
    theme, weekday: weekdayIn(now, tz), localDate: targetDate, seed,
  });
  const content = gen.content ?? pickMotivationFallback(seed, theme);

  const img = await renderImage({
    prompt: sceneFor(theme),
    storagePath: `${userId}/motivation_${targetDate}.jpg`,
    bucket: BUCKET,
    supabaseUrl: SUPABASE_URL,
    serviceKey: SERVICE_KEY,
    palette: paletteFor(theme),
  });

  const insert = await db('zoe_daily_motivations', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      target_date: targetDate,
      theme: content.theme,
      headline: content.headline,
      body: content.body,
      action_step: content.actionStep,
      quote: content.quote,
      poster_path: img.path,
      source: content.source,
    }),
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
      const profRes = await db(
        `astro_profiles?select=user_id,display_timezone&order=updated_at.asc&limit=${MAX_BATCH}`,
      );
      const rows: Array<{ user_id: string; display_timezone: string }> = Array.isArray(profRes.data) ? profRes.data : [];
      const out = [];
      for (const p of rows) {
        out.push({ user_id: p.user_id, ...(await ensureForUser(p.user_id, p.display_timezone || 'UTC', now)) });
      }
      return json({ ok: true, processed: out.length, results: out.map((r) => ({ user_id: r.user_id, status: r.status })) });
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
    const result = await ensureForUser(user.id, tz, now);
    return json({ ok: true, ...result });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 200);
  }
});
