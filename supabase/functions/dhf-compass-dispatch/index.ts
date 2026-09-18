/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ZOE'S DHF DISPATCH — backend pre-warm, no login required.
 *
 * The scheduler calls this every ten minutes. It gives weekly-active members
 * cards for their OWN local date before they ever open the app, so the very
 * first sign-in already shows a populated timeline.
 *
 * Background-job contract:
 *   • Bounded work: at most BATCH_SIZE member-days per invocation.
 *   • Single-flight: a lease row in `dhf_dispatch_lease` (job_queue-backed) is
 *     taken before any work; a second concurrent run exits immediately.
 *   • Idempotent: `ensureDayForUser` short-circuits on existing coverage, so a
 *     re-run costs nothing.
 *   • Circuit breaker: provider failures degrade to the local vault without
 *     blocking the remaining active members.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { COMPASS_SLOTS, countForDate, db, ensureDayForUser } from '../_shared/dhf-compass-runner.ts';
import { localDateIn } from '../_shared/astro-engine.ts';
import { DHF_IMAGE_PROMPT_VERSION, buildDhfImageBrief } from '../_shared/dhf-compass-image.ts';
import { seedFrom } from '../_shared/dhf-compass.ts';

/**
 * Server-side artwork sweep. Every card written under an older image contract is
 * rebuilt here, for every member, without any model call and without touching a
 * single word of card text. This makes the artwork correct even for members who
 * never open the app while a client is signed in.
 */
const REIMAGE_LIMIT = 150;

async function sweepStaleArtwork(): Promise<{ stale: number; repaired: number }> {
  const stale = await db(
    'dhf_daily_posts?' +
    `or=(image_prompt_version.is.null,image_prompt_version.neq.${DHF_IMAGE_PROMPT_VERSION})` +
    '&select=id,user_id,category,headline,short_summary,full_story_content,astrological_context,slot_time,post_date' +
    `&order=post_date.desc,slot_time.desc&limit=${REIMAGE_LIMIT}`,
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
      seed: seedFrom(`${row.user_id}:${row.post_date}:${row.slot_time}`),
    });
    const patch = await db(`dhf_daily_posts?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
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
  return { stale: rows.length, repaired };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 12;
/** Hard wall-clock budget so the run always returns before the 150s edge limit. */
const TIME_BUDGET_MS = 110_000;
const LEASE_KEY = 'dhf_compass_dispatch';
const LEASE_MS = 4 * 60 * 1000;

async function takeLease(): Promise<boolean> {
  const now = Date.now();
  const existing = await db(`dhf_dispatch_lease?key=eq.${LEASE_KEY}&select=key,leased_at,status&limit=1`);
  const row = Array.isArray(existing.data) && existing.data.length ? existing.data[0] : null;
  if (row) {
    const age = now - new Date(row.leased_at).getTime();
    if (row.status === 'running' && age < LEASE_MS) return false;
    const upd = await db(`dhf_dispatch_lease?key=eq.${LEASE_KEY}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'running', leased_at: new Date(now).toISOString() }),
    });
    return upd.ok;
  }
  const created = await db('dhf_dispatch_lease', {
    method: 'POST',
    headers: { Prefer: 'return=minimal,resolution=ignore-duplicates' },
    body: JSON.stringify({ key: LEASE_KEY, status: 'running', leased_at: new Date(now).toISOString() }),
  });
  return created.ok;
}

