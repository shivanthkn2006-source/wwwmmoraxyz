// External (outside-platform) search: web, images, news, videos, music,
// weather and shopping products. Uses free/keyless public APIs by default so
// results never block on secrets. Every result is normalised into one shape so
// the M'Mora home feed can render it inline (nothing opens outside the app).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ExternalKind = 'web' | 'music' | 'weather' | 'video' | 'image' | 'news' | 'shopping';

type ExternalResult = {
  id: string;
  kind: ExternalKind;
  title: string;
  subtitle?: string;
  url?: string;
  thumbnail?: string;
  /** Full-bleed media for in-feed rendering (images/products). */
  image?: string;
  source?: string;
  publishedAt?: string;
  /** Structured product facts rendered as tags on shopping cards. */
  price?: string;
  availability?: string;
  rating?: number;
  reviews?: number;
  location?: string;
  /** Extra key/value chips (portal details, categories, brands…). */
  tags?: string[];
};

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const safeJson = async (url: string, ms = 9000): Promise<any | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) {
      console.warn('[external-search] json fetch failed', res.status, new URL(url).host);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.warn('[external-search] json fetch threw', new URL(url).host, String(error));
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const safeText = async (url: string, ms = 9000): Promise<string | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml' } });
    if (!res.ok) {
      console.warn('[external-search] text fetch failed', res.status, new URL(url).host);
      return null;
    }
    return await res.text();
  } catch (error) {
    console.warn('[external-search] text fetch threw', new URL(url).host, String(error));
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const stripTags = (value: string) => value.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();

const WEATHER_CODE: Record<number, string> = {
  0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow',
  75: 'Heavy snow', 77: 'Snow grains', 80: 'Rain showers', 81: 'Rain showers',
  82: 'Violent rain showers', 85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail',
};

/**
 * Local weather: today's detailed card plus the next 7 daily cards.
 * Uses the caller's coordinates when available, otherwise the typed place.
 */
const weatherSearch = async (
  query: string,
  coords?: { lat?: number; lon?: number },
): Promise<ExternalResult[]> => {
  const place = query.replace(/\b(weather|forecast|temperature|climate|in|at|for|today|tomorrow|week|my|local|here)\b/gi, '').trim();

  let latitude: number | undefined;
  let longitude: number | undefined;
  let label = '';

  if (place) {
    const geo = await safeJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`,
    );
    const hit = geo?.results?.[0];
    if (hit) {
      latitude = hit.latitude;
      longitude = hit.longitude;
      label = `${hit.name}${hit.admin1 ? `, ${hit.admin1}` : ''}${hit.country ? `, ${hit.country}` : ''}`;
    }
  }

  if (latitude === undefined && typeof coords?.lat === 'number' && typeof coords?.lon === 'number') {
    latitude = coords.lat;
    longitude = coords.lon;
    const rev = await safeJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lon}&localityLanguage=en`,
    );
    label = [rev?.city || rev?.locality, rev?.principalSubdivision, rev?.countryName].filter(Boolean).join(', ') || 'Your location';
  }

  if (latitude === undefined || longitude === undefined) return [];

  const forecast = await safeJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,wind_speed_10m_max` +
      `&forecast_days=8&timezone=auto`,
  );
  if (!forecast?.current || !forecast?.daily) return [];

  const c = forecast.current;
  const d = forecast.daily;
  const name = label || 'Your location';
  const results: ExternalResult[] = [
    {
      id: `weather-today-${latitude}-${longitude}`,
      kind: 'weather',
      title: `${name} — ${Math.round(c.temperature_2m)}°C, ${WEATHER_CODE[c.weather_code] ?? 'Now'}`,
      subtitle:
        `Feels like ${Math.round(c.apparent_temperature)}° · Humidity ${c.relative_humidity_2m}% · ` +
        `Wind ${Math.round(c.wind_speed_10m)} km/h · High ${Math.round(d.temperature_2m_max?.[0])}° / Low ${Math.round(d.temperature_2m_min?.[0])}° · ` +
        `Rain chance ${d.precipitation_probability_max?.[0] ?? 0}% · Sunrise ${String(d.sunrise?.[0] ?? '').slice(11)} · Sunset ${String(d.sunset?.[0] ?? '').slice(11)}`,
      location: name,
      source: 'Open-Meteo',
      tags: [
        'Today',
        `Now ${Math.round(c.temperature_2m)}°C`,
        `High ${Math.round(d.temperature_2m_max?.[0])}°`,
        `Low ${Math.round(d.temperature_2m_min?.[0])}°`,
        `Rain ${d.precipitation_probability_max?.[0] ?? 0}%`,
      ],
    },
  ];

  for (let i = 1; i < Math.min(8, d.time?.length ?? 0); i++) {
    const day = new Date(`${d.time[i]}T12:00:00`);
    results.push({
      id: `weather-day-${d.time[i]}-${latitude}`,
      kind: 'weather',
      title: `${day.toLocaleDateString('en-US', { weekday: 'long' })} — ${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°`,
      subtitle: `${name} · ${WEATHER_CODE[d.weather_code?.[i]] ?? 'Forecast'} · Rain ${d.precipitation_probability_max?.[i] ?? 0}% · Wind ${Math.round(d.wind_speed_10m_max?.[i] ?? 0)} km/h`,
      location: name,
      source: 'Open-Meteo',
      publishedAt: d.time[i],
      tags: [day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })],
    });
  }

  return results;
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
    image: track.artworkUrl100?.replace('100x100', '600x600'),
    source: 'Apple Music',
    price: typeof track.trackPrice === 'number' && track.trackPrice > 0 ? `$${track.trackPrice.toFixed(2)}` : undefined,
  }));
};

/**
 * YouTube video results. Uses YOUTUBE_API_KEY when present, otherwise the
 * shared GOOGLE_API_KEY. Keyless = silent no-op so search never breaks.
 */
const videoSearch = async (query: string): Promise<ExternalResult[]> => {
  const term = query.replace(/\b(video|videos|watch|youtube)\b/gi, ' ').trim() || query;
  const key =
    Deno.env.get('YOUTUBE_API_KEY') ||
    Deno.env.get('GOOGLE_API_KEY') ||
    Deno.env.get('GOOGLE_AI_STUDIO_KEY');
  if (key) {
    const data = await safeJson(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&safeSearch=moderate&maxResults=10` +
        `&q=${encodeURIComponent(term)}&key=${key}`,
    );
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    if (items.length) {
      return items
        .filter((item) => item?.id?.videoId)
        .map((item) => ({
          id: `video-${item.id.videoId}`,
          kind: 'video' as const,
          title: String(item.snippet?.title ?? 'Video'),
          subtitle: String(item.snippet?.channelTitle ?? 'YouTube'),
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          thumbnail:
            item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || undefined,
          source: 'YouTube',
          publishedAt: item.snippet?.publishedAt,
        }));
    }
    console.warn('[external-search] youtube api returned nothing (quota/key) — using keyless fallback');
  }

  // Keyless fallback: read the public results page and lift the video ids, so
  // the Videos lane keeps working when the API key is missing or over quota.
  const html = await safeText(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}&sp=EgIQAQ%253D%253D&hl=en&gl=US`,
  );
  if (!html) return [];
  const seen = new Set<string>();
  const results: ExternalResult[] = [];
  const re = /"videoId":"([\w-]{6,})"[\s\S]{0,600}?"text":"([^"]{3,120})"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && results.length < 10) {
    const [, id, title] = match;
    if (seen.has(id)) continue;
    seen.add(id);
    results.push({
      id: `video-${id}`,
      kind: 'video',
      title: title.replace(/\\u0026/g, '&'),
      subtitle: 'YouTube',
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      source: 'YouTube',
    });
  }
  if (!results.length) console.warn('[external-search] video search returned no items');
  return results;
};

/** Images: Openverse first, Wikimedia Commons as the always-on fallback. */
const imageSearch = async (query: string): Promise<ExternalResult[]> => {
  const term = query.replace(/\b(image|images|photo|photos|picture|pictures)\b/gi, ' ').trim() || query;
  const data = await safeJson(
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(term)}&page_size=8&mature=false`,
    5000,
  );
  const items: any[] = Array.isArray(data?.results) ? data.results : [];
  if (items.length) {
    return items
      .filter((item) => item?.url)
      .map((item) => ({
        id: `image-${item.id}`,
        kind: 'image' as const,
        title: String(item.title || term),
        subtitle: [item.creator, item.license?.toUpperCase()].filter(Boolean).join(' · '),
        url: item.foreign_landing_url || item.url,
        thumbnail: item.thumbnail || item.url,
        image: item.url,
        source: String(item.source || 'Openverse'),
        tags: [item.license ? `License ${String(item.license).toUpperCase()}` : null, item.provider].filter(Boolean) as string[],
      }));
  }

  const commons = await safeJson(
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(term)}` +
      `&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900&format=json&origin=*`,
  );
  const pages: any[] = Object.values(commons?.query?.pages ?? {});
  return pages
    .map((page) => {
      const info = page?.imageinfo?.[0];
      if (!info?.thumburl) return null;
      return {
        id: `image-commons-${page.pageid}`,
        kind: 'image' as const,
        title: String(page.title ?? term).replace(/^File:/, ''),
        subtitle: 'Wikimedia Commons',
        url: info.descriptionurl || info.url,
        thumbnail: info.thumburl,
        image: info.thumburl,
        source: 'Wikimedia Commons',
      };
    })
    .filter(Boolean) as ExternalResult[];
};

/** News via keyless RSS: Google News first, Bing News as fallback. */
const parseRssItems = (xml: string, fallbackSource: string): ExternalResult[] =>
  xml
    .split('<item>')
    .slice(1, 9)
    .map((block, index) => {
      const pick = (tag: string) => {
        const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return match ? stripTags(match[1].replace(/<!\[CDATA\[|\]\]>/g, '')) : '';
      };
      const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1]?.trim();
      return {
        id: `news-${index}-${(link || '').slice(-16)}`,
        kind: 'news' as const,
        title: pick('title') || 'News story',
        subtitle: pick('description').slice(0, 200),
        url: link,
        source: pick('source') || fallbackSource,
        publishedAt: pick('pubDate'),
      };
    })
    .filter((item) => item.title && item.title !== 'News story');

const newsSearch = async (query: string): Promise<ExternalResult[]> => {
  const google = await safeText(
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
  );
  const fromGoogle = google ? parseRssItems(google, 'Google News') : [];
  if (fromGoogle.length) return fromGoogle;
  const bing = await safeText(`https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=RSS`);
  return bing ? parseRssItems(bing, 'Bing News') : [];
};

/**
 * Shopping products with price, availability, rating, review count and portal
 * details. Uses SERPAPI_KEY (Google Shopping) when configured; otherwise falls
 * back to a keyless catalogue so the shopping lane is never structurally empty.
 */
const shoppingSearch = async (query: string): Promise<ExternalResult[]> => {
  const term = query.replace(/\b(buy|shop|shopping|price|cheap|deal|deals|product|products)\b/gi, ' ').trim() || query;
  const serpKey = Deno.env.get('SERPAPI_KEY');
  if (serpKey) {
    const data = await safeJson(
      `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(term)}&num=8&api_key=${serpKey}`,
    );
    const items: any[] = Array.isArray(data?.shopping_results) ? data.shopping_results : [];
    if (items.length) {
      return items.slice(0, 8).map((item, index) => ({
        id: `shop-${item.product_id ?? index}`,
        kind: 'shopping' as const,
        title: String(item.title ?? 'Product'),
        subtitle: [item.source, item.delivery].filter(Boolean).join(' · '),
        url: item.product_link || item.link,
        thumbnail: item.thumbnail,
        image: item.thumbnail,
        source: String(item.source ?? 'Google Shopping'),
        price: item.price ? String(item.price) : undefined,
        availability: item.delivery ? String(item.delivery) : 'See portal',
        rating: typeof item.rating === 'number' ? item.rating : undefined,
        reviews: typeof item.reviews === 'number' ? item.reviews : undefined,
        location: item.store_location ? String(item.store_location) : undefined,
        tags: [item.source, item.delivery, item.extensions?.[0]].filter(Boolean) as string[],
      }));
    }
  }

  const data = await safeJson(`https://dummyjson.com/products/search?q=${encodeURIComponent(term)}&limit=8`);
  const items: any[] = Array.isArray(data?.products) ? data.products : [];
  return items.map((item) => ({
    id: `shop-${item.id}`,
    kind: 'shopping' as const,
    title: String(item.title ?? 'Product'),
    subtitle: [item.brand, item.category].filter(Boolean).join(' · '),
    url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.title ?? term)}`,
    thumbnail: item.thumbnail,
    image: item.images?.[0] || item.thumbnail,
    source: String(item.brand || 'Catalogue'),
    price: typeof item.price === 'number'
      ? `$${item.price.toFixed(2)}${item.discountPercentage ? ` (-${Math.round(item.discountPercentage)}%)` : ''}`
      : undefined,
    availability: item.availabilityStatus || (item.stock > 0 ? `In stock (${item.stock})` : 'Out of stock'),
    rating: typeof item.rating === 'number' ? item.rating : undefined,
    reviews: Array.isArray(item.reviews) ? item.reviews.length : undefined,
    location: item.meta?.barcode ? undefined : undefined,
    tags: [item.brand, item.category, item.warrantyInformation, item.shippingInformation].filter(Boolean) as string[],
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
      source: ddg.AbstractSource || 'DuckDuckGo',
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
      source: 'DuckDuckGo',
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
        source: 'Wikipedia',
      });
    }
  }

  return results.slice(0, 6);
};

/** Long-tail knowledge: Wikipedia summary + Internet Archive holdings. */
const archiveSearch = async (query: string): Promise<ExternalResult[]> => {
  const results: ExternalResult[] = [];

  const summary = await safeJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
    6000,
  );
  if (summary?.extract) {
    results.push({
      id: `wiki-summary-${summary.pageid ?? query}`,
      kind: 'web',
      title: stripTags(String(summary.title ?? query)),
      subtitle: stripTags(String(summary.extract)).slice(0, 320),
      url: summary.content_urls?.desktop?.page,
      thumbnail: summary.thumbnail?.source,
      image: summary.originalimage?.source,
      source: 'Wikipedia',
      tags: ['Encyclopedia'],
    });
  }

  const archive = await safeJson(
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}` +
      `&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=mediatype&fl%5B%5D=year&rows=5&page=1&output=json`,
    8000,
  );
  for (const doc of archive?.response?.docs ?? []) {
    if (!doc?.identifier) continue;
    results.push({
      id: `archive-${doc.identifier}`,
      kind: 'web',
      title: stripTags(String(doc.title ?? doc.identifier)),
      subtitle: `Internet Archive · ${doc.mediatype ?? 'item'}${doc.year ? ` · ${doc.year}` : ''}`,
      url: `https://archive.org/details/${doc.identifier}`,
      thumbnail: `https://archive.org/services/img/${doc.identifier}`,
      source: 'archive.org',
      tags: [String(doc.mediatype ?? 'item')],
    });
  }

  return results;
};

