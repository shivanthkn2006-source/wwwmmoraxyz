/**
 * Dropped items: a fallen villager leaves an ammo pouch on the ground (Use to
 * take). Uncollected drops fade after 60 s and are cleared when the next
 * chapter loads, so old loot never piles up between stages.
 */
import React, { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { registerUse } from '@/lib/vrUse';
import { dropAmmo } from '@/lib/vrAmmo';
import { useGear } from '@/lib/vrGear';
import { playerSpot } from './VillageVillagers';

type Drop = { id: number; x: number; z: number; at: number };
const LIFE_MS = 60_000;

export const VillageDrops: React.FC = () => {
  const { camera } = useThree();
  const owned = useGear();
  const chapter = ['map', 'medallion', 'crest'].find((q) => !owned.includes(q)) ?? 'done';
  const [drops, setDrops] = useState<Drop[]>([]);
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail; setDrops((l) => [...l.slice(-11), { id: Date.now() + Math.random(), x: d.x, z: d.z, at: Date.now() }]); };
    window.addEventListener('vr-drop', on);
    const t = window.setInterval(() => setDrops((l) => l.filter((d) => Date.now() - d.at < LIFE_MS)), 5000);
    return () => { window.removeEventListener('vr-drop', on); window.clearInterval(t); };
  }, []);
  useEffect(() => { setDrops([]); }, [chapter]); // next stage loads → clear floor
  useEffect(() => registerUse(() => {
    const ps = playerSpot(camera); let best: { d: number; id: number } | null = null;
    for (const d of drops) { const k = Math.hypot(ps.x - d.x, ps.z - d.z); if (!best || k < best.d) best = { d: k, id: d.id }; }
    if (!best) return null;
    const id = best.id;
    return { dist: best.d * 0.45, reach: 2.2, label: 'Take dropped ammo', run: () => { dropAmmo(); void import('@/lib/vrSfx').then((m) => m.playSfx('metal')).catch(() => {}); setDrops((l) => l.filter((d) => d.id !== id)); } };
  }), [camera, drops]);
  return <>{drops.map((d) => (
    <group key={d.id} position={[d.x, 0.12, d.z]}>
      <mesh><boxGeometry args={[0.32, 0.18, 0.22]} /><meshStandardMaterial color="#5a4a2e" emissive="#ffd25a" emissiveIntensity={0.35} roughness={0.8} /></mesh>
      <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.08, 0.08, 2.2, 6, 1, true]} /><meshBasicMaterial color="#ffe08a" transparent opacity={0.3} depthWrite={false} /></mesh>
    </group>
  ))}</>;
};
