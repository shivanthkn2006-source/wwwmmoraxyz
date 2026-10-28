// Visitor consent for non-essential measurement (first-party visit analytics).
// Regions that require prior consent see a banner and measurement stays off until
// the visitor decides. Everywhere else measurement runs by default and the visitor
// can still refuse from Cookie settings. Choices apply immediately, sync across
// tabs, and are never replayed: events dropped while refused stay dropped.

export const CONSENT_VERSION = 1;
const STORE_KEY = 'mmora-consent-v1';

// EEA + UK + Switzerland + Brazil: prior consent required for non-essential measurement.
const CONSENT_REGIONS = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO',
  'SK', 'SI', 'ES', 'SE', 'GB', 'CH', 'BR',
]);

export type AnalyticsChoice = 'granted' | 'denied';

export interface ConsentRecord {
  version: number;
  analytics: AnalyticsChoice;
  region: string; // country code at decision time, 'XX' if unknown
  at: number; // epoch ms
}

type RegionState = 'pending' | 'consent-region' | 'open-region';

let record: ConsentRecord | null = null;
let regionState: RegionState = 'pending';
let regionCode = 'XX';
const listeners = new Set<() => void>();

function load(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed?.version !== CONSENT_VERSION || (parsed.analytics !== 'granted' && parsed.analytics !== 'denied')) return null;
    return parsed;
  } catch {
    return null;
  }
}

function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* a listener must not break consent */ }
  });
}

/** Current saved choice, or null when the visitor has not decided yet. */
export function getConsent(): ConsentRecord | null {
  if (record === null) record = load();
  return record;
}

/** Persist a choice and apply it immediately (trackers read this on every send). */
export function setConsent(analytics: AnalyticsChoice): ConsentRecord {
  record = { version: CONSENT_VERSION, analytics, region: regionCode, at: Date.now() };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(record)); } catch { /* private mode: keep in memory */ }
  notify();
  return record;
}

/**
 * Whether non-essential measurement may run right now.
 * Consent region, undecided → false (deny by default). Everywhere else → true
 * unless the visitor explicitly refused. A refusal always wins.
 */
export function analyticsAllowed(): boolean {
  const c = getConsent();
  if (c) return c.analytics === 'granted';
  return regionState === 'open-region'; // unresolved location must not authorize measurement
}

/** True while the visitor owes a decision (consent region, no saved choice). */
export function needsDecision(): boolean {
  return regionState === 'consent-region' && !getConsent();
}

/** Country code from the last region lookup ('XX' when unknown). */
export function getRegionCode(): string {
  return regionCode;
}

export function getRegionState(): RegionState {
  return regionState;
}

export function onConsentChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Resolve the visitor's country from the same-origin /cdn-cgi/trace endpoint
 * (Cloudflare, no third-party call). On failure, timeout, unknown (XX) or Tor (T1)
 * we treat the visitor as being in a consent region — the safe default.
 */
export async function resolveRegion(timeoutMs = 2000): Promise<void> {
  if (regionState !== 'pending') return;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch('/cdn-cgi/trace', { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) throw new Error('trace failed');
    const text = await res.text();
    const loc = text.match(/^loc=([A-Z0-9]{2})$/m)?.[1] ?? 'XX';
    regionCode = loc;
    regionState = !loc || loc === 'XX' || loc === 'T1' || CONSENT_REGIONS.has(loc) ? 'consent-region' : 'open-region';
  } catch {
    regionCode = 'XX';
    regionState = 'consent-region';
  }
  notify();
}

/** Re-apply a stored choice from another tab. */
export function syncFromStorage(): void {
  const fresh = load();
  if (JSON.stringify(fresh) !== JSON.stringify(record)) {
    record = fresh;
    notify();
  }
}

/** Ask the banner host to open the preferences dialog (used by "Cookie settings" links). */
export function openConsentSettings(): void {
  window.dispatchEvent(new CustomEvent('mmora:open-consent'));
}

// Test-only reset.
export function __resetConsentForTests(): void {
  record = null;
  regionState = 'pending';
  regionCode = 'XX';
  try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
}

// Test-only simulated reload: drop in-memory state but keep stored choice.
export function __reloadConsentForTests(): void {
  record = null;
  regionState = 'pending';
  regionCode = 'XX';
}
