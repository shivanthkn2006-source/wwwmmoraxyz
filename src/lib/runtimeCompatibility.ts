/**
 * Runtime feature/compatibility telemetry.
 *
 * Records lightweight, client-side events for the features we need a
 * device/OS compatibility view over (M'Mora Live, Home dock badges, camera
 * indicators). Events live in memory + localStorage; nothing is sent anywhere.
 */

export type CompatFeatureId =
  | 'live-stream'
  | 'dock-badges'
  | 'dock-badge-boundary'
  | 'camera-indicator'
  | 'media-teardown';

export type CompatStatus = 'ok' | 'degraded' | 'failed' | 'unknown';

export interface CompatEvent {
  feature: CompatFeatureId;
  status: CompatStatus;
  /** Short machine-ish label, e.g. `opened`, `closed`, `permission-denied`. */
  event: string;
  detail?: string;
  at: number;
}

export interface DeviceProfile {
  os: string;
  browser: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  viewport: string;
  dpr: number;
  cores: number | null;
  touchPoints: number;
  secureContext: boolean;
  supportsGetUserMedia: boolean;
  supportsBackdropFilter: boolean;
  userAgent: string;
}

const STORAGE_KEY = 'mmora.compat.events.v1';
const MAX_EVENTS = 120;

let events: CompatEvent[] = [];
const listeners = new Set<() => void>();
let hydrated = false;

const hydrate = () => {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) events = JSON.parse(raw) as CompatEvent[];
  } catch {
    events = [];
  }
};

const persist = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* storage unavailable */
  }
};

export const recordCompatEvent = (
  feature: CompatFeatureId,
  event: string,
  status: CompatStatus = 'ok',
  detail?: string,
) => {
  if (typeof window === 'undefined') return;
  hydrate();
  events = [...events, { feature, event, status, detail, at: Date.now() }].slice(-MAX_EVENTS);
  persist();
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
  try {
    window.dispatchEvent(
      new CustomEvent('mmora:compat-event', { detail: { feature, event, status, detail } }),
    );
  } catch {
    /* noop */
  }
};

export const getCompatEvents = (): CompatEvent[] => {
  hydrate();
  return [...events];
};

export const clearCompatEvents = () => {
  events = [];
  persist();
  listeners.forEach((fn) => fn());
};

export const subscribeCompatEvents = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const detectDeviceProfile = (): DeviceProfile => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const touchPoints = (navigator as unknown as { maxTouchPoints?: number })?.maxTouchPoints ?? 0;

  const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
  const isIOS = /iPhone|iPod/.test(ua) || isIPad;
  const isAndroid = /Android/.test(ua);

  let os = 'Unknown';
  if (isIOS) os = isIPad ? 'iPadOS' : 'iOS';
  else if (isAndroid) os = 'Android';
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  let browser = 'Unknown';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/CriOS|Chrome\//.test(ua)) browser = 'Chrome';
  else if (/FxiOS|Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  const width = typeof window !== 'undefined' ? window.innerWidth : 0;
  const deviceType: DeviceProfile['deviceType'] = isIPad
    ? 'tablet'
    : isIOS || isAndroid || width < 768
      ? 'mobile'
      : 'desktop';

  const supportsBackdropFilter =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    (CSS.supports('backdrop-filter', 'blur(4px)') || CSS.supports('-webkit-backdrop-filter', 'blur(4px)'));

  return {
    os,
    browser,
    deviceType,
    viewport: typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : 'n/a',
    dpr: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    cores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? null : null,
    touchPoints,
    secureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
    supportsGetUserMedia: Boolean(navigator?.mediaDevices?.getUserMedia),
    supportsBackdropFilter,
    userAgent: ua,
  };
};
