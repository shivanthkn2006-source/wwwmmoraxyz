import { describe, it, expect } from 'vitest';
import { groupBatch, FIRST_GROUP, GROUP, RETRY_MS } from '@/worlds/realmap/osm';

describe('real-map loading', () => {
  it('asks for your own 3x3 blocks first, then small groups', () => {
    const g = groupBatch(Array.from({ length: 25 }, (_, i) => i));
    expect(g[0]).toHaveLength(FIRST_GROUP);
    expect(g[0][0]).toBe(0);
    g.slice(1).forEach((x) => expect(x.length).toBeLessThanOrEqual(GROUP));
    expect(g.flat()).toHaveLength(25);
  });
  it('retries with growing pauses', () => {
    expect(RETRY_MS).toEqual([...RETRY_MS].sort((a, b) => a - b));
    expect(RETRY_MS.length).toBeGreaterThanOrEqual(3);
  });
});
