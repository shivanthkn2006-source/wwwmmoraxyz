/**
 * Stage 2 — the Hollow Warden: a tall stalker that hunts by sound during the
 * Medallion and Crest chapters. Walking keeps it slow; running makes it fast.
 * It cannot die — enough hits stagger it and it retreats into the fog.
 */
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { gearStats, getEquipped, useGear } from '@/lib/vrGear';
import { WALK_MPS, RUN_MPS } from '@/lib/vrWalk';
import { logStory } from '@/lib/vrStoryline';
import { playerSpot } from './VillageVillagers';

const BODY = new THREE.MeshStandardMaterial({ color: '#1b1a1e', roughness: 0.9 });
const EYE = new THREE.MeshBasicMaterial({ color: '#9cff6a' });

export const HollowWarden: React.FC = () => {
  const owned = useGear();
  const active = owned.includes('map') && !owned.includes('crest');
  return active ? <Warden /> : null;
};

const Warden: React.FC = () => {
  const { camera } = useThree();
  const root = useRef<THREE.Group>(null);
  const st = useRef({ hp: 3, stagger: 0, hitCd: 0, warned: false, last: new THREE.Vector3(), speed: 0, phase: 0 });

  useEffect(() => {
    const p = root.current; if (!p) return;
    p.position.set(camera.position.x + 30, 0, camera.position.z + 30);
    st.current.last.copy(camera.position);
    logStory('enemy', 'hollow-warden:appear');
  }, [camera]);

  useEffect(() => registerUse(() => {
    const p = root.current; if (!p || st.current.stagger > 0) return null;
    const ps = playerSpot(camera); const d = Math.hypot(ps.x - p.position.x, ps.z - p.position.z);
    return { dist: d, reach: 3, label: 'Strike the Warden', run: () => {
      const c = st.current; c.hp -= Math.max(1, Math.round(gearStats(getEquipped()).attack / 15));
      void import('@/lib/vrSfx').then((m) => m.playSfx('metal'));
      if (c.hp <= 0) { c.hp = 3; c.stagger = 20; logStory('enemy', 'hollow-warden:stagger');
        window.dispatchEvent(new CustomEvent('vr-toast', { detail: 'The Hollow Warden retreats into the fog…' })); }
    } };
  }), [camera]);

  useFrame((_, dtRaw) => {
    const p = root.current; if (!p) return; const dt = Math.min(dtRaw, 0.1); const c = st.current;
    // Player noise = how fast you move.
    const moved = camera.position.distanceTo(c.last) / Math.max(dt, 1e-3); c.last.copy(camera.position);
    c.speed = c.speed * 0.9 + moved * 0.1;
    if (c.stagger > 0) { c.stagger -= dt; p.visible = c.stagger < 1; if (c.stagger <= 0) p.position.set(camera.position.x - 35, 0, camera.position.z - 35); return; }
    p.visible = true;
    const ps = playerSpot(camera); const dx = ps.x - p.position.x, dz = ps.z - p.position.z, dd = Math.hypot(dx, dz) || 1;
    if (dd > 80) { p.position.set(ps.x + 40, 0, ps.z + 40); return; }
    const loud = c.speed > WALK_MPS * 1.3;
    const v = loud ? RUN_MPS * 0.85 : WALK_MPS * 0.55;
    p.rotation.y = Math.atan2(dx, dz);
    if (dd > 1.4) { p.position.x += (dx / dd) * v * dt; p.position.z += (dz / dd) * v * dt; c.phase += dt * (loud ? 9 : 4); }
    p.position.y = Math.abs(Math.sin(c.phase)) * 0.05;
    if (dd < 15 && !c.warned) { c.warned = true; window.dispatchEvent(new CustomEvent('vr-danger')); }
    if (dd > 30) c.warned = false;
    c.hitCd -= dt;
    if (dd <= 1.8 && c.hitCd <= 0) {
      c.hitCd = 2;
      const { defence } = gearStats(getEquipped());
      window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: Math.max(5, Math.round(25 * (1 - defence / 60))) } }));
    }
  });

  return (
    <group ref={root}>
      <mesh material={BODY} position={[0, 1.3, 0]}><cylinderGeometry args={[0.28, 0.45, 2.2, 8]} /></mesh>
      <mesh material={BODY} position={[0, 2.6, 0]}><sphereGeometry args={[0.26, 10, 8]} /></mesh>
      <mesh material={EYE} position={[-0.09, 2.63, 0.22]}><sphereGeometry args={[0.035, 6, 4]} /></mesh>
      <mesh material={EYE} position={[0.09, 2.63, 0.22]}><sphereGeometry args={[0.035, 6, 4]} /></mesh>
      <mesh material={BODY} position={[-0.45, 1.6, 0.1]} rotation={[0.3, 0, 0.15]}><cylinderGeometry args={[0.06, 0.05, 1.5, 5]} /></mesh>
      <mesh material={BODY} position={[0.45, 1.6, 0.1]} rotation={[0.3, 0, -0.15]}><cylinderGeometry args={[0.06, 0.05, 1.5, 5]} /></mesh>
    </group>
  );
};
