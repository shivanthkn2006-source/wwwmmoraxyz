/** Renders street relics on the real map and lets the Use button pick them up. */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { toLocal, type LatLng } from './geo';
import { useStreetRelics, getStreetRelics, takeRelic, type StreetRelic } from './streetRelics';
import { registerUse } from '@/lib/vrUse';
import { playPickup } from '@/lib/vrSfx';
import { recordVRCollect } from '@/lib/vrQuests';
import { notifySelf } from '@/lib/notifySelf';
import { trackActivity } from '@/lib/visitTracker';
import { sayInWorld } from '@/worlds/meet/vrMeet';

const COLORS: Record<string, string> = { common: '#9fd8ff', uncommon: '#7ee0a8', rare: '#5aa2ff', epic: '#c58bff', legendary: '#ffd166' };
const GEO = new THREE.OctahedronGeometry(0.45, 0);
const BEAM = new THREE.CylinderGeometry(0.05, 0.05, 6, 6, 1, true);
const label = (r: StreetRelic) => r.type.replace(/_/g, ' ');

export function collectStreetRelic(r: StreetRelic) {
  takeRelic(r.id);
  playPickup('relic');
  void recordVRCollect({ type: r.type, rarity: r.rarity });
  void notifySelf('vr_relic_found', 'Street relic found', `You found a ${r.rarity} ${label(r)} on your real street.`, { link: '/vr-world', rarity: r.rarity, relic: r.id }).catch(() => {});
  try { trackActivity('vr_collect', `Found a ${r.rarity} ${label(r)} on the real map`); } catch { /* optional */ }
  sayInWorld(`found a ${r.rarity} ${label(r)} 🏺`);
}

const Relic: React.FC<{ r: StreetRelic; origin: LatLng }> = ({ r, origin }) => {
  const ref = useRef<THREE.Mesh>(null);
  const p = useMemo(() => toLocal(r, origin), [r, origin]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: COLORS[r.rarity], emissive: COLORS[r.rarity], emissiveIntensity: 0.9 }), [r.rarity]);
  const beam = useMemo(() => new THREE.MeshBasicMaterial({ color: COLORS[r.rarity], transparent: true, opacity: 0.35, depthWrite: false }), [r.rarity]);
  useEffect(() => () => { mat.dispose(); beam.dispose(); }, [mat, beam]);
  useFrame(({ clock }) => { if (ref.current) { ref.current.rotation.y = clock.elapsedTime * 1.4; ref.current.position.y = 1.1 + Math.sin(clock.elapsedTime * 2) * 0.15; } });
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh ref={ref} geometry={GEO} material={mat} />
      <mesh geometry={BEAM} material={beam} position={[0, 3, 0]} />
    </group>
  );
};

export const StreetRelics: React.FC<{ origin: LatLng }> = ({ origin }) => {
  const relics = useStreetRelics();
  const { camera } = useThree();
  useEffect(() => registerUse(() => {
    let best: StreetRelic | null = null; let bestD = Infinity;
    for (const r of getStreetRelics()) {
      const { x, z } = toLocal(r, origin);
      const d = Math.hypot(x - camera.position.x, z - camera.position.z);
      if (d < bestD) { bestD = d; best = r; }
    }
    if (!best || camera.position.y > 6) return null;
    const hit = best;
    return { dist: bestD, reach: 3, label: `Picked up a ${hit.rarity} ${label(hit)} — added to your bag`, run: () => collectStreetRelic(hit) };
  }), [camera, origin]);
  return <>{relics.map((r) => <Relic key={r.id} r={r} origin={origin} />)}</>;
};
export default StreetRelics;
