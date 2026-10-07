import { describe, it, expect } from 'vitest';
import { portalCellFor } from '@/worlds/realmap/CityPortals';
describe('city portals', () => {
  it('skips the home cell and gives every other area a portal within 500 m', () => {
    expect(portalCellFor(100, -200)).toBeNull();
    expect(portalCellFor(2400, -3600)).toEqual([2000, -4000]);
  });
});
