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

type Cohort = 'genz' | 'millennial' | 'genx' | 'boomer' | 'unspecified';

const TONE: Record<Cohort, string> = {
  genz: 'Register: short, low-key, unpolished lines. Dry warmth. No corporate polish, no exclamation stacking, no emoji.',
  millennial: 'Register: conversational with light self-awareness. Clear structure, a little humour, no jargon.',
  genx: 'Register: plain and direct. Point first, context second. No hype.',
  boomer: 'Register: warm and complete, full sentences, clear explanations. No slang, no abbreviations.',
  unspecified: 'Register: natural and plain.',
};

function cohortFromBirthDate(bd?: string | null): Cohort {
  if (!bd) return 'unspecified';
  const y = new Date(bd).getFullYear();
  if (!Number.isFinite(y)) return 'unspecified';
  if (y >= 1997) return 'genz';
  if (y >= 1981) return 'millennial';
  if (y >= 1965) return 'genx';
  if (y >= 1946) return 'boomer';
  return 'unspecified';
}

function cohortOf(
  profile?: { age_cohort?: string | null; birth_date?: string | null; date_of_birth?: string | null } | null,
): Cohort {
  const stored = profile?.age_cohort as Cohort | undefined | null;
  if (stored && stored !== 'unspecified' && stored in TONE) return stored;
  return cohortFromBirthDate(profile?.birth_date ?? profile?.date_of_birth ?? null);
}



/** Real trending headlines from Google News (GNews) RSS — keyless, no quota. */
async function googleNews(query: string, limit = 5): Promise<Array<{ title: string; url: string; source: string; publishedAt: string | null }>> {
  const q = encodeURIComponent(query.trim() || 'top stories');
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.split('<item>').slice(1, limit + 1);
    return items.map((raw) => {
      const pick = (tag: string) => {
        const m = raw.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() : '';
      };
      return {
        title: pick('title').slice(0, 180),
        url: pick('link').slice(0, 500),
        source: pick('source') || 'Google News',
        publishedAt: pick('pubDate') || null,
      };
    }).filter((h) => h.title && h.url);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

const STOP = new Set('the a an and or but for with from this that then they them your you our are was were have has had will just about into over more very really today what when where which who how why been being some what\'s i\'m its it\'s here there'.split(' '));

/** Topic derived from what the member actually wrote — never a hardcoded string. */
function topicFromPosts(texts: string[]): string {
  const counts = new Map<string, number>();
  for (const t of texts) {
    for (const w of (t || '').toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []) {
      if (STOP.has(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);
  return top.join(' ');
}

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

    // The member's generation decides Zoe's register — never her facts.
    const { data: meProfile } = await asUser
      .from('profiles')
      .select('age_cohort, birth_date, date_of_birth')
      .eq('user_id', userId)
      .maybeSingle();
    const cohort = cohortOf(meProfile);


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

    const topic = topicFromPosts([
      ...facts.your_recent_posts.map((p) => p.text),
      ...facts.recent_posts_from_them.map((p) => p.text),
    ]);
    const headlines = await googleNews(topic);
    // deno-lint-ignore no-explicit-any
    (facts as any).live_headlines_from_google_news = headlines.map((h) => ({
      title: h.title,
      source: h.source,
      published_at: h.publishedAt,
    }));
    // deno-lint-ignore no-explicit-any
    (facts as any).headline_search_topic = topic || 'top stories';

    const hasMaterial =
      facts.your_recent_posts.length > 0 ||
      facts.recent_posts_from_them.length > 0 ||
      Object.keys(facts.your_engagement_last_14_days).length > 0 ||
      headlines.length > 0;

    if (!hasMaterial) {
      return json({ ok: true, created: 0, reason: 'no_real_material_yet' });
    }

    const ai = await callAIGateway('zoe-feed-cards', 'feed_card_generation', userId, {
      model: 'google/gemini-2.5-flash',
      temperature: 0.6,
      maxTokens: 1500,
      messages: [
        {
          role: 'system',
          content:
            "You are Zoe, M'Mora's companion. Write 1 to 3 very short feed cards for this member, " +
            'grounded ONLY in the JSON facts given. Never invent a person, a post, a number, a date or an event. ' +
            'If a fact is not in the JSON, do not mention it. Warm, plain, human, no emoji, no hashtags, no marketing tone. ' +
            'Each card: a title of at most 6 words and a body of at most 45 words. ' +
            'When live_headlines_from_google_news is present, at most ONE card may be kind "topic": summarise a real headline in the member\'s own interest area, quoting nothing that is not in the facts. ' +
            'Reply with JSON only: {"cards":[{"kind":"reflection|nudge|circle|topic","title":"...","body":"...","related_post_ids":["uuid"]}]}. ' +
            'related_post_ids may only contain ids that appear in the facts.',
        },
        { role: 'user', content: JSON.stringify(facts) },
      ],
    });

    if (!ai.success) {
      return json({ ok: false, created: 0, error: ai.error?.message ?? 'ai_unavailable' }, 503);
    }

    // deno-lint-ignore no-explicit-any
    const a = ai as any;
    const msg = a.data?.choices?.[0]?.message;
    const raw: string =
      (typeof a.content === 'string' ? a.content : '') ||
      (typeof msg?.content === 'string'
        ? msg.content
        : Array.isArray(msg?.content)
          ? msg.content.map((c: { text?: string }) => c?.text ?? '').join('\n')
          : '') ||
      (typeof a.data?.output_text === 'string' ? a.data.output_text : '');

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('[zoe-feed-cards] no JSON in model output; content length', raw.length);
      return json({ ok: false, created: 0, error: 'unparsable_model_output' }, 502);
    }

    let drafts: DraftCard[] = [];
    try {
      drafts = JSON.parse(match[0]).cards ?? [];
    } catch {
      console.error('[zoe-feed-cards] JSON parse failed. head=', match[0].slice(0, 300));
      return json({ ok: false, created: 0, error: 'unparsable_model_output' }, 502);
    }


    const knownIds = new Set([
      ...facts.your_recent_posts.map((p) => p.id),
      ...facts.recent_posts_from_them.map((p) => p.id),
    ]);

    const rows = drafts
      .map((d) => ({
        user_id: userId,
        kind: ['reflection', 'nudge', 'circle', 'topic'].includes(String(d.kind)) ? String(d.kind) : 'reflection',
        title: clean(d.title, 80),
        body: clean(d.body, 400),
        related_post_ids: (d.related_post_ids ?? []).filter((id) => knownIds.has(id)).slice(0, 4),
        source: {
          generated_from: {
            your_posts: facts.your_recent_posts.length,
            circle_posts: facts.recent_posts_from_them.length,
            signals: Object.keys(facts.your_engagement_last_14_days).length,
          },
          headline_topic: topic || 'top stories',
          headlines: headlines.slice(0, 5),
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
