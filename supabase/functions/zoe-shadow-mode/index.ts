/**
 * ZOE SHADOW MODE — replay real DHF history, generate recommendations offline.
 *
 * For each member with real DHF data the function:
 *   1. reads the member's actual rows (DHF posts, memories, biometric sensor
 *      events, lineage entries, latest growth/live recommendation)
 *   2. asks the sovereign AI stack (own provider keys — never Lovable credits)
 *      for the recommendation Zoe *would* have made from that evidence
 *   3. stores it in `zoe_shadow_recommendations` next to the live one so the
 *      admin console can compare real vs generated side by side
 *
 * Optionally replays every registered route first (`replayRoutes: true`) by
 * invoking the synthetic crawler, and attaches the resulting route-health
 * summary to each shadow row's metadata.
 *
 * Auth: admin bearer token, or cron via `x-crawler-secret`.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { sovereignFetch, sovereignKey } from '../_shared/sovereign-ai.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-crawler-secret',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface Evidence {
  posts: { id: string; headline: string; short_summary: string | null; created_at: string }[];
  memories: { content: string; created_at: string }[];
  sensors: { created_at: string; metadata: Record<string, unknown> | null }[];
  lineage: number;
  live: string | null;
}

function summarise(evidence: Evidence): string {
  const lines: string[] = [];
  for (const p of evidence.posts) lines.push(`DHF post ${p.created_at.slice(0, 10)}: ${p.headline} — ${String(p.short_summary ?? '').slice(0, 180)}`);
  for (const m of evidence.memories) lines.push(`Memory ${m.created_at.slice(0, 10)}: ${String(m.content).slice(0, 180)}`);
  for (const s of evidence.sensors.slice(0, 3)) {
    lines.push(`Sensor ${s.created_at.slice(0, 16)}: ${JSON.stringify(s.metadata ?? {}).slice(0, 200)}`);
  }
  lines.push(`Lineage entries on record: ${evidence.lineage}`);
  return lines.join('\n');
}

/** Deterministic fallback when no AI provider key is configured. */
function fallbackRecommendation(evidence: Evidence): string {
  if (evidence.posts.length === 0 && evidence.memories.length === 0) {
    return 'Not enough real DHF evidence yet — capture a sensor snapshot or write a DHF entry first.';
  }
  const latest = evidence.posts[0]?.headline ?? evidence.memories[0]?.content ?? '';
  return `Continue the thread you last recorded ("${String(latest).slice(0, 80)}…") and log one sensor snapshot today so the pattern becomes measurable.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const cronSecret = Deno.env.get('CRAWLER_SECRET') ?? '';
    const isCron = !!cronSecret && (req.headers.get('x-crawler-secret') ?? '') === cronSecret;

    if (!isCron) {
      const authHeader = req.headers.get('Authorization') ?? '';
      if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
      const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await caller.auth.getUser();
      const callerId = userData?.user?.id;
      if (!callerId) return json({ error: 'Unauthorized' }, 401);
      const { data: isAdmin } = await caller.rpc('has_role', { _user_id: callerId, _role: 'admin' });
      if (!isAdmin) return json({ error: 'Admin access required' }, 403);
    }

    const limitUsers = Math.min(Number(body.limitUsers ?? 10) || 10, 50);
    const replayRoutes = body.replayRoutes === true;

    // 1. Optional route replay through the synthetic crawler.
    let routeHealth: Record<string, unknown> | null = null;
    if (replayRoutes) {
      try {
        const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/zoe-synthetic-crawler`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-crawler-secret': cronSecret },
          body: JSON.stringify({ trigger: 'shadow-mode' }),
        });
        routeHealth = await res.json().catch(() => null);
      } catch (e) {
        routeHealth = { error: String((e as Error)?.message ?? e).slice(0, 200) };
      }
    }
    if (!routeHealth) {
      const { data: lastRun } = await service
        .from('zoe_crawl_runs')
        .select('id, routes_checked, findings_count, summary, started_at')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      routeHealth = lastRun ?? null;
    }

    // 2. Candidate members: anyone with at least one real DHF row.
    const [{ data: postUsers }, { data: memoryUsers }] = await Promise.all([
      service.from('dhf_daily_posts').select('user_id').limit(2000),
      service.from('mmora_memories').select('user_id').limit(2000),
    ]);
    const userIds = Array.from(
      new Set([...(postUsers ?? []), ...(memoryUsers ?? [])].map((r: { user_id: string }) => r.user_id).filter(Boolean)),
    ).slice(0, limitUsers);

    if (userIds.length === 0) return json({ ok: true, users: 0, generated: 0, note: 'no real DHF data to replay' });

    const aiKey = sovereignKey();
    const rows: Record<string, unknown>[] = [];

    for (const userId of userIds) {
      const [posts, memories, sensors, lineage, growth] = await Promise.all([
        service.from('dhf_daily_posts').select('id, headline, short_summary, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(8),
        service.from('mmora_memories').select('content, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        service.from('behavioral_events').select('created_at, metadata').eq('user_id', userId).eq('event_category', 'biometric').order('created_at', { ascending: false }).limit(5),
        service.from('dhf_lineage_ledger').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        service.from('growth_feed_items').select('title, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
      ]);

      const evidence: Evidence = {
        posts: (posts.data ?? []) as Evidence['posts'],
        memories: (memories.data ?? []) as Evidence['memories'],
        sensors: (sensors.data ?? []) as Evidence['sensors'],
        lineage: lineage.count ?? 0,
        live: (growth.data?.[0]?.title as string | undefined) ?? null,
      };

      const basis = summarise(evidence);
      let recommendation = fallbackRecommendation(evidence);
      let model = 'deterministic-fallback';

      if (aiKey && (evidence.posts.length || evidence.memories.length)) {
        try {
          const res = await sovereignFetch('sovereign://chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${aiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content:
                    'You are Zoe running in shadow mode. Using ONLY the evidence given, write one concrete next-step recommendation (max 40 words). Never invent facts that are not in the evidence.',
                },
                { role: 'user', content: basis },
              ],
              temperature: 0.4,
              max_tokens: 200,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
            if (text) {
              recommendation = text;
              model = 'google/gemini-2.5-flash';
            }
          }
        } catch (e) {
          console.warn('[zoe-shadow-mode] AI failed, using fallback:', (e as Error)?.message);
        }
      }

      const evidenceCount = evidence.posts.length + evidence.memories.length + evidence.sensors.length;
      rows.push({
        user_id: userId,
        source: 'shadow_replay',
        basis: basis.slice(0, 4000),
        recommendation,
        live_recommendation: evidence.live,
        confidence: Math.min(0.95, 0.25 + evidenceCount * 0.08),
        metadata: {
          model,
          evidence: {
            posts: evidence.posts.length,
            memories: evidence.memories.length,
            sensors: evidence.sensors.length,
            lineage: evidence.lineage,
          },
          route_health: routeHealth,
        },
      });
    }

    const { error: insertErr } = await service.from('zoe_shadow_recommendations').insert(rows);
    if (insertErr) return json({ error: `insert failed: ${insertErr.message}` }, 500);

    return json({
      ok: true,
      users: userIds.length,
      generated: rows.length,
      aiEnabled: !!aiKey,
      routeHealth,
    });
  } catch (e) {
    console.error('[zoe-shadow-mode]', e);
    return json({ error: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
