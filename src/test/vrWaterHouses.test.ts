import { describe, it, expect } from 'vitest';
import { parseOverpass } from '@/worlds/realmap/osmParse';
import { indexBlock, __resetMapIndex } from '@/worlds/realmap/mapIndex';
import { streetHouses } from '@/worlds/realmap/StreetHouses';

const sq = (la: number, ln: number, d = 0.0002) => [{ lat: la, lon: ln }, { lat: la + d, lon: ln }, { lat: la + d, lon: ln + d }, { lat: la, lon: ln + d }, { lat: la, lon: ln }];

describe('Real Map water, bridges and enterable homes', () => {
  it('parses lakes, parks, rivers and bridges', () => {
    const c = parseOverpass({ elements: [
      { type: 'way', tags: { natural: 'water', name: 'Lake' }, geometry: sq(13, 80) },
      { type: 'way', tags: { leisure: 'park' }, geometry: sq(13.01, 80) },
      { type: 'way', tags: { waterway: 'river', name: 'Adyar' }, geometry: sq(13.02, 80).slice(0, 3) },
      { type: 'way', tags: { highway: 'primary', bridge: 'yes', name: 'Elphinstone Bridge' }, geometry: sq(13.03, 80).slice(0, 2) },
    ] });
    expect(c.areas?.map((a) => a.kind)).toEqual(['water', 'park']);
    expect(c.waterways?.[0].name).toBe('Adyar');
    expect(c.roads[0].br).toBe(1);
  });
  it('gives every member the same doors and contents per block', () => {
    __resetMapIndex();
    const c = parseOverpass({ elements: [0, 1, 2, 3, 4].map((i) => ({ type: 'way', tags: { building: 'yes' }, geometry: sq(13 + i * 0.001, 80) })) });
    indexBlock('k1', c);
    const a = streetHouses({ lat: 13, lng: 80 }), b = streetHouses({ lat: 13, lng: 80 });
    expect(a.length).toBe(3);
    expect(a.map((h) => h.id)).toEqual(b.map((h) => h.id));
    expect(a.every((h) => h.herbId || h.coinId)).toBe(true);
  });
});
