import { describe, it, expect } from 'vitest';
import { trimForShare } from '@/worlds/realmap/osm';

describe('shared map blocks fit the shared-cache limits', () => {
  it('trims dense city blocks but keeps named streets and places', () => {
    const roads = Array.from({ length: 300 }, (_, i) => ({ pts: [[0, 0], [1, 1]] as [number, number][], w: 4, ...(i % 10 === 0 ? { name: `Road ${i}` } : {}) }));
    const pois = Array.from({ length: 90 }, (_, i) => ({ lat: 13, lng: 80, name: `Shop ${i}`, kind: 'shop' }));
    const big = Array.from({ length: 900 }, (_, i) => [i, i] as [number, number]);
    const t = trimForShare({ buildings: [{ pts: big, h: 500 }], roads, pois, v: 3 } as never);
    expect(t.roads).toHaveLength(250);
    expect(t.roads.filter((r) => r.name)).toHaveLength(30);
    expect(t.pois).toHaveLength(60);
    expect(t.buildings[0].pts.length).toBeLessThanOrEqual(400);
    expect(t.buildings[0].h).toBe(300);
  });
});
