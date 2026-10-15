/**
 * M'Mora Village street plan (pure data, no React/three): the houses, the
 * village square and every road / lane, plus the placement of roadside props
 * (walls, carts, barrels, fences, lamps, trees). Everything that stands in the
 * village is checked against these roads so the lanes stay clear for players
 * and villagers (src/test/villageRoads.test.ts proves it).
 */
export type Pt = [number, number];
type Spot = [number, number, number, number]; // x, z, rotY, scale

/** [x, z, rotationY] — house 6 sits north of the castle road (it used to block the way west). */
export const HOUSES: [number, number, number][] = [
  [18, -10, 0], [-26, -18, Math.PI / 2], [30, 22, Math.PI], [-20, 28, -Math.PI / 2],
  [6, -34, 0], [44, -6, Math.PI / 2], [-42, -8, 0], [12, 40, Math.PI],
];

/** Open village square around the centre; lanes start at its edge. */
export const SQUARE_R = 6;
/** Half of a lane's width (lanes are ~2.8 m wide). */
export const ROAD_HALF = 1.4;

export const STATUE_POS: Pt = [-13, 12];
export const CLOCK_POS: [number, number, number] = [34, 0, -30];
export const BELL_POS: [number, number, number] = [-40, 0, -40];
export const MERCHANT_POS: [number, number, number] = [-52, 0, 30];
export const ARCHIVE_POS: [number, number, number] = [-12, 0, 4];
/** Quest board [x, z, rotY] at the square's south-east edge, between two lanes, facing the centre. */
export const QUEST_BOARD: [number, number, number] = [4.6, -6.55, -0.61];
/** Church centre and nave size; castle centre and wall square. */
export const CHURCH = { cx: -14, cz: -52, w: 10, l: 18 };
export const CASTLE = { cx: -70, cz: 10, s: 24 };
export const SAVE_POS: [number, number, number] = [-1.5, 0, 9];
export const TEAM_LEVER_POS: Record<'north' | 'south', [number, number, number]> = { north: [7, 0, -8], south: [10, 0, -12] };
export const PUZZLE_SPOTS: Record<string, Pt> = {
  shell: [20, -18], fluid: [-22, 16], mixer: [9, 22], gate: [-8, -30], terminal: [-8, -36], keycard: [14, -30],
  lab: [-14, -30], bypass: [-8, -33], hose: [24, 6], generator: [-3, -29],
};
/** Fixed benches [x, z, rotY]: village benches beside the lanes + beach benches facing the sea. */
export const VILLAGE_BENCHES: [number, number, number][] = [
  [-6, 3.2, 0], [10, 2, Math.PI], [-3.5, -12, 0], [-14, -5, Math.PI / 2],
  [12, -14, -Math.PI / 2], [-4, 14, Math.PI], [8, 16, Math.PI], [-16, 6, Math.PI / 2],
  ...[-30, -20, -10, 0, 10, 20, 30].map((x): [number, number, number] => [x, -70, Math.PI]),
];

const laneEnd = (x: number, z: number, back = 4): Pt => { const L = Math.hypot(x, z); return [x * (L - back) / L, z * (L - back) / L]; };
const laneStart = (x: number, z: number): Pt => { const L = Math.hypot(x, z); return [x * SQUARE_R / L, z * SQUARE_R / L]; };

export const CHURCH_ROAD: Pt[] = [[-0.25, -6], [-0.7, -22], [-11.6, -26], [-11.6, -32], [-14, -36]];
export const BEACH_ROAD: Pt[] = [[-0.7, -22], [-0.7, -62]];
/** West road to the castle gate (gate faces +z at x=-70). */
export const CASTLE_ROAD: Pt[] = [[-6, -1], [-52, -1], [-53, 26], [-70, 26]];

export const ROADS: { name: string; pts: Pt[] }[] = [
  ...HOUSES.map(([x, z], i) => ({ name: `lane${i}`, pts: [laneStart(x, z), laneEnd(x, z)] })),
  { name: 'church', pts: CHURCH_ROAD },
  { name: 'beach', pts: BEACH_ROAD },
  { name: 'castle', pts: CASTLE_ROAD },
];

function segDist(px: number, pz: number, a: Pt, b: Pt) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
  const t = L2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L2)) : 0;
  return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz);
}
/** Distance from (x,z) to the nearest road centre line (optionally ignoring one road). */
export function distToRoads(x: number, z: number, skip?: string): number {
  let best = Infinity;
  for (const r of ROADS) {
    if (r.name === skip) continue;
    for (let j = 0; j < r.pts.length - 1; j++) best = Math.min(best, segDist(x, z, r.pts[j], r.pts[j + 1]));
  }
  return best;
}
/** True when a thing of radius r at (x,z) stays off every road. */
export const clearOfRoads = (x: number, z: number, r: number, skip?: string) => distToRoads(x, z, skip) >= ROAD_HALF + r;

/** House-local → world (same convention as the house groups: rotation about y). */
export function houseToWorld(i: number, lx: number, lz: number): Pt {
  const [x, z, r] = HOUSES[i], c = Math.cos(r), s = Math.sin(r);
  return [x + lx * c + lz * s, z - lx * s + lz * c];
}

const rand = (s: number) => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };

/** Sample points along a straight piece (centre, direction angle in world xz, length). */
export function piecePoints(cx: number, cz: number, dirX: number, dirZ: number, len: number, n = 5): Pt[] {
  return Array.from({ length: n }, (_, k) => { const f = n === 1 ? 0 : (k / (n - 1) - 0.5) * len; return [cx + dirX * f, cz + dirZ * f] as Pt; });
}
const pieceClear = (pts: Pt[], r: number) => pts.every(([x, z]) => clearOfRoads(x, z, r));

