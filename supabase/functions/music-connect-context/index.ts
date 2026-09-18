// ═══════════════════════════════════════════════════════════════════════════════
// MUSIC CONNECT CONTEXT
// Deterministic, owner-scoped music suggestion context.
//
// Suggestions are derived ONLY from real calculations and the member's own saved
// preferences — never from a language model, never from random values:
//   • current planetary hour (hora) lord and weekday (day) lord
//   • current sidereal Moon sign + nakshatra
//   • Vimshottari maha/antar dasha from the stored natal chart
//   • tightest current transit to the natal chart (orb <= 2 degrees)
//   • the member's saved genres and moods
//   • the member's declared religion (devotional keyword, if set)
//
// Artist names and previously played track titles are deliberately NOT used as
// suggestions: members asked for mood/situation keywords, not their own history
// echoed back. The cache lives one hour because the hora lord changes hourly.
// Raw birth details never leave this function.
// ═══════════════════════════════════════════════════════════════════════════════
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSwissPositions, swissEngineMode } from '../_shared/swiss-ephemeris.ts';
import { getPrecisePositions, precisTransits, vimshottariDasha } from '../_shared/ephemeris-precision.ts';
import { zonedTimeToUtc } from '../_shared/astro-engine.ts';
import { getDailyArchetype } from '../_shared/day-lord.ts';

/** The hora lord changes every hour, so the derived context must too. */
const CACHE_MS = 60 * 60 * 1000;
const SUGGESTION_COUNT = 10;

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

/** Mood/music words each planet governs — fixed table, no generation. */
const PLANET_MOODS: Record<string, string[]> = {
  Sun: ['uplifting', 'confident anthems'],
  Moon: ['calm', 'reflective'],
  Mercury: ['focus music', 'lyrical'],
  Venus: ['romantic', 'melodic'],
  Mars: ['energetic', 'workout energy'],
  Jupiter: ['joyful', 'devotional'],
  Saturn: ['deep focus', 'ambient'],
  Rahu: ['electronic', 'experimental'],
  Ketu: ['meditation', 'instrumental'],
};

/** Nakshatra families → the texture that sits well with that lunar mansion. */
const NAKSHATRA_MOODS: Record<string, string> = {
  Ashwini: 'bright morning energy', Bharani: 'grounding rhythm', Krittika: 'sharp percussion',
  Rohini: 'melodic warmth', Mrigashira: 'wandering flute', Ardra: 'stormy strings',
  Punarvasu: 'gentle revival', Pushya: 'nurturing chants', Ashlesha: 'deep hypnotic',
  Magha: 'regal classical', 'Purva Phalguni': 'playful romance', 'Uttara Phalguni': 'steady harmony',
  Hasta: 'skilful instrumental', Chitra: 'colourful fusion', Swati: 'airy acoustic',
  Vishakha: 'determined build', Anuradha: 'devotional bhajan', Jyeshtha: 'intense orchestral',
  Mula: 'root deep bass', 'Purva Ashadha': 'flowing water sounds', 'Uttara Ashadha': 'victory march',
  Shravana: 'listening ambience', Dhanishta: 'rhythmic groove', Shatabhisha: 'healing frequencies',
  'Purva Bhadrapada': 'mystic drone', 'Uttara Bhadrapada': 'calm depth', Revati: 'soft lullaby',
};

/** Faith-aware devotional keywords, used only when the member declared one. */
const RELIGION_KEYWORDS: Record<string, string[]> = {
  hindu: ['bhajan', 'sanskrit chants', 'carnatic devotional', 'aarti', 'kirtan', 'vedic mantra'],
  christian: ['worship songs', 'gospel', 'hymns', 'contemporary christian', 'choir praise', 'gregorian chant'],
  muslim: ['naat', 'sufi qawwali', 'nasheed', 'islamic dhikr', 'quran recitation'],
  islam: ['naat', 'sufi qawwali', 'nasheed', 'islamic dhikr', 'quran recitation'],
  buddhist: ['buddhist chants', 'zen meditation', 'tibetan singing bowls', 'pali suttas'],
  sikh: ['shabad kirtan', 'gurbani', 'japji sahib', 'sikh simran'],
  jain: ['jain stavan', 'peaceful chants', 'navkar mantra', 'jain bhakti'],
  jewish: ['niggun', 'jewish prayer songs', 'cantorial chazzanut', 'shabbat songs'],
  spiritual: ['sacred chants', 'meditation music', 'healing frequencies', 'devotional instrumental'],
  none: [],
};

