// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { boxPoly, inside, setStaticSolids, resolveMove } from '@/lib/vrSolids';
import { enterMMora, __resetWorldForTests } from '@/worlds/worldMode';

describe('vrSolids', () => {
  it('detects a point inside a house box', () => {
    const p = boxPoly(0, 0, 5, 5);
    expect(inside(0, 0, p)).toBe(true);
    expect(inside(10, 0, p)).toBe(false);
  });
  it('stops you at a wall in M\'Mora World and lets you slide along it', () => {
    __resetWorldForTests();
    enterMMora([0, 1.6, 0]);
    setStaticSolids([boxPoly(0, 0, 5, 5)]);
    expect(resolveMove(-4, 0, -2, 0)).toEqual([-4, 0]);       // walking straight into the wall: stop
    expect(resolveMove(-4, 4, -4, 3)).toEqual([-4, 3]);       // walking beside it: free
    const [x, z] = resolveMove(-3, 3.2, -2, 2.4);             // diagonal into the corner: slides
    expect(x === -3 || z === 3.2).toBe(true);
  });
});

import { indexBlock, __resetMapIndex } from '@/worlds/realmap/mapIndex';
import { chooseStartCity } from '@/worlds/worldMode';
import { toLatLng } from '@/worlds/realmap/geo';

describe('Real Map buildings are solid', () => {
  it('stops you at a real building wall', () => {
    __resetWorldForTests(); __resetMapIndex();
    const o = { lat: 13.0827, lng: 80.2707 };
    chooseStartCity({ name: 'Chennai', ...o });
    const ll = (x: number, z: number) => { const p = toLatLng(x, z, o); return [p.lat, p.lng] as [number, number]; };
    indexBlock('t', { buildings: [{ pts: [ll(10, -5), ll(20, -5), ll(20, 5), ll(10, 5), ll(10, -5)], h: 10 }], roads: [], pois: [], fetchedAt: 0, v: 1 } as never);
    expect(resolveMove(8, 0, 10.5, 0)).toEqual([8, 0]);
    expect(resolveMove(0, 0, 1, 0)).toEqual([1, 0]);
  });
});
