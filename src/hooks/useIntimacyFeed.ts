/**
 * Opt-in intimacy feed hook.
 *
 * A surface that wants closeness-aware ordering calls this and renders
 * `ordered`. Nothing is mutated globally: pass items in, get items back. When
 * the member has no graph yet (new account, signed out), the original order is
 * returned untouched, so the existing chronological feed is the safe default.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchIntimacyEdges, recomputeIntimacy, intimacyMap, type IntimacyEdge } from '@/features/intimacy/intimacyGraph';
import { rankByIntimacy, type RankableItem } from '@/features/intimacy/rankFeed';

export interface UseIntimacyFeedOptions {
  enabled?: boolean;
  /** Recompute the graph from raw events on mount (default: false — read only). */
  recomputeOnMount?: boolean;
}

export function useIntimacyFeed<T extends RankableItem>(
  items: T[],
  options: UseIntimacyFeedOptions = {},
) {
  const { enabled = true, recomputeOnMount = false } = options;
  const [edges, setEdges] = useState<IntimacyEdge[]>([]);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(
    async (recompute: boolean) => {
      setLoading(true);
      try {
        setEdges(recompute ? await recomputeIntimacy() : await fetchIntimacyEdges());
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let alive = true;
    void (async () => {
      const next = recomputeOnMount ? await recomputeIntimacy() : await fetchIntimacyEdges();
      if (alive) {
        setEdges(next);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled, recomputeOnMount]);

  const ordered = useMemo(() => {
    if (!enabled || edges.length === 0) return items;
    return rankByIntimacy(items, { intimacy: intimacyMap(edges) });
  }, [items, edges, enabled]);

  return { ordered, edges, loading, refresh: () => load(true) };
}

export default useIntimacyFeed;
