/**
 * The Quarantine Perimeter (Part 14, M'Mora telling): a rusted chain-link
 * fence line with razor wire and an abandoned military checkpoint at the
 * forest edge east of the village, overgrown with vines. Scenery only —
 * instanced/merged meshes, no layout changes.
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';

const POST = new THREE.MeshStandardMaterial({ color: '#3a3d3a', roughness: 0.8, metalness: 0.5 });
const MESH_WIRE = new THREE.MeshStandardMaterial({ color: '#4a4d48', roughness: 0.7, metalness: 0.6, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
const RAZOR = new THREE.MeshStandardMaterial({ color: '#5a5d55', roughness: 0.5, metalness: 0.7 });
const VINE = new THREE.MeshStandardMaterial({ color: '#2c4426', roughness: 1 });
const TARP = new THREE.MeshStandardMaterial({ color: '#4a4436', roughness: 1 });
const rand = (s: number) => { const x = Math.sin(s * 57.3) * 43758.5453; return x - Math.floor(x); };

/** One fence run: posts, chain-link panel, razor wire coil, vines. */
const FenceRun: React.FC<{ x: number; z: number; len: number; rot?: number; seed: number }> = ({ x, z, len, rot = 0, seed }) => {
  const posts = useMemo(() => Array.from({ length: Math.floor(len / 2.5) + 1 }, (_, i) => i * 2.5), [len]);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {posts.map((px, i) => (
        <mesh key={i} material={POST} position={[px, 1.1, 0]} rotation={[0, 0, (rand(seed + i) - 0.5) * 0.08]}>
          <cylinderGeometry args={[0.05, 0.06, 2.2, 5]} />
        </mesh>
      ))}
      <mesh material={MESH_WIRE} position={[len / 2, 1.05, 0]}><planeGeometry args={[len, 1.9, 8, 2]} /></mesh>
      {/* razor wire coil along the top */}
      {posts.slice(0, -1).map((px, i) => (
        <mesh key={i} material={RAZOR} position={[px + 1.25, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.02, 4, 8]} />
        </mesh>
      ))}
      {/* overgrown vines */}
      {Array.from({ length: Math.floor(len / 4) }, (_, i) => (
        <mesh key={i} material={VINE} position={[rand(seed + i * 3) * len, 0.8 + rand(i) * 0.8, 0.05]} rotation={[0, 0, (rand(i + seed) - 0.5) * 0.6]}>
          <boxGeometry args={[0.18, 1.6 + rand(i + 2), 0.06]} />
        </mesh>
      ))}
    </group>
  );
};

/** Abandoned checkpoint: guard hut, barrier arm, sandbags, tarp roof. */
const Checkpoint: React.FC<{ x: number; z: number; rot?: number }> = ({ x, z, rot = 0 }) => (
  <group position={[x, 0, z]} rotation={[0, rot, 0]}>
    <mesh material={POST} position={[0, 1.1, 0]}><boxGeometry args={[2.2, 2.2, 2]} /></mesh>
    <mesh material={TARP} position={[0, 2.35, 0]} rotation={[0, 0, 0.06]}><boxGeometry args={[2.8, 0.08, 2.6]} /></mesh>
    <mesh material={MESH_WIRE} position={[0, 1.3, 1.02]}><planeGeometry args={[1.2, 0.9]} /></mesh>
    {/* fallen barrier arm */}
    <mesh material={RAZOR} position={[2.6, 0.25, 1.2]} rotation={[0, 0.3, 0.12]}><boxGeometry args={[3.4, 0.09, 0.09]} /></mesh>
    {/* sandbags */}
    {[0, 1, 2, 3, 4].map((i) => (
      <mesh key={i} material={TARP} position={[-1.6 + (i % 3) * 0.55, 0.18 + Math.floor(i / 3) * 0.3, 1.4]} rotation={[0, rand(i) * 3, 0]}>
        <capsuleGeometry args={[0.18, 0.35, 2, 6]} />
      </mesh>
    ))}
  </group>
);

export const VillageQuarantine: React.FC = () => (
  <group>
    {/* fence line sealing the forest edge east of the village */}
    <FenceRun x={86} z={-40} len={40} rot={0.15} seed={5} />
    <FenceRun x={88} z={2} len={36} rot={-0.1} seed={21} />
    <Checkpoint x={84} z={-18} rot={-0.4} />
  </group>
);
export default VillageQuarantine;
