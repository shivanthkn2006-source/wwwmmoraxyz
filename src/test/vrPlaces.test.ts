import { describe, it, expect } from 'vitest';
import { parseOverpass, poiKind, buildQuery, CHUNK_V } from '@/worlds/realmap/osm';
import { followDecision, friendsToPing, DRIVING_MPS } from '@/worlds/realmap/gpsFollow';

describe('real places', () => {
  it('asks for fuel pumps, malls, brands, hotels and offices', () => {
    const q = buildQuery({ south: 1, west: 2, north: 3, east: 4 });
    expect(q).toContain('fuel'); expect(q).toContain('nwr["shop"]'); expect(q).toContain('tourism'); expect(q).toContain('office');
  });
  it('classifies places', () => {
    expect(poiKind({ amenity: 'fuel' })).toBe('fuel');
    expect(poiKind({ shop: 'mall' })).toBe('mall');
    expect(poiKind({ amenity: 'fast_food', brand: 'KFC' })).toBe('fast_food');
    expect(poiKind({ amenity: 'restaurant' })).toBe('food');
  });
  it('keeps KFC nodes and mall outlines (as a centre point)', () => {
    const c = parseOverpass({ elements: [
      { type: 'node', lat: 1, lon: 2, tags: { amenity: 'fast_food', name: 'KFC' } },
      { type: 'way', tags: { shop: 'mall', name: 'Forum Mall', building: 'yes' }, geometry: [{ lat: 0, lon: 0 }, { lat: 0, lon: 2 }, { lat: 2, lon: 2 }, { lat: 2, lon: 0 }] },
    ] });
    expect(c.v).toBe(CHUNK_V);
    expect(c.pois.map((p) => p.name)).toEqual(['KFC', 'Forum Mall']);
    expect(c.pois[1]).toMatchObject({ lat: 1, lng: 1, kind: 'mall' });
    expect(c.buildings[0].name).toBe('Forum Mall');
  });
});

describe('follow my GPS', () => {
  it('moves on real steps, ignores jitter, pauses when driving', () => {
    expect(followDecision(null, 0, 0, 0, null)).toBe('move');
    expect(followDecision({ x: 0, z: 0, at: 0 }, 1, 0, 5000, 1)).toBe('skip');
    expect(followDecision({ x: 0, z: 0, at: 0 }, 6, 0, 5000, 1.2)).toBe('move');
    expect(followDecision({ x: 0, z: 0, at: 0 }, 10, 0, 5000, DRIVING_MPS + 1)).toBe('driving');
    expect(followDecision({ x: 0, z: 0, at: 0 }, 100, 0, 5000, null)).toBe('driving');
  });
  it('pings each nearby friend once an hour, never strangers', () => {
    const me = { lat: 12.97, lng: 77.59 };
    const ps = [
      { id: 'a', tag: 'friend', lat: 12.9705, lng: 77.59, username: 'a' },
      { id: 'b', tag: 'unknown', lat: 12.9705, lng: 77.59, username: 'b' },
      { id: 'c', tag: 'friend', lat: 13.1, lng: 77.59, username: 'c' },
    ];
    const seen = new Map<string, number>();
    expect(friendsToPing(me, ps, 1e9, seen).map((p) => p.id)).toEqual(['a']);
    seen.set('a', 1e9);
    expect(friendsToPing(me, ps, 1e9 + 60_000, seen)).toHaveLength(0);
  });
});
import { prefillPlan, SOUTH_INDIA_CITIES } from '@/worlds/realmap/prefillCities';
describe('south india prefill', () => {
  it('plans 25 blocks around each of the 18 city centres', () => {
    const p = prefillPlan();
    expect(SOUTH_INDIA_CITIES).toHaveLength(18);
    expect(p).toHaveLength(18 * 25);
    expect(new Set(p.map((s) => s.id.key)).size).toBe(450);
  });
});
