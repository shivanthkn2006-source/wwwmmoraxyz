import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSwissPositions, swissEngineMode } from '../_shared/swiss-ephemeris.ts';
import { getPrecisePositions, precisTransits, vimshottariDasha } from '../_shared/ephemeris-precision.ts';
import { zonedTimeToUtc } from '../_shared/astro-engine.ts';

const CACHE_MS = 6 * 60 * 60 * 1000;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

type BirthRow = {
  birth_date: string | null;
  birth_time: string | null;
  birth_timezone: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
};

const PLANET_MOODS: Record<string, string[]> = {
  Sun: ['uplifting', 'confident'], Moon: ['calm', 'reflective'], Mercury: ['focus', 'lyrical'],
  Venus: ['romantic', 'melodic'], Mars: ['energetic', 'workout'], Jupiter: ['joyful', 'devotional'],
  Saturn: ['deep focus', 'ambient'], Rahu: ['electronic', 'experimental'], Ketu: ['meditation', 'instrumental'],
};

function uniqueFive(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim().toLowerCase()).filter((value): value is string => Boolean(value)))].slice(0, 5);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) return json({ error: 'Music Connect is not configured.' }, 500);

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: auth, error: authError } = await caller.auth.getUser();
    if (authError || !auth.user) return json({ error: 'Invalid session' }, 401);
    const body = await req.json().catch(() => ({}));
    const force = body && typeof body === 'object' && (body as { force?: unknown }).force === true;
    const service = createClient(url, serviceKey);
    const now = new Date();

    if (!force) {
      const { data: cached } = await service.from('music_connect_context').select('*').eq('user_id', auth.user.id).maybeSingle();
      if (cached && Date.parse(cached.expires_at) > now.getTime()) return json({ ...cached, cached: true });
    }

    const [{ data: birth }, { data: profile }, { data: listens }] = await Promise.all([
      service.from('astro_profiles').select('birth_date,birth_time,birth_timezone,birth_latitude,birth_longitude').eq('user_id', auth.user.id).maybeSingle(),
      service.from('music_profiles').select('genres,moods,artists,favorite_tracks').eq('user_id', auth.user.id).maybeSingle(),
      service.from('music_listens').select('track_artist,track_title,created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(100),
    ]);

    const artists = (profile?.artists ?? []) as string[];
    const genres = (profile?.genres ?? []) as string[];
    const moods = (profile?.moods ?? []) as string[];
    const recentArtists = [...new Set((listens ?? []).map((row) => row.track_artist).filter(Boolean))] as string[];
    const recentTracks = [...new Set((listens ?? []).map((row) => row.track_title).filter(Boolean))] as string[];
    const planetary: Record<string, unknown> = { engine: 'none', calculatedAt: now.toISOString(), completeBirthData: false };
    const astroKeywords: string[] = [];

    const birthRow = birth as BirthRow | null;
    const sky = await getSwissPositions(now);
    planetary.engine = `Swiss Ephemeris ${swissEngineMode()}`;
    planetary.currentMoon = { sign: sky.Moon.siderealSign, nakshatra: sky.Moon.nakshatra, pada: sky.Moon.pada };
    astroKeywords.push(...(PLANET_MOODS.Moon ?? []));

    if (birthRow?.birth_date) {
      const natalUtc = zonedTimeToUtc(
        birthRow.birth_date.slice(0, 10),
        (birthRow.birth_time || '12:00').slice(0, 5),
        birthRow.birth_timezone || 'Asia/Kolkata',
      );
      const dasha = vimshottariDasha(natalUtc, 9).current;
      planetary.completeBirthData = Boolean(birthRow.birth_time && birthRow.birth_timezone && birthRow.birth_latitude != null && birthRow.birth_longitude != null);
      planetary.dasha = dasha;
      if (dasha) astroKeywords.push(...(PLANET_MOODS[dasha.maha] ?? []), ...(PLANET_MOODS[dasha.antar] ?? []));
      const natal = getPrecisePositions(natalUtc);
      const tightTransit = precisTransits(natal, sky).find((transit) => transit.orb <= 2);
      if (tightTransit) {
        planetary.tightestTransit = tightTransit;
        astroKeywords.push(...(PLANET_MOODS[tightTransit.transitBody] ?? []));
      }
    }

    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: birthRow?.birth_timezone || 'Asia/Kolkata' }).format(now));
    const timeKeyword = hour < 6 ? 'sleep ambient' : hour < 11 ? 'morning uplifting' : hour < 17 ? 'focus music' : hour < 22 ? 'evening chill' : 'calm night';
    const suggestions = uniqueFive([moods[0], genres[0], artists[0], astroKeywords[0], timeKeyword, recentArtists[0], recentTracks[0]]);
    const defaults = ['calm music', 'focus music', 'uplifting music', 'melodic music', 'evening chill'];
    for (const fallback of defaults) if (suggestions.length < 5 && !suggestions.includes(fallback)) suggestions.push(fallback);

    const context = {
      user_id: auth.user.id,
      taste_vector: { genres: genres.slice(0, 10), moods: moods.slice(0, 10), artists: [...artists, ...recentArtists].slice(0, 10), recentTracks: recentTracks.slice(0, 10) },
      suggestion_keywords: suggestions.slice(0, 5),
      planetary_context: planetary,
      source_fingerprint: [profile?.genres?.length ?? 0, profile?.moods?.length ?? 0, profile?.artists?.length ?? 0, listens?.length ?? 0, now.toISOString().slice(0, 13)].join(':'),
      calculated_at: now.toISOString(),
      expires_at: new Date(now.getTime() + CACHE_MS).toISOString(),
      updated_at: now.toISOString(),
    };
    const { error: saveError } = await service.from('music_connect_context').upsert(context, { onConflict: 'user_id' });
    if (saveError) throw saveError;
    return json({ ...context, cached: false });
  } catch (error) {
    console.error('[music-connect-context]', error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : 'Music Connect failed.' }, 500);
  }
});