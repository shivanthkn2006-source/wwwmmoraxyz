import { describe, it, expect } from 'vitest';
import {
  HOUSES, ROADS, ROAD_HALF, distToRoads, villageLayout, piecePoints, VILLAGER_ROUTES,
  STATUE_POS, SAVE_POS, TEAM_LEVER_POS, PUZZLE_SPOTS, VILLAGE_BENCHES, CLOCK_POS, BELL_POS,
  MERCHANT_POS, ARCHIVE_POS, QUEST_BOARD, CHURCH, CASTLE,
} from '@/worlds/mmora/villageMap';

type Ob = { name: string; x: number; z: number; r: number; skip?: string };
function obstacles(): Ob[] {
  const L = villageLayout(); const o: Ob[] = [];
  HOUSES.forEach(([x, z, r], i) => {
    // house footprint (5×5 + walls) sampled as points; its own lane may end at it
    for (let a = -2.6; a <= 2.6; a += 1.3) for (let b = -2.6; b <= 2.6; b += 1.3) {
      const c = Math.cos(r), s = Math.sin(r);
      o.push({ name: `house${i}`, x: x + a * c + b * s, z: z - a * s + b * c, r: 0.1, skip: `lane${i}` });
    }
  });
  L.walls.forEach(([x, z, r], i) => piecePoints(x, z, Math.sin(r - Math.PI / 2), Math.cos(r - Math.PI / 2), 5.2).forEach(([px, pz]) => o.push({ name: `wall${i}`, x: px, z: pz, r: 0.3 })));
  L.fences.forEach(([x, z, r], i) => piecePoints(x, z, Math.cos(-r), Math.sin(-r), 3.8).forEach(([px, pz]) => o.push({ name: `fence${i}`, x: px, z: pz, r: 0.12 })));
  L.lamps.forEach(([x, z], i) => o.push({ name: `lamp${i}`, x, z, r: 0.15 }));
  L.trees.forEach(([x, z], i) => o.push({ name: `tree${i}`, x, z, r: 0.4 }));
  L.carts.forEach(([x, z], i) => o.push({ name: `cart${i}`, x, z, r: 1.6 }));
  L.barrels.forEach(([x, z], i) => o.push({ name: `barrel${i}`, x, z, r: 0.42 }));
  o.push({ name: 'statue', x: STATUE_POS[0], z: STATUE_POS[1], r: 1.6 });
  o.push({ name: 'save ring', x: SAVE_POS[0], z: SAVE_POS[2], r: 1 }, { name: 'typewriter', x: SAVE_POS[0] + 1.6, z: SAVE_POS[2], r: 0.5 });
  Object.entries(TEAM_LEVER_POS).forEach(([k, p]) => o.push({ name: `lever ${k}`, x: p[0], z: p[2], r: 0.5 }));
  const P = PUZZLE_SPOTS;
  o.push({ name: 'mixer', x: P.mixer[0], z: P.mixer[1], r: 0.6 }, { name: 'generator', x: P.generator[0], z: P.generator[1], r: 0.7 },
    { name: 'terminal', x: P.terminal[0], z: P.terminal[1], r: 1.2 }, { name: 'bypass', x: P.bypass[0] + 1.6, z: P.bypass[1], r: 0.2 },
    { name: 'fuse gate L', x: P.gate[0] - 2, z: P.gate[1], r: 0.15 }, { name: 'fuse gate R', x: P.gate[0] + 2, z: P.gate[1], r: 0.15 },
    { name: 'lab door L', x: P.lab[0] - 0.7, z: P.lab[1], r: 0.1 }, { name: 'lab door R', x: P.lab[0] + 0.7, z: P.lab[1], r: 0.1 });
  VILLAGE_BENCHES.forEach(([x, z], i) => o.push({ name: `bench${i}`, x, z, r: 0.8 }));
  o.push({ name: 'clock tower', x: CLOCK_POS[0], z: CLOCK_POS[2], r: 3 }, { name: 'bell tower', x: BELL_POS[0], z: BELL_POS[2], r: 3.2 });
  o.push({ name: 'merchant', x: MERCHANT_POS[0] - 1.2, z: MERCHANT_POS[2], r: 1 });
  o.push({ name: 'quest board', x: QUEST_BOARD[0], z: QUEST_BOARD[1], r: 1.3 });
  for (let a = -3; a <= 3; a += 1) for (let b = -3; b <= 3; b += 1) o.push({ name: 'archive', x: ARCHIVE_POS[0] + a, z: ARCHIVE_POS[2] + b, r: 0.15 });
  for (let x = CHURCH.cx - CHURCH.w / 2; x <= CHURCH.cx + CHURCH.w / 2; x += 1) for (let z = CHURCH.cz - CHURCH.l / 2; z <= CHURCH.cz + CHURCH.l / 2 + 5; z += 1) o.push({ name: 'church', x, z, r: 0.2 });
  const h = CASTLE.s / 2;
  for (let x = -h; x <= h; x += 1) for (let z = -h; z <= h; z += 1) o.push({ name: 'castle', x: CASTLE.cx + x, z: CASTLE.cz + z, r: 0.4 });
  return o;
}

describe('M\'Mora Village roads', () => {
  it('nothing stands on any road or lane', () => {
    const hits = obstacles().filter((b) => distToRoads(b.x, b.z, b.skip) < ROAD_HALF + b.r).map((b) => `${b.name}@${b.x.toFixed(1)},${b.z.toFixed(1)}`);
    expect([...new Set(hits)]).toEqual([]);
  });

  it('the castle road reaches the castle gate without passing through a house', () => {
    const road = ROADS.find((r) => r.name === 'castle')!;
    const end = road.pts[road.pts.length - 1];
    expect(Math.hypot(end[0] - CASTLE.cx, end[1] - (CASTLE.cz + CASTLE.s / 2))).toBeLessThan(5);
    for (const [hx, hz] of HOUSES) for (let j = 0; j < road.pts.length - 1; j++) {
      const [a, b] = [road.pts[j], road.pts[j + 1]];
      for (let f = 0; f <= 1; f += 0.02) expect(Math.hypot(a[0] + (b[0] - a[0]) * f - hx, a[1] + (b[1] - a[1]) * f - hz)).toBeGreaterThan(5);
    }
  });

  it('villagers only walk on roads, lanes and the square', () => {
    for (const route of VILLAGER_ROUTES) for (let i = 0; i < route.length; i++) {
      const a = route[i], b = route[(i + 1) % route.length];
      for (let f = 0; f <= 1; f += 0.05) {
        const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
        expect(Math.hypot(x, z) < 6.5 || distToRoads(x, z) < ROAD_HALF + 0.6).toBe(true);
      }
    }
  });

  it('keeps the same number of props (moved, never removed)', () => {
    const L = villageLayout();
    expect(L.walls.length).toBe(HOUSES.length * 2);
    expect(L.carts.length).toBe(4);
    expect(L.barrels.length).toBe(HOUSES.length * 2);
    expect(L.trees.length).toBe(90);
    expect(L.fences.length).toBe(12);
  });
});
