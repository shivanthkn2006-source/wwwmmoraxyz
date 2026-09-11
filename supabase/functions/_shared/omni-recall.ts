/**
 * OMNI-GRAPH RECALL — galaxy-wide retrieval over public.zoe_universal_index.
 *
 * Every Zoe brain uses this single entry point so recall behaves identically no
 * matter which backend answers. The query runs through the caller's JWT (never
 * the service role) so Postgres RLS decides what the user may see: their own
 * rows, public rows, and friends' rows. No client-side privacy filtering.
 *
 * Ranking pipeline (SEP03 upgrade):
 *   1. RLS-safe hybrid retrieval (vector + full-text RRF) with over-fetch.
 *   2. Rerank: hybrid score x recency decay x temporal-validity x type prior.
 *   3. Diversity: cap per entity type so one content family cannot flood recall.
 *   4. Provenance: every hit carries type + id + date for citation.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { embedText } from './zoe-embeddings.ts';
import { ageInDays, isStale, rerankRecallHits } from './omni-rank.ts';

export { rerankRecallHits };

export type OmniRecallHit = {
  entityType: string;
  entityId: string;
  content: string;
  score: number;
  rawScore: number;
  createdAt: string | null;
  ageDays: number | null;
  stale: boolean;
  metadata: Record<string, unknown>;
};

const LABELS: Record<string, string> = {
  post: 'Feed post',
  image: 'Image post',
  loop_video: 'Loop',
  quote: 'Quote',
  profile: 'Member profile',
  chat: 'Past conversation',
  direct_message: 'Direct message',
  post_comment: 'Comment',
  dhf_node: 'DHF memory',
  dhf_post: 'DHF daily essay',
  dhf_video: 'DHF video',
  growth_card: 'Growth insight',
  astro_prediction: 'Daily Compass prediction',
  wisdom_goal: 'Wisdom goal',
  visual_memory: 'Something Zoe saw',
  important_date: 'Saved date',
  post_attachment: 'Attached photo or document',
  life_fact: 'Remembered life detail',
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

  const limit = Math.max(1, Math.min(matchCount, 25));

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
      // Over-fetch so the reranker has room to trade relevance for freshness
      // and type diversity without starving the final set.
      match_count: Math.min(50, limit * 3),
    });
    if (error) {
      console.warn('[omni-recall] search failed:', error.message);
      return [];
    }

    const hits: OmniRecallHit[] = (data || []).map((row: Record<string, unknown>) => {
      const entityType = String(row.entity_type || 'unknown');
      const metadata = (row.metadata as Record<string, unknown>) || {};
      const createdAt =
        (typeof row.created_at === 'string' ? row.created_at : null) ||
        (typeof metadata.createdAt === 'string' ? metadata.createdAt : null);
      const age = ageInDays(createdAt);
      return {
        entityType,
        entityId: String(row.entity_id || ''),
        content: String(row.content_synthesis || '').slice(0, 600),
        rawScore: Number(row.score || 0),
        score: Number(row.score || 0),
        createdAt,
        ageDays: age,
        stale: isStale(entityType, age),
        metadata,
      };
    });

    return rerankRecallHits(hits, limit);
  } catch (error) {
    console.warn('[omni-recall] unavailable:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Provenance payload for the in-app citation buttons: each hit becomes a
 * numbered citation the UI can open back to its exact source row.
 */
export type RecallSource = {
  citationId: number;
  entityType: string;
  entityId: string;
  title: string | null;
  route: string | null;
  createdAt: string | null;
  stale: boolean;
  score: number;
  excerpt: string;
};

export function buildRecallSources(hits: OmniRecallHit[]): RecallSource[] {
  return hits.map((hit, index) => ({
    citationId: index + 1,
    entityType: hit.entityType,
    entityId: hit.entityId,
    title:
      typeof hit.metadata?.title === 'string'
        ? hit.metadata.title
        : LABELS[hit.entityType] || hit.entityType,
    route: typeof hit.metadata?.route === 'string' ? hit.metadata.route : null,
    createdAt: hit.createdAt,
    stale: hit.stale,
    score: Number(hit.score.toFixed(4)),
    excerpt: hit.content.slice(0, 240),
  }));
}

/** Formats recall hits as a prompt block; returns '' when nothing was found. */

export function buildOmniRecallBlock(hits: OmniRecallHit[]): string {
  if (!hits.length) return '';
  const lines = hits.map((hit, index) => {
    const label = LABELS[hit.entityType] || hit.entityType;
    const when = hit.createdAt ? ` ${hit.createdAt.slice(0, 10)}` : '';
    const staleTag = hit.stale ? ' · HISTORICAL, no longer current' : '';
    const ref = hit.entityId ? ` ref:${hit.entityType}/${hit.entityId.slice(0, 8)}` : '';
    return `(${index + 1}) [${label}${when}${staleTag}${ref}] ${hit.content.replace(/\s+/g, ' ').trim()}`;
  });
  return `\n\n═══ OMNI-GRAPH RECALL (this platform's own knowledge) ═══\n${lines.join('\n')}\n═══════════════════════════════════════\nUse these platform facts before any outside knowledge. Never invent platform content that is not listed here. Items marked HISTORICAL describe a past day — never present them as today's content.`;
}
