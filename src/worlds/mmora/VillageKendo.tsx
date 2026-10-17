/**
 * Kendo, the Watch scout (Part 13): a young field agent posted near the
 * sunken docks once the Church Medallion is taken. Dark-green combat vest,
 * knee pads, earpiece. Use near him to hear his briefing (male voice),
 * once per visit.
 */
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { useGear } from '@/lib/vrGear';
import { logStory } from '@/lib/vrStoryline';
import { playerSpot } from './VillageVillagers';

const VEST = new THREE.MeshStandardMaterial({ color: '#2e4030', roughness: 0.9 });
const CLOTH = new THREE.MeshStandardMaterial({ color: '#3a3f36', roughness: 1 });
const SKIN = new THREE.MeshStandardMaterial({ color: '#c9a081', roughness: 0.8 });
const POS = { x: -14, z: -78 }; // top of the main pier

const LINES = [
  'Kendo: Docks are rotting through — watch your footing past the shoreline.',
  'Kendo: The Drowned spit saltwater bile from a few metres out. Keep moving.',
  'Kendo: Hear metal dragging on stone near the old sanatorium? Run.',
];

export const VillageKendo: React.FC = () => (useGear().includes('medallion') ? <Kendo /> : null);

const Kendo: React.FC = () => {
  const { camera } = useThree();
  const said = useRef(0);
  const g = useRef<THREE.Group>(null);
  useEffect(() => registerUse(() => {
    const ps = playerSpot(camera);
    const d = Math.hypot(ps.x - POS.x, ps.z - POS.z);
    if (d > 3) return null;
    return { dist: d * 0.4, reach: 3, label: 'Talk to Kendo', run: () => {
      const line = LINES[Math.min(said.current, LINES.length - 1)];
      said.current += 1;
      window.dispatchEvent(new CustomEvent('vr-toast', { detail: line }));
      void import('@/utils/deepgramTTS').then((m) => m.speakWithDeepgram(line, { voice: 'male' } as never)).catch(() => {});
      logStory('npc', 'kendo');
    } };
  }), [camera]);
  useFrame(({ clock }) => { const grp = g.current; if (grp) grp.rotation.y = Math.sin(clock.elapsedTime * 0.4) * 0.4 + 0.6; });
  return (
    <group ref={g} position={[POS.x, 0, POS.z]}>
      <mesh material={CLOTH} position={[0, 0.55, 0]}><capsuleGeometry args={[0.16, 0.7, 2, 6]} /></mesh>
      <mesh material={VEST} position={[0, 1.25, 0]}><capsuleGeometry args={[0.24, 0.55, 3, 8]} /></mesh>
      <mesh material={SKIN} position={[0, 1.85, 0]}><sphereGeometry args={[0.17, 8, 6]} /></mesh>
      {/* earpiece */}
      <mesh material={CLOTH} position={[0.16, 1.88, 0]}><sphereGeometry args={[0.03, 4, 3]} /></mesh>
      {/* knee pads */}
      <mesh material={VEST} position={[-0.12, 0.35, 0.12]}><sphereGeometry args={[0.07, 5, 4]} /></mesh>
      <mesh material={VEST} position={[0.12, 0.35, 0.12]}><sphereGeometry args={[0.07, 5, 4]} /></mesh>
    </group>
  );
};
export default VillageKendo;
