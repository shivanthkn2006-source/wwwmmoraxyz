/**
 * DHF VIDEO DISPATCH — the daily ingestion that keeps the DHF video feed full.
 *
 * Once a day the scheduler calls this with no body. It walks a rotating slice
 * of the DHF figure roster, asks the YouTube Data API for one real, public,
 * embeddable video about that figure's idea, and stores it in
 * `public.dhf_videos` with a title, a description, and live TikTok / Instagram
 * destinations for the same topic.
 *
 * Contract:
 *   • Bounded: at most BATCH_SIZE lookups per run (one quota unit each).
 *   • Idempotent: a video already in the table is skipped, never duplicated.
 *   • Degrading: a missing key or a quota error records a failure on the run
 *     row and leaves the existing feed untouched — it never empties it.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { GROWTH_FIGURES } from '../_shared/growth-figures.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const BATCH_SIZE = 8;

interface YoutubeHit {
  videoId: string;
  title: string;
  description: string;
  channel: string;
  thumbnail: string;
  publishedAt: string | null;
}

async function searchYoutube(query: string): Promise<YoutubeHit | null> {
  const key = Deno.env.get('YOUTUBE_API_KEY') ?? Deno.env.get('GOOGLE_API_KEY');
  if (!key) throw new Error('No YouTube API key configured');

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

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube search failed [${res.status}]: ${await res.text()}`);
  const data = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        description?: string;
        channelTitle?: string;
        publishedAt?: string;
        thumbnails?: Record<string, { url?: string }>;
      };
    }>;
  };
  const hit = (data.items ?? []).find((i) => i.id?.videoId);
  if (!hit?.id?.videoId) return null;
  const s = hit.snippet ?? {};
  return {
    videoId: hit.id.videoId,
    title: (s.title ?? '').slice(0, 240),
    description: (s.description ?? '').slice(0, 900),
    channel: (s.channelTitle ?? '').slice(0, 160),
    thumbnail: s.thumbnails?.high?.url ?? s.thumbnails?.medium?.url ?? s.thumbnails?.default?.url ?? '',
    publishedAt: s.publishedAt ?? null,
  };
}

const tagFor = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const body = await req.json().catch(() => ({})) as { limit?: number; slugs?: string[] };
  const limit = Math.min(Math.max(Number(body.limit) || BATCH_SIZE, 1), 20);

  const { data: run } = await admin
    .from('dhf_video_dispatch_runs')
    .insert({ requested: limit })
    .select('id')
    .single();
  const runId = run?.id as string | undefined;

  // Figures we have no video for yet come first; otherwise rotate by day.
  const { data: existing } = await admin.from('dhf_videos').select('figure_slug');
  const covered = new Set((existing ?? []).map((r: { figure_slug: string }) => r.figure_slug));

  const roster = Array.isArray(body.slugs) && body.slugs.length
    ? GROWTH_FIGURES.filter((f) => body.slugs!.includes(f.slug))
    : GROWTH_FIGURES;
  const uncovered = roster.filter((f) => !covered.has(f.slug));
  const dayOffset = Math.floor(Date.now() / 86_400_000) % Math.max(roster.length, 1);
  const rotated = [...roster.slice(dayOffset), ...roster.slice(0, dayOffset)];
  const queue = (uncovered.length ? uncovered : rotated).slice(0, limit);

  let inserted = 0;
  let skipped = 0;
  let failures = 0;
  const notes: string[] = [];

  for (const figure of queue) {
    const topic = `${figure.name} — ${figure.discipline}`;
    const query = `${figure.name} ${figure.discipline} lessons documentary`;
    try {
      const hit = await searchYoutube(query);
      if (!hit) {
        skipped += 1;
        continue;
      }
      const search = encodeURIComponent(figure.name);
      const { error } = await admin.from('dhf_videos').upsert(
        {
          figure_slug: figure.slug,
          figure_name: figure.name,
          topic,
          title: hit.title || figure.name,
          description: hit.description || figure.known,
          category: figure.discipline,
          youtube_video_id: hit.videoId,
          youtube_url: `https://www.youtube.com/watch?v=${hit.videoId}`,
          youtube_channel: hit.channel,
          tiktok_url: `https://www.tiktok.com/search?q=${search}`,
          instagram_url: `https://www.instagram.com/explore/tags/${tagFor(figure.name)}/`,
          thumbnail_url: hit.thumbnail,
          published_at: hit.publishedAt,
          source: 'youtube_api',
          active: true,
        },
        { onConflict: 'youtube_video_id', ignoreDuplicates: true },
      );
      if (error) {
        failures += 1;
        notes.push(`${figure.slug}: ${error.message}`);
      } else {
        inserted += 1;
      }
    } catch (error) {
      failures += 1;
      notes.push(`${figure.slug}: ${(error as Error).message}`);
      // A key/quota failure will hit every remaining figure identically.
      if (String((error as Error).message).includes('No YouTube API key')) break;
    }
  }

  if (runId) {
    await admin
      .from('dhf_video_dispatch_runs')
      .update({
        finished_at: new Date().toISOString(),
        inserted,
        skipped,
        failures,
        status: failures && !inserted ? 'failed' : 'completed',
        detail: { notes: notes.slice(0, 20), figures: queue.map((f) => f.slug) },
      })
      .eq('id', runId);
  }

  return json({ ok: failures === 0 || inserted > 0, inserted, skipped, failures, notes: notes.slice(0, 5) });
});
