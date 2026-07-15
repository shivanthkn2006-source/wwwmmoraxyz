/**
 * Lightweight performance logger.
 * Tracks page load timings and API/edge-function latency in memory
 * so the admin Health page (and console) can inspect them without
 * shipping another vendor SDK.
 */

export interface PerfEntry {
  kind: 'page' | 'api';
  label: string;
  durationMs: number;
  status?: number | string;
  ok: boolean;
  at: number; // epoch ms
}

const MAX_ENTRIES = 200;
const buffer: PerfEntry[] = [];
const listeners = new Set<(entries: PerfEntry[]) => void>();

function emit() {
  const snap = [...buffer];
  listeners.forEach((cb) => {
    try { cb(snap); } catch { /* ignore */ }
  });
}

export function recordPerf(entry: PerfEntry) {
  buffer.unshift(entry);
  if (buffer.length > MAX_ENTRIES) buffer.length = MAX_ENTRIES;
  // Console signal for debugging
  const tag = entry.ok ? '✓' : '✗';
  // eslint-disable-next-line no-console
  console.info(`[perf][${entry.kind}] ${tag} ${entry.label} ${entry.durationMs.toFixed(0)}ms`, entry.status ?? '');
  emit();
}

export function getPerfEntries(): PerfEntry[] {
  return [...buffer];
}

export function subscribePerf(cb: (entries: PerfEntry[]) => void): () => void {
  listeners.add(cb);
  cb([...buffer]);
  return () => { listeners.delete(cb); };
}

/**
 * Wraps `fetch` globally to record API latency.
 * Idempotent — safe to call multiple times.
 */
let fetchWrapped = false;
export function installFetchPerfLogger() {
  if (fetchWrapped || typeof window === 'undefined') return;
  fetchWrapped = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const started = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    let status: number | string = 'network-error';
    let ok = false;
    try {
      const res = await originalFetch(...args);
      status = res.status;
      ok = res.ok;
      return res;
    } catch (err) {
      ok = false;
      throw err;
    } finally {
      const durationMs = performance.now() - started;
      // Only track our backend + edge functions to avoid noise
      if (
        url.includes('supabase.co') ||
        url.includes('/functions/v1/') ||
        url.startsWith('/api/')
      ) {
        recordPerf({
          kind: 'api',
          label: shortenUrl(url),
          durationMs,
          status,
          ok,
          at: Date.now(),
        });
      }
    }
  };
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return `${u.pathname}${u.search ? '?' + u.searchParams.toString().slice(0, 40) : ''}`;
  } catch {
    return url.slice(0, 120);
  }
}

/**
 * Records initial page load timing using the Navigation Timing API.
 */
export function recordPageLoad() {
  if (typeof window === 'undefined' || !('performance' in window)) return;
  // Wait for load event so metrics are populated
  const capture = () => {
    try {
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (!nav) return;
      recordPerf({
        kind: 'page',
        label: window.location.pathname || '/',
        durationMs: nav.loadEventEnd - nav.startTime,
        status: 'loaded',
        ok: true,
        at: Date.now(),
      });
    } catch { /* ignore */ }
  };
  if (document.readyState === 'complete') {
    setTimeout(capture, 0);
  } else {
    window.addEventListener('load', () => setTimeout(capture, 0), { once: true });
  }
}
