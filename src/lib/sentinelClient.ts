/**
 * SENTINEL CLIENT — device/hardware snapshot, presence heartbeat and threat
 * reporting for the admin surveillance board.
 *
 * Everything here is deliberately quiet: no console output, no UI, no hints
 * about the platform internals. The server owns IP, geo and block decisions;
 * the browser only contributes the hardware profile it can see about itself.
 */
import { supabase } from '@/integrations/supabase/client';

const TOKEN_KEY = 'mm.sentinel.session';

export interface DeviceSnapshot {
  userAgent: string;
  platform: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  cores: number | null;
  memoryGb: number | null;
  screen: string;
  pixelRatio: number;
  touchPoints: number;
  languages: string;
  timezone: string;
  gpuVendor: string | null;
  gpuModel: string | null;
  connection: string | null;
  standalone: boolean;
}

const uaVersion = (ua: string, name: string): string => {
  const m = new RegExp(`${name}\\/([0-9.]+)`).exec(ua);
  return m?.[1] ?? '';
};

const detectBrowser = (ua: string): { browser: string; browserVersion: string } => {
  if (/Edg\//.test(ua)) return { browser: 'Edge', browserVersion: uaVersion(ua, 'Edg') };
  if (/OPR\//.test(ua)) return { browser: 'Opera', browserVersion: uaVersion(ua, 'OPR') };
  if (/Chrome\//.test(ua)) return { browser: 'Chrome', browserVersion: uaVersion(ua, 'Chrome') };
  if (/Firefox\//.test(ua)) return { browser: 'Firefox', browserVersion: uaVersion(ua, 'Firefox') };
  if (/Safari\//.test(ua)) return { browser: 'Safari', browserVersion: uaVersion(ua, 'Version') };
  return { browser: 'Unknown', browserVersion: '' };
};

const detectOs = (ua: string): { os: string; osVersion: string } => {
  if (/Windows NT ([0-9.]+)/.test(ua)) return { os: 'Windows', osVersion: RegExp.$1 };
  if (/Android ([0-9.]+)/.test(ua)) return { os: 'Android', osVersion: RegExp.$1 };
  if (/(iPhone|iPad); CPU OS ([0-9_]+)/.test(ua)) return { os: 'iOS', osVersion: RegExp.$2.replace(/_/g, '.') };
  if (/Mac OS X ([0-9_]+)/.test(ua)) return { os: 'macOS', osVersion: RegExp.$1.replace(/_/g, '.') };
  if (/Linux/.test(ua)) return { os: 'Linux', osVersion: '' };
  return { os: 'Unknown', osVersion: '' };
};

const readGpu = (): { gpuVendor: string | null; gpuModel: string | null } => {
  // Browsers without WebGL (privacy mode, hardened enterprise policies and
  // non-visual runtimes) may expose canvas.getContext while rejecting every
  // graphics context. Avoid invoking that noisy unsupported path.
  if (typeof window === 'undefined' || typeof window.WebGLRenderingContext === 'undefined') {
    return { gpuVendor: null, gpuModel: null };
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return { gpuVendor: null, gpuModel: null };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return { gpuVendor: null, gpuModel: null };
    return {
      gpuVendor: String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) ?? '') || null,
      gpuModel: String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '') || null,
    };
  } catch {
    return { gpuVendor: null, gpuModel: null };
  }
};

/** Everything the browser will admit about the machine it runs on. */
export const collectDevice = (): DeviceSnapshot => {
  const ua = navigator.userAgent;
  const { browser, browserVersion } = detectBrowser(ua);
  const { os, osVersion } = detectOs(ua);
  const { gpuVendor, gpuModel } = readGpu();
  const touchPoints = navigator.maxTouchPoints ?? 0;
  const deviceType: DeviceSnapshot['deviceType'] = /iPad|Tablet/.test(ua)
    ? 'tablet'
    : /Mobi|Android|iPhone/.test(ua)
      ? 'mobile'
      : 'desktop';

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
  };

  return {
    userAgent: ua,
    platform: navigator.platform ?? '',
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    cores: navigator.hardwareConcurrency ?? null,
    memoryGb: nav.deviceMemory ?? null,
    screen: `${window.screen.width}x${window.screen.height}`,
    pixelRatio: window.devicePixelRatio ?? 1,
    touchPoints,
    languages: (navigator.languages ?? [navigator.language]).join(','),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    gpuVendor,
    gpuModel,
    connection: nav.connection?.effectiveType ?? null,
    standalone: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
  };
};

/** Stable-per-machine hash of the hardware profile. */
export const deviceFingerprint = (d: DeviceSnapshot): string => {
  const raw = [d.platform, d.os, d.browser, d.screen, d.pixelRatio, d.cores, d.memoryGb, d.gpuModel, d.timezone].join('|');
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < raw.length; i += 1) {
    h1 = Math.imul(h1 ^ raw.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + raw.charCodeAt(i) + 1, 2246822519) >>> 0;
  }
  return `${h1.toString(16)}${h2.toString(16)}`;
};

/** One persistent token per browser tab-set, so a session survives reloads. */
export const sessionToken = (): string => {
  try {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;
    const token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
    return 'ephemeral-' + Math.random().toString(36).slice(2);
  }
};

export type SentinelAction = 'heartbeat' | 'threat' | 'end';

interface SentinelResponse {
  ok: boolean;
  blocked?: boolean;
}

/** Fire-and-forget call; returns whether the caller is now blocked. */
export const callSentinel = async (
  action: SentinelAction,
  payload: Record<string, unknown> = {},
): Promise<SentinelResponse> => {
  try {
    const device = collectDevice();
    const { data, error } = await supabase.functions.invoke('sentinel-guard', {
      body: {
        action,
        sessionToken: sessionToken(),
        fingerprint: deviceFingerprint(device),
        device,
        pageUrl: window.location.pathname,
        ...payload,
      },
    });
    if (error) return { ok: false };
    return (data as SentinelResponse) ?? { ok: false };
  } catch {
    return { ok: false };
  }
};

export const reportThreat = (
  threatType: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  details: Record<string, unknown> = {},
): Promise<SentinelResponse> => callSentinel('threat', { threatType, severity, details });
