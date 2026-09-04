/**
 * WEB GROUNDING — real outside-the-platform knowledge for every Zoe brain.
 *
 * The omni-graph only knows what lives on this platform. When a member asks
 * about the world (news, people, definitions, prices, science…) Zoe now grounds
 * her answer in live web sources instead of guessing.
 *
 * Keyless, quota-free providers so grounding never depends on a secret:
 *   • DuckDuckGo Instant Answer (abstract + related topics)
 *   • Wikipedia search + summary (encyclopedic facts)
 *   • GDELT article list (fresh news, last days)
 *
 * Everything is returned as citation-shaped rows so the existing provenance UI
 * renders web sources next to platform sources.
 */

export interface WebGroundHit {
  title: string;
  snippet: string;
  url: string;
  source: string;
  publishedAt: string | null;
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const strip = (value: string) =>
  String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function safeJson(url: string, ms = 6000): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Personal/platform questions the omni-graph already answers on its own. */
const PLATFORM_ONLY =
  /\b(my|mine|our|i)\b[^?]{0,40}\b(post|posts|feed|dhf|essay|memory|memories|profile|growth|loop|loops|comment|message|badge|streak|compass)\b/i;

/** Signals that the answer lives outside this platform. */
const EXTERNAL_HINT =
  /\b(who|what|when|where|why|how|latest|news|today'?s|current|price|stock|weather|define|meaning|history|explain|search|google|world|president|ceo|release|version|score|match|election|202\d|19\d\d)\b/i;

/**
 * Decide whether to spend a web round-trip on this turn.
 * Ground when the question reaches outside the platform, or when the platform
 * index returned almost nothing to work with.
 */
export function needsWebGrounding(query: string, platformHits: number): boolean {
  const q = (query || '').trim();
  if (q.length < 6) return false;
  if (PLATFORM_ONLY.test(q)) return false;
  if (/\b(mmora|m'mora|this platform|the app)\b/i.test(q) && platformHits > 0) return false;
  return EXTERNAL_HINT.test(q) || platformHits < 2;
}

async function duckduckgo(query: string): Promise<WebGroundHit[]> {
  const data = await safeJson(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
  );
  const out: WebGroundHit[] = [];
  if (data?.AbstractText) {
    out.push({
      title: strip(data.Heading || query),
      snippet: strip(data.AbstractText),
      url: String(data.AbstractURL || ''),
      source: String(data.AbstractSource || 'DuckDuckGo'),
      publishedAt: null,
    });
  }
  for (const topic of (data?.RelatedTopics ?? []).slice(0, 3)) {
    if (!topic?.Text || !topic?.FirstURL) continue;
    out.push({
      title: strip(String(topic.Text).split(' - ')[0]),
      snippet: strip(topic.Text),
      url: String(topic.FirstURL),
      source: 'DuckDuckGo',
      publishedAt: null,
    });
  }
  return out;
}

async function wikipedia(query: string): Promise<WebGroundHit[]> {
  const data = await safeJson(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query,
    )}&format=json&srlimit=3&origin=*`,
  );
  return (data?.query?.search ?? []).map((page: Record<string, unknown>) => ({
    title: strip(String(page.title ?? query)),
    snippet: strip(String(page.snippet ?? '')),
    url: `https://en.wikipedia.org/?curid=${page.pageid}`,
    source: 'Wikipedia',
    publishedAt: typeof page.timestamp === 'string' ? page.timestamp : null,
  }));
}

async function safeText(url: string, ms = 6000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, text/xml, */*' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Fresh news: Google News RSS (keyless), GDELT as a secondary source. */
async function freshNews(query: string): Promise<WebGroundHit[]> {
  const out: WebGroundHit[] = [];

  const xml = await safeText(
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
  );
  if (xml) {
    const items = xml.split('<item>').slice(1, 6);
    for (const item of items) {
      const pick = (tag: string) => {
        const m = item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
        return m ? strip(m[1].replace(/<!\[CDATA\[|\]\]>/g, '')) : '';
      };
      const title = pick('title');
      const link = pick('link');
      if (!title || !link) continue;
      out.push({
        title,
        snippet: strip(pick('description')).slice(0, 240) || title,
        url: link,
        source: pick('source') || 'Google News',
        publishedAt: pick('pubDate') ? new Date(pick('pubDate')).toISOString() : null,
      });
    }
  }

  if (out.length) return out;

  const data = await safeJson(
    `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(
      query,
    )}&mode=artlist&maxrecords=4&sort=datedesc&format=json`,
  );
  for (const a of (data?.articles ?? []).slice(0, 4)) {
    if (!a?.url) continue;
    out.push({
      title: strip(String(a.title ?? '')),
      snippet: strip(String(a.domain ?? '')),
      url: String(a.url),
      source: String(a.domain ?? 'news'),
      publishedAt: typeof a.seendate === 'string' ? a.seendate : null,
    });
  }
  return out;
}

/** Fetch live web knowledge for a query. Never throws. */
export async function webGround(query: string, limit = 6): Promise<WebGroundHit[]> {
  const term = (query || '').trim().slice(0, 300);
  if (term.length < 3) return [];
  const wantsNews = /\b(news|latest|today|breaking|update|current|now|who is|price|score|202\d)\b/i.test(term);

  const settled = await Promise.allSettled([
    duckduckgo(term),
    wikipedia(term),
    // News is cheap and keyless — run it whenever the question sounds time-sensitive.
    ...(wantsNews ? [freshNews(term)] : []),
  ]);

  const seen = new Set<string>();
  return settled
    .flatMap((entry) => (entry.status === 'fulfilled' ? entry.value : []))
    .filter((hit) => {
      if (!hit?.url || !hit.title || seen.has(hit.url)) return false;
      seen.add(hit.url);
      return true;
    })
    .slice(0, limit);
}

/** Prompt block appended after the platform recall block. */
export function buildWebGroundingBlock(hits: WebGroundHit[], startIndex = 0): string {
  if (!hits.length) return '';
  const lines = hits.map((hit, i) => {
    const when = hit.publishedAt ? ` ${hit.publishedAt.slice(0, 10)}` : '';
    return `(${startIndex + i + 1}) [${hit.source}${when}] ${hit.title} — ${hit.snippet.slice(0, 300)} <${hit.url}>`;
  });
  return `\n\n═══ LIVE WEB GROUNDING (outside this platform) ═══\n${lines.join(
    '\n',
  )}\n═══════════════════════════════════════\nThese were retrieved from the live web seconds ago: trust them over your training data for anything outside this platform, and never claim you cannot access current information while they are present. Cite them by their number. If they do not answer the question, say what you do not know instead of inventing an answer.`;
}

/** Citation rows in the same shape the UI already renders for platform sources. */
export function buildWebSources(hits: WebGroundHit[], startIndex = 0) {
  return hits.map((hit, i) => ({
    citationId: startIndex + i + 1,
    entityType: 'web',
    entityId: hit.url,
    title: hit.title,
    route: hit.url,
    createdAt: hit.publishedAt,
    stale: false,
    score: 1 - i * 0.05,
    excerpt: hit.snippet.slice(0, 240),
  }));
}
