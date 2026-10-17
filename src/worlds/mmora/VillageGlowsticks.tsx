/**
 * Green emergency glowsticks (Part 13): crackling green light sticks left in
 * the church and castle interiors, where the diesel power doesn't reach.
 * Emissive meshes only — no extra dynamic lights, so the light budget stays
 * fixed. A faint green floor pool under each stick sells the glow.
 */
import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const STICK = new THREE.MeshStandardMaterial({ color: '#1d3a24', emissive: '#57e07a', emissiveIntensity: 1.6, roughness: 0.4 });
const POOL = new THREE.MeshBasicMaterial({ color: '#3fae5a', transparent: true, opacity: 0.14, depthWrite: false });

// church interior (altar near -14,-59) and castle ground-floor rooms (near -70,4)
const SPOTS: [number, number, number, number][] = [
  [-12.5, 1.2, -57.5, 0.4], [-15.5, 1.2, -61, 2.2], [-14, 0.6, -55.5, 1.1],
  [-68, 1.1, 2, 0.8], [-72, 1.1, 6, 2.8], [-66.5, 0.5, 6.5, 1.9],
];

export const VillageGlowsticks: React.FC = () => {
  useFrame(({ clock }) => { STICK.emissiveIntensity = 1.4 + Math.sin(clock.elapsedTime * 7) * 0.15 + Math.sin(clock.elapsedTime * 23) * 0.1; }); // crackle
  return (
    <group>
      {SPOTS.map(([x, y, z, r], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, r, 0]}>
          <mesh material={STICK} rotation={[0, 0, 1.2]}><cylinderGeometry args={[0.02, 0.02, 0.22, 5]} /></mesh>
          <mesh material={POOL} rotation={[-Math.PI / 2, 0, 0]} position={[0, -y + 0.03, 0]}><circleGeometry args={[1.1, 16]} /></mesh>
        </group>
      ))}
    </group>
  );
};
export default VillageGlowsticks;
