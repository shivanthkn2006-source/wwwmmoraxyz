/**
 * The Proto-Hunter (Part 14, M'Mora telling): a skeletal, pale stalker with
 * exposed muscle fibers and elongated talons. It haunts the outpost cavern
 * after the Crest, making no sound until it lunges — no screech warning,
 * unlike the Executioner. Very fast lunge, heavy hit, one ammo drop.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { useGear, gearStats, getEquipped } from '@/lib/vrGear';
import { logStory } from '@/lib/vrStoryline';
import { playerSpot } from './VillageVillagers';

const PALE = new THREE.MeshStandardMaterial({ color: '#b8b0a0', roughness: 0.85 });
const MUSCLE = new THREE.MeshStandardMaterial({ color: '#7a3a30', roughness: 0.9 });
const EYE = new THREE.MeshBasicMaterial({ color: '#d8e8f0' });
const HOME = { x: -116, z: -30 }; // the outpost cavern

export const VillageProtoHunter: React.FC = () => (useGear().includes('crest') ? <Hunter /> : null);

const Hunter: React.FC = () => {
  const { camera } = useThree();
  const st = useRef({ x: HOME.x, z: HOME.z, hp: 260, dead: false, lunge: 0, crouch: 0 });
  const [, tick] = useState(0);
  const g = useRef<THREE.Group>(null);

  useEffect(() => registerUse(() => {
    const s = st.current; if (s.dead) return null;
    const ps = playerSpot(camera); const d = Math.hypot(ps.x - s.x, ps.z - s.z);
    if (d > 3) return null;
    return { dist: d * 0.4, reach: 3, label: 'Strike the Proto-Hunter', run: () => {
      s.hp -= gearStats(getEquipped()).attack; void import('@/lib/vrSfx').then((m) => m.playSfx('knife'));
      if (s.hp <= 0) {
        s.dead = true;
        window.dispatchEvent(new CustomEvent('vr-drop', { detail: { x: s.x, z: s.z } }));
        logStory('enemy', 'protohunter:down');
        window.dispatchEvent(new CustomEvent('vr-toast', { detail: 'The Proto-Hunter folds without a sound' }));
        // The Curator takes an interest (Part 14 story note, read aloud, kept in Files).
        window.setTimeout(() => void import('@/lib/vrStory').then((st) => st.readNote('log_curator')), 2500);
      }
      tick((n) => n + 1);
    } };
  }), [camera]);

  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05); const s = st.current;
    const grp = g.current; if (!grp) return;
    if (s.dead) { grp.position.y = Math.max(-1.4, grp.position.y - dt); return; }
    const ps = playerSpot(camera);
    const dx = ps.x - s.x, dz = ps.z - s.z, k = Math.hypot(dx, dz);
    const near = Math.hypot(ps.x - HOME.x, ps.z - HOME.z) < 36;
    if (!near) { s.x += (HOME.x - s.x) * dt * 0.3; s.z += (HOME.z - s.z) * dt * 0.3; grp.position.set(s.x, 0, s.z); return; }
    // stalks crouched and silent, then explosive lunge inside 9 m
    if (k > 9) { s.crouch = 1; s.x += dx / k * 1.2 * dt; s.z += dz / k * 1.2 * dt; }
    else {
      s.crouch = 0; s.lunge -= dt;
      if (s.lunge <= 0 && k > 1.4) { s.lunge = 2.2; s.x += dx / k * 4.5 * dt * 8; s.z += dz / k * 4.5 * dt * 8; void import('@/lib/vrSfx').then((m) => m.playSfx('knife')); }
      else if (k <= 1.4 && Math.random() < dt * 1.1) window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: Math.max(6, Math.round(18 * (1 - gearStats(getEquipped()).defence / 60))) } }));
    }
    grp.position.set(s.x, s.crouch ? -0.35 : 0, s.z);
    grp.rotation.y = Math.atan2(dx, dz);
    grp.rotation.x = s.crouch ? 0.35 : Math.sin(clock.elapsedTime * 2) * 0.04;
  });

  return (
    <group ref={g} position={[HOME.x, 0, HOME.z]}>
      <mesh material={PALE} position={[0, 1.3, 0]}><capsuleGeometry args={[0.34, 0.9, 3, 8]} /></mesh>
      {/* exposed muscle fibers */}
      <mesh material={MUSCLE} position={[0.2, 1.4, 0.2]} rotation={[0.3, 0, 0.4]}><capsuleGeometry args={[0.07, 0.6, 2, 5]} /></mesh>
      <mesh material={MUSCLE} position={[-0.22, 1.2, 0.15]} rotation={[0.2, 0, -0.5]}><capsuleGeometry args={[0.06, 0.5, 2, 5]} /></mesh>
      <mesh material={PALE} position={[0, 2.1, 0.05]}><sphereGeometry args={[0.22, 8, 6]} /></mesh>
      <mesh material={EYE} position={[-0.08, 2.14, 0.22]}><sphereGeometry args={[0.03, 4, 3]} /></mesh>
      <mesh material={EYE} position={[0.08, 2.14, 0.22]}><sphereGeometry args={[0.03, 4, 3]} /></mesh>
      {/* elongated talons */}
      {[-0.5, 0.5].map((x, i) => (
        <group key={i} position={[x, 1.3, 0.2]}>
          <mesh material={PALE} rotation={[0.8, 0, 0]}><capsuleGeometry args={[0.09, 0.7, 2, 5]} /></mesh>
          {[0, 1, 2].map((c) => (
            <mesh key={c} material={PALE} position={[(c - 1) * 0.06, -0.55, 0.45]} rotation={[1.4, 0, 0]}><coneGeometry args={[0.025, 0.3, 4]} /></mesh>
          ))}
        </group>
      ))}
      <mesh material={PALE} position={[-0.2, 0.45, 0]}><capsuleGeometry args={[0.11, 0.7, 2, 6]} /></mesh>
      <mesh material={PALE} position={[0.2, 0.45, 0]}><capsuleGeometry args={[0.11, 0.7, 2, 6]} /></mesh>
    </group>
  );
};
export default VillageProtoHunter;
