/**
 * Walls you can't walk through: Real Map building footprints (from loaded map
 * blocks) and M'Mora World houses. The walk step asks resolveMove(); if the new
 * spot is inside a wall it slides along the free axis or stops, like real life.
 */
import { mapBlocks } from '@/worlds/realmap/mapIndex';
import { toLocal } from '@/worlds/realmap/geo';
import { getWorldState } from '@/worlds/worldMode';

type Poly = { pts: [number, number][]; minX: number; maxX: number; minZ: number; maxZ: number };
const R = 0.35; // body radius
let cacheKey = '';
let polys: Poly[] = [];
const extra: Poly[] = [];

export function boxPoly(cx: number, cz: number, w: number, d: number, rot = 0): Poly {
  const c = Math.cos(rot), s = Math.sin(rot);
  const pts = ([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] as const).map(([x, z]) => [cx + x * c + z * s, cz - x * s + z * c] as [number, number]);
  return withBox(pts);
}
function withBox(pts: [number, number][]): Poly {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  return { pts, minX, maxX, minZ, maxZ };
}
/** M'Mora World (or any fixed) solids. */
export function setStaticSolids(list: Poly[]) { extra.length = 0; extra.push(...list); }

function realPolys(): Poly[] {
  const w = getWorldState();
  if (w.mode !== 'real' || w.origin.status !== 'ready') return [];
  const o = w.origin.origin;
  const key = `${o.lat},${o.lng}|${mapBlocks().size}|${[...mapBlocks().keys()].join(',').length}`;
  if (key === cacheKey) return polys;
  cacheKey = key; polys = [];
  mapBlocks().forEach((d) => {
    for (const b of d.buildings) {
      if (b.pts.length < 3) continue;
      polys.push(withBox(b.pts.map(([la, ln]) => { const p = toLocal({ lat: la, lng: ln }, o); return [p.x, p.z] as [number, number]; })));
    }
  });
  return polys;
}

export function inside(x: number, z: number, p: Poly): boolean {
  if (x < p.minX - R || x > p.maxX + R || z < p.minZ - R || z > p.maxZ + R) return false;
  let hit = false;
  const a = p.pts;
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
    const [xi, zi] = a[i], [xj, zj] = a[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}
const blocked = (x: number, z: number, list: Poly[]) => {
  for (const p of list) if (inside(x, z, p) || inside(x + R, z, p) || inside(x - R, z, p) || inside(x, z + R, p) || inside(x, z - R, p)) return true;
  return false;
};

/** Pure-ish: returns the allowed position after trying to move from (px,pz) to (nx,nz). */
export function resolveMove(px: number, pz: number, nx: number, nz: number, y = 1.6): [number, number] {
  if (y > 8) return [nx, nz]; // flying / aerial view
  const list = getWorldState().mode === 'real' ? realPolys() : extra;
  if (!list.length) return [nx, nz];
  const near = list.filter((p) => nx > p.minX - 3 && nx < p.maxX + 3 && nz > p.minZ - 3 && nz < p.maxZ + 3);
  if (!near.length || !blocked(nx, nz, near)) return [nx, nz];
  if (blocked(px, pz, near)) return [nx, nz]; // already inside (spawned in) — let them walk out
  if (!blocked(nx, pz, near)) return [nx, pz];
  if (!blocked(px, nz, near)) return [px, nz];
  return [px, pz];
}

/** Nearest open ground to (x,z) with no building within `clear` metres (Real Map), searching outward up to `maxR`. */
export function findOpenSpot(x: number, z: number, clear = 8, maxR = 150): [number, number] {
  const list = realPolys();
  const free = (px: number, pz: number) => {
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      if (blocked(px + Math.cos(ang) * clear, pz + Math.sin(ang) * clear, list)) return false;
    }
    return !blocked(px, pz, list);
  };
  if (free(x, z)) return [x, z];
  for (let r = 6; r <= maxR; r += 6) {
    const steps = Math.max(8, Math.round(r / 3));
    for (let i = 0; i < steps; i++) {
      const ang = (i / steps) * Math.PI * 2, px = x + Math.cos(ang) * r, pz = z + Math.sin(ang) * r;
      if (free(px, pz)) return [px, pz];
    }
  }
  return [x, z];
}
