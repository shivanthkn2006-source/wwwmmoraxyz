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

  return { executeAmbientSearch, isSynthesizing, result, error, reset };
};

/** Fire-and-forget indexing of any platform entity into the universal vector graph. */
export async function indexEntity(input: {
  entityType: 'loop_video' | 'chat' | 'dhf_node' | 'spot' | '3d_asset' | 'post' | string;
  entityId: string;
  rawContent?: string;
  mediaUrl?: string;
  ownerId?: string;
  privacyLevel?: 'public' | 'friends' | 'private';
  socialWeight?: number;
  metadata?: Record<string, any>;
}): Promise<boolean> {
  if (!input?.entityType || !input?.entityId) {
    console.warn('[zoe-index-ingest:req] skipped — entityType/entityId required', input);
    return false;
  }
  const requestId = `ix-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = performance.now();
  console.info('[zoe-index-ingest:req]', {
    requestId,
    entityType: input.entityType,
    entityId: input.entityId,
    hasMedia: Boolean(input.mediaUrl),
    contentChars: (input.rawContent || '').length,
  });
  try {
    const { data, error } = await supabase.functions.invoke('zoe-index-ingest', {
      body: { ...input, requestId },
    });
    const roundTripMs = Math.round(performance.now() - startedAt);
    if (error || data?.error) {
      console.warn('[zoe-index-ingest:res]', { requestId, roundTripMs, error: error?.message || data?.error });
      return false;
    }
    console.info('[zoe-index-ingest:res]', {
      requestId,
      roundTripMs,
      indexedCharacters: data?.indexedCharacters ?? 0,
      dims: data?.dims ?? null,
      serverTimings: data?.timings ?? null,
    });
    return true;
  } catch (e) {
    console.warn('[zoe-index-ingest:res] threw', { requestId, error: e });
    return false;
  }
}

export default useAmbientSearch;
