/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GENERATE DHF DAILY FEED — the "generate once, read forever" Oracle engine.
 *
 * Actions (POST body { action }):
 *   "ensure"     — (default) make sure the caller has today's 10 cards.
 *   "status"     — how many cards exist for the caller today (no generation).
 *   "backfill"   — ADMIN ONLY: fill a specific user + date, skipping any day
 *                  already complete (never double-charges).
 *   "regenerate" — ADMIN ONLY: explicitly delete + rebuild one user-day.
 *
 * All generation goes through `_shared/dhf-compass-runner.ts`, which owns the
 * idempotency key, the single-flight lease, durable image storage and the
 * structured `dhf_generation_runs` log.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { COMPASS_SLOTS, COMPASS_WORKER_VERSION, countForDate, db, ensureDayForUser } from '../_shared/dhf-compass-runner.ts';
import { buildDhfImageBrief, DHF_IMAGE_PROMPT_VERSION } from '../_shared/dhf-compass-image.ts';
import { seedFrom } from '../_shared/dhf-compass.ts';
import { localDateIn } from '../_shared/astro-engine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

async function isAdmin(userId: string): Promise<boolean> {
  const r = await db(`user_roles?user_id=eq.${userId}&role=eq.admin&select=role&limit=1`);
  return Array.isArray(r.data) && r.data.length > 0;
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify({ worker: COMPASS_WORKER_VERSION, ...(body as object) }), {
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
    const requested = String(body.action ?? 'ensure');
    const action = ['status', 'backfill', 'regenerate', 'reimage'].includes(requested) ? requested : 'ensure';

    // ── Token-free artwork repair ───────────────────────────────────────────
    // Rebuilds only the image contract for the caller's own existing cards when
    // they carry an older prompt version. No model call, no text is rewritten.
    if (action === 'reimage') {
      const stale = await db(
        `dhf_daily_posts?user_id=eq.${user.id}` +
        `&or=(image_prompt_version.is.null,image_prompt_version.neq.${DHF_IMAGE_PROMPT_VERSION})` +
        '&select=id,category,headline,short_summary,full_story_content,astrological_context,slot_time,post_date' +
        '&order=post_date.desc,slot_time.desc&limit=60',
      );
      const rows = Array.isArray(stale.data) ? stale.data : [];
      let repaired = 0;
      for (const row of rows) {
        const image = buildDhfImageBrief({
          category: String(row.category ?? ''),
          headline: String(row.headline ?? ''),
          shortSummary: String(row.short_summary ?? ''),
          fullStory: String(row.full_story_content ?? ''),
          astrologicalContext: String(row.astrological_context ?? ''),
          seed: seedFrom(`${user.id}:${row.post_date}:${row.slot_time}`),
        });
        const patch = await db(`dhf_daily_posts?id=eq.${row.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            image_url: image.url,
            image_path: null,
            image_source: 'remote',
            image_prompt: image.prompt,
            image_prompt_version: image.promptVersion,
            image_prompt_hash: image.promptHash,
          }),
        });
        if (patch.ok) repaired += 1;
      }
      return json({ ok: true, action, stale: rows.length, repaired, version: DHF_IMAGE_PROMPT_VERSION });
    }

    // ── Admin surface ───────────────────────────────────────────────────────
    if (action === 'backfill' || action === 'regenerate') {
      if (!(await isAdmin(user.id))) return json({ error: 'forbidden' }, 403);
      const targetUserId = String(body.userId ?? '');
      if (!UUID.test(targetUserId)) return json({ error: 'invalid userId' }, 400);

      const existing = await countForDate(targetUserId, date);
      if (action === 'backfill' && existing >= COMPASS_SLOTS.length) {
        // Nothing missing — refuse to spend a single token.
        return json({ ok: true, date, userId: targetUserId, existing, generated: 0, cached: true });
      }

      const result = await ensureDayForUser({
        budgetMs: 100_000,
        userId: targetUserId,
        date,
        trigger: 'admin',
        action,
        regenerate: action === 'regenerate',
      });
      return json({ ...result, userId: targetUserId });
    }

    const existing = await countForDate(user.id, date);
    if (action === 'status') {
      return json({ ok: true, date, existing, complete: existing >= COMPASS_SLOTS.length });
    }

    const result = await ensureDayForUser({ userId: user.id, date, trigger: 'client', action: 'ensure', budgetMs: 100_000 });
    return json(result);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