/** Chaldean order used for the classical planetary hour (hora) sequence. */
const CHALDEAN = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
const DAY_LORD_SEQUENCE = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

/**
 * Classical planetary hour: the first hora of a day belongs to the day lord and
 * subsequent horas follow the Chaldean order. Hours are measured from local
 * midnight-relative sunrise approximation (06:00 local), the convention already
 * used elsewhere in the platform for hora tagging.
 */
function planetaryHoraLord(now: Date, timeZone: string): { lord: string; index: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = weekdayMap[get('weekday')] ?? now.getUTCDay();
  const hour = Number(get('hour')) || 0;
  const minutes = Number(get('minute')) || 0;
  // Hours elapsed since 06:00 local; before sunrise belongs to the previous day.
  const elapsed = hour + minutes / 60 - 6;
  const sinceSunrise = elapsed >= 0 ? elapsed : elapsed + 24;
  const dayIndex = elapsed >= 0 ? weekday : (weekday + 6) % 7;
  const dayLord = DAY_LORD_SEQUENCE[dayIndex];
  const start = CHALDEAN.indexOf(dayLord);
  const horaIndex = Math.floor(sinceSunrise);
  return { lord: CHALDEAN[(start + horaIndex) % 7], index: horaIndex + 1 };
}

function uniqueKeywords(values: Array<string | null | undefined>): string[] {
  return [...new Set(
    values
      .map((value) => value?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value) && (value as string).length > 1),
  )].slice(0, SUGGESTION_COUNT);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authHeader = req.headers.get('authorization') ?? '';
  // A signed-out or expired visitor is an expected state, not a failure: answer
  // 200 with an empty context so the Music page keeps its fallback suggestions
  // instead of surfacing a runtime error.
  if (!authHeader.startsWith('Bearer ')) return json({ signed_out: true, suggestion_keywords: [], taste_vector: {}, planetary_context: {}, expires_at: null });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) return json({ error: 'Music Connect is not configured.' }, 500);

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: auth, error: authError } = await caller.auth.getUser();
    if (authError || !auth.user) return json({ signed_out: true, suggestion_keywords: [], taste_vector: {}, planetary_context: {}, expires_at: null });
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
      service.from('music_profiles').select('genres,moods,artists,religion,favorite_tracks').eq('user_id', auth.user.id).maybeSingle(),
      service.from('music_listens').select('track_artist,track_title,created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(100),
    ]);

    const artists = (profile?.artists ?? []) as string[];
    const genres = (profile?.genres ?? []) as string[];
    const moods = (profile?.moods ?? []) as string[];
    const religion = typeof profile?.religion === 'string' ? profile.religion.trim().toLowerCase() : '';
    const recentArtists = [...new Set((listens ?? []).map((row) => row.track_artist).filter(Boolean))] as string[];
    const recentTracks = [...new Set((listens ?? []).map((row) => row.track_title).filter(Boolean))] as string[];

    const timeZone = birth?.birth_timezone || 'Asia/Kolkata';
    const planetary: Record<string, unknown> = { engine: 'none', calculatedAt: now.toISOString(), completeBirthData: false };
    // Astro keywords are ordered by how strongly they describe *this hour*.
    const astroKeywords: string[] = [];

    const sky = await getSwissPositions(now);
    planetary.engine = `Swiss Ephemeris ${swissEngineMode()}`;
    planetary.currentMoon = { sign: sky.Moon.siderealSign, nakshatra: sky.Moon.nakshatra, pada: sky.Moon.pada };

    // 1. Planetary hour — the fastest-moving real signal, so it leads.
    const hora = planetaryHoraLord(now, timeZone);
    const dayLord = getDailyArchetype(now, timeZone);
    planetary.hora = { lord: hora.lord, index: hora.index };
    planetary.dayLord = { day: dayLord.dayName, planet: dayLord.rulingPlanet, focus: dayLord.dailyFocus };
    astroKeywords.push(...(PLANET_MOODS[hora.lord] ?? []));

    // 2. Current Moon nakshatra texture and Moon mood.
    const nakshatraMood = NAKSHATRA_MOODS[sky.Moon.nakshatra];
    if (nakshatraMood) astroKeywords.push(nakshatraMood);
    astroKeywords.push(...(PLANET_MOODS.Moon ?? []));

    // 3. Day lord.
    astroKeywords.push(...(PLANET_MOODS[dayLord.rulingPlanet] ?? []));

    const birthRow = birth as BirthRow | null;
    if (birthRow?.birth_date) {
      const natalUtc = zonedTimeToUtc(
        birthRow.birth_date.slice(0, 10),
        (birthRow.birth_time || '12:00').slice(0, 5),
        timeZone,
      );
      const dasha = vimshottariDasha(natalUtc, 9).current;
      planetary.completeBirthData = Boolean(birthRow.birth_time && birthRow.birth_timezone && birthRow.birth_latitude != null && birthRow.birth_longitude != null);
      planetary.dasha = dasha;
      // 4. Dasha (life-period colour) and 5. tightest transit (situation of the day).
      if (dasha) astroKeywords.push(...(PLANET_MOODS[dasha.antar] ?? []), ...(PLANET_MOODS[dasha.maha] ?? []));
      const natal = getPrecisePositions(natalUtc);
      const tightTransit = precisTransits(natal, sky).find((transit) => transit.orb <= 2);
      if (tightTransit) {
        planetary.tightestTransit = tightTransit;
        astroKeywords.push(...(PLANET_MOODS[tightTransit.transitBody] ?? []));
      }
    }

    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone }).format(now));
    const timeKeyword = hour < 6 ? 'sleep ambient' : hour < 11 ? 'morning uplifting' : hour < 17 ? 'focus music' : hour < 22 ? 'evening chill' : 'calm night';
    planetary.timeOfDay = timeKeyword;
    const faithKeywords = RELIGION_KEYWORDS[religion] ?? (religion ? [`${religion} devotional`, `${religion} prayer songs`] : []);
    planetary.religion = religion || null;
    // Faith words are published so the app can search and recommend devotional
    // music for the member's own faith, not only planetary moods.
    planetary.faithKeywords = faithKeywords;

    // Planet-derived words first, then the member's own saved moods/genres and
    // faith, then the hour of day. No artist names, no played track titles.
    const suggestions = uniqueKeywords([
      astroKeywords[0], astroKeywords[1], astroKeywords[2], astroKeywords[3],
      moods[0], genres[0], faithKeywords[0],
      astroKeywords[4], astroKeywords[5],
      timeKeyword,
      moods[1], genres[1], faithKeywords[1],
      ...astroKeywords.slice(6),
    ]);
    const defaults = ['calm music', 'focus music', 'uplifting music', 'melodic music', 'evening chill', 'morning uplifting', 'sleep ambient', 'devotional music', 'workout energy', 'instrumental meditation'];
    for (const fallback of defaults) if (suggestions.length < SUGGESTION_COUNT && !suggestions.includes(fallback)) suggestions.push(fallback);

    const context = {
      user_id: auth.user.id,
      // Taste still records artists/tracks — Zoe uses them to *play* music and to
      // talk about taste; they are simply never shown as search suggestions.
      taste_vector: { genres: genres.slice(0, 10), moods: moods.slice(0, 10), artists: [...artists, ...recentArtists].slice(0, 10), recentTracks: recentTracks.slice(0, 10), religion: religion || null },
      suggestion_keywords: suggestions.slice(0, SUGGESTION_COUNT),
      planetary_context: planetary,
      source_fingerprint: [genres.length, moods.length, artists.length, listens?.length ?? 0, religion, hora.lord, now.toISOString().slice(0, 13)].join(':'),
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
