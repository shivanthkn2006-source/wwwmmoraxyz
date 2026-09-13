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
  artwork?: string;
  /** Direct, playable audio/stream URL. */
  url: string;
  /** Seconds, when the provider reports it. */
  duration?: number;
  source: 'audius' | 'radio' | 'archive';
  /** Human-readable attribution shown in the UI and spoken by Zoe. */
  credit: string;
  live?: boolean;
}

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

export async function searchAudius(query: string, limit = 20): Promise<MusicTrack[]> {
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
      artwork: t.artwork?.['480x480'] ?? t.artwork?.['150x150'] ?? undefined,
      url: `${host}/v1/tracks/${t.id}/stream?app_name=MMora`,
      duration: typeof t.duration === 'number' ? t.duration : undefined,
      source: 'audius' as const,
      credit: 'Audius (open streaming)',
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

/* ────────────────────────── Internet Archive ────────────────────────── */

export async function searchArchive(query: string, limit = 10): Promise<MusicTrack[]> {
  const search = await getJson<{ response?: { docs?: Array<{ identifier: string; title?: string; creator?: string }> } }>(
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
      `${query} AND mediatype:(audio)`,
    )}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&rows=${limit}&page=1&output=json`,
  );
  const docs = search?.response?.docs ?? [];
  const out: MusicTrack[] = [];
  for (const doc of docs.slice(0, 5)) {
    const meta = await getJson<{ files?: Array<{ name: string; format?: string; length?: string }> }>(
      `https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`,
    );
    const file = (meta?.files ?? []).find((f) => /(^|\s)(VBR MP3|MP3|64Kbps MP3)$/i.test(String(f.format ?? '')));
    if (!file) continue;
    out.push({
      id: `archive:${doc.identifier}:${file.name}`,
      title: String(doc.title ?? doc.identifier),
      artist: String(doc.creator ?? 'Internet Archive'),
      url: `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${encodeURIComponent(file.name)}`,
      source: 'archive' as const,
      credit: 'Internet Archive (public domain)',
    });
  }
  return out;
}

/* ─────────────────────────── Routing helper ─────────────────────────── */

/**
 * Resolves a spoken request into a real queue. Sources are tried in the order
 * that best matches the request, and the first source with results wins.
 */
export async function resolveMusicQueue(
  query: string,
  kind: 'track' | 'mood' | 'genre' | 'radio' | 'devotional',
): Promise<{ tracks: MusicTrack[]; source: string | null }> {
  const order: Array<() => Promise<MusicTrack[]>> =
    kind === 'radio' || kind === 'devotional'
      ? [() => searchRadio(query), () => searchArchive(query), () => searchAudius(query)]
      : kind === 'track'
        ? [() => searchAudius(query), () => searchArchive(query), () => searchRadio(query)]
        : [() => searchAudius(query), () => searchRadio(query), () => searchArchive(query)];

  for (const attempt of order) {
    const tracks = await attempt();
    if (tracks.length) return { tracks, source: tracks[0].credit };
  }
  return { tracks: [], source: null };
}
