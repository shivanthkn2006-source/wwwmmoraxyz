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
  dhf_node: 'DHF memory',
  dhf_post: 'DHF daily essay',
  dhf_video: 'DHF video',
  growth_card: 'Growth insight',
  astro_prediction: 'Daily Compass prediction',
  wisdom_goal: 'Wisdom goal',
};

/**
 * Half-life in days per entity type. Time-bound content (a day's compass
 * reading) decays fast; identity-ish content (profiles, goals) barely decays.
 */
const HALF_LIFE_DAYS: Record<string, number> = {
  astro_prediction: 1,
  growth_card: 3,
  post: 21,
  image: 21,
  loop_video: 21,
  quote: 60,
  chat: 30,
  dhf_post: 45,
  dhf_video: 180,
  dhf_node: 120,
  wisdom_goal: 365,
  profile: 3650,
};

/** Beyond this age (days) an item is flagged stale and labelled as historical. */
const STALE_AFTER_DAYS: Record<string, number> = {
  astro_prediction: 2,
  growth_card: 7,
};

/** Small prior so first-party memory outranks incidental feed chatter on ties. */
const TYPE_PRIOR: Record<string, number> = {
  dhf_node: 1.15,
  chat: 1.1,
  profile: 1.1,
  wisdom_goal: 1.05,
};

/** Maximum hits allowed from a single entity type in the final result set. */
const MAX_PER_TYPE = 3;

const DAY_MS = 86_400_000;

function ageInDays(createdAt: string | null): number | null {
  if (!createdAt) return null;
  const ts = Date.parse(createdAt);
  if (Number.isNaN(ts)) return null;
  return Math.max(0, (Date.now() - ts) / DAY_MS);
}

function recencyFactor(entityType: string, age: number | null): number {
  if (age === null) return 0.85; // unknown date: mild penalty, never excluded
  const halfLife = HALF_LIFE_DAYS[entityType] ?? 30;
  // Exponential decay floored at 0.2 so old-but-relevant content stays reachable.
  return Math.max(0.2, Math.pow(0.5, age / halfLife));
}

/** Reranks + diversifies raw hybrid hits. Exported for unit tests. */
export function rerankRecallHits(hits: OmniRecallHit[], limit: number): OmniRecallHit[] {
  const scored = hits
    .map((hit) => {
      const prior = TYPE_PRIOR[hit.entityType] ?? 1;
      const recency = recencyFactor(hit.entityType, hit.ageDays);
      return { ...hit, score: hit.rawScore * recency * prior };
    })
    .sort((a, b) => b.score - a.score);

  const perType = new Map<string, number>();
  const primary: OmniRecallHit[] = [];
  const overflow: OmniRecallHit[] = [];

  for (const hit of scored) {
    const used = perType.get(hit.entityType) ?? 0;
    if (used < MAX_PER_TYPE) {
      perType.set(hit.entityType, used + 1);
      primary.push(hit);
    } else {
      overflow.push(hit);
    }
  }

  return [...primary, ...overflow].slice(0, limit);
}

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
      const staleAfter = STALE_AFTER_DAYS[entityType];
      return {
        entityType,
        entityId: String(row.entity_id || ''),
        content: String(row.content_synthesis || '').slice(0, 600),
        rawScore: Number(row.score || 0),
        score: Number(row.score || 0),
        createdAt,
        ageDays: age,
        stale: staleAfter !== undefined && age !== null && age > staleAfter,
        metadata,
      };
    });

    return rerankRecallHits(hits, limit);
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
    const when = hit.createdAt ? ` ${hit.createdAt.slice(0, 10)}` : '';
    const staleTag = hit.stale ? ' · HISTORICAL, no longer current' : '';
    const ref = hit.entityId ? ` ref:${hit.entityType}/${hit.entityId.slice(0, 8)}` : '';
    return `(${index + 1}) [${label}${when}${staleTag}${ref}] ${hit.content.replace(/\s+/g, ' ').trim()}`;
  });
  return `\n\n═══ OMNI-GRAPH RECALL (this platform's own knowledge) ═══\n${lines.join('\n')}\n═══════════════════════════════════════\nUse these platform facts before any outside knowledge. Never invent platform content that is not listed here. Items marked HISTORICAL describe a past day — never present them as today's content.`;
}
