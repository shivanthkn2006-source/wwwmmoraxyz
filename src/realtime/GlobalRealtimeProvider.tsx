/**
 * GlobalRealtimeProvider — React surface over the realtime multiplexer.
 *
 * Mount ONCE near the app root. Components call `useRealtimeTable` instead of
 * `supabase.channel(...)`, so N components sharing a (table, event, filter)
 * tuple cost exactly one server-side subscription.
 */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  subscribeRealtime,
  realtimeStats,
  type RealtimePayload,
  type RealtimeSubscriptionSpec,
} from './globalRealtime';

interface RealtimeContextValue {
  stats: ReturnType<typeof realtimeStats>;
  refreshStats: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export const GlobalRealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState(() => realtimeStats());

  useEffect(() => {
    // Cheap in-memory read; 30s is plenty for the health panels and keeps the
    // provider itself off the render-hot path.
    const id = setInterval(() => setStats(realtimeStats()), 30_000);
    return () => clearInterval(id);
  }, []);

  const value = useMemo<RealtimeContextValue>(
    () => ({ stats, refreshStats: () => setStats(realtimeStats()) }),
    [stats],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export function useRealtimeDiagnostics() {
  return useContext(RealtimeContext)?.stats ?? realtimeStats();
}

/**
 * Subscribe to a shared realtime stream.
 * `handler` may change every render — it is read through a ref so the channel
 * is never torn down and rebuilt because of an inline callback.
 */
export function useRealtimeTable(
  spec: RealtimeSubscriptionSpec & { enabled?: boolean },
  handler: (payload: RealtimePayload) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const { table, event, schema, filter, enabled = true } = spec;

  useEffect(() => {
    if (!enabled) return;
    return subscribeRealtime({ table, event, schema, filter }, (payload) => handlerRef.current(payload));
  }, [table, event, schema, filter, enabled]);
}

export default GlobalRealtimeProvider;
