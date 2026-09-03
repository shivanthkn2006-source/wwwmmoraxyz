/**
 * OMNI-GRAPH RECALL — galaxy-wide retrieval over public.zoe_universal_index.
 *
 * Every Zoe brain uses this single entry point so recall behaves identically no
 * matter which backend answers. The query runs through the caller's JWT (never
 * the service role) so Postgres RLS decides what the user may see: their own
 * rows, public rows, and friends' rows. No client-side privacy filtering.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { embedText } from './zoe-embeddings.ts';

export type OmniRecallHit = {
  entityType: string;
  entityId: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
};

const LABELS: Record<string, string> = {
  post: 'Feed post',
  image: 'Image post',
  loop_video: 'Loop',
  quote: 'Quote',
  profile: 'Member profile',
  chat: 'Past conversation',
  dhf_node: 'DHF memory',
  dhf_post: 'DHF daily essay',
  dhf_video: 'DHF video',
  growth_card: 'Growth insight',
  astro_prediction: 'Daily Compass prediction',
  wisdom_goal: 'Wisdom goal',
};

/** Retrieves the most relevant platform entities for a natural-language query. */
export async function omniRecall(
  authHeader: string,
  query: string,
  matchCount = 8,
): Promise<OmniRecallHit[]> {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const term = (query || '').trim();
  if (!url || !anon || !authHeader || term.length < 3) return [];

  try {
    const embedding = await embedText(term.slice(0, 2000));
    if (!embedding) return [];
    const db = createClient(url, anon, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await db.rpc('zoe_hybrid_search', {
      query_embedding: JSON.stringify(embedding),
      query_text: term.slice(0, 500),
      match_count: Math.max(1, Math.min(matchCount, 25)),
    });
    if (error) {
      console.warn('[omni-recall] search failed:', error.message);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => ({
      entityType: String(row.entity_type || 'unknown'),
      entityId: String(row.entity_id || ''),
      content: String(row.content_synthesis || '').slice(0, 600),
      score: Number(row.score || 0),
      metadata: (row.metadata as Record<string, unknown>) || {},
    }));
  } catch (error) {
    console.warn('[omni-recall] unavailable:', error instanceof Error ? error.message : error);
    return [];
  }
}

/** Formats recall hits as a prompt block; returns '' when nothing was found. */
export function buildOmniRecallBlock(hits: OmniRecallHit[]): string {
  if (!hits.length) return '';
  const lines = hits.map((hit, index) => {
    const label = LABELS[hit.entityType] || hit.entityType;
    const when = typeof hit.metadata?.createdAt === 'string' ? ` (${String(hit.metadata.createdAt).slice(0, 10)})` : '';
    return `(${index + 1}) [${label}${when}] ${hit.content.replace(/\s+/g, ' ').trim()}`;
  });
  return `\n\n═══ OMNI-GRAPH RECALL (this platform's own knowledge) ═══\n${lines.join('\n')}\n═══════════════════════════════════════\nUse these platform facts before any outside knowledge. Never invent platform content that is not listed here.`;
}
