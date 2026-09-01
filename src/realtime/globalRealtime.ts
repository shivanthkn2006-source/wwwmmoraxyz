/**
 * Global realtime multiplexer.
 *
 * Problem this solves: every feed card, panel and hook used to call
 * `supabase.channel(...)` on its own. A 20-post feed opened 20+ separate
 * realtime channels per user; at 5,000 concurrent users that is 100k+
 * server-side subscriptions for what is really a handful of distinct
 * (table, event, filter) tuples.
 *
 * This module keeps ONE channel per distinct tuple, ref-counted across every
 * component that asks for it, and fans each payload out to the local
 * listeners. Unsubscribing the last listener tears the channel down.
 *
 * It is deliberately framework-free so it can be unit-tested without React.
 */
import { supabase } from '@/integrations/supabase/client';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimeSubscriptionSpec {
  table: string;
  event?: RealtimeEvent;
  schema?: string;
  /** PostgREST-style filter, e.g. `user_id=eq.<uuid>`. Omit to share one channel table-wide. */
  filter?: string;
}

export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: RealtimeEvent;
  new?: T;
  old?: T;
  table: string;
}

type Listener = (payload: RealtimePayload) => void;

interface Entry {
  key: string;
  channel: ReturnType<typeof supabase.channel> | null;
  listeners: Set<Listener>;
  status: 'idle' | 'joining' | 'joined' | 'errored';
}

const entries = new Map<string, Entry>();

export function subscriptionKey(spec: RealtimeSubscriptionSpec): string {
  return [spec.schema ?? 'public', spec.table, spec.event ?? '*', spec.filter ?? ''].join('|');
}

function teardown(entry: Entry) {
  if (entry.channel) {
    try {
      supabase.removeChannel(entry.channel);
    } catch {
      /* channel already gone — nothing to reclaim */
    }
  }
  entries.delete(entry.key);
}

/**
 * Register a listener on the shared channel for `spec`.
 * Returns an unsubscribe function; the channel closes when the count hits 0.
 */
export function subscribeRealtime(spec: RealtimeSubscriptionSpec, listener: Listener): () => void {
  const key = subscriptionKey(spec);
  let entry = entries.get(key);

  if (!entry) {
    entry = { key, channel: null, listeners: new Set(), status: 'idle' };
    entries.set(key, entry);

    const bound = entry;
    const config: Record<string, string> = {
      event: spec.event ?? '*',
      schema: spec.schema ?? 'public',
      table: spec.table,
    };
    if (spec.filter) config.filter = spec.filter;

    bound.status = 'joining';
    try {
      bound.channel = supabase
        .channel(`mux:${key}`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('postgres_changes' as any, config as any, (payload: any) => {
          const normalized: RealtimePayload = {
            eventType: (payload?.eventType ?? payload?.type ?? '*') as RealtimeEvent,
            new: payload?.new ?? undefined,
            old: payload?.old ?? undefined,
            table: spec.table,
          };
          // A throwing listener must never break the other subscribers sharing
          // this socket, so each fan-out call is isolated.
          bound.listeners.forEach((fn) => {
            try {
              fn(normalized);
            } catch (error) {
              console.warn('[globalRealtime] listener failed', spec.table, error);
            }
          });
        })
        .subscribe((status: string) => {
          bound.status = status === 'SUBSCRIBED' ? 'joined' : status === 'CHANNEL_ERROR' ? 'errored' : bound.status;
        });
    } catch (error) {
      bound.status = 'errored';
      console.warn('[globalRealtime] channel setup failed', key, error);
    }
  }

  entry.listeners.add(listener);
  const target = entry;

  return () => {
    target.listeners.delete(listener);
    if (target.listeners.size === 0) teardown(target);
  };
}

/** Diagnostics for the admin/health surfaces. */
export function realtimeStats() {
  return {
    channels: entries.size,
    listeners: Array.from(entries.values()).reduce((sum, e) => sum + e.listeners.size, 0),
    errored: Array.from(entries.values()).filter((e) => e.status === 'errored').length,
    keys: Array.from(entries.keys()),
  };
}

/** Test/teardown helper — closes every shared channel. */
export function resetRealtimeMultiplexer() {
  Array.from(entries.values()).forEach(teardown);
  entries.clear();
}
