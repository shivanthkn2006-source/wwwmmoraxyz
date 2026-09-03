import { describe, expect, it } from 'vitest';
import {
  MAX_PER_TYPE,
  ageInDays,
  isStale,
  rerankRecallHits,
  recencyFactor,
  type RankableHit,
} from '../../supabase/functions/_shared/omni-rank';

const hit = (over: Partial<RankableHit>): RankableHit => ({
  entityType: 'post',
  entityId: 'id',
  content: 'content',
  score: 0,
  rawScore: 0.01,
  createdAt: null,
  ageDays: 0,
  stale: false,
  metadata: {},
  ...over,
});

describe('omni-graph ranking', () => {
  it('computes age in days from a timestamp', () => {
    const now = Date.parse('2026-09-03T00:00:00Z');
    expect(ageInDays('2026-09-01T00:00:00Z', now)).toBe(2);
    expect(ageInDays(null, now)).toBeNull();
    expect(ageInDays('not-a-date', now)).toBeNull();
  });

  it('flags time-bound content stale past its validity window', () => {
    expect(isStale('astro_prediction', 3)).toBe(true);
    expect(isStale('astro_prediction', 1)).toBe(false);
    expect(isStale('dhf_video', 900)).toBe(false);
  });

  it('decays fresh-critical types faster than evergreen types', () => {
    expect(recencyFactor('astro_prediction', 3)).toBeLessThan(recencyFactor('dhf_video', 3));
    expect(recencyFactor('profile', 30)).toBeGreaterThan(0.9);
    expect(recencyFactor('post', 10_000)).toBe(0.2);
  });

  it('prefers a fresh item over a slightly more relevant stale one', () => {
    const ranked = rerankRecallHits(
      [
        hit({ entityId: 'old', entityType: 'astro_prediction', rawScore: 0.02, ageDays: 30 }),
        hit({ entityId: 'new', entityType: 'astro_prediction', rawScore: 0.018, ageDays: 0 }),
      ],
      2,
    );
    expect(ranked[0].entityId).toBe('new');
  });

  it('caps how many hits one entity type contributes', () => {
    const flood = Array.from({ length: 8 }, (_, i) =>
      hit({ entityId: `p${i}`, entityType: 'post', rawScore: 0.05 - i * 0.001, ageDays: 1 }),
    );
    const other = hit({ entityId: 'chat1', entityType: 'chat', rawScore: 0.001, ageDays: 1 });
    const ranked = rerankRecallHits([...flood, other], 4);
    const posts = ranked.filter((r) => r.entityType === 'post');
    expect(posts.length).toBeLessThanOrEqual(MAX_PER_TYPE);
    expect(ranked.some((r) => r.entityType === 'chat')).toBe(true);
  });

  it('never returns more hits than the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      hit({ entityId: `x${i}`, entityType: i % 2 ? 'post' : 'chat', rawScore: 0.01, ageDays: i }),
    );
    expect(rerankRecallHits(many, 5)).toHaveLength(5);
  });
});
