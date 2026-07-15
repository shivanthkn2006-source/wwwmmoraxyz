import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface PostgresChangesFilter {
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  filter?: string;
}

interface Binding {
  filter: PostgresChangesFilter;
  handler: (payload: RealtimePostgresChangesPayload<any>) => void;
}

interface Options {
  /** Base name for the channel; a random suffix is always appended. */
  name: string;
  /** postgres_changes bindings to attach. */
  bindings: Binding[];
  /** Maximum retries before giving up (default 5). */
  maxRetries?: number;
  /** Base backoff in ms (default 1000). Actual wait is exponential + jitter. */
  baseBackoffMs?: number;
  /** Called with the current attempt number when a retry is scheduled. */
  onRetry?: (attempt: number, reason: string) => void;
  /** Called when subscription succeeds. */
  onSubscribed?: () => void;
  /** Called after maxRetries exhausted. */
  onFailed?: (reason: string) => void;
}

/**
 * Subscribes to a Supabase Realtime channel with automatic
 * exponential backoff on CHANNEL_ERROR / TIMED_OUT / CLOSED, so
 * a transient realtime hiccup does not crash the page.
 *
 * Returns a cleanup function that removes the current channel and
 * cancels any pending retries.
 */
export function subscribeWithBackoff(opts: Options): () => void {
  const {
    name,
    bindings,
    maxRetries = 5,
    baseBackoffMs = 1000,
    onRetry,
    onSubscribed,
    onFailed,
  } = opts;

  let currentChannel: RealtimeChannel | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let disposed = false;

  const cleanupCurrent = () => {
    if (currentChannel) {
      try { supabase.removeChannel(currentChannel); } catch { /* ignore */ }
      currentChannel = null;
    }
  };

  const scheduleRetry = (reason: string) => {
    if (disposed) return;
    if (attempt >= maxRetries) {
      onFailed?.(reason);
      return;
    }
    const backoff = Math.min(
      baseBackoffMs * Math.pow(2, attempt) + Math.random() * 300,
      30_000,
    );
    attempt += 1;
    onRetry?.(attempt, reason);
    retryTimer = setTimeout(() => {
      cleanupCurrent();
      connect();
    }, backoff);
  };

  const connect = () => {
    if (disposed) return;
    const uniqueName = `${name}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    let ch: RealtimeChannel = supabase.channel(uniqueName);
    for (const b of bindings) {
      ch = (ch as any).on('postgres_changes', b.filter, b.handler);
    }
    currentChannel = ch.subscribe((status) => {
      if (disposed) return;
      if (status === 'SUBSCRIBED') {
        attempt = 0;
        onSubscribed?.();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        scheduleRetry(status);
      }
    });
  };

  connect();

  return () => {
    disposed = true;
    if (retryTimer) clearTimeout(retryTimer);
    cleanupCurrent();
  };
}
