// External (outside-platform) search: web, music and weather.
// Uses only free, keyless public APIs so it never blocks on secrets.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ExternalResult = {
  id: string;
  kind: 'web' | 'music' | 'weather';
  title: string;
  subtitle?: string;
  url?: string;
  thumbnail?: string;
};

const safeJson = async (url: string, ms = 6000): Promise<any | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'mmora-search/1.0' } });
    if (!res.ok) return null;
    return await res.json();
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const weatherSearch = async (query: string): Promise<ExternalResult[]> => {
  const place = query.replace(/\b(weather|forecast|temperature|climate|in|at|for|today)\b/gi, '').trim() || 'London';
  const geo = await safeJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`,
  );
  const hit = geo?.results?.[0];
  if (!hit) return [];
  const forecast = await safeJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
  );
  if (!forecast?.current) return [];
  const c = forecast.current;
  const d = forecast.daily;
  return [
    {
      id: `weather-${hit.id}`,
      kind: 'weather',
      title: `${hit.name}${hit.country ? `, ${hit.country}` : ''} — ${Math.round(c.temperature_2m)}°C`,
      subtitle: `Humidity ${c.relative_humidity_2m}% · Wind ${Math.round(c.wind_speed_10m)} km/h · High ${Math.round(d?.temperature_2m_max?.[0] ?? c.temperature_2m)}° / Low ${Math.round(d?.temperature_2m_min?.[0] ?? c.temperature_2m)}°`,
    },
  ];
};

const musicSearch = async (query: string): Promise<ExternalResult[]> => {
  const term = query.replace(/\b(music|song|songs|track|play|listen)\b/gi, '').trim() || query;
  const data = await safeJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=5`,
  );
  return (data?.results ?? []).map((track: any, index: number) => ({
    id: `music-${track.trackId ?? index}`,
    kind: 'music' as const,
    title: track.trackName ?? 'Unknown track',
    subtitle: [track.artistName, track.collectionName].filter(Boolean).join(' · '),
    url: track.trackViewUrl,
    thumbnail: track.artworkUrl100,
  }));
};

const webSearch = async (query: string): Promise<ExternalResult[]> => {
  const results: ExternalResult[] = [];

  const ddg = await safeJson(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
  );
  if (ddg?.AbstractText) {
    results.push({
      id: 'web-abstract',
      kind: 'web',
      title: ddg.Heading || query,
      subtitle: ddg.AbstractText,
      url: ddg.AbstractURL,
      thumbnail: ddg.Image ? `https://duckduckgo.com${ddg.Image}` : undefined,
    });
  }
  for (const topic of (ddg?.RelatedTopics ?? []).slice(0, 4)) {
    if (!topic?.Text) continue;
    results.push({
      id: `web-${topic.FirstURL ?? topic.Text.slice(0, 24)}`,
      kind: 'web',
      title: topic.Text.split(' - ')[0],
      subtitle: topic.Text,
      url: topic.FirstURL,
    });
  }

  if (results.length < 3) {
    const wiki = await safeJson(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=5&origin=*`,
    );
    for (const page of wiki?.query?.search ?? []) {
      results.push({
        id: `wiki-${page.pageid}`,
        kind: 'web',
        title: page.title,
        subtitle: String(page.snippet ?? '').replace(/<[^>]+>/g, ''),
        url: `https://en.wikipedia.org/?curid=${page.pageid}`,
      });
    }
  }

  return results.slice(0, 6);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    const term = String(query ?? '').trim();
    if (term.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const wantsWeather = /\b(weather|forecast|temperature|rain|climate)\b/i.test(term);
    const wantsMusic = /\b(music|song|songs|track|album|artist|play|listen)\b/i.test(term);

    // Intent-matched sources run first so they rank above generic web hits.
    const tasks: Promise<ExternalResult[]>[] = [];
    if (wantsWeather) tasks.push(weatherSearch(term));
    if (wantsMusic || !wantsWeather) tasks.push(musicSearch(term));
    tasks.push(webSearch(term));

    const settled = await Promise.allSettled(tasks);
    const results = settled.flatMap((entry) => (entry.status === 'fulfilled' ? entry.value : []));

    return new Response(JSON.stringify({ results: results.slice(0, 10) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[external-search] failed', error);
    return new Response(JSON.stringify({ results: [], error: String(error) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
