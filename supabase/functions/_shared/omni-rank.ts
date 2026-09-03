/**
 * Pure ranking helpers for omni-graph recall.
 *
 * Kept free of Deno/network imports so both the edge runtime and the Vitest
 * suite can exercise the exact same ranking maths.
 */

export type RankableHit = {
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

/** Half-life in days per entity type: time-bound content decays fastest. */
export const HALF_LIFE_DAYS: Record<string, number> = {
  astro_prediction: 1,
  growth_card: 3,
  post: 21,
  image: 21,
  loop_video: 21,
  quote: 60,
  chat: 30,
  direct_message: 30,
  post_comment: 21,
  dhf_post: 45,
  dhf_video: 180,
  dhf_node: 120,
  wisdom_goal: 365,
  profile: 3650,
};

/** Beyond this age (days) an item is flagged stale and labelled historical. */
export const STALE_AFTER_DAYS: Record<string, number> = {
  astro_prediction: 2,
  growth_card: 7,
};

/** Small prior so first-party memory outranks incidental feed chatter on ties. */
export const TYPE_PRIOR: Record<string, number> = {
  dhf_node: 1.15,
  chat: 1.1,
  direct_message: 1.1,
  profile: 1.1,
  wisdom_goal: 1.05,
};

/** Maximum hits allowed from a single entity type in the final result set. */
export const MAX_PER_TYPE = 3;

const DAY_MS = 86_400_000;

export function ageInDays(createdAt: string | null, now = Date.now()): number | null {
  if (!createdAt) return null;
  const ts = Date.parse(createdAt);
  if (Number.isNaN(ts)) return null;
  return Math.max(0, (now - ts) / DAY_MS);
}

export function isStale(entityType: string, age: number | null): boolean {
  const staleAfter = STALE_AFTER_DAYS[entityType];
  return staleAfter !== undefined && age !== null && age > staleAfter;
}

export function recencyFactor(entityType: string, age: number | null): number {
  if (age === null) return 0.85; // unknown date: mild penalty, never excluded
  const halfLife = HALF_LIFE_DAYS[entityType] ?? 30;
  // Exponential decay floored at 0.2 so old-but-relevant content stays reachable.
  return Math.max(0.2, Math.pow(0.5, age / halfLife));
}

/** Reranks by relevance x freshness x type prior, then caps per-type flooding. */
export function rerankRecallHits<T extends RankableHit>(hits: T[], limit: number): T[] {
  const scored = hits
    .map((hit) => ({
      ...hit,
      score: hit.rawScore * recencyFactor(hit.entityType, hit.ageDays) * (TYPE_PRIOR[hit.entityType] ?? 1),
    }))
    .sort((a, b) => b.score - a.score);

  const perType = new Map<string, number>();
  const primary: T[] = [];
  const overflow: T[] = [];

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
