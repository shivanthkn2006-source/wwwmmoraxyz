import { describe, it, expect } from 'vitest';
import { headlampLit } from '@/worlds/mmora/VillageHeadlamp';
import { GEAR } from '@/lib/vrGear';

describe('headlamp', () => {
  it('is a shop-only armour item', () => {
    const h = GEAR.find((g) => g.id === 'headlamp');
    expect(h?.kind).toBe('armour'); expect(h?.shop).toBe(true);
  });
  it('shines only when worn, switched on and dark', () => {
    expect(headlampLit(true, true, true)).toBe(true);
    expect(headlampLit(true, true, false)).toBe(false);
    expect(headlampLit(false, true, true)).toBe(false);
    expect(headlampLit(true, false, true)).toBe(false);
  });
});
