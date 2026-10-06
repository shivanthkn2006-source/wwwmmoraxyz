/** Real Map lakes, ponds, rivers, canals, parks and bridge decks, merged per block (one mesh each). */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toLocal, type LatLng } from './geo';
import type { OsmChunk } from './osmParse';

export const WATER_MAT = new THREE.MeshStandardMaterial({ color: '#3f7fb8', roughness: 0.15, metalness: 0.2, emissive: '#0d2a44', emissiveIntensity: 0.25 });
export const PARK_MAT = new THREE.MeshStandardMaterial({ color: '#5e8f4a', roughness: 0.95 });
export const BRIDGE_MAT = new THREE.MeshStandardMaterial({ color: '#8d8a84', roughness: 0.8 });

function polygon(pts: [number, number][], origin: LatLng, y: number): THREE.BufferGeometry | null {
  if (pts.length < 4) return null;
  const s = new THREE.Shape(pts.map(([la, ln]) => { const p = toLocal({ lat: la, lng: ln }, origin); return new THREE.Vector2(p.x, -p.z); }));
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  return g;
}

/** Flat strip following a line (river, canal, bridge deck). */
export function ribbon(pts: [number, number][], origin: LatLng, w: number, y: number): THREE.BufferGeometry | null {
  const L = pts.map(([la, ln]) => toLocal({ lat: la, lng: ln }, origin));
  if (L.length < 2) return null;
  const pos: number[] = [], idx: number[] = [];
  L.forEach((p, i) => {
    const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * (w / 2), nz = (dx / len) * (w / 2);
    pos.push(p.x + nx, y, p.z + nz, p.x - nx, y, p.z - nz);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

const merge = (gs: (THREE.BufferGeometry | null)[]) => {
  const ok = gs.filter(Boolean) as THREE.BufferGeometry[];
  if (!ok.length) return null;
  const m = mergeGeometries(ok.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  ok.forEach((g) => g.dispose());
  return m;
};

export function buildWaterParts(d: OsmChunk, origin: LatLng) {
  const water = merge([
    ...(d.areas ?? []).filter((a) => a.kind === 'water').map((a) => polygon(a.pts, origin, 0.04)),
    ...(d.waterways ?? []).map((w) => ribbon(w.pts, origin, w.w, 0.05)),
  ]);
  const park = merge((d.areas ?? []).filter((a) => a.kind === 'park').map((a) => polygon(a.pts, origin, 0.02)));
  const bridges = d.roads.filter((r) => r.br);
  const deck = merge(bridges.map((r) => ribbon(r.pts, origin, r.w + 1, 0.7)));
  return { water, park, deck, rails: null as THREE.BufferGeometry | null };
}
