import { describe, it, expect } from 'vitest';
import { MILK_PLANS, choreFor, milkSeat, routeT } from '@/worlds/mmora/villageChores';
import { VILLAGER_ROUTES, HOUSES } from '@/worlds/mmora/villageMap';

const PEOPLE_ROUTE = [0, 0, 1, 1, 2, 2]; // route index of each villager (VillageVillagers PEOPLE)

describe('villager chores', () => {
  it('milkers walk a farm track that never crosses a house', () => {
    for (const p of MILK_PLANS) {
      const route = VILLAGER_ROUTES[PEOPLE_ROUTE[p.villager]];
      const path = [route[p.gate], ...p.track, p.home];
      for (let s = 0; s < path.length - 1; s++) for (let k = 0; k <= 40; k++) {
        const x = path[s][0] + (path[s + 1][0] - path[s][0]) * k / 40, z = path[s][1] + (path[s + 1][1] - path[s][1]) * k / 40;
        for (const h of HOUSES) expect(Math.hypot(x - h[0], z - h[1])).toBeGreaterThan(3.6);
      }
    }
  });
  it('milking only at dawn and dusk, seat is beside the cow', () => {
    expect(choreFor(4, 6)).toBe('milk'); expect(choreFor(4, 17)).toBe('milk'); expect(choreFor(4, 12)).toBe(null);
    const [x, z] = milkSeat({ x: 0, z: 0, yaw: 0 });
    expect(Math.hypot(x, z)).toBeCloseTo(1.1);
    expect(routeT([[0, 0], [10, 0]], 1)).toBeCloseTo(0.5);
  });
});
