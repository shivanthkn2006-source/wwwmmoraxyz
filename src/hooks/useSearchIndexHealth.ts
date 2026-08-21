/**
 * Health + recovery layer for the Zoe universal search index.
 * - Reads live index/queue stats from the durable indexer.
 * - Warns (and lets search disable itself) when the index is empty.
 * - Triggers one bounded automatic backfill when the index is empty or stale.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SearchIndexStats {
  indexed: number;
  pending: number;
  processing: number;
  failed: number;
  newestIndexedAt: string | null;
}

export interface SearchIndexFailure {
  id: string;
  entity_type: string;
  entity_id: string;
  attempts: number;
  last_error: string | null;
  updated_at: string;
}

const STALE_MS = 24 * 60 * 60 * 1000;
const AUTO_BACKFILL_KEY = 'zoe.search.autoBackfillAt';

export type SearchIndexCoverage = Record<string, { indexed: number; withVision: number }>;

export async function fetchSearchIndexStats(): Promise<{ stats: SearchIndexStats; failures: SearchIndexFailure[]; coverage: SearchIndexCoverage } | null> {
  const { data, error } = await supabase.functions.invoke('zoe-search-indexer', { body: { stats: true } });
  if (error || !data?.stats) return null;
  return {
    stats: data.stats as SearchIndexStats,
    failures: (data.failures || []) as SearchIndexFailure[],
    coverage: (data.coverage || {}) as SearchIndexCoverage,
  };
}

/** Requeues media entities for vision description (all of them when `force`). */
export async function runVisionBackfill(options: { force?: boolean; limit?: number } = {}) {
  const { data, error } = await supabase.functions.invoke('zoe-search-indexer', {
    body: { visionBackfill: true, force: options.force === true, limit: options.limit ?? 5 },
  });
  if (error) throw error;
  return data as { enqueued: number; processed: number; completed: number; failed: number };
}

/** Drains one bounded batch; optionally enqueues the full historical backfill first. */
export async function runIndexerBatch(options: { backfill?: boolean; limit?: number } = {}) {
  const { data, error } = await supabase.functions.invoke('zoe-search-indexer', {
    body: { backfill: options.backfill === true, limit: options.limit ?? 10 },
  });
  if (error) throw error;
  return data as { enqueued: number; processed: number; completed: number; failed: number };
}

async function drainIndexerQueue(initialBackfill: boolean) {
  let shouldBackfill = initialBackfill;
  for (let batch = 0; batch < 60; batch += 1) {
    const result = await runIndexerBatch({ backfill: shouldBackfill, limit: 1 });
    shouldBackfill = false;
    if (result.processed === 0) break;
    // Yield between media-analysis calls and avoid monopolizing the browser/network.
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
}

export function useSearchIndexHealth(options: { autoBackfill?: boolean } = {}) {
  const { autoBackfill = false } = options;
  const [stats, setStats] = useState<SearchIndexStats | null>(null);
  const [failures, setFailures] = useState<SearchIndexFailure[]>([]);
  const [coverage, setCoverage] = useState<SearchIndexCoverage>({});
  const [loading, setLoading] = useState(true);
  const startedRef = useRef(false);

  const refresh = useCallback(async () => {
    const snapshot = await fetchSearchIndexStats();
    if (snapshot) {
      setStats(snapshot.stats);
      setFailures(snapshot.failures);
      setCoverage(snapshot.coverage);
    }
    setLoading(false);
    return snapshot;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const snapshot = await refresh();
      if (cancelled || !autoBackfill || !snapshot || startedRef.current) return;

      const newest = snapshot.stats.newestIndexedAt ? Date.parse(snapshot.stats.newestIndexedAt) : 0;
      const isEmpty = snapshot.stats.indexed === 0;
      const isStale = !newest || Date.now() - newest > STALE_MS;
      const hasOutstandingJobs = snapshot.stats.pending > 0 || snapshot.stats.failed > 0;
      if (!isEmpty && !isStale && !hasOutstandingJobs) return;

      // Guard against repeated startup storms: at most one auto backfill per day.
      const lastRun = Number(localStorage.getItem(AUTO_BACKFILL_KEY) || 0);
      if (!isEmpty && !hasOutstandingJobs && Date.now() - lastRun < STALE_MS) return;
      startedRef.current = true;
      localStorage.setItem(AUTO_BACKFILL_KEY, String(Date.now()));
      try {
        await drainIndexerQueue(isEmpty || isStale);
        if (!cancelled) await refresh();
      } catch (error) {
        console.warn('[search-index] auto backfill failed:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [autoBackfill, refresh]);

  return {
    stats,
    coverage,
    failures,
    loading,
    refresh,
    isEmpty: !loading && (stats?.indexed ?? 0) === 0,
  };
}

export default useSearchIndexHealth;
