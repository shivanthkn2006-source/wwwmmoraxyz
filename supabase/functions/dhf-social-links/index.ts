/**
 * DHF SOCIAL LINKS — turns a daily compass card into real, openable video
 * destinations instead of dead placeholders.
 *
 * For each card headline we resolve, once, and then cache forever-ish:
 *   • YouTube  — a real, embeddable, public video from the YouTube Data API.
 *   • TikTok   — the platform's live search URL for the card's keywords.
 *   • Instagram— the explore/tag URL for the card's strongest keyword.
 *
 * The cache lives in `public.dhf_social_links`, keyed by a normalised topic, so
 * the same headline never costs a second quota unit no matter how many members
 * see the card. A missing key or a quota error degrades to search URLs only —
 * the card still opens something real, it just isn't a specific video.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { guardRequest, wafCorsHeaders } from '../_shared/waf.ts';

const corsHeaders = wafCorsHeaders;
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'your', 'you', 'his', 'her', 'their', 'that', 'this', 'is', 'are', 'was',
  'how', 'why', 'what', 'when', 'from', 'about', 'into', 'it', 'its', 'as',
]);

const topicKey = (headline: string): string =>
  headline.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);

const keywords = (headline: string, category?: string): string[] => {
  const words = topicKey(headline).split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w));
  const list = words.slice(0, 5);
  if (category) list.push(...category.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0, 1));
  return [...new Set(list)];
};

const tiktokUrl = (terms: string[]) =>
  `https://www.tiktok.com/search?q=${encodeURIComponent(terms.join(' '))}`;

const instagramUrl = (terms: string[]) => {
  const tag = terms.join('').replace(/[^a-z0-9]/g, '').slice(0, 30);
  return tag ? `https://www.instagram.com/explore/tags/${tag}/` : 'https://www.instagram.com/explore/';
};

interface YoutubeHit {
  videoId: string;
  title: string;
  channel: string;
}

async function searchYoutube(query: string): Promise<YoutubeHit | null> {
  const key = Deno.env.get('YOUTUBE_API_KEY') ?? Deno.env.get('GOOGLE_API_KEY');
  if (!key) return null;
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '3');
  url.searchParams.set('safeSearch', 'strict');
  url.searchParams.set('videoEmbeddable', 'true');
  url.searchParams.set('videoSyndicated', 'true');
  url.searchParams.set('relevanceLanguage', 'en');
  url.searchParams.set('key', key);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`[dhf-social-links] YouTube search failed [${res.status}]: ${await res.text()}`);
      return null;
    }
    const data = (await res.json()) as {
      items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }>;
    };
    const hit = (data.items ?? []).find((i) => i.id?.videoId);
    if (!hit?.id?.videoId) return null;
    return {
      videoId: hit.id.videoId,
      title: hit.snippet?.title ?? '',
      channel: hit.snippet?.channelTitle ?? '',
    };
  } catch (error) {
    console.error('[dhf-social-links] YouTube lookup threw', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const guard = await guardRequest(req, {
    name: 'dhf-social-links',
    limit: 120,
    windowSeconds: 60,
    maxBodyBytes: 16 * 1024,
    allowRichText: true,
  });
  if (guard.response) return guard.response;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  try {
    const raw = Array.isArray(guard.body.topics) ? guard.body.topics : [];
    const topics = raw
      .slice(0, 12)
      .map((t) => t as { headline?: string; category?: string })
      .filter((t) => typeof t.headline === 'string' && t.headline.trim().length > 3)
      .map((t) => ({ headline: t.headline!.slice(0, 240), category: (t.category ?? '').slice(0, 80) }));

    if (!topics.length) return json({ ok: false, error: 'No topics supplied' }, 400);

    const keys = topics.map((t) => topicKey(t.headline));
    const { data: cached } = await admin
      .from('dhf_social_links')
      .select('topic_key, youtube_video_id, youtube_url, youtube_title, youtube_channel, tiktok_url, instagram_url')
      .in('topic_key', keys);

    const byKey = new Map((cached ?? []).map((row) => [row.topic_key as string, row]));
    const results: Record<string, unknown>[] = [];

    for (const topic of topics) {
      const key = topicKey(topic.headline);
      const existing = byKey.get(key);
      if (existing) {
        results.push({ topicKey: key, ...existing });
        continue;
      }

      const terms = keywords(topic.headline, topic.category);
      const hit = await searchYoutube(topic.headline);
      const row = {
        topic_key: key,
        headline: topic.headline,
        category: topic.category || null,
        youtube_video_id: hit?.videoId ?? null,
        youtube_url: hit
          ? `https://www.youtube.com/watch?v=${hit.videoId}`
          : `https://www.youtube.com/results?search_query=${encodeURIComponent(topic.headline)}`,
        youtube_title: hit?.title ?? null,
        youtube_channel: hit?.channel ?? null,
        tiktok_url: tiktokUrl(terms),
        instagram_url: instagramUrl(terms),
        source: hit ? 'youtube_api' : 'search_fallback',
        refreshed_at: new Date().toISOString(),
      };

      const { error } = await admin.from('dhf_social_links').upsert(row, { onConflict: 'topic_key' });
      if (error) console.error('[dhf-social-links] cache write failed', error.message);
      results.push({ topicKey: key, ...row });
    }

    return json({ ok: true, links: results });
  } catch (error) {
    console.error('[dhf-social-links] failed', error);
    return json({ ok: false, error: 'Link resolution failed' }, 500);
  }
});
