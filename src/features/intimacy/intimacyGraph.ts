/**
 * Closeness graph.
 *
 * Reads the derived `intimacy_scores` edges for the signed-in member and asks
 * the server routine to recompute them from the raw `feed_events`. All maths
 * lives in Postgres (`recompute_intimacy_scores`) so it cannot be gamed from
 * the client, and RLS means a member only ever sees their own edges.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveAuthUid } from '@/lib/safeTelemetry';
import { flushFeedEvents } from './feedEvents';

export interface IntimacyEdge {
  targetUserId: string;
  score: number;
  reciprocity: number;
  depthRatio: number;
  eventCount: number;
  lastInteractionAt: string | null;
}

let cache: { at: number; edges: IntimacyEdge[] } | null = null;
const CACHE_MS = 60_000;

export async function fetchIntimacyEdges(force = false): Promise<IntimacyEdge[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.edges;
  const uid = await resolveAuthUid();
  if (!uid) return [];

  const { data, error } = await supabase
    .from('intimacy_scores')
    .select('target_user_id, score, reciprocity, depth_ratio, event_count, last_interaction_at')
    .order('score', { ascending: false })
    .limit(500);

  if (error || !data) return cache?.edges ?? [];

  const edges: IntimacyEdge[] = data.map((row) => ({
    targetUserId: row.target_user_id as string,
    score: Number(row.score ?? 0),
    reciprocity: Number(row.reciprocity ?? 0),
    depthRatio: Number(row.depth_ratio ?? 0),
    eventCount: Number(row.event_count ?? 0),
    lastInteractionAt: (row.last_interaction_at as string | null) ?? null,
  }));
  cache = { at: Date.now(), edges };
  return edges;
}

/** Recompute the edges server-side, then return the fresh graph. */
export async function recomputeIntimacy(): Promise<IntimacyEdge[]> {
  const uid = await resolveAuthUid();
  if (!uid) return [];
  await flushFeedEvents();
  try {
    await supabase.rpc('recompute_intimacy_scores', { _user_id: uid });
  } catch {
    /* keep whatever edges already exist */
  }
  return fetchIntimacyEdges(true);
}

export function intimacyMap(edges: IntimacyEdge[]): Map<string, number> {
  return new Map(edges.map((e) => [e.targetUserId, e.score]));
}

export function clearIntimacyCache(): void {
  cache = null;
}
