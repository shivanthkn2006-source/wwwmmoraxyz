// Records page visits, time spent and sign-in/out events for the admin-only analytics page.
// Runs once per tab, off the boot path; every call is fire-and-forget.
// Visit/page measurement is non-essential: it waits for consent in regions that
// require it and stops immediately on refusal. Sign-in/out security records are
// essential and always sent.
import { supabase } from '@/integrations/supabase/client';
import { analyticsAllowed, onConsentChange } from '@/lib/consent';

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/track-visit`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const HEARTBEAT_MS = 30_000;

let started = false;
let accessToken: string | null = null;
let current: { id: string | null; path: string; enteredAt: number; activeMs: number; visibleSince: number | null } | null = null;
let heartbeat: number | undefined;
let firstVisit = true;
const queue: { kind: 'tap' | 'error'; name: string; path: string }[] = [];

function enqueue(kind: 'tap' | 'error', name: string) {
  const n = name.replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!n || queue.length >= 50) return;
  queue.push({ kind, name: n, path: location.pathname.slice(0, 300) });
}

function flush(final = false) {
  if (!analyticsAllowed()) { queue.length = 0; return; }
  if (!queue.length) return;
  const events = queue.splice(0, 50);
  void post({ action: 'events', visitor_id: visitorId(), device_type: deviceInfo().device_type, events }, final).catch(() => {});
}

/** Feature label for a tap: explicit data-track, else the button's aria-label/short text, prefixed by the page area. */
function onTap(e: Event) {
  const el = (e.target as Element | null)?.closest?.('[data-track],button,a,[role="button"]') as HTMLElement | null;
  if (!el || el.closest('input,textarea,[contenteditable="true"]')) return;
  const label = el.dataset.track || el.getAttribute('aria-label') || el.getAttribute('title') || (el.textContent || '').trim().slice(0, 40);
  if (!label) return;
  const area = location.pathname.split('/')[1] || 'home';
  enqueue('tap', `${area} · ${label}`);
}

function loadMs(): number | null {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const v = nav ? (nav.loadEventEnd || nav.domContentLoadedEventEnd) : 0;
    return v > 0 ? Math.round(v) : Math.round(performance.now());
  } catch { return null; }
}

export function visitorId(): string {
  const k = 'mmora-visitor-id';
  let v = localStorage.getItem(k);
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
  return v;
}

const REF_KEY = 'mmora-member-ref';
/** First-touch member referral code from ?r=, kept 30 days. */
function refCode(): string | null {
  try {
    const fromUrl = new URLSearchParams(location.search).get('r')?.trim().toUpperCase();
    if (fromUrl && /^M[0-9A-F]{8}$/.test(fromUrl) && !localStorage.getItem(REF_KEY)) {
      localStorage.setItem(REF_KEY, JSON.stringify({ code: fromUrl, at: Date.now() }));
    }
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw);
    if (Date.now() - at > 30 * 86400_000) { localStorage.removeItem(REF_KEY); return null; }
    return code;
  } catch { return null; }
}

function deviceInfo() {
  const ua = navigator.userAgent;
  const device_type = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop';
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung'
    : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  return { device_type, os, browser };
}

function hardware() {
  const n = navigator as any;
  let gpu: string | null = null;
  try {
    const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext | null;
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    if (gl && ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)).slice(0, 200);
  } catch { /* ignore */ }
  return {
    cpu_cores: n.hardwareConcurrency ?? null,
    memory_gb: n.deviceMemory ?? null,
    gpu,
    touch_points: n.maxTouchPoints ?? 0,
    connection: n.connection?.effectiveType ?? null,
    pixel_ratio: Math.round((window.devicePixelRatio || 1) * 100) / 100,
    platform: n.userAgentData?.platform ?? n.platform ?? null,
    model: null,
  };
}

function post(body: unknown, keepalive = false) {
  return fetch(FN_URL, {
    method: 'POST',
    keepalive,
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${accessToken || ANON}` },
    body: JSON.stringify(body),
  });
}

function activeSeconds(): number {
  if (!current) return 0;
  const live = current.visibleSince ? Date.now() - current.visibleSince : 0;
  return Math.round((current.activeMs + live) / 1000);
}

function ping(final = false) {
  if (!analyticsAllowed()) return;
  if (!current?.id) return;
  void post({ action: 'ping', id: current.id, visitor_id: visitorId(), duration_seconds: Math.min(activeSeconds(), 86400) }, final).catch(() => {});
}

