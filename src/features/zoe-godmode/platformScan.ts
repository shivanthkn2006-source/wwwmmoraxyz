// ═══════════════════════════════════════════════════════════════════════════════
// ZOE GOD MODE — end-to-end platform scan
// Runs a battery of checks in parallel across browser capabilities, permissions,
// Lovable Cloud (Supabase) auth/db/functions, LLM provider health, hands-free
// state, and recent runtime errors. Produces a structured pass/warn/fail report.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import { getRuntimeIssues, type RuntimeIssue } from './runtimeIssueCollector';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
export type CheckCategory = 'browser' | 'permission' | 'cloud' | 'ai' | 'handsfree' | 'runtime' | 'perf';

export interface CheckResult {
  id: string;
  category: CheckCategory;
  label: string;
  status: CheckStatus;
  detail?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

export interface PlatformScanReport {
  startedAt: number;
  endedAt: number;
  durationMs: number;
  overall: CheckStatus;
  counts: Record<CheckStatus, number>;
  route: string;
  userAgent: string;
  online: boolean;
  checks: CheckResult[];
  runtimeIssues: RuntimeIssue[];
}

export interface ScanProgress {
  completed: number;
  total: number;
  current?: string;
  results: CheckResult[];
}

// ────────────────────────────────────────────────────────────────────────────
// Individual checks — each returns a CheckResult
// ────────────────────────────────────────────────────────────────────────────

async function timed<T extends Omit<CheckResult, 'durationMs'>>(fn: () => Promise<T>): Promise<CheckResult> {
  const t0 = performance.now();
  try {
    const r = await fn();
    return { ...r, durationMs: Math.round(performance.now() - t0) };
  } catch (err) {
    return {
      id: 'unknown',
      category: 'runtime',
      label: 'unknown check',
      status: 'fail',
      detail: (err as Error)?.message ?? String(err),
      durationMs: Math.round(performance.now() - t0),
    };
  }
}

function checkSpeechRecognition(): CheckResult {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  const has = !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  return {
    id: 'browser.speech-recognition',
    category: 'browser',
    label: 'SpeechRecognition API',
    status: has ? 'pass' : 'fail',
    detail: has ? 'available' : 'not supported in this browser',
  };
}

function checkSpeechSynthesis(): CheckResult {
  const has = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const voices = has ? window.speechSynthesis.getVoices().length : 0;
  return {
    id: 'browser.speech-synthesis',
    category: 'browser',
    label: 'Text-to-Speech (speechSynthesis)',
    status: has ? (voices > 0 ? 'pass' : 'warn') : 'fail',
    detail: has ? `${voices} voice(s) loaded` : 'not supported',
  };
}

function checkMediaDevices(): CheckResult {
  const has = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  return {
    id: 'browser.media-devices',
    category: 'browser',
    label: 'navigator.mediaDevices',
    status: has ? 'pass' : 'fail',
    detail: has ? 'getUserMedia available' : 'missing (mic capture blocked)',
  };
}

function checkStorage(): CheckResult {
  try {
    const k = '__zoe_gm_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return { id: 'browser.local-storage', category: 'browser', label: 'localStorage', status: 'pass' };
  } catch (err) {
    return { id: 'browser.local-storage', category: 'browser', label: 'localStorage', status: 'fail', detail: (err as Error).message };
  }
}

function checkIndexedDB(): CheckResult {
  const has = typeof indexedDB !== 'undefined';
  return {
    id: 'browser.indexed-db',
    category: 'browser',
    label: 'IndexedDB',
    status: has ? 'pass' : 'warn',
    detail: has ? 'available' : 'unavailable (offline persistence limited)',
  };
}

function checkServiceWorker(): CheckResult {
  const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  return {
    id: 'browser.service-worker',
    category: 'browser',
    label: 'Service Worker support',
    status: supported ? 'pass' : 'warn',
    detail: supported ? 'available' : 'not supported',
  };
}

function checkWebGL(): CheckResult {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return {
      id: 'browser.webgl',
      category: 'browser',
      label: 'WebGL',
      status: gl ? 'pass' : 'warn',
      detail: gl ? 'context OK' : 'context unavailable',
    };
  } catch (err) {
    return { id: 'browser.webgl', category: 'browser', label: 'WebGL', status: 'warn', detail: (err as Error).message };
  }
}

