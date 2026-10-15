/**
 * Compression-glove power (design doc, Part 1): the left glove hums amber;
 * pressing G (or Use when nothing else is in reach) fires a kinetic shockwave
 * that cracks mould and staggers nearby Drowned. Each use adds 40 heat and
 * lights a beacon that draws the Drowned. Heat cools 10/s; at 100 the glove
 * overheats (5 damage, locked 8 s) — Varga's warning from the script.
 */
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { useGear } from '@/lib/vrGear';
import { logStory } from '@/lib/vrStoryline';
import { playerSpot } from './VillageVillagers';

const toast = (t: string) => window.dispatchEvent(new CustomEvent('vr-toast', { detail: t }));

export const VillageGlove: React.FC = () => (useGear().includes('medallion') ? <Glove /> : null);

const Glove: React.FC = () => {
  const { camera } = useThree();
  const heat = useRef(0); const lock = useRef(0); const ring = useRef<THREE.Mesh>(null); const wave = useRef(0);
  const fire = () => {
    if (lock.current > 0) { toast('Glove overheated — wait'); return; }
    const ps = playerSpot(camera); heat.current += 40; wave.current = 1;
    if (ring.current) ring.current.position.set(ps.x, 0.2, ps.z);
    window.dispatchEvent(new CustomEvent('vr-glove', { detail: { x: ps.x, z: ps.z } }));
    void import('@/lib/vrSfx').then((m) => m.playSfx('rocket')); logStory('power', 'glove');
    if (heat.current >= 100) { lock.current = 8; heat.current = 100; window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: 5 } })); toast('Varga: Your gloves are overheating — pull back!'); }
    else toast(`Glove shockwave · heat ${Math.round(heat.current)}% · the Drowned heard that`);
  };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'g' || e.key === 'G') fire(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }); // eslint-disable-line
  useEffect(() => registerUse(() => ({ dist: 2.95, reach: 3, label: 'Glove shockwave', run: fire })), [camera]); // eslint-disable-line
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    heat.current = Math.max(0, heat.current - 10 * dt); lock.current = Math.max(0, lock.current - dt);
    const r = ring.current; if (!r) return;
    wave.current = Math.max(0, wave.current - dt * 1.5); r.visible = wave.current > 0;
    const s = 1 + (1 - wave.current) * 5; r.scale.set(s, s, 1); (r.material as THREE.MeshBasicMaterial).opacity = wave.current * 0.6;
  });
  return <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[0.8, 1, 32]} /><meshBasicMaterial color="#ff9a2e" transparent depthWrite={false} side={THREE.DoubleSide} /></mesh>;
};
