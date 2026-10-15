/**
 * The Drowned: waterlogged husks that rise from the surf once the Church
 * Medallion is taken. They stir near the shoreline, and (per the design doc)
 * every glove-power shockwave is a beacon that draws them in anywhere. They shamble slowly (1.1 m/s), hit hard up close and drop an ammo
 * pouch when beaten. Leaving the shore lets them sink back.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { useGear, gearStats, getEquipped } from '@/lib/vrGear';
import { logStory } from '@/lib/vrStoryline';
import { SHORE_Z } from './MMoraBeach';
import { playerSpot } from './VillageVillagers';

type D = { id: number; x: number; z: number; hp: number; rise: number };
const BODY = new THREE.MeshStandardMaterial({ color: '#3e5550', roughness: 0.95, emissive: '#0d2a24', emissiveIntensity: 0.4 });
const EYE = new THREE.MeshBasicMaterial({ color: '#9fe6c8' });

export const VillageDrowned: React.FC = () => (useGear().includes('medallion') ? <Drowned /> : null);

const Drowned: React.FC = () => {
  const { camera } = useThree();
  const list = useRef<D[]>([]); const [, tick] = useState(0); const spawn = useRef(0);
  const beacon = useRef(0);
  useEffect(() => { const on = (e: Event) => { const d = (e as CustomEvent).detail as { x: number; z: number };
    // Shockwave hurts any Drowned within 5 m; then more are drawn to the noise.
    for (const w of list.current) if (Math.hypot(w.x - d.x, w.z - d.z) < 5) w.hp -= 40;
    list.current = list.current.filter((w) => { if (w.hp > 0) return true; window.dispatchEvent(new CustomEvent('vr-drop', { detail: { x: w.x, z: w.z } })); return false; });
    beacon.current = 20; spawn.current = 0; tick((n) => n + 1); };
    window.addEventListener('vr-glove', on); return () => window.removeEventListener('vr-glove', on); }, []);
  useEffect(() => registerUse(() => {
    const ps = playerSpot(camera); let b: D | null = null, bd = 1e9;
    for (const d of list.current) { const k = Math.hypot(ps.x - d.x, ps.z - d.z); if (k < bd) { bd = k; b = d; } }
    if (!b || bd > 3) return null; const t = b;
    return { dist: bd * 0.4, reach: 3, label: 'Strike the Drowned', run: () => {
      t.hp -= gearStats(getEquipped()).attack; void import('@/lib/vrSfx').then((m) => m.playSfx('knife'));
      if (t.hp <= 0) { list.current = list.current.filter((d) => d !== t); window.dispatchEvent(new CustomEvent('vr-drop', { detail: { x: t.x, z: t.z } })); logStory('enemy', 'drowned:down'); }
      tick((n) => n + 1);
    } };
  }), [camera]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05); const ps = playerSpot(camera);
    beacon.current = Math.max(0, beacon.current - dt);
    const nearShore = ps.z < SHORE_Z + 14 || beacon.current > 0;
    if (!nearShore) { if (list.current.length) { list.current = []; tick((n) => n + 1); } return; }
    spawn.current -= dt;
    if (spawn.current <= 0 && list.current.length < 3) { spawn.current = 7; list.current.push({ id: Math.random(), x: ps.x + (Math.random() - 0.5) * 16, z: beacon.current > 0 && ps.z >= SHORE_Z + 14 ? ps.z + (Math.random() < 0.5 ? -12 : 12) : SHORE_Z - 2, hp: 60, rise: 0 }); void import('@/lib/vrSfx').then((m) => m.playSfx('leather')); logStory('enemy', 'drowned:rise'); tick((n) => n + 1); }
    for (const d of list.current) {
      d.rise = Math.min(1, d.rise + dt / 2); if (d.rise < 1) continue;
      const dx = ps.x - d.x, dz = ps.z - d.z, k = Math.hypot(dx, dz);
      if (k > 1.1) { d.x += dx / k * 1.1 * dt; d.z += dz / k * 1.1 * dt; }
      else if (Math.random() < dt * 0.6) window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: Math.max(3, Math.round(10 * (1 - gearStats(getEquipped()).defence / 60))) } }));
    }
  });
  return <>{list.current.map((d) => <Body key={d.id} d={d} />)}</>;
};

const Body: React.FC<{ d: D }> = ({ d }) => {
  const r = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { const g = r.current; if (!g) return; g.position.set(d.x, -1.8 + d.rise * 1.8, d.z); g.rotation.z = Math.sin(clock.elapsedTime * 2 + d.id * 9) * 0.12; });
  return <group ref={r}>
    <mesh material={BODY} position={[0, 0.95, 0]}><capsuleGeometry args={[0.3, 1, 3, 6]} /></mesh>
    <mesh material={BODY} position={[0, 1.8, 0.05]}><sphereGeometry args={[0.24, 8, 6]} /></mesh>
    <mesh material={EYE} position={[-0.08, 1.84, 0.24]}><sphereGeometry args={[0.03, 4, 3]} /></mesh>
    <mesh material={EYE} position={[0.08, 1.84, 0.24]}><sphereGeometry args={[0.03, 4, 3]} /></mesh>
    <mesh material={BODY} position={[0.38, 1.2, 0.3]} rotation={[1.2, 0, 0]}><capsuleGeometry args={[0.07, 0.6, 2, 5]} /></mesh>
    <mesh material={BODY} position={[-0.38, 1.2, 0.3]} rotation={[1.2, 0, 0]}><capsuleGeometry args={[0.07, 0.6, 2, 5]} /></mesh>
  </group>;
};
