// ═══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE TELEMETRY SINK
// Batched, deduped, non-blocking error reporting to platform_error_events.
// Never throws. Never blocks render. Safe to call from error boundaries.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface TelemetryEvent {
  errorType: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  userAgent?: string;
  severity?: ErrorSeverity;
  source?: string;
  metadata?: Record<string, unknown>;
}

const QUEUE: TelemetryEvent[] = [];
const MAX_QUEUE = 25;
const FLUSH_MS = 4000;
const DEDUPE_WINDOW_MS = 30_000;
const recent = new Map<string, number>();

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let disabled = false;

const fingerprint = (e: TelemetryEvent) =>
  `${e.errorType}::${(e.message || '').slice(0, 160)}::${e.source ?? ''}`;

const isDuplicate = (e: TelemetryEvent): boolean => {
  const key = fingerprint(e);
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return true;
  recent.set(key, now);
  if (recent.size > 200) {
    for (const [k, ts] of recent) {
      if (now - ts > DEDUPE_WINDOW_MS) recent.delete(k);
    }
  }
  return false;
};

async function flush(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (disabled || QUEUE.length === 0) return;

  const events = QUEUE.splice(0, QUEUE.length);
  try {
    const { error } = await supabase.functions.invoke('log-platform-error', {
      body: { events },
    });
    if (error) throw error;
  } catch (err) {
    // Telemetry must never surface as an app failure. Degrade silently after
    // repeated transport failures so we do not loop on a broken network.
    console.warn('[telemetry] flush failed:', err);
    if (events.length >= MAX_QUEUE) disabled = true;
  }
}

/** Queue an error for server-side capture. Fire-and-forget, never throws. */
export function reportPlatformError(event: TelemetryEvent): void {
  try {
    if (disabled) return;
    const enriched: TelemetryEvent = {
      severity: 'medium',
      source: 'frontend',
      ...event,
      url: event.url ?? (typeof window !== 'undefined' ? window.location.href : undefined),
      userAgent:
        event.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
    };
    if (isDuplicate(enriched)) return;

    QUEUE.push(enriched);
    if (QUEUE.length >= MAX_QUEUE) {
      void flush();
      return;
    }
    if (!flushTimer) flushTimer = setTimeout(() => void flush(), FLUSH_MS);
  } catch {
    /* telemetry is best-effort only */
  }
}

/** Flush pending events immediately (used on page hide). */
export function flushPlatformErrors(): void {
  void flush();
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPlatformErrors();
  });
}
