/**
 * Home load report — one row per Home visit recording how long Home took,
 * which Home parts appeared, and every request/runtime failure during load.
 * Saved to `home_load_reports` so failures can be compared across visits and members.
 */
import { supabase } from '@/integrations/supabase/client';
import { getInteractiveDelayMs, getStartupMarks } from '@/lib/startupTiming';
import { getPerfEntries } from '@/utils/perfLogger';

export const HOME_SECTIONS: Record<string, string> = {
  'Home page': '[data-home-liquid-page]',
  'Menu dock': '[data-home-dock]',
  'Feed tabs': '[data-feed-tab]',
  'Forecast card': '[data-home-forecast]',
  'DHF cards': '[data-dhf-slide]',
  'Growth cards': '[data-growth-status-slide]',
  "Zoe's LOL cards": '[data-humor-slide], [data-humor-drop]',
  'Trending jokes': '[data-humor-trending-slide], [data-humor-trending]',
  'Music shelf': '[data-home-music-shelf]',
};

export interface LoadFailure {
  kind: 'request' | 'error' | 'rejection';
  label: string;
  status?: string | number;
  at: number;
}

const SNAPSHOT_AFTER_MS = 12_000;
let activeVisit = false;
let startupReported = false;

const deviceKind = () => {
  const w = window.innerWidth;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  const base = w < 768 ? 'phone' : w < 1100 ? 'tablet' : 'desktop';
  return standalone ? `${base} (installed app)` : base;
};

const browserName = () => {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/CriOS|Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
};

/** Starts recording one Home visit. Returns a cancel function. */
export function startHomeLoadReport(userId: string | undefined): () => void {
  if (!userId || activeVisit || typeof window === 'undefined') return () => undefined;
  activeVisit = true;
  const startedAt = Date.now();
  const firstVisitOfPageLoad = !startupReported;
  startupReported = true;
  const failures: LoadFailure[] = [];

  const onError = (e: ErrorEvent) =>
    failures.push({ kind: 'error', label: String(e.message || 'Script error').slice(0, 200), at: Date.now() - startedAt });
  const onRejection = (e: PromiseRejectionEvent) =>
    failures.push({ kind: 'rejection', label: String((e.reason as Error)?.message ?? e.reason ?? 'rejected').slice(0, 200), at: Date.now() - startedAt });
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  // Per-part load time: ms from Home opening until each part first appears.
  const seenAt: Record<string, number> = {};
  const scan = () => {
    for (const [name, selector] of Object.entries(HOME_SECTIONS)) {
      if (seenAt[name] === undefined && document.querySelector(selector)) seenAt[name] = Date.now() - startedAt;
    }
  };
  scan();
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; scan(); });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const cleanup = () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    observer.disconnect();
  };

  const timer = window.setTimeout(async () => {
    cleanup();
    for (const entry of getPerfEntries()) {
      if (entry.kind === 'api' && !entry.ok && entry.at >= startedAt) {
        failures.push({ kind: 'request', label: entry.label, status: entry.status, at: entry.at - startedAt });
      }
    }
    const sections: Record<string, boolean> = {};
    for (const [name, selector] of Object.entries(HOME_SECTIONS)) {
      sections[name] = Boolean(document.querySelector(selector));
    }
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    try {
      await supabase.from('home_load_reports' as never).insert({
        user_id: userId,
        device: deviceKind(),
        browser: browserName(),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        connection: conn?.effectiveType ?? null,
        // Startup timings belong only to the visit that opened the app; a later
        // in-app return to Home would otherwise repeat the same old numbers.
        interactive_ms: firstVisitOfPageLoad ? getInteractiveDelayMs() : null,
        marks: [
          ...(firstVisitOfPageLoad ? getStartupMarks() : [{ phase: 'return-visit', at: 0 }]),
          ...Object.entries(seenAt).map(([name, at]) => ({ phase: `part:${name}`, at })),
        ],
        sections,
        failures: failures.slice(0, 50),
        failure_count: failures.length,
      } as never);
    } catch {
      /* reporting must never affect Home */
    }
  }, SNAPSHOT_AFTER_MS);

  return () => {
    window.clearTimeout(timer);
    cleanup();
    activeVisit = false;
  };
}
