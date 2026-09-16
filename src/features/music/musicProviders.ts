/**
 * FREE, KEYLESS MUSIC + RADIO PROVIDERS
 *
 * Every source here is public, free and needs no API key, so the platform can
 * play worldwide music without a paywall and without shipping credentials:
 *   · Audius            — millions of full-length tracks, open API
 *   · Radio Browser     — 40k+ live radio stations (language / genre / mood)
 *   · Internet Archive  — public-domain, devotional and classical recordings
 *
 * Contract: every lookup returns real, playable stream URLs or an empty list.
 * Nothing is ever faked — the caller reports honestly when nothing was found.
 */

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  /** Album or collection, only when the provider supplies it. */
  album?: string;
  artwork?: string;
  /** Direct, playable audio/stream URL. */
  url: string;
  /** Seconds, when the provider reports it. */
  duration?: number;
  source: 'audius' | 'radio' | 'archive' | 'apple';
  /** Human-readable attribution shown in the UI and spoken by Zoe. */
  credit: string;
  live?: boolean;
}

export interface MusicSearchResult {
  tracks: MusicTrack[];
  source: string | null;
  query: string;
  corrected: boolean;
  providers: Array<{ name: string; status: 'ok' | 'empty' | 'unavailable'; count: number }>;
}
import { musicMatchScore, normalizeMusicQuery } from './musicQuery';

const TIMEOUT_MS = 8_000;

/** HTTPS pages cannot play insecure radio streams; only queue safe URLs. */
export function isSecurePlayableUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ────────────────────────────── Audius ────────────────────────────── */

let audiusHost: string | null = null;

async function resolveAudiusHost(): Promise<string | null> {
  if (audiusHost) return audiusHost;
  const data = await getJson<{ data?: string[] }>('https://api.audius.co');
  const host = data?.data?.[0];
  if (host) audiusHost = host;
  return audiusHost;
}

export async function searchAudius(query: string, limit = 40): Promise<MusicTrack[]> {
  const host = await resolveAudiusHost();
  if (!host) return [];
  const data = await getJson<{ data?: any[] }>(
    `${host}/v1/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}&app_name=MMora`,
  );
  return (data?.data ?? [])
    .filter((t) => t?.id && t?.is_streamable !== false)
    .map((t) => ({
      id: `audius:${t.id}`,
      title: String(t.title ?? 'Untitled'),
      artist: String(t.user?.name ?? t.user?.handle ?? 'Audius artist'),
      album: typeof t.album === 'string' ? t.album : undefined,
      artwork: t.artwork?.['480x480'] ?? t.artwork?.['150x150'] ?? undefined,
      url: `${host}/v1/tracks/${t.id}/stream?app_name=MMora`,
      duration: typeof t.duration === 'number' ? t.duration : undefined,
      source: 'audius' as const,
      credit: 'Audius (open streaming)',
    }));
}

function deduplicateAndRank(tracks: MusicTrack[], query: string): MusicTrack[] {
  const unique = new Map<string, MusicTrack>();
  for (const track of tracks) {
    const key = `${track.title}|${track.artist}`.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!unique.has(key)) unique.set(key, track);
  }
  const sourceBonus: Record<MusicTrack['source'], number> = { audius: 50, archive: 45, radio: 20, apple: 0 };
  return [...unique.values()].sort((left, right) =>
    (musicMatchScore(right, query) + sourceBonus[right.source])
      - (musicMatchScore(left, query) + sourceBonus[left.source]),
  );
}

/** Searches every connected playable source while isolating individual provider failures. */
export async function searchMusicCatalog(rawQuery: string, kind: 'track' | 'mood' | 'genre' | 'radio' | 'devotional' = 'track'): Promise<MusicSearchResult> {
  const normalized = normalizeMusicQuery(rawQuery);
  const query = normalized.query || rawQuery.trim();
  const tasks = [
    { name: 'Audius', run: () => searchAudius(query) },
    { name: 'Internet Archive', run: () => searchArchive(query) },
    { name: 'Radio Browser', run: () => searchRadio(query) },
    { name: 'Apple Music', run: () => searchAppleMusic(query) },
  ];
  if (kind === 'radio' || kind === 'devotional') tasks.reverse();

  const settled = await Promise.allSettled(tasks.map((provider) => provider.run()));
  let tracks = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);

  // Retry once with the original spelling when correction produced no match.
  if (!tracks.length && normalized.corrected && normalized.original !== query) {
    const retry = await Promise.allSettled(tasks.map((provider) => {
      if (provider.name === 'Apple Music') return searchAppleMusic(normalized.original);
      if (provider.name === 'Audius') return searchAudius(normalized.original);
      if (provider.name === 'Internet Archive') return searchArchive(normalized.original);
      return searchRadio(normalized.original);
    }));
    tracks = retry.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  }

  const ranked = deduplicateAndRank(tracks, query);
  return {
    tracks: ranked,
    source: ranked[0]?.credit ?? null,
    query,
    corrected: normalized.corrected,
    providers: settled.map((result, index) => ({
      name: tasks[index].name,
      status: result.status === 'rejected' ? 'unavailable' : result.value.length ? 'ok' : 'empty',
      count: result.status === 'fulfilled' ? result.value.length : 0,
    })),
  };
}

/* ───────────────────────── Apple Music previews ───────────────────── */

