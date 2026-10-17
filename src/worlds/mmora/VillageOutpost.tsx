/**
 * The Overgrown Research Outpost (Part 14, M'Mora telling): a long-lost
 * auxiliary lab hidden in the rocky rise past the sanatorium. Rusting
 * catwalk over a dark chasm, shattered containment pods, and a damp
 * cleanroom shell. Scenery only, emissive accents, fixed light budget.
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';

const ROCK = new THREE.MeshStandardMaterial({ color: '#3c3a36', roughness: 1 });
const RUST_METAL = new THREE.MeshStandardMaterial({ color: '#4a3626', roughness: 0.8, metalness: 0.5 });
const POD_GLASS = new THREE.MeshStandardMaterial({ color: '#1a2a26', roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.7 });
const POD_GLOW = new THREE.MeshStandardMaterial({ color: '#16301c', emissive: '#46c46a', emissiveIntensity: 0.8, roughness: 0.5 });
const DUST = new THREE.MeshStandardMaterial({ color: '#6a675e', roughness: 1 });
const rand = (s: number) => { const x = Math.sin(s * 77.7) * 43758.5453; return x - Math.floor(x); };

export const VillageOutpost: React.FC = () => {
  const pods = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ x: -118 + (i % 3) * 2.2, z: -34 + Math.floor(i / 3) * 2.4, broken: rand(i) > 0.5, glow: rand(i + 9) > 0.6 })), []);
  return (
    <group>
      {/* cavern mouth in the rise */}
      <mesh material={ROCK} position={[-116, 3, -30]} rotation={[0, 0.4, 0]}><sphereGeometry args={[7, 10, 8]} /></mesh>
      <mesh material={ROCK} position={[-112, 2, -26]}><sphereGeometry args={[4.5, 8, 7]} /></mesh>
      {/* catwalk over the dark chasm */}
      <mesh material={RUST_METAL} position={[-116, 1.4, -30]} rotation={[0, 0.5, 0]}><boxGeometry args={[10, 0.12, 1.4]} /></mesh>
      {[-4, -1.5, 1, 3.5].map((o, i) => (
        <mesh key={i} material={RUST_METAL} position={[-116 + o * Math.cos(0.5), 0.7, -30 - o * Math.sin(0.5)]}>
          <cylinderGeometry args={[0.06, 0.08, 1.4, 5]} />
        </mesh>
      ))}
      {/* chasm: dark pit plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-116, 0.02, -30]}>
        <circleGeometry args={[6, 20]} />
        <meshBasicMaterial color="#05070a" />
      </mesh>
      {/* shattered containment pods */}
      {pods.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, rand(i) * 3, p.broken ? 0.5 : 0]}>
          <mesh material={p.glow ? POD_GLOW : POD_GLASS} position={[0, 1, 0]}>
            <capsuleGeometry args={[0.55, 1.4, 4, 10]} />
          </mesh>
          <mesh material={DUST} position={[0, 0.1, 0]}><cylinderGeometry args={[0.7, 0.8, 0.2, 10]} /></mesh>
          {p.broken && <mesh material={POD_GLASS} position={[0.8, 0.15, 0.4]} rotation={[1.2, 0, 0.6]}><sphereGeometry args={[0.3, 6, 5]} /></mesh>}
        </group>
      ))}
      {/* cleanroom shell: half-buried office block */}
      <mesh material={DUST} position={[-122, 1.2, -24]} rotation={[0, 0.7, 0]}><boxGeometry args={[5, 2.4, 4]} /></mesh>
      {/* flooded lower server room: hip-deep black water and dead server racks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-122, 0.35, -24]}>
        <planeGeometry args={[4.4, 3.4]} />
        <meshStandardMaterial color="#0a1414" roughness={0.15} metalness={0.4} transparent opacity={0.9} />
      </mesh>
      {[[-123.2, -25], [-120.8, -25], [-123.2, -23], [-120.8, -23]].map(([x, z], i) => (
        <mesh key={i} material={RUST_METAL} position={[x, 0.9, z]} rotation={[0, rand(i) * 0.4, (rand(i + 3) - 0.5) * 0.15]}>
          <boxGeometry args={[0.6, 1.8, 0.4]} />
        </mesh>
      ))}
    </group>
  );
};
export default VillageOutpost;
