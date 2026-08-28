import { describe, expect, it } from 'vitest';
import { composeChronologicalFeed, interleaveGrowthCards, orderGrowthByTime } from '@/lib/growthFeedComposition';

describe('Growth feed composition', () => {
  it('places Growth cards between ordinary feed items', () => {
    expect(interleaveGrowthCards(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], ['g1', 'g2'], 3))
      .toEqual(['p1', 'p2', 'p3', 'g1', 'p4', 'p5', 'p6', 'g2']);
  });

  it('does not hide Growth cards when the ordinary feed is empty', () => {
    expect(interleaveGrowthCards([], ['g1', 'g2'])).toEqual(['g1', 'g2']);
  });

  it('preserves all content when there are no Growth cards', () => {
    expect(interleaveGrowthCards(['p1', 'p2'], [])).toEqual(['p1', 'p2']);
  });

  it('includes every card once in a sparse feed', () => {
    expect(interleaveGrowthCards(['p1'], ['g1', 'g2', 'g3']))
      .toEqual(['p1', 'g1', 'g2', 'g3']);
  });

  it('interleaves cards through a combined posts, loops, and videos sequence', () => {
    const content = ['post-1', 'loop-1', 'search-video-1', 'post-2', 'neural-video-1'];
    const composed = interleaveGrowthCards(content, ['growth-morning', 'growth-midday'], 3);
    expect(composed).toEqual([
      'post-1', 'loop-1', 'search-video-1', 'growth-morning',
      'post-2', 'neural-video-1', 'growth-midday',
    ]);
    expect(composed.filter((item) => item.startsWith('growth-'))).toHaveLength(2);
  });
});
describe('Chronological mixed feed composition', () => {
  it('orders posts, loops, and Growth by their real timestamps', () => {
    expect(composeChronologicalFeed([
      { id: 'old-post', timestamp: '2026-08-28T10:00:00Z', value: 'old-post' },
      { id: 'night-growth', timestamp: '2026-08-28T16:30:00Z', value: 'night-growth' },
      { id: 'new-loop', timestamp: '2026-08-28T18:00:00Z', value: 'new-loop' },
    ])).toEqual(['new-loop', 'night-growth', 'old-post']);
  });

  it('keeps stable source order for equal or invalid timestamps', () => {
    expect(composeChronologicalFeed([
      { id: 'a', timestamp: 'invalid', value: 'a' },
      { id: 'b', timestamp: 'invalid', value: 'b' },
    ])).toEqual(['a', 'b']);
  });
});
describe('Growth card time ordering', () => {
  const card = (slot: string) => ({ slot: slot as never, id: slot });

  it('leads with the window the member is in right now', () => {
    const out = orderGrowthByTime(
      [card('morning'), card('midday'), card('afternoon')],
      'afternoon' as never,
    );
    expect(out.map((c) => c.id)).toEqual(['afternoon', 'midday', 'morning']);
  });

  it('falls back to the most recent passed window', () => {
    const out = orderGrowthByTime([card('morning'), card('midday')], 'afternoon' as never);
    expect(out.map((c) => c.id)).toEqual(['midday', 'morning']);
  });

  it('places windows still ahead after the due ones', () => {
    const out = orderGrowthByTime([card('morning'), card('night')], 'midday' as never);
    expect(out.map((c) => c.id)).toEqual(['morning', 'night']);
  });
});
