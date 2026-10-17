/**
 * The Feral (Part 14, M'Mora telling): fast, animalistic infected that haunt
 * the quarantine forest east of the village after the Crest is taken. They
 * drop from the tree line in ambush, move in quick lunges (2.6 m/s), and
 * hit fast but light. Beating one drops an ammo pouch.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { useGear, gearStats, getEquipped } from '@/lib/vrGear';
import { logStory } from '@/lib/vrStoryline';
import { playerSpot } from './VillageVillagers';

type F = { id: number; x: number; z: number; hp: number; drop: number };
const SKIN = new THREE.MeshStandardMaterial({ color: '#6a6250', roughness: 0.95 });
const EYE = new THREE.MeshBasicMaterial({ color: '#e8e0c0' });
const FOREST = { x: 92, z: -18 }; // inside the quarantine fence line

export const VillageFeral: React.FC = () => (useGear().includes('crest') ? <FeralPack /> : null);

const FeralPack: React.FC = () => {
  const { camera } = useThree();
  const list = useRef<F[]>([]); const [, tick] = useState(0); const spawn = useRef(0);
  useEffect(() => registerUse(() => {
    const ps = playerSpot(camera); let b: F | null = null, bd = 1e9;
    for (const f of list.current) { const k = Math.hypot(ps.x - f.x, ps.z - f.z); if (k < bd) { bd = k; b = f; } }
    if (!b || bd > 2.6) return null; const t = b;
    return { dist: bd * 0.4, reach: 2.6, label: 'Strike the Feral', run: () => {
      t.hp -= gearStats(getEquipped()).attack; void import('@/lib/vrSfx').then((m) => m.playSfx('knife'));
      if (t.hp <= 0) { list.current = list.current.filter((f) => f !== t); window.dispatchEvent(new CustomEvent('vr-drop', { detail: { x: t.x, z: t.z } })); logStory('enemy', 'feral:down'); }
      tick((n) => n + 1);
    } };
  }), [camera]);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05); const ps = playerSpot(camera);
    const inForest = Math.hypot(ps.x - FOREST.x, ps.z - FOREST.z) < 34;
    if (!inForest) { if (list.current.length) { list.current = []; tick((n) => n + 1); } return; }
    spawn.current -= dt;
    if (spawn.current <= 0 && list.current.length < 3) {
      spawn.current = 8;
      // ambush: drops from the tree line just ahead of the member
      list.current.push({ id: Math.random(), x: ps.x + (Math.random() - 0.5) * 10, z: ps.z - 8 - Math.random() * 6, hp: 35, drop: 1 });
      void import('@/lib/vrSfx').then((m) => m.playSfx('leather')); logStory('enemy', 'feral:ambush'); tick((n) => n + 1);
    }
    for (const f of list.current) {
      f.drop = Math.max(0, f.drop - dt * 1.5); if (f.drop > 0) continue;
      const dx = ps.x - f.x, dz = ps.z - f.z, k = Math.hypot(dx, dz);
      // quick lunges: sprint, pause, sprint
      const lunge = Math.sin(clock.elapsedTime * 3 + f.id * 20) > 0.2 ? 2.6 : 0.4;
      if (k > 1) { f.x += dx / k * lunge * dt; f.z += dz / k * lunge * dt; }
      else if (Math.random() < dt * 1.2) window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: Math.max(2, Math.round(6 * (1 - gearStats(getEquipped()).defence / 60))) } }));
    }
  });
  return <>{list.current.map((f) => <Body key={f.id} f={f} />)}</>;
};

const Body: React.FC<{ f: F }> = ({ f }) => {
  const r = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { const g = r.current; if (!g) return; g.position.set(f.x, 2.2 * f.drop, f.z); g.rotation.x = Math.sin(clock.elapsedTime * 6 + f.id * 9) * 0.08; });
  return <group ref={r}>
    {/* hunched, animalistic frame on all fours */}
    <mesh material={SKIN} position={[0, 0.55, 0]} rotation={[0.5, 0, 0]}><capsuleGeometry args={[0.22, 0.7, 3, 6]} /></mesh>
    <mesh material={SKIN} position={[0, 0.75, 0.45]}><sphereGeometry args={[0.16, 7, 5]} /></mesh>
    <mesh material={EYE} position={[-0.06, 0.8, 0.58]}><sphereGeometry args={[0.025, 4, 3]} /></mesh>
    <mesh material={EYE} position={[0.06, 0.8, 0.58]}><sphereGeometry args={[0.025, 4, 3]} /></mesh>
    {[[-0.18, 0.3], [0.18, 0.3], [-0.18, -0.3], [0.18, -0.3]].map(([x, z], i) => (
      <mesh key={i} material={SKIN} position={[x, 0.25, z]}><capsuleGeometry args={[0.06, 0.4, 2, 5]} /></mesh>
    ))}
  </group>;
};
export default VillageFeral;
