/**
 * Cars, motorbikes and people on the real streets (from the traffic
 * controller file): each kind is ONE instanced mesh (1 draw call), vehicles
 * follow real OSM roads in lanes, brake when you step in front of them, turn
 * round at dead ends, and people walk the pavements at human pace. Counts
 * shrink on low-memory phones and when slow-phone protection steps in.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toLocal, type LatLng } from './geo';
import { mapBlocks, useMapVersion } from './mapIndex';
import { useGovLevel, TRAFFIC_SCALE } from './thermalGovernor';

export type Lane = { pts: [number, number][]; cum: number[]; len: number; w: number };
export type Agent = { lane: number; s: number; dir: 1 | -1; speed: number; base: number; off: number; kind: 0 | 1 | 2; phase: number };

const LOW_MEM = typeof navigator !== 'undefined' && (((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4);
export const MAX = LOW_MEM ? { car: 12, bike: 6, ped: 16 } : { car: 24, bike: 12, ped: 40 };
export const NEAR_M = 320;
const BRAKE_AHEAD_M = 7;

/** Pure: polyline (local x/z) → lane with cumulative lengths; null for degenerate roads. */
export function makeLane(pts: [number, number][], w: number): Lane | null {
  const clean: [number, number][] = [];
  for (const p of pts) {
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
    const q = clean[clean.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.3) clean.push(p);
  }
  if (clean.length < 2) return null;
  const cum = [0];
  for (let k = 1; k < clean.length; k++) cum.push(cum[k - 1] + Math.hypot(clean[k][0] - clean[k - 1][0], clean[k][1] - clean[k - 1][1]));
  const len = cum[cum.length - 1];
  return len > 15 ? { pts: clean, cum, len, w } : null;
}

/** Pure: point + heading at distance s along a lane, shifted sideways by `off` (right of travel). */
export function sampleLane(l: Lane, s: number, dir: 1 | -1, off: number): { x: number; z: number; yaw: number } {
  const d = Math.max(0, Math.min(l.len, s));
  let k = 1;
  while (k < l.cum.length - 1 && l.cum[k] < d) k++;
  const a = l.pts[k - 1], b = l.pts[k];
  const seg = l.cum[k] - l.cum[k - 1] || 1;
  const t = (d - l.cum[k - 1]) / seg;
  let dx = (b[0] - a[0]) / seg, dz = (b[1] - a[1]) / seg;
  if (dir < 0) { dx = -dx; dz = -dz; }
  const x = a[0] + (b[0] - a[0]) * t + -dz * -off, z = a[1] + (b[1] - a[1]) * t + dx * -off;
  return { x, z, yaw: Math.atan2(dx, dz) };
}

/** Pure: advance one agent; at a dead end it turns round (never freezes). */
export function stepAgent(a: Agent, l: Lane, dt: number, blocked: boolean): Agent {
  const target = blocked ? 0 : a.base;
  const speed = a.speed + (target - a.speed) * Math.min(1, dt * (blocked ? 6 : 1.5));
  let s = a.s + a.dir * speed * dt, dir = a.dir;
  if (s >= l.len) { s = l.len; dir = -1; } else if (s <= 0) { s = 0; dir = 1; }
  return { ...a, s, dir, speed, phase: a.phase + speed * dt };
}

function carGeometry() {
  const body = new THREE.BoxGeometry(1.8, 0.7, 4.2); body.translate(0, 0.55, 0);
  const cabin = new THREE.BoxGeometry(1.6, 0.6, 2.2); cabin.translate(0, 1.2, -0.2);
  return mergeGeometries([body, cabin])!;
}
function bikeGeometry() {
  const g = new THREE.BoxGeometry(0.6, 0.9, 2.0); g.translate(0, 0.75, 0);
  const rider = new THREE.CapsuleGeometry(0.25, 0.6, 2, 6); rider.translate(0, 1.55, -0.2);
  return mergeGeometries([g.toNonIndexed(), rider.toNonIndexed()])!;
}
function pedGeometry() { const g = new THREE.CapsuleGeometry(0.24, 1.15, 2, 8); g.translate(0, 0.82, 0); return g; }

const CAR_COLORS = ['#e5e7eb', '#1f2937', '#387BF6', '#b91c1c', '#9ca3af', '#f8fafc', '#0f766e', '#ca8a04'];
const PED_COLORS = ['#7c3f22', '#1e3a8a', '#f5f5f4', '#475569', '#15803d', '#be185d', '#a16207'];

