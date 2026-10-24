/** Crawler-only authority: the configured site, never a caller-selected host. */
export const DEFAULT_CRAWLER_ORIGIN = 'https://wwwmmoraxyz.lovable.app';

export class UnsafeCrawlerDestination extends Error {}

function siteOrigin(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim() !== raw || /[\\\s]/.test(raw)) {
    throw new UnsafeCrawlerDestination('An exact HTTPS site origin is required');
  }
  let url: URL;
  try { url = new URL(raw); } catch { throw new UnsafeCrawlerDestination('Invalid site origin'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      url.pathname !== '/' || url.search || url.hash || !host.includes('.') ||
      host.endsWith('.') || /^[\d.]+$/.test(host) || host.includes(':') ||
      /(?:^|\.)(?:localhost|local|internal|lan|test|invalid)$/.test(host)) {
    throw new UnsafeCrawlerDestination('An exact public HTTPS site origin is required');
  }
  return url.origin;
}

export function crawlerOrigin(configured: string | undefined, requested: unknown): string {
  const origin = siteOrigin(configured || DEFAULT_CRAWLER_ORIGIN);
  if (requested !== undefined && siteOrigin(requested) !== origin) {
    throw new UnsafeCrawlerDestination('Crawler origin must match the configured site');
  }
  return origin;
}

export function crawlerTarget(origin: string, path: string): URL {
  if (!path.startsWith('/') || path.startsWith('//') || /[\\\s\u0000-\u001f\u007f]/.test(path) ||
      /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(path)) {
    throw new UnsafeCrawlerDestination('Invalid crawler route');
  }
  const target = new URL(path, origin);
  if (target.origin !== origin || target.username || target.password) {
    throw new UnsafeCrawlerDestination('Crawler route escapes the configured site');
  }
  return target;
}

export interface Finding {
  route: string | null;
  finding_type: string;
  severity: string;
  http_status: number | null;
  duration_ms: number | null;
  detail: string;
}

export async function probeRoute(origin: string, path: string, fetcher: typeof fetch = fetch): Promise<Finding | null> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const url = crawlerTarget(origin, path).href;
    const res = await fetcher(url, { redirect: 'manual', signal: controller.signal });
    const duration = Date.now() - started;
    await res.body?.cancel(); // A status probe never consumes the page body.
    if (res.status >= 300 && res.status < 400) {
      return { route: path, finding_type: 'dead_link', severity: 'critical', http_status: res.status, duration_ms: duration, detail: `HTTP ${res.status} redirect refused for ${url}` };
    }
    if (res.status >= 400) {
      return { route: path, finding_type: 'dead_link', severity: 'critical', http_status: res.status, duration_ms: duration, detail: `HTTP ${res.status} for ${url}` };
    }
    if (duration > 2500) {
      return { route: path, finding_type: 'slow_route', severity: 'warning', http_status: res.status, duration_ms: duration, detail: `${duration}ms exceeds 2500ms budget` };
    }
    return null;
  } catch (e) {
    return { route: path, finding_type: 'dead_link', severity: 'critical', http_status: null, duration_ms: Date.now() - started, detail: `request failed: ${String((e as Error)?.message ?? e).slice(0, 200)}` };
  } finally {
    clearTimeout(timer);
  }
}