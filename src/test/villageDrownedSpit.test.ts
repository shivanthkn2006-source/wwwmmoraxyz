import { describe, it, expect } from 'vitest';
import { inSpitRange } from '@/worlds/mmora/VillageDrowned';
describe('Drowned bile spit', () => {
  it('reaches a player standing 3–8 m away on the shore', () => {
    expect(inSpitRange(3)).toBe(true); expect(inSpitRange(5)).toBe(true); expect(inSpitRange(7.9)).toBe(true);
  });
  it('does not spit in melee contact or beyond 8 m', () => {
    expect(inSpitRange(1)).toBe(false); expect(inSpitRange(8)).toBe(false);
  });
});
