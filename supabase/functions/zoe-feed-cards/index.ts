/**
 * zoe-feed-cards — Zoe writes short, grounded feed cards for the caller.
 *
 * Everything she writes is derived from REAL rows the caller is allowed to see:
 *   • their own recent posts
 *   • the people they are closest to right now (intimacy_scores)
 *   • the posts those people published recently
 *   • their own recent engagement signals (feed_events)
 *
 * If there is nothing real to say, no card is written. Zoe never invents posts,
 * people, events or numbers here.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { resolveClaims } from '../_shared/auth-claims.ts';
import { callAIGateway } from '../_shared/ai-telemetry.ts';

// deno-lint-ignore no-explicit-any
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface DraftCard {
  kind?: string;
  title?: string;
  body?: string;
  related_post_ids?: string[];
}

const clean = (s: unknown, max: number) =>
  typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const authClient = createClient(url, anon);
  const { data: claims, error: claimError } = await resolveClaims(authClient, token);
  const userId = claims?.claims?.sub;
  if (!userId) return json({ error: claimError?.message ?? 'unauthorized' }, 401);

  // Reads run as the caller so RLS decides what Zoe may look at.
  const asUser = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const admin = createClient(url, service);

  try {
    const since = new Date(Date.now() - 14 * 24 * 3600_000).toISOString();

    const [{ data: fresh }, { data: mine }, { data: closeness }, { data: signals }] =
      await Promise.all([
        asUser
          .from('zoe_feed_cards')
          .select('id, created_at')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 6 * 3600_000).toISOString())
          .limit(3),
        asUser
          .from('posts')
          .select('id, content, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
        asUser
          .from('intimacy_scores')
          .select('other_user_id, score')
          .eq('user_id', userId)
          .order('score', { ascending: false })
          .limit(5),
        asUser
          .from('feed_events')
          .select('event_type, post_id, target_user_id, created_at')
          .eq('user_id', userId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(60),
      ]);

    const force = await req.json().catch(() => ({})).then((b) => Boolean(b?.force));
    if (!force && (fresh?.length ?? 0) > 0) {
      return json({ ok: true, created: 0, reason: 'recent_cards_exist' });
    }

    const closeIds = (closeness ?? []).map((r: { other_user_id: string }) => r.other_user_id);
    let circlePosts: Array<{ id: string; content: string | null; user_id: string }> = [];
    if (closeIds.length) {
      const { data } = await asUser
        .from('posts')
        .select('id, content, user_id, created_at')
        .in('user_id', closeIds)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(12);
      circlePosts = data ?? [];
    }

    const names = new Map<string, string>();
    const allIds = Array.from(new Set([...closeIds, ...circlePosts.map((p) => p.user_id)]));
    if (allIds.length) {
      const { data: profs } = await asUser
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', allIds);
      for (const p of profs ?? []) {
        names.set(p.user_id, p.display_name || p.username || 'someone in your circle');
      }
    }

    const facts = {
      your_recent_posts: (mine ?? []).map((p) => ({ id: p.id, text: clean(p.content, 240) })),
      closest_people: (closeness ?? []).map((c: { other_user_id: string; score: number }) => ({
        name: names.get(c.other_user_id) ?? 'someone in your circle',
        closeness: Math.round(c.score),
      })),
      recent_posts_from_them: circlePosts.map((p) => ({
        id: p.id,
        author: names.get(p.user_id) ?? 'someone in your circle',
        text: clean(p.content, 240),
      })),
      your_engagement_last_14_days: (signals ?? []).reduce(
        (acc: Record<string, number>, s: { event_type: string }) => {
          acc[s.event_type] = (acc[s.event_type] ?? 0) + 1;
          return acc;
        },
        {},
      ),
    };

    const hasMaterial =
      facts.your_recent_posts.length > 0 ||
      facts.recent_posts_from_them.length > 0 ||
      Object.keys(facts.your_engagement_last_14_days).length > 0;

    if (!hasMaterial) {
      return json({ ok: true, created: 0, reason: 'no_real_material_yet' });
    }

    const ai = await callAIGateway('zoe-feed-cards', 'feed_card_generation', userId, {
      model: 'google/gemini-2.5-flash',
      temperature: 0.6,
      maxTokens: 700,
      messages: [
        {
          role: 'system',
          content:
            "You are Zoe, M'Mora's companion. Write 1 to 3 very short feed cards for this member, " +
            'grounded ONLY in the JSON facts given. Never invent a person, a post, a number, a date or an event. ' +
            'If a fact is not in the JSON, do not mention it. Warm, plain, human, no emoji, no hashtags, no marketing tone. ' +
            'Each card: a title of at most 6 words and a body of at most 45 words. ' +
            'Reply with JSON only: {"cards":[{"kind":"reflection|nudge|circle","title":"...","body":"...","related_post_ids":["uuid"]}]}. ' +
            'related_post_ids may only contain ids that appear in the facts.',
        },
        { role: 'user', content: JSON.stringify(facts) },
      ],
    });

    if (!ai.success) {
      return json({ ok: false, created: 0, error: ai.error?.message ?? 'ai_unavailable' }, 503);
    }

    // deno-lint-ignore no-explicit-any
    const raw: string = (ai as any).content ?? (ai as any).data?.choices?.[0]?.message?.content ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return json({ ok: false, created: 0, error: 'unparsable_model_output' }, 502);

    let drafts: DraftCard[] = [];
    try {
      drafts = JSON.parse(match[0]).cards ?? [];
    } catch {
      return json({ ok: false, created: 0, error: 'unparsable_model_output' }, 502);
    }

    const knownIds = new Set([
      ...facts.your_recent_posts.map((p) => p.id),
      ...facts.recent_posts_from_them.map((p) => p.id),
    ]);

    const rows = drafts
      .map((d) => ({
        user_id: userId,
        kind: ['reflection', 'nudge', 'circle'].includes(String(d.kind)) ? String(d.kind) : 'reflection',
        title: clean(d.title, 80),
        body: clean(d.body, 400),
        related_post_ids: (d.related_post_ids ?? []).filter((id) => knownIds.has(id)).slice(0, 4),
        source: {
          generated_from: {
            your_posts: facts.your_recent_posts.length,
            circle_posts: facts.recent_posts_from_them.length,
            signals: Object.keys(facts.your_engagement_last_14_days).length,
          },
          model: 'google/gemini-2.5-flash',
          generated_at: new Date().toISOString(),
        },
      }))
      .filter((r) => r.title && r.body)
      .slice(0, 3);

    if (!rows.length) return json({ ok: true, created: 0, reason: 'model_returned_nothing_usable' });

    const { error: insertError } = await admin.from('zoe_feed_cards').insert(rows);
    if (insertError) return json({ ok: false, created: 0, error: insertError.message }, 500);

    return json({ ok: true, created: rows.length, cards: rows });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'unexpected error' }, 500);
  }
});
