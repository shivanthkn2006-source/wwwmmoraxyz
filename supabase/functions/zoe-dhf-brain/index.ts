/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ZOE DHF BRAIN — consciousness ingestion + feed injection orchestrator
 *
 * Every search / chat / feed-click passes through here:
 *   1. resolve the caller from the JWT (never trust a client-supplied user_id)
 *   2. load the DHF profile (birth data + natal chart)
 *   3. compute deterministic day-lord telemetry (Swiss-Ephemeris grounded)
 *   4. embed the query with the sovereign embedding cascade (no Lovable AI)
 *   5. write the vector memory row into dhf_consciousness_memory
 *   6. inject personalised video recommendations into mmora_feed_items
 *
 * Every stage degrades independently: a missing embedding provider or missing
 * YouTube key never fails the request, it just reports `degraded`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { embedText } from '../_shared/zoe-embeddings.ts';
import { getDailyArchetype } from '../_shared/day-lord.ts';

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

function categorizeQuery(query: string): string {
  const q = (query || '').toLowerCase();
  if (/\b(quote|inspire|motivat|mind|peace|calm)\b/.test(q)) return 'inspirational_mind';
  if (/\b(code|ui|ux|3d|tech|algorithm|build|design)\b/.test(q)) return 'technical_creation';
  if (/\b(astro|astronomy|god|guru|karma|dharma|life|soul|philosoph)\b/.test(q)) return 'philosophical_dhf';
  if (/\b(sad|happy|angry|anxious|love|lonely|tired)\b/.test(q)) return 'emotional_state';
  return 'general_exploration';
}

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'how', 'why', 'who', 'are', 'was', 'you', 'your', 'about', 'into', 'have']);
function extractConcepts(query: string): string[] {
  return Array.from(
    new Set(
      (query || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP.has(w)),
    ),
  ).slice(0, 12);
}

/** YouTube Data API v3 search → mmora_feed_items. Keyless = silent no-op. */
async function injectYouTube(
  admin: ReturnType<typeof createClient>,
  userId: string,
  searchIntent: string,
  planetInfluence: string,
): Promise<{ injected: number; reason?: string }> {
  const key = Deno.env.get('YOUTUBE_API_KEY') || Deno.env.get('GOOGLE_AI_STUDIO_KEY');
  if (!key) return { injected: 0, reason: 'missing_youtube_key' };
  const term = (searchIntent || '').trim();
  if (term.length < 2) return { injected: 0, reason: 'query_too_short' };

  try {
    const endpoint =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&safeSearch=moderate` +
      `&q=${encodeURIComponent(term)}&type=video&key=${key}`;
    const res = await fetch(endpoint);
    if (!res.ok) {
      return { injected: 0, reason: `youtube_${res.status}` };
    }
    const data = await res.json();
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    if (!items.length) return { injected: 0, reason: 'no_results' };

    const rows = items
      .filter((i) => i?.id?.videoId)
      .map((item, index) => ({
        user_id: userId,
        video_id: String(item.id.videoId),
        title: String(item.snippet?.title ?? 'Untitled'),
        channel_title: String(item.snippet?.channelTitle ?? ''),
        thumbnail_url: String(
          item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
        ),
        triggered_by_query: term.slice(0, 180),
        astrological_tag: planetInfluence,
        relevance_score: Number((1 - index * 0.1).toFixed(2)),
        is_viewed: false,
      }));
    if (!rows.length) return { injected: 0, reason: 'no_video_ids' };

    const { error } = await admin
      .from('mmora_feed_items')
      .upsert(rows, { onConflict: 'user_id,video_id', ignoreDuplicates: true });
    if (error) return { injected: 0, reason: `db_${error.code || 'error'}` };
    return { injected: rows.length };
  } catch (e) {
    return { injected: 0, reason: `exception_${(e as Error)?.message?.slice(0, 60)}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const scoped = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await scoped.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: 'unauthorized' }, 401);

  let body: { query?: string; contextType?: string; injectFeed?: boolean; timezone?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const query = (body.query || '').trim().slice(0, 2000);
  const contextType = body.contextType || 'search';
  const admin = createClient(url, service);
  const degraded: string[] = [];

  // 1. DHF profile (may not exist yet)
  const { data: profile } = await admin
    .from('dhf_profiles')
    .select('birth_date, birth_time, birth_timezone, natal_chart')
    .eq('user_id', user.id)
    .maybeSingle();

  const timeZone = body.timezone || (profile?.birth_timezone as string) || 'Asia/Kolkata';

  // 2. Deterministic telemetry
  const dailyTelemetry = getDailyArchetype(new Date(), timeZone);
  const archetype = `${dailyTelemetry.rulingPlanet}_${dailyTelemetry.archetype.split(' ')[0]}`;

  if (!query) {
    return json({ success: true, dailyTelemetry, natalAlignment: profile?.natal_chart ?? null, memoryStored: false, feed: { injected: 0, reason: 'empty_query' }, degraded: ['empty_query'] });
  }

  // 3. Embedding (sovereign cascade: Google → OpenRouter → NVIDIA)
  let embedding: number[] | null = null;
  try {
    embedding = await embedText(query);
  } catch (e) {
    console.warn('[zoe-dhf-brain] embed failed', e);
  }
  if (!embedding) degraded.push('embedding_unavailable');

  // 4. Consciousness memory write (stored even without a vector)
  const { error: memError } = await admin.from('dhf_consciousness_memory').insert({
    user_id: user.id,
    category: categorizeQuery(query),
    raw_query: query,
    extracted_concepts: extractConcepts(query),
    archetype_influence: archetype,
    embedding,
    metadata: { contextType, timezone: timeZone, timestamp: new Date().toISOString() },
  });
  if (memError) {
    console.error('[zoe-dhf-brain] memory insert failed', memError);
    degraded.push('memory_write_failed');
  }

  // 5. Feed injection (opt-out via injectFeed: false)
  const feed = body.injectFeed === false
    ? { injected: 0, reason: 'skipped' }
    : await injectYouTube(admin, user.id, query, archetype);
  if (feed.reason && feed.injected === 0) degraded.push(`feed_${feed.reason}`);

  return json({
    success: true,
    dailyTelemetry,
    natalAlignment: profile?.natal_chart ?? null,
    hasProfile: Boolean(profile?.birth_date),
    memoryStored: !memError,
    feed,
    degraded,
  });
});
