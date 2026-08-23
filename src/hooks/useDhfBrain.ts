/**
 * useDhfBrain — client port into the Zoe DHF consciousness orchestrator.
 * Fire-and-forget for search/chat; explicit (awaited) for manual feed refresh.
 */
import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDailyArchetype, type DayLordTelemetry } from '@/lib/dayLord';

export interface DhfFeedResult {
  injected: number;
  reason?: string;
  retryable?: boolean;
  keySource?: string;
  status?: number;
}

export interface DhfIngestResult {
  success: boolean;
  usedQuery?: string;
  isDefaultQuery?: boolean;
  dailyTelemetry: DayLordTelemetry;
  memoryStored: boolean;
  feed: DhfFeedResult;
  degraded: string[];
  hasProfile?: boolean;
}

export interface DhfYoutubeDiagnosis {
  configured: boolean;
  keySource: string;
  valid: boolean;
  quota: 'ok' | 'exceeded' | 'unknown';
  status?: number;
  reason?: string;
}

export type DhfContext = 'search' | 'chat' | 'feed_click' | 'voice' | 'manual';

export function useDhfBrain() {
  const [lastResult, setLastResult] = useState<DhfIngestResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const inFlight = useRef<Set<string>>(new Set());

  const ingest = useCallback(
    async (
      query: string,
      contextType: DhfContext = 'search',
      options?: { injectFeed?: boolean; allowEmpty?: boolean },
    ): Promise<DhfIngestResult | null> => {
      const clean = (query || '').trim();
      if (clean.length < 2 && !options?.allowEmpty) return null;
      const dedupeKey = `${contextType}:${clean.toLowerCase()}`;
      if (inFlight.current.has(dedupeKey)) return null;
      inFlight.current.add(dedupeKey);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          setLastError('not_authenticated');
          return null;
        }

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
          setLastError(error.message);
          return null;
        }
        const result = data as DhfIngestResult;
        setLastResult(result);
        setLastError(null);
        if (result?.feed?.injected) {
          window.dispatchEvent(new CustomEvent('mmora:dhf-feed-updated', { detail: result.feed }));
        }
        return result;
      } catch (e) {
        console.warn('[useDhfBrain] ingest threw', e);
        setLastError((e as Error)?.message ?? 'unknown_error');
        return null;
      } finally {
        setTimeout(() => inFlight.current.delete(dedupeKey), 4000);
      }
    },
    [],
  );

  /** Server-side YouTube key + quota validation (no writes). */
  const diagnose = useCallback(async (): Promise<DhfYoutubeDiagnosis | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('zoe-dhf-brain', {
        body: { mode: 'diagnose' },
      });
      if (error) {
        setLastError(error.message);
        return null;
      }
      return (data as { youtube: DhfYoutubeDiagnosis })?.youtube ?? null;
    } catch (e) {
      setLastError((e as Error)?.message ?? 'unknown_error');
      return null;
    }
  }, []);

  return { ingest, diagnose, lastResult, lastError, telemetry: getDailyArchetype() };
}

export default useDhfBrain;
