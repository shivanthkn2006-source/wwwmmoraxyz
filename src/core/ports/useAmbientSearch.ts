/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE AMBIENT SEARCH PORT (headless)
 * Connects any existing search bar / voice handler to the decoupled retrieval
 * orchestrator (Groq intent → RRF hybrid search → Gemini synthesis).
 * No UI is rendered here by design.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ZoeDispatchAction {
  action: string;
  payload: Record<string, any>;
}

export interface AmbientSearchRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  content_synthesis: string;
  metadata: Record<string, any> | null;
  social_weight: number;
  score: number;
}

export interface AmbientSearchIntent {
  intent: 'informational' | 'actionable' | 'memory_recall' | 'academic';
  requiresAction: boolean;
  normalizedQuery: string;
}

export interface AmbientSearchResult {
  synthesis: string;
  dispatchAction?: ZoeDispatchAction | null;
  intent?: AmbientSearchIntent;
  records: AmbientSearchRecord[];
  nodesEvaluated: number;
}

/** Developer-only trace of the most recent orchestrator round trip. */
export interface AmbientSearchDebug {
  requestId: string;
  query: string;
  at: number;
  roundTripMs: number;
  serverTimings: Record<string, number> | null;
  intent: string | null;
  nodesEvaluated: number;
  nodeTypes: Record<string, number>;
  dispatchBlock: string | null;
  dispatchParsed: ZoeDispatchAction | null;
  degraded: unknown;
  error: string | null;
}

export const useAmbientSearch = () => {
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [result, setResult] = useState<AmbientSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<AmbientSearchDebug | null>(null);
  const runIdRef = useRef(0);


  const executeAmbientSearch = useCallback(
    async (query: string, dhfContext?: Record<string, any>): Promise<AmbientSearchResult | null> => {
      const term = (query || '').trim();
      if (!term) return null;

      const runId = ++runIdRef.current;
      setIsSynthesizing(true);
      setError(null);

      const requestId = `as-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const startedAt = performance.now();
      console.info('[zoe-ambient-search:req]', { requestId, query: term });

      try {
        // Drain a small durable indexing batch first. Database triggers create
        // jobs, so an interrupted upload/search is safely retried next time.
        const { error: indexerError } = await supabase.functions.invoke('zoe-search-indexer', {
          body: { limit: 5 },
        });
        if (indexerError) console.warn('[zoe-search-indexer] background batch failed:', indexerError.message);

        const { data, error: fnError } = await supabase.functions.invoke('zoe-ambient-search', {
          body: { queryText: term, dhfContext: dhfContext || {}, requestId },
        });
        const roundTripMs = Math.round(performance.now() - startedAt);
        console.info('[zoe-ambient-search:res]', {
          requestId,
          roundTripMs,
          serverTimings: data?.timings ?? null,
          intent: data?.intent?.intent ?? null,
          nodesEvaluated: data?.nodesEvaluated ?? 0,
          degraded: data?.degraded ?? null,
          error: fnError?.message || data?.error || null,
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        const rawSynthesis: string = data?.synthesis || '';

        let dispatchAction: ZoeDispatchAction | null = null;
        let cleanText = rawSynthesis;

        const dispatchMatch = rawSynthesis.match(/<zoe_dispatch>([\s\S]*?)<\/zoe_dispatch>/);
        if (dispatchMatch) {
          cleanText = rawSynthesis.replace(/<zoe_dispatch>[\s\S]*?<\/zoe_dispatch>/, '').trim();
          try {
            dispatchAction = JSON.parse(dispatchMatch[1].trim());
          } catch (e) {
            console.warn('[useAmbientSearch] failed to parse zoe_dispatch payload:', e);
          }
        }

        const searchOutput: AmbientSearchResult = {
          synthesis: cleanText,
          dispatchAction,
          intent: data?.intent,
          records: Array.isArray(data?.records) ? data.records : [],
          nodesEvaluated: data?.nodesEvaluated || 0,
        };

        const nodeTypes: Record<string, number> = {};
        for (const record of searchOutput.records) {
          nodeTypes[record.entity_type] = (nodeTypes[record.entity_type] || 0) + 1;
        }

        // Ignore stale responses from superseded queries.
        if (runId === runIdRef.current) {
          setResult(searchOutput);
          setDebug({
            requestId,
            query: term,
            at: Date.now(),
            roundTripMs,
            serverTimings: (data?.timings as Record<string, number>) ?? null,
            intent: data?.intent?.intent ?? null,
            nodesEvaluated: searchOutput.nodesEvaluated,
            nodeTypes,
            dispatchBlock: dispatchMatch ? dispatchMatch[0] : null,
            dispatchParsed: dispatchAction,
            degraded: data?.degraded ?? null,
            error: null,
          });
        }
        return searchOutput;
      } catch (err: any) {
        const errMessage = err?.message || 'Synthesis failed';
        if (runId === runIdRef.current) {
          setError(errMessage);
          setDebug({
            requestId,
            query: term,
            at: Date.now(),
            roundTripMs: Math.round(performance.now() - startedAt),
            serverTimings: null,
            intent: null,
            nodesEvaluated: 0,
            nodeTypes: {},
            dispatchBlock: null,
            dispatchParsed: null,
            degraded: null,
            error: errMessage,
          });
        }
        return null;

      } finally {
        if (runId === runIdRef.current) setIsSynthesizing(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    runIdRef.current += 1;
    setResult(null);
    setError(null);
    setIsSynthesizing(false);
  }, []);

  // `debug` intentionally survives reset() so the last trace stays inspectable.
  return { executeAmbientSearch, isSynthesizing, result, error, reset, debug };

};

export default useAmbientSearch;
