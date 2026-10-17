/**
 * The Spliced Executioner (Part 13): a massive hulking test subject whose
 * right arm has fused into a rusted iron anchor. It patrols the sanatorium
 * rise after the Lord's Crest is taken, dragging the anchor along the ground
 * — a metallic screech warns the member before it is seen. Slow but hits
 * very hard; beating it drops two ammo pouches and logs the encounter.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { useGear, gearStats, getEquipped } from '@/lib/vrGear';
import { logStory } from '@/lib/vrStoryline';
import { playerSpot } from './VillageVillagers';

const SKIN = new THREE.MeshStandardMaterial({ color: '#5d5648', roughness: 0.9 });
const SKIN_DARK = new THREE.MeshStandardMaterial({ color: '#453f34', roughness: 1 });
const ANCHOR = new THREE.MeshStandardMaterial({ color: '#3d2c1e', roughness: 0.75, metalness: 0.6 });
const EYE = new THREE.MeshBasicMaterial({ color: '#e8d44f' });

const HOME = { x: -88, z: -16 }; // sanatorium drive
const toast = (t: string) => window.dispatchEvent(new CustomEvent('vr-toast', { detail: t }));

export const VillageExecutioner: React.FC = () => (useGear().includes('crest') ? <Exec /> : null);

const Exec: React.FC = () => {
  const { camera } = useThree();
  const st = useRef({ x: HOME.x, z: HOME.z, hp: 400, dead: false, screech: 0, swing: 0 });
  const [, tick] = useState(0);
  const g = useRef<THREE.Group>(null); const arm = useRef<THREE.Group>(null);

  useEffect(() => registerUse(() => {
    const s = st.current; if (s.dead) return null;
    const ps = playerSpot(camera); const d = Math.hypot(ps.x - s.x, ps.z - s.z);
    if (d > 3.4) return null;
    return { dist: d * 0.4, reach: 3.4, label: 'Strike the Executioner', run: () => {
      s.hp -= gearStats(getEquipped()).attack;
      void import('@/lib/vrSfx').then((m) => m.playSfx('knife'));
      if (s.hp <= 0) {
        s.dead = true;
        window.dispatchEvent(new CustomEvent('vr-drop', { detail: { x: s.x, z: s.z } }));
        window.dispatchEvent(new CustomEvent('vr-drop', { detail: { x: s.x + 1, z: s.z + 1 } }));
        logStory('enemy', 'executioner:down');
        toast('The Executioner collapses — the anchor rings once on the stone');
      }
      tick((n) => n + 1);
    } };
  }), [camera]);

  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05); const s = st.current;
    const grp = g.current; if (!grp) return;
    if (s.dead) { grp.position.y = Math.max(-1.6, grp.position.y - dt * 0.8); grp.rotation.x = Math.min(1.2, grp.rotation.x + dt * 0.5); return; }
    const ps = playerSpot(camera);
    const dx = ps.x - s.x, dz = ps.z - s.z, k = Math.hypot(dx, dz);
    // screech warning: anchor drag audible within 24 m
    s.screech -= dt;
    if (k < 24 && s.screech <= 0) { s.screech = 6; void import('@/lib/vrSfx').then((m) => m.playSfx('metal')); }
    // hunts within 30 m of home, else lumbers back
    const tx = k < 30 ? ps.x : HOME.x, tz = k < 30 ? ps.z : HOME.z;
    const mx = tx - s.x, mz = tz - s.z, mk = Math.hypot(mx, mz);
    if (mk > 1.6) { s.x += mx / mk * 0.9 * dt; s.z += mz / mk * 0.9 * dt; grp.rotation.y = Math.atan2(mx, mz); }
    else if (k < 1.8) {
      s.swing = 0.4;
      if (Math.random() < dt * 0.9) window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: Math.max(8, Math.round(26 * (1 - gearStats(getEquipped()).defence / 60))) } }));
    }
    s.swing = Math.max(0, s.swing - dt);
    grp.position.set(s.x, Math.abs(Math.sin(clock.elapsedTime * 1.6)) * 0.08, s.z);
    if (arm.current) arm.current.rotation.x = s.swing > 0 ? -1.2 : 0.5 + Math.sin(clock.elapsedTime * 1.6) * 0.1; // anchor drags behind, raised to swing
  });

  return (
    <group ref={g} position={[HOME.x, 0, HOME.z]}>
      {/* hulking torso */}
      <mesh material={SKIN} position={[0, 1.5, 0]}><capsuleGeometry args={[0.55, 1.1, 3, 8]} /></mesh>
      <mesh material={SKIN_DARK} position={[0, 2.45, 0.05]}><sphereGeometry args={[0.3, 8, 6]} /></mesh>
      <mesh material={EYE} position={[-0.1, 2.5, 0.3]}><sphereGeometry args={[0.04, 4, 3]} /></mesh>
      <mesh material={EYE} position={[0.1, 2.5, 0.3]}><sphereGeometry args={[0.04, 4, 3]} /></mesh>
      {/* legs */}
      <mesh material={SKIN_DARK} position={[-0.28, 0.5, 0]}><capsuleGeometry args={[0.16, 0.8, 2, 6]} /></mesh>
      <mesh material={SKIN_DARK} position={[0.28, 0.5, 0]}><capsuleGeometry args={[0.16, 0.8, 2, 6]} /></mesh>
      {/* left arm */}
      <mesh material={SKIN} position={[-0.7, 1.5, 0.15]} rotation={[0.6, 0, 0.3]}><capsuleGeometry args={[0.13, 0.9, 2, 6]} /></mesh>
      {/* right arm fused into a rusted anchor, dragged behind */}
      <group ref={arm} position={[0.7, 1.9, 0]}>
        <mesh material={SKIN} position={[0, -0.5, 0.1]} rotation={[0.4, 0, -0.2]}><capsuleGeometry args={[0.17, 0.8, 2, 6]} /></mesh>
        <group position={[0.1, -1.1, -0.6]}>
          <mesh material={ANCHOR}><cylinderGeometry args={[0.09, 0.09, 1.6, 6]} /></mesh>
          <mesh material={ANCHOR} position={[0, -0.8, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.45, 0.09, 6, 12, Math.PI]} /></mesh>
          <mesh material={ANCHOR} position={[-0.45, -0.72, 0]} rotation={[0, 0, 0.6]}><coneGeometry args={[0.14, 0.4, 5]} /></mesh>
          <mesh material={ANCHOR} position={[0.45, -0.72, 0]} rotation={[0, 0, -0.6]}><coneGeometry args={[0.14, 0.4, 5]} /></mesh>
          <mesh material={ANCHOR} position={[0, 0.85, 0]}><torusGeometry args={[0.14, 0.05, 5, 10]} /></mesh>
        </group>
      </group>
    </group>
  );
};
export default VillageExecutioner;