function startVisit(path: string) {
  if (!analyticsAllowed()) return; // non-essential measurement waits for consent; dropped visits are never replayed
  if (current?.path === path) return;
  ping(true);
  const visible = document.visibilityState === 'visible';
  const v = { id: null as string | null, path, enteredAt: Date.now(), activeMs: 0, visibleSince: visible ? Date.now() : null };
  current = v;
  const { device_type, os, browser } = deviceInfo();
  const wasFirst = firstVisit; firstVisit = false;
  post({
    action: 'start', visitor_id: visitorId(), path, referrer: document.referrer || null, ref_code: refCode(), load_ms: wasFirst ? loadMs() : null,
    device_type, os, browser, screen: `${screen.width}x${screen.height}`,
    language: navigator.language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, hardware: hardware(),
  }).then((r) => r.json()).then((d) => { if (d?.id) v.id = d.id; }).catch(() => {});
}

function onVisibility() {
  if (!current) return;
  if (document.visibilityState === 'visible') current.visibleSince = Date.now();
  else {
    if (current.visibleSince) current.activeMs += Date.now() - current.visibleSince;
    current.visibleSince = null;
    ping(true);
  }
}

function sendAuth(event: 'login' | 'logout', token: string | null) {
  if (!token) return;
  const { device_type, os, browser } = deviceInfo();
  void fetch(FN_URL, {
    method: 'POST', keepalive: true,
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'auth', event, device_type, os, browser, ref_code: refCode() }),
  }).catch(() => {});
}

export function startVisitTracker() {
  if (started || typeof window === 'undefined') return;
  started = true;

  supabase.auth.onAuthStateChange((event, session) => {
    const prevToken = accessToken;
    accessToken = session?.access_token ?? null;
    if (event === 'SIGNED_IN' && session) {
      const k = `mmora-login-logged-${session.user.id}`;
      if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); sendAuth('login', session.access_token); }
    } else if (event === 'SIGNED_OUT') {
      Object.keys(sessionStorage).filter((k) => k.startsWith('mmora-login-logged-')).forEach((k) => sessionStorage.removeItem(k));
      sendAuth('logout', prevToken);
    }
  });

  const wrap = (fn: 'pushState' | 'replaceState') => {
    const orig = history[fn].bind(history);
    history[fn] = ((...args: Parameters<History['pushState']>) => {
      const r = orig(...args);
      queueMicrotask(() => startVisit(location.pathname));
      return r;
    }) as History['pushState'];
  };
  wrap('pushState');
  wrap('replaceState');
  window.addEventListener('popstate', () => startVisit(location.pathname));
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', () => { ping(true); flush(true); });
  document.addEventListener('click', onTap, { capture: true, passive: true });
  window.addEventListener('error', (e) => enqueue('error', String(e.message || 'Script error')));
  window.addEventListener('unhandledrejection', (e) => enqueue('error', String((e.reason && (e.reason.message || e.reason)) || 'Unhandled rejection')));
  window.setInterval(() => flush(), 10_000);
  heartbeat = window.setInterval(() => { if (document.visibilityState === 'visible') ping(); }, HEARTBEAT_MS);

  void supabase.auth.getSession().then(({ data }) => {
    accessToken = data.session?.access_token ?? null;
    startVisit(location.pathname);
  });

  // React to consent changes immediately: start measuring on acceptance,
  // stop heartbeats and drop the in-flight visit on refusal (no replay).
  onConsentChange(() => {
    if (analyticsAllowed()) {
      startVisit(location.pathname);
    } else {
      current = null;
      queue.length = 0;
    }
  });
}

export function stopVisitTracker() {
  if (heartbeat) window.clearInterval(heartbeat);
}

/** Shareable member referral link + stats (signed-in only). */
export const memberRefCode = (userId: string) => 'M' + userId.replace(/-/g, '').slice(0, 8).toUpperCase();
export async function fetchMyReferrals(): Promise<{ code: string; visits: number; visitors: number; signups: number; recent: string[] } | null> {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  if (!t) return null;
  const r = await fetch(FN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${t}` }, body: JSON.stringify({ action: 'my_referrals' }) });
  return r.ok ? r.json() : null;
}

export type LiveActivityKind = 'page_not_found' | 'admin_probe' | 'vr_enter' | 'vr_collect' | 'vr_purchase';
/** Live admin-monitoring event (server throttles repeats, skips the admin, and gates delivery by the notification switches). */
export function trackActivity(kind: LiveActivityKind, name: string): void {
  if (!analyticsAllowed()) return;
  try {
    void supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token ?? accessToken ?? ANON;
      return fetch(FN_URL, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'activity', visitor_id: visitorId(), kind, name: name.slice(0, 120), path: location.pathname.slice(0, 300), device_type: deviceInfo().device_type }),
      });
    }).catch(() => {});
  } catch { /* monitoring must never break the page */ }
}
