/**
 * Villager daily chores by local hour, like a farming village day:
 * milking at dawn (06–08) and dusk (17–19), household work (sweeping the doorstep,
 * carrying firewood) mid-morning (09–11) and afternoon (15–17). Other hours: walking the roads.
 * Asleep indoors 22–06 is handled by VillageVillagers.
 *
 * Milkers walk: along their road loop to the road point nearest the pasture ("gate"),
 * then a farm track to the herd's milking cow, milk beside it, and walk the same way back.
 * The milking cow publishes its live position here and stands still while being milked.
 */
export type Chore = 'milk' | 'sweep' | 'wood' | null;
type Pt = [number, number];

export interface MilkPlan { villager: number; cow: string; home: Pt; gate: number; track: Pt[] }
/** gate = index into the villager's VILLAGER_ROUTES loop; track avoids houses (checked in villageChores.test). */
export const MILK_PLANS: MilkPlan[] = [
  { villager: 4, cow: '0-0', home: [62, 46], gate: 1, track: [[24, 30]] },
  { villager: 2, cow: '1-1', home: [-60, -46], gate: 2, track: [] },
];
export const milkPlanFor = (v: number) => MILK_PLANS.find((p) => p.villager === v) ?? null;

export const isMilkHour = (h: number) => (h >= 6 && h < 8) || (h >= 17 && h < 19);

export function choreFor(villager: number, hour: number): Chore {
  const milker = !!milkPlanFor(villager);
  if (milker && isMilkHour(hour)) return 'milk';
  if (!milker && villager % 2 === 0 && ((hour >= 9 && hour < 11) || (hour >= 15 && hour < 17))) return 'sweep';
  if (!milker && villager % 2 === 1 && hour >= 9 && hour < 11) return 'wood';
  return null;
}

/** Live cow positions + whether a milker is beside it (cow holds still). */
export const milkCows = new Map<string, { x: number; z: number; yaw: number; held: boolean }>();
export function cowSpot(plan: MilkPlan) {
  const c = milkCows.get(plan.cow);
  return c ?? { x: plan.home[0], z: plan.home[1], yaw: 0, held: false };
}
/** Where the milker sits: beside the cow's flank (1.1 m to its side). */
export function milkSeat(c: { x: number; z: number; yaw: number }): Pt {
  return [c.x + Math.cos(c.yaw) * 1.1, c.z - Math.sin(c.yaw) * 1.1];
}

/** Loop parameter (0..1) of a route waypoint. */
export function routeT(route: Pt[], idx: number) {
  const segs = route.map((p, i) => { const q = route[(i + 1) % route.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); });
  const total = segs.reduce((a, b) => a + b, 0);
  return segs.slice(0, idx).reduce((a, b) => a + b, 0) / total;
}

/** Live milker trip state (read by the dev preview / tests). */
export const milkerState = new Map<number, { leg: string; x: number; z: number }>();
