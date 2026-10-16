// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { boxPoly, inside, setStaticSolids, resolveMove, resolveAvatarMove, setBodySolid } from '@/lib/vrSolids';
import { enterMMora, __resetWorldForTests } from '@/worlds/worldMode';

describe('vrSolids', () => {
  it('stops the avatar ahead of the camera at a closed door and another person', () => {
    __resetWorldForTests(); enterMMora([0, 1.6, 0]);
    setStaticSolids([boxPoly(0, -4, 4, 0.3)]);
    expect(resolveAvatarMove(0, 0, 0, -1, 0, 0, 2.8)).toEqual([0, 0]);
    setStaticSolids([]); setBodySolid('test-person', { x: 0, z: -4, radius: 0.35 });
    expect(resolveAvatarMove(0, 0, 0, -1, 0, 0, 2.8)).toEqual([0, 0]);
    setBodySolid('test-person', null);
  });
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

import { setSolidGroup, wallPieces } from '@/lib/vrSolids';
describe('building wall pieces', () => {
  it('a thin wall stops you, the doorway lets you through, upper-floor walls only block upstairs', () => {
    __resetWorldForTests(); enterMMora([0, 1.6, 0]); setStaticSolids([]);
    setSolidGroup('t', [...wallPieces(0, 0, 0, [[-2, 0, 3, 0.4], [2, 0, 3, 0.4]]), ...wallPieces(0, 5, 0, [[0, 0, 6, 0.4]], 4.5)]);
    expect(resolveMove(-2, 1, -2, -0.1)).toEqual([-2, 1]);       // blocked by wall
    expect(resolveMove(0, 1, 0, -1)).toEqual([0, -1]);            // through the gap
    expect(resolveMove(0, 6, 0, 4.5)).toEqual([0, 4.5]);          // ground floor: upstairs wall ignored
    expect(resolveMove(0, 6, 0, 4.9, 6.2)).toEqual([0, 6]);        // upstairs: blocked
    setSolidGroup('t', null);
  });
});
