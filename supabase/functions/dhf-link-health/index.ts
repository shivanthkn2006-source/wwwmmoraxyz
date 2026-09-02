import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CHECK_TIMEOUT_MS = 7000;
const CONCURRENCY = 8;

/**
 * Nightly link-health sweep for the DHF video library.
 *
 * YouTube's oEmbed endpoint returns 404 / 401 for removed, private or
 * region-locked videos, which is the cheapest reliable liveness signal that
 * does not consume Data API quota. Dead IDs are deactivated so the DHF feed
 * never renders an unplayable card.
 */
async function checkVideo(videoId: string): Promise<{ alive: boolean; status: number }> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`,
  )}&format=json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
    await res.body?.cancel();
    // 404/401 => gone or private. 403/429 => throttling, treat as alive to avoid
    // deactivating a healthy library during a rate-limit burst.
    if (res.status === 404 || res.status === 401) return { alive: false, status: res.status };
    return { alive: true, status: res.status };
  } catch {
    return { alive: true, status: 0 };
  }
}

async function runPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index]);
      }
    }),
  );
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: run } = await admin
    .from('dhf_link_health_runs')
    .insert({})
    .select('id')
    .single();

  try {
    const { data: videos, error } = await admin
      .from('dhf_videos')
      .select('id, youtube_video_id, title')
      .eq('active', true)
      .limit(500);

    if (error) throw error;

    const rows = (videos || []).filter((v) => v.youtube_video_id);
    const checks = await runPool(rows, CONCURRENCY, async (video) => {
      const result = await checkVideo(video.youtube_video_id as string);
      return { ...video, ...result };
    });

    const dead = checks.filter((c) => !c.alive);
    let deactivated = 0;
    if (dead.length > 0) {
      const { error: updateError } = await admin
        .from('dhf_videos')
        .update({ active: false })
        .in('id', dead.map((d) => d.id));
      if (!updateError) deactivated = dead.length;
    }

    const detail = dead.slice(0, 50).map((d) => ({
      id: d.id,
      youtube_video_id: d.youtube_video_id,
      title: d.title,
      status: d.status,
    }));

    if (run?.id) {
      await admin
        .from('dhf_link_health_runs')
        .update({
          checked: checks.length,
          dead: dead.length,
          deactivated,
          detail,
          finished_at: new Date().toISOString(),
        })
        .eq('id', run.id);
    }

    return json({ ok: true, checked: checks.length, dead: dead.length, deactivated, detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'link health failed';
    console.error('[dhf-link-health]', message);
    if (run?.id) {
      await admin
        .from('dhf_link_health_runs')
        .update({ errors: 1, detail: [{ error: message }], finished_at: new Date().toISOString() })
        .eq('id', run.id);
    }
    return json({ ok: false, error: message }, 500);
  }
});