function checkNetwork(): CheckResult {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return {
    id: 'browser.network',
    category: 'browser',
    label: 'navigator.onLine',
    status: online ? 'pass' : 'fail',
    detail: online ? 'online' : 'browser reports offline',
  };
}

async function checkMicPermission(): Promise<CheckResult> {
  if (!navigator.permissions?.query) {
    return { id: 'permission.microphone', category: 'permission', label: 'Microphone permission', status: 'skip', detail: 'Permissions API unavailable' };
  }
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    const map: Record<PermissionState, CheckStatus> = { granted: 'pass', prompt: 'warn', denied: 'fail' };
    return {
      id: 'permission.microphone',
      category: 'permission',
      label: 'Microphone permission',
      status: map[status.state] ?? 'warn',
      detail: status.state,
    };
  } catch (err) {
    return { id: 'permission.microphone', category: 'permission', label: 'Microphone permission', status: 'skip', detail: (err as Error).message };
  }
}

async function checkNotificationPermission(): Promise<CheckResult> {
  if (typeof Notification === 'undefined') {
    return { id: 'permission.notifications', category: 'permission', label: 'Notifications permission', status: 'skip', detail: 'Notification API unavailable' };
  }
  const state = Notification.permission;
  const map: Record<NotificationPermission, CheckStatus> = { granted: 'pass', default: 'warn', denied: 'warn' };
  return {
    id: 'permission.notifications',
    category: 'permission',
    label: 'Notifications permission',
    status: map[state] ?? 'warn',
    detail: state,
  };
}

async function checkAuthSession(): Promise<CheckResult> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { id: 'cloud.auth', category: 'cloud', label: 'Auth session', status: 'fail', detail: error.message };
    const session = data?.session;
    return {
      id: 'cloud.auth',
      category: 'cloud',
      label: 'Auth session',
      status: session ? 'pass' : 'warn',
      detail: session ? `signed in as ${session.user?.email ?? session.user?.id?.slice(0, 8)}` : 'no active session',
    };
  } catch (err) {
    return { id: 'cloud.auth', category: 'cloud', label: 'Auth session', status: 'fail', detail: (err as Error).message };
  }
}

async function checkCloudDb(): Promise<CheckResult> {
  try {
    // Cheap probe — anon-safe endpoint. Selecting from a nonexistent-yet-authorised table
    // still validates PostgREST reachability via the returned error code.
    const { error } = await supabase.auth.getUser();
    if (error && error.message?.toLowerCase().includes('failed to fetch')) {
      return { id: 'cloud.database', category: 'cloud', label: 'Lovable Cloud reachable', status: 'fail', detail: error.message };
    }
    return { id: 'cloud.database', category: 'cloud', label: 'Lovable Cloud reachable', status: 'pass', detail: 'REST endpoint reachable' };
  } catch (err) {
    return { id: 'cloud.database', category: 'cloud', label: 'Lovable Cloud reachable', status: 'fail', detail: (err as Error).message };
  }
}

async function checkHealthFunction(): Promise<CheckResult> {
  try {
    const { data, error } = await supabase.functions.invoke('zoe-health-check', { method: 'GET' as never });
    if (error) return { id: 'cloud.health-fn', category: 'cloud', label: 'zoe-health-check function', status: 'fail', detail: error.message };
    const status = (data as { status?: string })?.status;
    const ok = status === 'online';
    return {
      id: 'cloud.health-fn',
      category: 'cloud',
      label: 'zoe-health-check function',
      status: ok ? 'pass' : status === 'degraded' ? 'warn' : 'fail',
      detail: status ?? 'unknown',
      meta: data as Record<string, unknown>,
    };
  } catch (err) {
    return { id: 'cloud.health-fn', category: 'cloud', label: 'zoe-health-check function', status: 'fail', detail: (err as Error).message };
  }
}

