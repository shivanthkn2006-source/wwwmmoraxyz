/**
 * useDhfBrain — client port into the Zoe DHF consciousness orchestrator.
 * Fire-and-forget: ingestion must never block or break a search/chat turn.
 */
import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDailyArchetype, type DayLordTelemetry } from '@/lib/dayLord';

export interface DhfIngestResult {
  success: boolean;
  dailyTelemetry: DayLordTelemetry;
  memoryStored: boolean;
  feed: { injected: number; reason?: string };
  degraded: string[];
  hasProfile?: boolean;
}

export type DhfContext = 'search' | 'chat' | 'feed_click' | 'voice';

export function useDhfBrain() {
  const [lastResult, setLastResult] = useState<DhfIngestResult | null>(null);
  const inFlight = useRef<Set<string>>(new Set());

  const ingest = useCallback(
    async (
      query: string,
      contextType: DhfContext = 'search',
      options?: { injectFeed?: boolean },
    ): Promise<DhfIngestResult | null> => {
      const clean = (query || '').trim();
      if (clean.length < 2) return null;
      const dedupeKey = `${contextType}:${clean.toLowerCase()}`;
      if (inFlight.current.has(dedupeKey)) return null;
      inFlight.current.add(dedupeKey);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) return null;

        const { data, error } = await supabase.functions.invoke('zoe-dhf-brain', {
          body: {
            query: clean,
            contextType,
            injectFeed: options?.injectFeed !== false,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
        if (error) {
          console.warn('[useDhfBrain] ingest failed', error.message);
          return null;
        }
        const result = data as DhfIngestResult;
        setLastResult(result);
        if (result?.feed?.injected) {
          window.dispatchEvent(new CustomEvent('mmora:dhf-feed-updated', { detail: result.feed }));
        }
        return result;
      } catch (e) {
        console.warn('[useDhfBrain] ingest threw', e);
        return null;
      } finally {
        setTimeout(() => inFlight.current.delete(dedupeKey), 4000);
      }
    },
    [],
  );

  return { ingest, lastResult, telemetry: getDailyArchetype() };
}

export default useDhfBrain;