async function releaseLease(summary: Record<string, unknown>) {
  await db(`dhf_dispatch_lease?key=eq.${LEASE_KEY}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'idle', summary }),
  });
}


interface Member { user_id: string; timezone: string; last_active: string }

const PRIORITY_USER_IDS = new Set([
  '86a57749-010a-4667-b9b7-bfce0de9241b', // ashasoosan
  '43f3a0d9-c2ec-4166-9c18-c81bc9e0a7b0', // moksh
  '9327eaf6-8a97-4234-aad0-2b6000f321f0', // manavmadhav925
  '9d4519a6-3e2d-4a83-ba6f-3de6afbe3bde', // adithyansanthosh
  'baf23106-101c-4165-bb7b-2a44abd21b9b', // type20forme
  '1f9b4cec-47ea-4b15-97d9-9f7970227d5a', // shivanth.k.n2006
]);

async function members(): Promise<Member[]> {
  const rows = await db('profiles?select=user_id&limit=500');
  const ids: string[] = Array.isArray(rows.data) ? rows.data.map((r: any) => r.user_id).filter(Boolean) : [];
  const zones = new Map<string, string>();
  const prefs = await db('growth_preferences?select=user_id,timezone&limit=500');
  if (Array.isArray(prefs.data)) {
    for (const p of prefs.data as any[]) if (p?.user_id && p?.timezone) zones.set(p.user_id, p.timezone);
  }
  const activity = new Map<string, string>();
  const sessions = await db('user_sessions?select=user_id,last_activity_at&order=last_activity_at.desc&limit=1000');
  if (Array.isArray(sessions.data)) {
    for (const session of sessions.data as any[]) {
      if (session?.user_id && session?.last_activity_at && !activity.has(session.user_id)) {
        activity.set(session.user_id, session.last_activity_at);
      }
    }
  }
  const weeklyCutoff = Date.now() - 7 * 86_400_000;
  return ids
    .filter((id) => PRIORITY_USER_IDS.has(id) || new Date(activity.get(id) ?? 0).getTime() >= weeklyCutoff)
    .map((id) => ({ user_id: id, timezone: zones.get(id) ?? 'UTC', last_active: activity.get(id) ?? '' }))
    .sort((a, b) => {
      const priority = Number(PRIORITY_USER_IDS.has(b.user_id)) - Number(PRIORITY_USER_IDS.has(a.user_id));
      return priority || new Date(b.last_active || 0).getTime() - new Date(a.last_active || 0).getTime();
    });
}

function safeZone(tz: string): string {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return 'UTC'; }
}

/** Local hour (0-23) for a timezone, used for the 2–4am prewarm window. */
function localHour(tz: string): number {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date()));
  } catch {
    return new Date().getUTCHours();
  }
}

/** True while it is 02:00–03:59 for this member — the nightly prewarm slot. */
function inPrewarmWindow(tz: string): boolean {
  const h = localHour(tz);
  return h >= 2 && h < 4;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (!(await takeLease())) return json({ ok: true, skipped: 'in-flight' });

    const startedAt = Date.now();
    const summary = { scanned: 0, generated: 0, cached: 0, failed: 0, prewarmed: 0, paused: false, timeboxed: false, imagesRepaired: 0 };
    try {
      const list = await members();
      summary.scanned = list.length;

      // Batch by timezone: members whose local clock is in the 2–4am prewarm
      // window go first, so a full day of cards is cached before they wake up.
      // Everyone else is only topped up when a slot is genuinely missing, which
      // keeps the 10-minute run from re-spending on already-cached days.
      const ordered = [...list].sort(
        (a, b) => Number(inPrewarmWindow(safeZone(b.timezone))) - Number(inPrewarmWindow(safeZone(a.timezone))),
      );

      // A single member-day takes 70-100s, so a sequential loop only ever
      // reached one or two people per run and the rest of the platform woke up
      // with an empty compass. Run a small pool instead: still bounded by
      // BATCH_SIZE and the wall-clock budget, but several members at a time.
      const CONCURRENCY = 4;
      let processed = 0;
      let cursor = 0;

      const worker = async () => {
        for (;;) {
          if (processed >= BATCH_SIZE) return;
          if (Date.now() - startedAt > TIME_BUDGET_MS) { summary.timeboxed = true; return; }
          const member = ordered[cursor++];
          if (!member) return;

          const tz = safeZone(member.timezone);
          const date = localDateIn(new Date(), tz);
          const prewarm = inPrewarmWindow(tz);

          const existing = await countForDate(member.user_id, date);
          if (existing >= COMPASS_SLOTS.length) { summary.cached++; continue; }

          processed++;
          const result = await ensureDayForUser({
            userId: member.user_id,
            date,
            trigger: 'cron',
            action: 'ensure',
            budgetMs: Math.max(10_000, TIME_BUDGET_MS - (Date.now() - startedAt)),
          });
          if (prewarm) summary.prewarmed++;
          if (result.paused) summary.paused = true;
          if (result.ok) summary.generated += result.generated; else summary.failed++;
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

      // Artwork repair runs on every dispatch, whatever happened above: it is a
      // pure metadata rebuild, so it never costs a generation and never blocks.
      try {
        const swept = await sweepStaleArtwork();
        summary.imagesRepaired = swept.repaired;
      } catch { /* artwork repair is best-effort */ }
    } finally {
      await releaseLease(summary);
    }


    return json({ ok: true, ...summary });
  } catch (e) {
    await releaseLease({ error: String((e as Error)?.message ?? e).slice(0, 200) });
    return json({ ok: false, error: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
