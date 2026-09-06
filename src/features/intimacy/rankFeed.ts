/**
 * Pure intimacy-aware ranking.
 *
 * Deliberately isolated from any component so the existing Home/Loops feed
 * keeps its chronological behaviour until a surface opts in. Rules:
 *  • closeness first — people you actually talk to outrank strangers
 *  • recency still matters (exponential decay over 72h)
 *  • velocity cap — raw popularity can never dominate a close friend's post
 *  • author diversity — no author appears twice in the first N slots
 */
export interface RankableItem {
  id: string;
  authorId?: string | null;
  createdAt: string | number | Date;
  /** Optional popularity signal (likes + comments). Capped, never dominant. */
  velocity?: number;
}

export interface RankOptions {
  /** targetUserId -> intimacy score */
  intimacy: Map<string, number>;
  /** Half-life of recency in hours. */
  halfLifeHours?: number;
  /** Max popularity contribution — the anti-virality cap. */
  velocityCap?: number;
  /** How many leading slots enforce one-post-per-author. */
  diversityWindow?: number;
  now?: number;
}

const ts = (v: RankableItem['createdAt']): number => {
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
};

export function scoreItem(item: RankableItem, opts: RankOptions): number {
  const now = opts.now ?? Date.now();
  const halfLife = (opts.halfLifeHours ?? 72) * 3600_000;
  const ageMs = Math.max(0, now - ts(item.createdAt));
  const recency = Math.pow(0.5, ageMs / halfLife); // 1 → 0
  const closeness = item.authorId ? (opts.intimacy.get(item.authorId) ?? 0) : 0;
  const closenessScore = Math.log2(1 + Math.max(0, closeness)); // diminishing
  const velocity = Math.min(opts.velocityCap ?? 3, Math.log2(1 + Math.max(0, item.velocity ?? 0)));
  return closenessScore * 2 + recency * 3 + velocity;
}

export function rankByIntimacy<T extends RankableItem>(items: T[], opts: RankOptions): T[] {
  const scored = items.map((item, index) => ({ item, index, score: scoreItem(item, opts) }));
  scored.sort((a, b) => (b.score - a.score) || (a.index - b.index));

  const window = opts.diversityWindow ?? 5;
  const out: typeof scored = [];
  const held: typeof scored = [];
  const seen = new Set<string>();

  for (const entry of scored) {
    const author = entry.item.authorId ?? '';
    if (out.length < window && author && seen.has(author)) {
      held.push(entry);
      continue;
    }
    if (author) seen.add(author);
    out.push(entry);
  }
  return [...out, ...held].map((e) => e.item);
}