/** Official catalog metadata with the playable preview supplied by Apple. */
export async function searchAppleMusic(query: string, limit = 200): Promise<MusicTrack[]> {
  const data = await getJson<{ results?: any[] }>(
    `https://itunes.apple.com/search?media=music&entity=song&limit=${limit}&term=${encodeURIComponent(query)}`,
  );
  return (data?.results ?? [])
    .filter((track) => track?.trackId && isSecurePlayableUrl(track?.previewUrl))
    .map((track) => ({
      id: `apple:${track.trackId}`,
      title: String(track.trackName ?? 'Untitled'),
      artist: String(track.artistName ?? 'Apple Music artist'),
      album: typeof track.collectionName === 'string' ? track.collectionName : undefined,
      artwork: typeof track.artworkUrl100 === 'string' ? track.artworkUrl100.replace('100x100bb', '600x600bb') : undefined,
      url: String(track.previewUrl),
      duration: typeof track.trackTimeMillis === 'number' ? Math.round(track.trackTimeMillis / 1000) : undefined,
      source: 'apple' as const,
      credit: 'Apple Music (official preview)',
    }));
}

/* ─────────────────────────── Radio Browser ─────────────────────────── */

export async function searchRadio(term: string, limit = 20): Promise<MusicTrack[]> {
  const data = await getJson<any[]>(
    `https://de1.api.radio-browser.info/json/stations/search?limit=${limit}&hidebroken=true&order=votes&reverse=true&name=${encodeURIComponent(
      term,
    )}`,
  );
  const byTag = data?.length
    ? data
    : await getJson<any[]>(
        `https://de1.api.radio-browser.info/json/stations/search?limit=${limit}&hidebroken=true&order=votes&reverse=true&tagList=${encodeURIComponent(
          term,
        )}`,
      );
  return (byTag ?? [])
    .filter((s) => isSecurePlayableUrl(s?.url_resolved))
    .map((s) => ({
      id: `radio:${s.stationuuid}`,
      title: String(s.name ?? 'Radio station').trim(),
      artist: [s.country, s.language].filter(Boolean).join(' · ') || 'Live radio',
      artwork: s.favicon || undefined,
      url: String(s.url_resolved),
      source: 'radio' as const,
      credit: 'Radio Browser (live station)',
      live: true,
    }));
}

/**
 * Real, currently-online radio stations for one tag (e.g. "classical"), ordered
 * by listener votes. Used to fill the sidebar with live channels instead of
 * canned search shortcuts. Returns [] when the directory is unreachable.
 */
export async function fetchLiveStations(tag: string, limit = 10): Promise<MusicTrack[]> {
  const data = await getJson<any[]>(
    `https://de1.api.radio-browser.info/json/stations/search?limit=${limit * 3}&hidebroken=true&is_https=true&order=votes&reverse=true&tagList=${encodeURIComponent(tag)}`,
  );
  const stations = (data ?? [])
    .filter((s) => isSecurePlayableUrl(s?.url_resolved))
    .map((s) => ({
      id: `radio:${s.stationuuid}`,
      title: String(s.name ?? 'Radio station').trim(),
      artist: [s.country, s.language].filter(Boolean).join(' · ') || 'Live radio',
      artwork: s.favicon || undefined,
      url: String(s.url_resolved),
      source: 'radio' as const,
      credit: 'Radio Browser (live station)',
      live: true,
    }));
  const unique = new Map<string, MusicTrack>();
  stations.forEach((station) => { if (!unique.has(station.title)) unique.set(station.title, station); });
  return [...unique.values()].slice(0, limit);
}

/** A full-length recording (not a 30-second catalogue preview). */
export function isFullLengthTrack(track: MusicTrack): boolean {
  return track.source !== 'apple';
}


/* ────────────────────────── Internet Archive ────────────────────────── */

export async function searchArchive(query: string, limit = 20): Promise<MusicTrack[]> {
  const search = await getJson<{ response?: { docs?: Array<{ identifier: string; title?: string; creator?: string }> } }>(
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
      `${query} AND mediatype:(audio)`,
    )}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&rows=${limit}&page=1&output=json`,
  );
  const docs = search?.response?.docs ?? [];
  const resolved = await Promise.all(docs.slice(0, 10).map(async (doc): Promise<MusicTrack | null> => {

    const meta = await getJson<{ files?: Array<{ name: string; format?: string; length?: string }> }>(
      `https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`,
    );
    const file = (meta?.files ?? []).find((f) => /(^|\s)(VBR MP3|MP3|64Kbps MP3)$/i.test(String(f.format ?? '')));
    if (!file) return null;
    return {
      id: `archive:${doc.identifier}:${file.name}`,
      title: String(doc.title ?? doc.identifier),
      artist: String(doc.creator ?? 'Internet Archive'),
      url: `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${encodeURIComponent(file.name)}`,
      source: 'archive' as const,
      credit: 'Internet Archive (public domain)',
    };
  }));
  return resolved.filter((track): track is MusicTrack => Boolean(track));
}

/* ─────────────────────────── Routing helper ─────────────────────────── */

/**
 * Resolves a spoken request into one ranked queue aggregated from every
 * connected, playable source.
 */
export async function resolveMusicQueue(
  query: string,
  kind: 'track' | 'mood' | 'genre' | 'radio' | 'devotional',
): Promise<{ tracks: MusicTrack[]; source: string | null }> {
  const result = await searchMusicCatalog(query, kind);
  return { tracks: result.tracks, source: result.source };
}
