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

export const useAmbientSearch = () => {
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [result, setResult] = useState<AmbientSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const executeAmbientSearch = useCallback(
    async (query: string, dhfContext?: Record<string, any>): Promise<AmbientSearchResult | null> => {
      const term = (query || '').trim();
      if (!term) return null;

      const runId = ++runIdRef.current;
      setIsSynthesizing(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('zoe-ambient-search', {
          body: { queryText: term, dhfContext: dhfContext || {} },
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

        // Ignore stale responses from superseded queries.
        if (runId === runIdRef.current) setResult(searchOutput);
        return searchOutput;
      } catch (err: any) {
        const errMessage = err?.message || 'Synthesis failed';
        if (runId === runIdRef.current) setError(errMessage);
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
  try {
    const { data, error } = await supabase.functions.invoke('zoe-index-ingest', { body: input });
    if (error || data?.error) {
      console.warn('[indexEntity] failed', error || data.error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[indexEntity] threw', e);
    return false;
  }
}

export default useAmbientSearch;
