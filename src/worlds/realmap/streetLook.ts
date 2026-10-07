/**
 * Street look for the Real Map: building walls with window rows, roofs with
 * a darker edge, varied wall tints, and highlighted roads with white edge
 * lines and a centre line on bigger streets. Everything per block is merged
 * into a handful of meshes and shares two tiny canvas textures, so it stays
 * light on 4 GB phones.
 */
import * as THREE from 'three';
import { registerLit } from '@/lib/vrLights';
import { toLocal, type LatLng } from './geo';
import type { OsmChunk } from './osm';

/** One window cell = 3.2 m wide × 3.2 m tall (one floor). */
export const FLOOR_M = 3.2;
const TINTS = ['#efe6d6', '#e4dccd', '#f3ede2', '#d9d2c4', '#e8dcc6', '#dfe3e6', '#ece2d0'];
const ROOFS = ['#9a8f84', '#8d8780', '#a2775f', '#7f8a8f', '#b0a493'];

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

let windowTex: THREE.Texture | null = null;
function getWindowTexture(): THREE.Texture {
  if (windowTex) return windowTex;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  if (!g) { windowTex = new THREE.Texture(); return windowTex; }
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  // Floor band
  g.fillStyle = '#d8d2c8'; g.fillRect(0, 58, 64, 6);
  // Window glass with frame
  g.fillStyle = '#6f8597'; g.fillRect(14, 14, 36, 32);
  g.fillStyle = '#9fb4c4'; g.fillRect(16, 16, 32, 13);
  g.fillStyle = '#e9e4da'; g.fillRect(31, 14, 2, 32);
  windowTex = new THREE.CanvasTexture(c);
  windowTex.wrapS = windowTex.wrapT = THREE.RepeatWrapping;
  windowTex.colorSpace = THREE.SRGBColorSpace;
  windowTex.anisotropy = 2;
  return windowTex;
}

let glowTex: THREE.Texture | null = null;
/** Same layout as the window texture: only the glass is bright (lit rooms). */
function getWindowGlowTexture(): THREE.Texture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  if (!g) { glowTex = new THREE.Texture(); return glowTex; }
  g.fillStyle = '#000000'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#ffc56a'; g.fillRect(14, 14, 36, 32);
  g.fillStyle = '#000000'; g.fillRect(31, 14, 2, 32);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.wrapS = glowTex.wrapT = THREE.RepeatWrapping;
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

export const makeWallMaterial = () => registerLit(new THREE.MeshStandardMaterial({
  map: getWindowTexture(), emissiveMap: getWindowGlowTexture(), emissive: '#ffd28a',
  vertexColors: true, roughness: 0.8, metalness: 0.05,
}), 1.6);
export const ROOF_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
export const PLAIN_WALL_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
export const ROAD_HI_MAT = new THREE.MeshStandardMaterial({ color: '#3f444b', roughness: 0.9 });
export const PATH_MAT = new THREE.MeshStandardMaterial({ color: '#cbbfa8', roughness: 1 });
export const LINE_MAT = new THREE.MeshStandardMaterial({ color: '#f4f1e8', emissive: '#f4f1e8', emissiveIntensity: 0.25, roughness: 0.7 });
export const CENTER_MAT = new THREE.MeshStandardMaterial({ color: '#f2c14e', emissive: '#f2c14e', emissiveIntensity: 0.25, roughness: 0.7 });

function geo(pos: number[], uv?: number[], col?: number[]) {
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** Walls (with window UVs, one floor per tile) and roofs for one block. */
export function buildBuildingParts(data: OsmChunk, origin: LatLng) {
  const wp: number[] = [], wu: number[] = [], wc: number[] = [];
  const rp: number[] = [], rc: number[] = [];
  const tint = new THREE.Color(), roof = new THREE.Color();
  for (const b of data.buildings) {
    if (b.pts.length < 3) continue;
    const pts = b.pts.map(([lat, lng]) => toLocal({ lat, lng }, origin));
    const h = Math.max(3, b.h);
    const seed = hash(`${b.pts[0][0].toFixed(6)},${b.pts[0][1].toFixed(6)}`);
    tint.set(TINTS[seed % TINTS.length]);
    roof.set(ROOFS[(seed >>> 4) % ROOFS.length]);
    // Winding: make walls face outwards.
    let area = 0;
    for (let k = 0; k < pts.length; k++) { const a = pts[k], c = pts[(k + 1) % pts.length]; area += a.x * c.z - c.x * a.z; }
    const ccw = area > 0;
    const floors = h / FLOOR_M;
    let run = 0;
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], c = pts[(k + 1) % pts.length];
      const len = Math.hypot(c.x - a.x, c.z - a.z);
      if (len < 0.05) continue;
      const u0 = run / FLOOR_M, u1 = (run + len) / FLOOR_M;
      run += len;
      const [p, q] = ccw ? [c, a] : [a, c];
      const [pu, qu] = ccw ? [u1, u0] : [u0, u1];
      wp.push(p.x, 0, p.z, q.x, 0, q.z, q.x, h, q.z, p.x, 0, p.z, q.x, h, q.z, p.x, h, p.z);
      wu.push(pu, 0, qu, 0, qu, floors, pu, 0, qu, floors, pu, floors);
      for (let v = 0; v < 6; v++) wc.push(tint.r, tint.g, tint.b);
    }
    // Roof: triangulated footprint at roof height.
    const contour = pts.map((p) => new THREE.Vector2(p.x, p.z));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    for (const [i0, i1, i2] of tris) {
      const order = ccw ? [i0, i2, i1] : [i0, i1, i2];
      for (const i of order) { rp.push(pts[i].x, h, pts[i].z); rc.push(roof.r, roof.g, roof.b); }
    }
  }
  return { walls: geo(wp, wu, wc), roofs: geo(rp, undefined, rc) };
}

function strip(out: number[], a: { x: number; z: number }, b: { x: number; z: number }, half: number, off: number, y: number) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.01) return;
  const px = -dz / len, pz = dx / len;
  const ax = a.x + px * off, az = a.z + pz * off, bx = b.x + px * off, bz = b.z + pz * off;
  const nx = px * half, nz = pz * half;
  out.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz,
           ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz);
}

/** Roads: asphalt for streets, sand paths for footways, white edges + yellow centre on big streets. */
export function buildRoadParts(data: OsmChunk, origin: LatLng) {
  const road: number[] = [], path: number[] = [], lines: number[] = [], centre: number[] = [];
  for (const r of data.roads) {
    const car = r.w >= 5;
    for (let k = 0; k < r.pts.length - 1; k++) {
      const a = toLocal({ lat: r.pts[k][0], lng: r.pts[k][1] }, origin);
      const b = toLocal({ lat: r.pts[k + 1][0], lng: r.pts[k + 1][1] }, origin);
      strip(car ? road : path, a, b, r.w / 2, 0, car ? 0.03 : 0.025);
      if (!car) continue;
      strip(lines, a, b, 0.09, r.w / 2 - 0.35, 0.045);
      strip(lines, a, b, 0.09, -(r.w / 2 - 0.35), 0.045);
      if (r.w >= 7) strip(centre, a, b, 0.08, 0, 0.05);
    }
  }
  const up = (p: number[]) => {
    if (!p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    const n = new Float32Array(p.length);
    for (let k = 1; k < n.length; k += 3) n[k] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    return g;
  };
  return { road: up(road), path: up(path), lines: up(lines), centre: up(centre) };
}
