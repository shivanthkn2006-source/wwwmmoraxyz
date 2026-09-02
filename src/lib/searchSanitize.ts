/**
 * Search data hygiene utilities.
 * RSS/news feeds leak raw HTML (`<a href="...">`) and numeric entities into
 * title/description fields. Everything rendered inside the Zoe search console
 * passes through here first so the UI never shows markup artifacts.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
};

/** Strips HTML tags, CDATA wrappers and entities from any feed-provided text. */
export function sanitizeText(input?: string | null): string {
  if (!input) return '';
  return String(input)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/(<([^>]+)>)/gi, ' ')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
    .replace(/https?:\/\/\S*\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Hostname of a result URL, without the `www.` prefix. */
export function hostFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Favicon for a result's portal (used as the source badge). */
export function faviconFor(url?: string | null): string | null {
  const host = hostFromUrl(url);
  return host ? `https://icons.duckduckgo.com/ip3/${host}.ico` : null;
}

/** Compact relative time ("32m ago", "2h ago") for feed/news timestamps. */
export function relativeTime(value?: string | null): string | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  const diff = Date.now() - time;
  if (diff < 0) return 'just now';
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(time).toLocaleDateString();
}

export type SearchIntent = 'entity' | 'media' | 'shopping' | 'weather' | 'semantic';

/**
 * Fast local classifier (no network) that runs before retrieval so the console
 * can skip heavy synthesis for exact-entity lookups and prioritise the right
 * lane for media/shopping/weather queries.
 */
export function classifyQuery(raw: string): SearchIntent {
  const query = raw.trim().toLowerCase();
  if (!query) return 'semantic';
  if (/^[@#]/.test(query) || (/^\S+$/.test(query) && query.length <= 16 && /[@#_\d]/.test(query))) return 'entity';
  if (/\b(weather|forecast|temperature|rain|climate)\b/.test(query)) return 'weather';
  if (/\b(buy|shop|shopping|price|deal|deals|product|order)\b/.test(query)) return 'shopping';
  if (/\b(song|music|track|album|video|videos|watch|listen|play)\b/.test(query)) return 'media';
  return 'semantic';
}
