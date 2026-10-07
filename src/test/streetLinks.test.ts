import { describe, it, expect } from 'vitest';
import { makeLane, buildLaneLinks, stepAgent, type Agent } from '@/worlds/realmap/StreetTraffic';
describe('connected roads', () => {
  it('a car reaching a junction drives on to the next road instead of turning round', () => {
    const a = makeLane([[0, 0], [50, 0]], 6)!, b = makeLane([[50, 0], [50, 40]], 6)!;
    const link = buildLaneLinks([a, b]);
    const car: Agent = { lane: 0, s: 49.9, dir: 1, speed: 10, base: 10, off: 1, kind: 0, phase: 0 };
    const next = stepAgent(car, a, 0.05, false, link);
    expect(next.lane).toBe(1); expect(next.dir).toBe(1);
  });
  it('turns round only at a real dead end', () => {
    const a = makeLane([[0, 0], [50, 0]], 6)!;
    const next = stepAgent({ lane: 0, s: 49.9, dir: 1, speed: 10, base: 10, off: 1, kind: 0, phase: 0 }, a, 0.05, false, buildLaneLinks([a]));
    expect(next.lane).toBe(0); expect(next.dir).toBe(-1);
  });
});