export const StreetTraffic: React.FC<{ origin: LatLng }> = ({ origin }) => {
  const { camera } = useThree();
  const version = useMapVersion();
  const level = useGovLevel();
  const scale = TRAFFIC_SCALE[level];
  const counts = { car: Math.round(MAX.car * scale), bike: Math.round(MAX.bike * scale), ped: Math.round(MAX.ped * scale) };

  const geos = useMemo(() => ({ car: carGeometry(), bike: bikeGeometry(), ped: pedGeometry() }), []);
  const mats = useMemo(() => ({
    car: new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.6 }),
    bike: new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.5 }),
    ped: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
  }), []);
  useEffect(() => () => { Object.values(geos).forEach((g) => g.dispose()); Object.values(mats).forEach((m) => m.dispose()); }, [geos, mats]);

  const carRef = useRef<THREE.InstancedMesh>(null), bikeRef = useRef<THREE.InstancedMesh>(null), pedRef = useRef<THREE.InstancedMesh>(null);
  const roads = useRef<{ car: Lane[]; walk: Lane[] }>({ car: [], walk: [] });
  const agents = useRef<Agent[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Rebuild lanes from the loaded blocks.
  useEffect(() => {
    const car: Lane[] = [], walk: Lane[] = [];
    for (const d of mapBlocks().values()) for (const r of d.roads) {
      const lane = makeLane(r.pts.map(([la, ln]) => { const p = toLocal({ lat: la, lng: ln }, origin); return [p.x, p.z] as [number, number]; }), r.w);
      if (!lane) continue;
      if (r.w >= 5) car.push(lane);
      walk.push(lane);
    }
    roads.current = { car, walk };
    agents.current = []; // respawn on the new street set
  }, [version, origin]);

  const spawn = (kind: 0 | 1 | 2): Agent | null => {
    const list = kind === 2 ? roads.current.walk : roads.current.car;
    if (!list.length) return null;
    const cx = camera.position.x, cz = camera.position.z;
    for (let tries = 0; tries < 8; tries++) {
      const lane = Math.floor(Math.random() * list.length), l = list[lane];
      const s = Math.random() * l.len, p = sampleLane(l, s, 1, 0);
      if (Math.hypot(p.x - cx, p.z - cz) > NEAR_M) continue;
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const base = kind === 0 ? 7 + Math.random() * 6 : kind === 1 ? 8 + Math.random() * 6 : 1.1 + Math.random() * 0.5;
      const off = kind === 2 ? l.w / 2 + 1.2 : Math.max(1, l.w / 4);
      return { lane, s, dir, speed: base, base, off, kind, phase: Math.random() * 6 };
    }
    return null;
  };

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const want = [counts.car, counts.bike, counts.ped];
    const have = [0, 0, 0];
    const cx = camera.position.x, cz = camera.position.z;
    const next: Agent[] = [];
    for (const a of agents.current) {
      if (have[a.kind] >= want[a.kind]) continue;
      const l = (a.kind === 2 ? roads.current.walk : roads.current.car)[a.lane];
      if (!l) continue;
      const p = sampleLane(l, a.s, a.dir, a.off);
      if (Math.hypot(p.x - cx, p.z - cz) > NEAR_M + 60) continue; // drifted away: respawn near you
      // Brake for you when you stand in the road just ahead.
      let blocked = false;
      if (a.kind !== 2) {
        const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), rx = cx - p.x, rz = cz - p.z;
        const ahead = rx * fx + rz * fz, side = Math.abs(rx * fz - rz * fx);
        blocked = ahead > 0 && ahead < BRAKE_AHEAD_M && side < 2.2;
      }
      next.push(stepAgent(a, l, dt, blocked)); have[a.kind]++;
    }
    for (const k of [0, 1, 2] as const) while (have[k] < want[k]) { const a = spawn(k); if (!a) break; next.push(a); have[k]++; }
    agents.current = next;

    const meshes = [carRef.current, bikeRef.current, pedRef.current];
    const idx = [0, 0, 0];
    const col = new THREE.Color();
    for (const a of next) {
      const m = meshes[a.kind]; if (!m) continue;
      const l = (a.kind === 2 ? roads.current.walk : roads.current.car)[a.lane];
      const p = sampleLane(l, a.s, a.dir, a.off);
      const bob = a.kind === 2 ? Math.abs(Math.sin(a.phase * 4)) * 0.06 : 0;
      dummy.position.set(p.x, bob, p.z); dummy.rotation.set(0, p.yaw, 0); dummy.updateMatrix();
      const i = idx[a.kind]++;
      m.setMatrixAt(i, dummy.matrix);
      const palette = a.kind === 2 ? PED_COLORS : CAR_COLORS;
      m.setColorAt(i, col.set(palette[(a.lane + Math.floor(a.base * 10)) % palette.length]));
    }
    meshes.forEach((m, k) => {
      if (!m) return;
      m.count = idx[k];
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
    (window as unknown as { __vrTraffic?: unknown }).__vrTraffic = { cars: idx[0], bikes: idx[1], people: idx[2], level };
  });

  return (
    <group>
      <instancedMesh ref={carRef} args={[geos.car, mats.car, MAX.car]} frustumCulled={false} />
      <instancedMesh ref={bikeRef} args={[geos.bike, mats.bike, MAX.bike]} frustumCulled={false} />
      <instancedMesh ref={pedRef} args={[geos.ped, mats.ped, MAX.ped]} frustumCulled={false} />
    </group>
  );
};
