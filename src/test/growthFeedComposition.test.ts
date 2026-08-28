import { describe, expect, it } from 'vitest';
import { interleaveGrowthCards } from '@/lib/growthFeedComposition';

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
});