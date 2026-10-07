/**
 * Bench economy in M'Mora World: Use near a bench to sit; while you stay
 * seated you earn 1 coin every 30 s (up to 20 per sitting). With 10 coins,
 * Use in an open spot builds a new bench there. Built benches are saved per
 * city, so each city's M'Mora World grows its own. Benches draw as 3
 * instanced batches, with a street lamp beside each one.
 */
import React, { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { addCoins, spendCoins, getPickups } from '@/lib/vrPickups';
import { mmoraCityKey } from '@/worlds/worldMode';
import { StreetLamps } from '../StreetLamps';

export const BENCH_COST = 10;
export const SIT_COIN_SECONDS = 30;
export const SIT_COIN_CAP = 20;
const MAX_BUILT = 30;

type Bench = [number, number, number]; // x, z, rotY
const BASE: Bench[] = [
  [-6, 0, 0], [10, 2, Math.PI], [0, -12, 0], [-12, -10, Math.PI / 2],
  [12, -14, -Math.PI / 2], [-4, 14, Math.PI], [8, 16, Math.PI], [-16, 6, Math.PI / 2],
];

const key = () => `vr-mmora-benches:${mmoraCityKey()}`;
let built: Bench[] = [];
let loadedFor = '';
const ls = new Set<() => void>();
function ensure() {
  const k = key();
  if (loadedFor === k) return;
  loadedFor = k;
  try { built = JSON.parse(localStorage.getItem(k) || '[]'); } catch { built = []; }
}
function addBuilt(b: Bench) {
  built = [...built, b].slice(-MAX_BUILT);
  try { localStorage.setItem(key(), JSON.stringify(built)); } catch { /* */ }
  ls.forEach((l) => l());
}
const useBuilt = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => { ensure(); return built; }, () => built);

const toast = (text: string) => window.dispatchEvent(new CustomEvent('vr-use-result', { detail: { ok: true, text } }));

// Bench parts [x, y, z, w, h, d] in bench space.
const WOOD: number[][] = [[0, 0.44, 0, 1.5, 0.06, 0.45], [0, 0.72, -0.2, 1.5, 0.3, 0.05]];
const LEGS: number[][] = [[-0.65, 0.22, 0.15, 0.06, 0.44, 0.06], [0.65, 0.22, 0.15, 0.06, 0.44, 0.06], [-0.65, 0.35, -0.2, 0.06, 0.7, 0.06], [0.65, 0.35, -0.2, 0.06, 0.7, 0.06]];
const BOX = new THREE.BoxGeometry(1, 1, 1);
const WOOD_MAT = new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.8 });
const LEG_MAT = new THREE.MeshStandardMaterial({ color: '#3a3a3a', metalness: 0.6, roughness: 0.4 });

const Parts: React.FC<{ benches: Bench[]; parts: number[][]; mat: THREE.Material }> = ({ benches, parts, mat }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(BOX, mat, Math.max(1, benches.length * parts.length));
    const b = new THREE.Matrix4(), p = new THREE.Matrix4();
    let k = 0;
    for (const [x, z, r] of benches) {
      b.makeRotationY(r).setPosition(x, 0, z);
      for (const [px, py, pz, w, h, d] of parts) {
        p.makeScale(w, h, d).setPosition(px, py, pz);
        m.setMatrixAt(k++, new THREE.Matrix4().multiplyMatrices(b, p));
      }
    }
    m.count = k;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    return m;
  }, [benches, parts, mat]);
  useEffect(() => () => { mesh.dispose(); }, [mesh]);
  return <primitive object={mesh} />;
};

/** Where you sit: just in front of the seat. */
export const seatOf = ([x, z, r]: Bench): [number, number] => [x + Math.sin(r) * 0.35, z + Math.cos(r) * 0.35];

export const MMoraBenches: React.FC = () => {
  const extra = useBuilt();
  const benches = useMemo(() => [...BASE, ...extra], [extra]);
  const benchesRef = useRef(benches); benchesRef.current = benches;
  const lamps = useMemo(() => benches.map(([x, z, r]) => [x + Math.cos(r) * 1.3, z - Math.sin(r) * 1.3] as [number, number]), [benches]);
  const { camera } = useThree();
  const armBuild = useRef(0);
  const sit = useRef<{ seat: [number, number]; t: number; earned: number } | null>(null);

  useEffect(() => registerUse(() => {
    const c = camera.position;
    let best: { d: number; b: Bench } | null = null;
    for (const b of benchesRef.current) { const d = Math.hypot(b[0] - c.x, b[1] - c.z); if (!best || d < best.d) best = { d, b }; }
    if (best && best.d < 2.5) {
      const b = best.b;
      return { dist: best.d, reach: 2.5, label: sit.current ? 'Already sitting — earning coins' : `Sit on the bench (1 coin / ${SIT_COIN_SECONDS}s)`, run: () => {
        if (sit.current) return;
        const seat = seatOf(b);
        window.dispatchEvent(new CustomEvent('vr-teleport', { detail: { position: [seat[0], 1.15, seat[1]], lockGround: true } }));
        sit.current = { seat, t: 0, earned: 0 };
        toast('Sitting — you earn a coin every 30 seconds');
      } };
    }
    if (best && best.d < 3.5) return null;
    // Open spot: offer to build (low priority so real targets win).
    const yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
    return { dist: 2.9, reach: 3, label: `Build a bench here (${BENCH_COST} coins)`, run: () => {
      if (performance.now() - armBuild.current > 4000) { armBuild.current = performance.now(); toast(`Press Use again to build a bench (${BENCH_COST} coins)`); return; }
      armBuild.current = 0;
      if (getPickups().coins < BENCH_COST || !spendCoins(BENCH_COST)) { toast(`You need ${BENCH_COST} coins — sit on a bench to earn them`); return; }
      const fx = -Math.sin(yaw) * 2, fz = -Math.cos(yaw) * 2;
      addBuilt([+(c.x + fx).toFixed(2), +(c.z + fz).toFixed(2), yaw]);
      toast('New bench built!');
    } };
  }), [camera]);

  useFrame((_, dt) => {
    const s = sit.current; if (!s) return;
    if (Math.hypot(camera.position.x - s.seat[0], camera.position.z - s.seat[1]) > 1.2) { sit.current = null; return; }
    s.t += Math.min(dt, 0.1);
    if (s.t >= SIT_COIN_SECONDS && s.earned < SIT_COIN_CAP) { s.t = 0; s.earned += 1; addCoins(1); toast(`+1 coin for resting (${s.earned})`); }
  });

  return (
    <group>
      <Parts benches={benches} parts={WOOD} mat={WOOD_MAT} />
      <Parts benches={benches} parts={LEGS} mat={LEG_MAT} />
      <StreetLamps spots={lamps} />
    </group>
  );
};