export interface VillageLayout {
  walls: Spot[]; fences: Spot[]; lamps: Spot[]; trees: Spot[];
  carts: [number, number, number][]; barrels: [number, number, number][];
}

let cached: VillageLayout | null = null;
/** Roadside props, each nudged (never dropped) to the first spot that keeps the roads clear. */
export function villageLayout(): VillageLayout {
  if (cached) return cached;
  const walls: Spot[] = [], fences: Spot[] = [], lamps: Spot[] = [], trees: Spot[] = [];
  const carts: [number, number, number][] = [], barrels: [number, number, number][] = [];
  HOUSES.forEach(([x, z, r], i) => {
    const ax = Math.sin(r), az = Math.cos(r); // house local +z in world
    // low stone walls either side of the house (5.2 m long along the house's depth)
    for (const s of [1, -1]) {
      const cands: Pt[] = [[5, 0], [5, -1.5], [5, 1.5], [5, -3], [5, 3], [5, -4.2], [5, 4.2], [6.2, 0], [6.2, -2.5]].map(([lx, lz]) => houseToWorld(i, s * lx, lz));
      const pick = cands.find(([wx, wz]) => pieceClear(piecePoints(wx, wz, ax, az, 5.2), 0.3)) ?? cands[0];
      walls.push([pick[0], pick[1], r + Math.PI / 2, 1]);
    }
    // a cart beside every other house, barrels by the other side wall
    if (i % 2 === 0) {
      const cands: Pt[] = [[6.5, 0], [-6.5, 0], [6.5, -2.5], [-6.5, -2.5], [0, -6.8]].map(([lx, lz]) => houseToWorld(i, lx, lz));
      const pick = cands.find(([cx, cz]) => clearOfRoads(cx, cz, 1.6)) ?? cands[0];
      carts.push([pick[0], pick[1], r + 0.3]);
    }
    const bc: Pt[] = [[-4.6, 0], [4.6, 0], [-4.6, -2], [4.6, -2], [0, -4.4]].map(([lx, lz]) => houseToWorld(i, lx, lz));
    const bp = bc.find(([bx, bz]) => clearOfRoads(bx + 0.5, bz, 0.45) && clearOfRoads(bx - 0.4, bz + 0.6, 0.45)) ?? bc[0];
    barrels.push([bp[0] + 0.5, bp[1], 0], [bp[0] - 0.4, bp[1] + 0.6, 1]);
    // fences beside the lane (parallel, 2.6 m out) and a lamp at the lane start
    const a = Math.atan2(z, x), L = Math.hypot(x, z), ux = Math.cos(a), uz = Math.sin(a), nx = -uz, nz = ux;
    for (const side of (i % 2 ? [1, -1] : [1])) {
      for (const f of [0.55, 0.62, 0.48, 0.7, 0.4, 0.78]) {
        const d = L * f, cx = ux * d + side * nx * 2.6, cz = uz * d + side * nz * 2.6;
        if (pieceClear(piecePoints(cx, cz, ux, uz, 3.8), 0.15) || f === 0.78) { fences.push([cx, cz, -a + (side < 0 ? 0.08 : 0), 1]); break; }
      }
    }
    for (const d of [9, 10.5, 7.5, 12, 13.5]) {
      const lx = ux * d + nx * 1.8, lz = uz * d + nz * 1.8;
      if (clearOfRoads(lx, lz, 0.2) && clearOfRoads(lx + Math.cos(a) * 0.45, lz + Math.sin(a) * 0.45, 0.15) || d === 13.5) { lamps.push([lx, lz, -a, 1]); break; }
    }
  });
  lamps.push([2.2, -40, 0, 1], [-3.2, -60, Math.PI, 1]);
  // lamps along the castle road (north side of the road, every ~14 m)
  for (const x of [-16, -30, -44]) lamps.push([x, 1.6, Math.PI, 1]);
  lamps.push([-55.5, 12, Math.PI / 2, 1], [-62, 28.6, 0, 1]);
  const free = (x: number, z: number) => Math.hypot(x, z) > 12 && HOUSES.every(([hx, hz]) => Math.hypot(x - hx, z - hz) > 7)
    && !(x > -22 && x < -6 && z < -34 && z > -64) && Math.hypot(x + 70, z - 10) > 22 && clearOfRoads(x, z, 0.8);
  for (let i = 0; trees.length < 90 && i < 1200; i++) {
    const ang = rand(i) * Math.PI * 2, rr = 20 + rand(i + 50) * 150, x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
    if (free(x, z)) trees.push([x, z, rand(i + 7) * 6, 0.8 + rand(i + 9) * 0.7]);
  }
  cached = { walls, fences, lamps, trees, carts, barrels };
  return cached;
}

/** Out along a path and back again (a closed loop that only uses the road). */
const outBack = (pts: Pt[]): Pt[] => [...pts, ...pts.slice(1, -1).reverse()];
const C: Pt = [0, 0];
const lane = (i: number): Pt[] => [C, laneEnd(HOUSES[i][0], HOUSES[i][1], 4.4)];
/** Villager walking loops — every leg runs along a lane or road, never across gardens or through houses. */
export const VILLAGER_ROUTES: Pt[][] = [
  [...outBack(lane(0)), ...outBack(lane(3))],
  outBack([C, ...CASTLE_ROAD, [-70, 24.5]]),
  [...outBack(lane(2)), ...outBack(lane(7)), ...outBack([C, ...CHURCH_ROAD.slice(0, 4)])],
];