async function checkProviderHealth(): Promise<CheckResult> {
  try {
    const { data, error } = await supabase.functions.invoke('provider-health', { method: 'GET' as never });
    if (error) return { id: 'ai.providers', category: 'ai', label: 'LLM providers configured', status: 'warn', detail: error.message };
    const keys = (data as { keys?: Record<string, boolean> })?.keys ?? {};
    const present = Object.entries(keys).filter(([, v]) => v).map(([k]) => k);
    const missing = Object.entries(keys).filter(([, v]) => !v).map(([k]) => k);
    return {
      id: 'ai.providers',
      category: 'ai',
      label: 'LLM providers configured',
      status: present.length === 0 ? 'fail' : missing.length === 0 ? 'pass' : 'warn',
      detail: `${present.length}/${Object.keys(keys).length} keys present`,
      meta: { present, missing },
    };
  } catch (err) {
    return { id: 'ai.providers', category: 'ai', label: 'LLM providers configured', status: 'warn', detail: (err as Error).message };
  }
}

function checkHandsFreeState(): CheckResult {
  try {
    // Import lazily to avoid circular deps at module load
    const bus = require('@/features/zoe-handsfree/debugBus') as typeof import('@/features/zoe-handsfree/debugBus');
    // No public getter — inspect via subscribe snapshot
    let snapshot: import('@/features/zoe-handsfree/debugBus').ZoeHandsFreeDebugState | null = null;
    const unsub = bus.subscribeZoeDebugState((s) => { snapshot = s; });
    unsub();
    if (!snapshot) {
      return { id: 'handsfree.state', category: 'handsfree', label: 'Hands-free debug bus', status: 'warn', detail: 'no state snapshot' };
    }
    const s = snapshot as import('@/features/zoe-handsfree/debugBus').ZoeHandsFreeDebugState;
    const status: CheckStatus = s.lastError ? 'warn' : 'pass';
    return {
      id: 'handsfree.state',
      category: 'handsfree',
      label: 'Hands-free debug bus',
      status,
      detail: `hf=${s.hfState} · mic=${s.micPermission} · recognizer=${s.activeRecognizer ?? 'none'}${s.lastError ? ` · lastError=${s.lastError}` : ''}`,
      meta: s as unknown as Record<string, unknown>,
    };
  } catch (err) {
    return { id: 'handsfree.state', category: 'handsfree', label: 'Hands-free debug bus', status: 'skip', detail: (err as Error).message };
  }
}

function checkRuntimeIssues(): CheckResult {
  const issues = getRuntimeIssues();
  const fatal = issues.filter((i) => i.kind === 'error' || i.kind === 'unhandledrejection');
  return {
    id: 'runtime.issues',
    category: 'runtime',
    label: 'Recent runtime errors',
    status: fatal.length === 0 ? 'pass' : fatal.length < 5 ? 'warn' : 'fail',
    detail: `${issues.length} total · ${fatal.length} fatal`,
    meta: { sample: issues.slice(-3) },
  };
}

function checkMemory(): CheckResult {
  const perf = performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } };
  if (!perf.memory) {
    return { id: 'perf.memory', category: 'perf', label: 'JS heap usage', status: 'skip', detail: 'performance.memory unavailable' };
  }
  const used = perf.memory.usedJSHeapSize;
  const limit = perf.memory.jsHeapSizeLimit;
  const pct = Math.round((used / limit) * 100);
  return {
    id: 'perf.memory',
    category: 'perf',
    label: 'JS heap usage',
    status: pct > 85 ? 'warn' : 'pass',
    detail: `${(used / 1048576).toFixed(1)}MB / ${(limit / 1048576).toFixed(0)}MB (${pct}%)`,
  };
}

