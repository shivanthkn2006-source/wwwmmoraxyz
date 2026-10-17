/**
 * Valerie Wright, bio-security specialist (Part 14, M'Mora telling): posted
 * at the quarantine checkpoint after the Crest is taken. Black urban-tactical
 * jumpsuit with forearm plating. Use near her for spoken briefings; her field
 * log is saved to Files the first time you talk.
 */
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { useGear } from '@/lib/vrGear';
import { logStory } from '@/lib/vrStoryline';
import { playerSpot } from './VillageVillagers';

const SUIT = new THREE.MeshStandardMaterial({ color: '#1c1e22', roughness: 0.85 });
const PLATE = new THREE.MeshStandardMaterial({ color: '#2e3238', roughness: 0.5, metalness: 0.4 });
const SKIN = new THREE.MeshStandardMaterial({ color: '#b98a68', roughness: 0.8 });
const POS = { x: 82, z: -16 }; // by the checkpoint

const LINES = [
  'Valerie: The perimeter is a suggestion, not a wall. The Feral drop from the branches — watch the trees, not the ground.',
  'Valerie: Something pale is living in the old outpost cavern. It makes no sound. None at all.',
  'Valerie: Mix a chemical reagent with two green herbs and you get a full antiviral serum. Use the case.',
];

export const VillageValerie: React.FC = () => (useGear().includes('crest') ? <Val /> : null);

const Val: React.FC = () => {
  const { camera } = useThree();
  const said = useRef(0);
  const g = useRef<THREE.Group>(null);
  useEffect(() => registerUse(() => {
    const ps = playerSpot(camera);
    const d = Math.hypot(ps.x - POS.x, ps.z - POS.z);
    if (d > 3) return null;
    return { dist: d * 0.4, reach: 3, label: 'Talk to Valerie', run: () => {
      if (said.current === 0) void import('@/lib/vrStory').then((s) => s.readNote('log_valerie'));
      if (said.current === 1) void import('@/lib/vrStory').then((s) => s.readNote('log_leon')); // the veteran's memo, passed on second talk
      const line = LINES[Math.min(said.current, LINES.length - 1)];
      said.current += 1;
      window.dispatchEvent(new CustomEvent('vr-toast', { detail: line }));
      void import('@/utils/deepgramTTS').then((m) => m.speakWithDeepgram(line)).catch(() => {});
      logStory('npc', 'valerie');
    } };
  }), [camera]);
  useFrame(({ clock }) => { const grp = g.current; if (grp) grp.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.5 - 0.8; });
  return (
    <group ref={g} position={[POS.x, 0, POS.z]}>
      <mesh material={SUIT} position={[0, 0.55, 0]}><capsuleGeometry args={[0.15, 0.7, 2, 6]} /></mesh>
      <mesh material={SUIT} position={[0, 1.25, 0]}><capsuleGeometry args={[0.22, 0.55, 3, 8]} /></mesh>
      <mesh material={SKIN} position={[0, 1.82, 0]}><sphereGeometry args={[0.16, 8, 6]} /></mesh>
      {/* carbon-fiber forearm plating */}
      <mesh material={PLATE} position={[-0.3, 1.1, 0.08]} rotation={[0.4, 0, 0.2]}><capsuleGeometry args={[0.06, 0.3, 2, 5]} /></mesh>
      <mesh material={PLATE} position={[0.3, 1.1, 0.08]} rotation={[0.4, 0, -0.2]}><capsuleGeometry args={[0.06, 0.3, 2, 5]} /></mesh>
      {/* shin plating */}
      <mesh material={PLATE} position={[-0.1, 0.3, 0.08]}><boxGeometry args={[0.09, 0.3, 0.05]} /></mesh>
      <mesh material={PLATE} position={[0.1, 0.3, 0.08]}><boxGeometry args={[0.09, 0.3, 0.05]} /></mesh>
    </group>
  );
};
export default VillageValerie;