/** Final hygiene pass — no HTML/entity artifacts ever leave this function. */
const sanitizeResult = (item: ExternalResult): ExternalResult => ({
  ...item,
  title: stripTags(item.title ?? '') || item.title,
  subtitle: item.subtitle ? stripTags(item.subtitle) : item.subtitle,
  tags: item.tags?.map((tag) => stripTags(tag)).filter(Boolean),
});



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

    // Every lane runs in parallel so one slow/broken source can never blank the
    // others; intent-matched lanes are simply ordered first.
    const tasks: Promise<ExternalResult[]>[] = [];
    if (wantsWeather) tasks.push(weatherSearch(term));
    if (wantsMusic) tasks.push(musicSearch(term));
    tasks.push(videoSearch(term));
    tasks.push(imageSearch(term));
    tasks.push(newsSearch(term));
    tasks.push(shoppingSearch(term));
    tasks.push(webSearch(term));
    tasks.push(archiveSearch(term));
    if (!wantsMusic) tasks.push(musicSearch(term));

    const settled = await Promise.allSettled(tasks);
    const degraded: string[] = [];
    settled.forEach((entry, index) => {
      if (entry.status === 'rejected') degraded.push(String(index));
    });
    const seen = new Set<string>();
    const results = settled
      .flatMap((entry) => (entry.status === 'fulfilled' ? entry.value : []))
      .filter((item) => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .map(sanitizeResult);


    const counts = results.reduce<Record<string, number>>((acc, item) => {
      acc[item.kind] = (acc[item.kind] ?? 0) + 1;
      return acc;
    }, {});
    console.log('[external-search]', JSON.stringify({ term, total: results.length, counts, degraded }));

    return new Response(JSON.stringify({ results: results.slice(0, 48), counts, degraded }), {
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