function checkHardware(): CheckResult {
  const cores = navigator.hardwareConcurrency ?? 0;
  const dpr = window.devicePixelRatio ?? 1;
  return {
    id: 'perf.hardware',
    category: 'perf',
    label: 'Hardware profile',
    status: cores > 0 ? 'pass' : 'warn',
    detail: `${cores || '?'} cores · dpr ${dpr} · ${window.innerWidth}×${window.innerHeight}`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ────────────────────────────────────────────────────────────────────────────

type CheckThunk = () => CheckResult | Promise<CheckResult>;

const CHECKS: { id: string; run: CheckThunk }[] = [
  { id: 'browser.speech-recognition', run: checkSpeechRecognition },
  { id: 'browser.speech-synthesis', run: checkSpeechSynthesis },
  { id: 'browser.media-devices', run: checkMediaDevices },
  { id: 'browser.local-storage', run: checkStorage },
  { id: 'browser.indexed-db', run: checkIndexedDB },
  { id: 'browser.service-worker', run: checkServiceWorker },
  { id: 'browser.webgl', run: checkWebGL },
  { id: 'browser.network', run: checkNetwork },
  { id: 'permission.microphone', run: checkMicPermission },
  { id: 'permission.notifications', run: checkNotificationPermission },
  { id: 'cloud.auth', run: checkAuthSession },
  { id: 'cloud.database', run: checkCloudDb },
  { id: 'cloud.health-fn', run: checkHealthFunction },
  { id: 'ai.providers', run: checkProviderHealth },
  { id: 'handsfree.state', run: checkHandsFreeState },
  { id: 'runtime.issues', run: checkRuntimeIssues },
  { id: 'perf.memory', run: checkMemory },
  { id: 'perf.hardware', run: checkHardware },
];

export async function runGodModePlatformScan(onProgress?: (p: ScanProgress) => void): Promise<PlatformScanReport> {
  const startedAt = Date.now();
  const results: CheckResult[] = [];

  await Promise.all(
    CHECKS.map(async ({ id, run }) => {
      onProgress?.({ completed: results.length, total: CHECKS.length, current: id, results: results.slice() });
      const r = await timed(async () => {
        const out = await run();
        return out;
      });
      results.push(r);
      onProgress?.({ completed: results.length, total: CHECKS.length, current: id, results: results.slice() });
    }),
  );

  // Stable ordering by category then id
  const order: CheckCategory[] = ['browser', 'permission', 'cloud', 'ai', 'handsfree', 'runtime', 'perf'];
  results.sort((a, b) => (order.indexOf(a.category) - order.indexOf(b.category)) || a.id.localeCompare(b.id));

  const counts: Record<CheckStatus, number> = { pass: 0, warn: 0, fail: 0, skip: 0 };
  results.forEach((r) => { counts[r.status]++; });
  const overall: CheckStatus = counts.fail > 0 ? 'fail' : counts.warn > 0 ? 'warn' : 'pass';

  const endedAt = Date.now();
  return {
    startedAt,
    endedAt,
    durationMs: endedAt - startedAt,
    overall,
    counts,
    route: typeof window !== 'undefined' ? window.location.pathname : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    checks: results,
    runtimeIssues: getRuntimeIssues(),
  };
}

export function formatReportMarkdown(r: PlatformScanReport): string {
  const badge = (s: CheckStatus) => ({ pass: '✅', warn: '⚠️', fail: '❌', skip: '⏭️' })[s];
  const lines: string[] = [];
  lines.push(`# Zoe God Mode — Platform Scan`);
  lines.push(`- **Overall:** ${badge(r.overall)} ${r.overall.toUpperCase()}`);
  lines.push(`- **When:** ${new Date(r.startedAt).toISOString()} (${r.durationMs}ms)`);
  lines.push(`- **Route:** ${r.route}`);
  lines.push(`- **Counts:** ${r.counts.pass} pass · ${r.counts.warn} warn · ${r.counts.fail} fail · ${r.counts.skip} skip`);
  lines.push(`- **UA:** ${r.userAgent}`);
  lines.push('');
  lines.push(`## Checks`);
  for (const c of r.checks) {
    lines.push(`- ${badge(c.status)} **[${c.category}] ${c.label}** — ${c.detail ?? ''}${c.durationMs != null ? ` _(${c.durationMs}ms)_` : ''}`);
  }
  if (r.runtimeIssues.length) {
    lines.push('');
    lines.push(`## Recent runtime issues (${r.runtimeIssues.length})`);
    for (const i of r.runtimeIssues.slice(-15)) {
      lines.push(`- [${i.kind}] ${new Date(i.ts).toISOString()} — ${i.message}${i.source ? ` @ ${i.source}` : ''}`);
    }
  }
  return lines.join('\n');
}
