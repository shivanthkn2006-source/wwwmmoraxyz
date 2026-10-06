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
