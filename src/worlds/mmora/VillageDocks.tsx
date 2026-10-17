/**
 * The Sunken Fishing Village (Part 13): rotting wooden stilt docks reaching
 * into the black bay past the shoreline, a collapsed pier section, a rusted
 * ship hull jutting from the shallows, and slick green mould glowing on the
 * posts. Pure scenery — instanced/merged meshes, no layout changes.
 */
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SHORE_Z } from './MMoraBeach';

const WOOD = new THREE.MeshStandardMaterial({ color: '#33291f', roughness: 0.95 });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: '#241d16', roughness: 1 });
const RUST = new THREE.MeshStandardMaterial({ color: '#4d2f1e', roughness: 0.9, metalness: 0.35 });
const MOLD = new THREE.MeshStandardMaterial({ color: '#1c3a24', emissive: '#3fae5a', emissiveIntensity: 0.55, roughness: 0.8 });
const rand = (s: number) => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };

/** One dock walkway on stilts; planks with gaps, posts into the water. */
const Dock: React.FC<{ x: number; z: number; len: number; rot?: number; broken?: boolean }> = ({ x, z, len, rot = 0, broken = false }) => {
  const planks = useMemo(() => {
    const n = Math.floor(len / 0.9);
    return Array.from({ length: n }, (_, i) => {
      if (broken && i > n * 0.55 && rand(i + x) > 0.45) return null; // collapsed section: missing planks
      const tilt = broken && i > n * 0.5 ? (rand(i) - 0.5) * 0.5 : (rand(i + 3) - 0.5) * 0.06;
      return { z: i * 0.9, tilt, sink: broken && i > n * 0.55 ? rand(i + 7) * 0.35 : 0 };
    }).filter(Boolean) as { z: number; tilt: number; sink: number }[];
  }, [len, broken, x]);
  const posts = useMemo(() => Array.from({ length: Math.floor(len / 2.2) + 1 }, (_, i) => i * 2.2), [len]);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {planks.map((p, i) => (
        <mesh key={i} material={i % 3 ? WOOD : WOOD_DARK} position={[0, 0.55 - p.sink, p.z]} rotation={[p.tilt, 0, (rand(i + 11) - 0.5) * 0.08]}>
          <boxGeometry args={[1.7, 0.07, 0.8]} />
        </mesh>
      ))}
      {posts.map((pz, i) => (
        <group key={i}>
          <mesh material={WOOD_DARK} position={[-0.75, 0, pz]}><cylinderGeometry args={[0.09, 0.11, 1.6, 5]} /></mesh>
          <mesh material={WOOD_DARK} position={[0.75, 0, pz]}><cylinderGeometry args={[0.09, 0.11, 1.6, 5]} /></mesh>
          {/* glowing mould clumps on the waterline posts */}
          {i % 2 === 0 && <mesh material={MOLD} position={[-0.75, 0.25, pz + 0.1]}><sphereGeometry args={[0.14, 6, 5]} /></mesh>}
        </group>
      ))}
    </group>
  );
};

/** Rusted ship hull jutting out of the shallows, heeled over. */
const Hull: React.FC<{ x: number; z: number; rot: number }> = ({ x, z, rot }) => (
  <group position={[x, 0.1, z]} rotation={[0.12, rot, 0.22]}>
    <mesh material={RUST} position={[0, 1, 0]}><cylinderGeometry args={[1.6, 2.2, 7, 8, 1, true, 0, Math.PI]} /></mesh>
    <mesh material={RUST} position={[0, 2.2, -2.6]} rotation={[0.5, 0, 0]}><boxGeometry args={[0.18, 3.4, 0.18]} /></mesh>
    <mesh material={MOLD} position={[0.8, 0.7, 1.2]}><sphereGeometry args={[0.35, 7, 6]} /></mesh>
    <mesh material={MOLD} position={[-0.9, 0.5, -1]}><sphereGeometry args={[0.28, 7, 6]} /></mesh>
  </group>
);

/** Slow green mould shimmer so the slick growth reads as alive. */
const MoldPulse: React.FC = () => {
  useFrame(({ clock }) => { MOLD.emissiveIntensity = 0.45 + Math.sin(clock.elapsedTime * 1.3) * 0.2; });
  return null;
};

export const VillageDocks: React.FC = () => {
  const z0 = SHORE_Z - 2;
  return (
    <group>
      <MoldPulse />
      {/* main pier and two side docks, one collapsed */}
      <Dock x={-18} z={z0} len={16} />
      <Dock x={-26} z={z0 - 6} len={10} rot={0.5} broken />
      <Dock x={-9} z={z0 - 4} len={9} rot={-0.4} />
      <Hull x={-32} z={z0 - 14} rot={0.8} />
      <Hull x={6} z={z0 - 22} rot={-1.9} />
      {/* scattered barrels and crates on the main pier */}
      {[[-18.5, z0 - 3], [-17.4, z0 - 8], [-18.2, z0 - 12]].map(([x, z], i) => (
        <mesh key={i} material={i % 2 ? RUST : WOOD_DARK} position={[x, 0.85, z]}><cylinderGeometry args={[0.32, 0.36, 0.7, 8]} /></mesh>
      ))}
    </group>
  );
};
export default VillageDocks;
