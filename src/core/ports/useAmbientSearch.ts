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
import { ensureLiveSession } from '@/lib/sessionGuard';

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

/**
 * Best-effort device location for live-data answers (weather and friends).
 * Cached for 10 minutes, resolves fast, and never blocks or rejects: without
 * a fix the backend simply falls back to a city named in the query.
 */
const GEO_TTL_MS = 10 * 60 * 1000;
let cachedGeo: { at: number; value: { latitude: number; longitude: number } | null } | null = null;

const resolveGeo = (): Promise<{ latitude: number; longitude: number } | null> => {
  if (cachedGeo && Date.now() - cachedGeo.at < GEO_TTL_MS) return Promise.resolve(cachedGeo.value);
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: { latitude: number; longitude: number } | null) => {
      if (settled) return;
      settled = true;
      cachedGeo = { at: Date.now(), value };
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 3000);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); finish({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); },
      () => { clearTimeout(timer); finish(null); },
      { enableHighAccuracy: false, maximumAge: GEO_TTL_MS, timeout: 3000 },
    );
  });
};

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
        // DHF consciousness ingestion — vector memory + personalised feed
        // injection. Fire-and-forget: never blocks or fails the search turn.
        void supabase.functions
          .invoke('zoe-dhf-brain', {
            body: {
              query: term,
              contextType: 'search',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          })
          .then(({ data, error: brainError }) => {
            if (brainError) {
              console.warn('[zoe-dhf-brain] ingestion failed:', brainError.message);
              return;
            }
            if (data?.feed?.injected) {
              window.dispatchEvent(new CustomEvent('mmora:dhf-feed-updated', { detail: data.feed }));
            }
          })
          .catch((e) => console.warn('[zoe-dhf-brain] ingestion threw:', e));

        // Drain a small durable indexing batch first. Database triggers create
        // jobs, so an interrupted upload/search is safely retried next time.
        // Signed-out visitors skip it: the indexer requires a session (401).
        // Index maintenance is unrelated to this foreground answer. It used to
        // block every visible search behind a session check and an edge call.
        void ensureLiveSession().then((live) => {
          if (!live) return;
          return supabase.functions.invoke('zoe-search-indexer', { body: { limit: 5 } });
        }).then((result) => {
          if (result?.error) console.warn('[zoe-search-indexer] background batch failed:', result.error.message);
        }).catch((e) => console.warn('[zoe-search-indexer] background batch threw:', e));

        // A cached fix arrives immediately. An uncached browser location gets a
        // small budget so weather remains useful without holding every search.
        const coords = await Promise.race([
          resolveGeo(),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 250)),
        ]);
        const { data, error: fnError } = await supabase.functions.invoke('zoe-ambient-search', {
          body: {
            queryText: term,
            dhfContext: dhfContext || {},
            requestId,
            geo: {
              ...(coords || {}),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          },
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
