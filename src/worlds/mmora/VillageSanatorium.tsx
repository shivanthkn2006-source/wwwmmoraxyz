/**
 * The Sanatorium Complex (Part 13): an abandoned 1950s brutalist medical
 * block built into the rise behind the castle. Long cracked concrete wings,
 * rows of dark windows (a few flickering on the diesel-generator schedule),
 * and reinforced observation cells whose glass bulges with glowing fungal
 * growths. Scenery only — no layout changes, fixed light count.
 */
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { registerLit } from '@/lib/vrLights';

const CONCRETE = new THREE.MeshStandardMaterial({ color: '#5a5c58', roughness: 0.95 });
const CONCRETE_DARK = new THREE.MeshStandardMaterial({ color: '#464843', roughness: 1 });
const MOSS = new THREE.MeshStandardMaterial({ color: '#33402a', roughness: 1 });
const GLASS_DARK = new THREE.MeshStandardMaterial({ color: '#14181a', roughness: 0.4, metalness: 0.3 });
// a few windows flicker on the building-lights schedule (17:54–22:00 local)
const GLASS_LIT = registerLit(new THREE.MeshStandardMaterial({ color: '#1c1a12', emissive: '#cfe08a' }), 1.4, 'building');
const FUNGUS = new THREE.MeshStandardMaterial({ color: '#22472c', emissive: '#4fd06a', emissiveIntensity: 0.7, roughness: 0.7 });

const rand = (s: number) => { const x = Math.sin(s * 91.7) * 43758.5453; return x - Math.floor(x); };

/** One concrete wing: slab body, window rows, moss streaks, a bulging cell. */
const Wing: React.FC<{ x: number; z: number; w: number; h: number; d: number; rot?: number; seed: number }> = ({ x, z, w, h, d, rot = 0, seed }) => {
  const windows = useMemo(() => {
    const cols = Math.floor(w / 2.4), rows = Math.floor(h / 2.6);
    const out: { x: number; y: number; lit: boolean }[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
      out.push({ x: -w / 2 + 1.4 + c * 2.4, y: 1.8 + r * 2.6, lit: rand(seed + r * 13 + c * 7) > 0.82 });
    return out;
  }, [w, h, seed]);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh material={CONCRETE} position={[0, h / 2, 0]}><boxGeometry args={[w, h, d]} /></mesh>
      <mesh material={CONCRETE_DARK} position={[0, h + 0.15, 0]}><boxGeometry args={[w + 0.5, 0.3, d + 0.5]} /></mesh>
      {windows.map((wd, i) => (
        <mesh key={i} material={wd.lit ? GLASS_LIT : GLASS_DARK} position={[wd.x, wd.y, d / 2 + 0.03]}>
          <boxGeometry args={[1.1, 1.4, 0.06]} />
        </mesh>
      ))}
      {/* moss streaks down the facade */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} material={MOSS} position={[-w / 2 + 2 + rand(seed + i) * (w - 4), h * 0.35, d / 2 + 0.04]}>
          <boxGeometry args={[0.7 + rand(i) * 0.8, h * 0.6, 0.04]} />
        </mesh>
      ))}
      {/* observation cell: glass bulging with fungal growth */}
      <group position={[w / 2 - 2, 1.6, d / 2 + 0.05]}>
        <mesh material={GLASS_DARK}><boxGeometry args={[2, 2.4, 0.08]} /></mesh>
        <mesh material={FUNGUS} position={[0.3, 0.2, 0.25]} scale={[1, 1.2, 0.7]}><sphereGeometry args={[0.7, 8, 6]} /></mesh>
        <mesh material={FUNGUS} position={[-0.5, -0.5, 0.2]} scale={[1, 0.8, 0.6]}><sphereGeometry args={[0.45, 7, 6]} /></mesh>
      </group>
    </group>
  );
};

/** Fungus shimmer, shared material. */
const FungusPulse: React.FC = () => {
  useFrame(({ clock }) => { FUNGUS.emissiveIntensity = 0.55 + Math.sin(clock.elapsedTime * 0.9) * 0.25; });
  return null;
};

export const VillageSanatorium: React.FC = () => (
  <group>
    <FungusPulse />
    {/* built into the rise behind the castle (castle sits near x=-70) */}
    <Wing x={-96} z={-24} w={22} h={9} d={8} rot={0.35} seed={3} />
    <Wing x={-104} z={-6} w={16} h={7} d={7} rot={0.9} seed={17} />
    {/* rusted surgical chair left on the overgrown drive */}
    <group position={[-88, 0, -14]} rotation={[0, 0.7, 0]}>
      <mesh material={CONCRETE_DARK} position={[0, 0.5, 0]} rotation={[-0.4, 0, 0]}><boxGeometry args={[0.7, 0.08, 1.6]} /></mesh>
      <mesh material={CONCRETE_DARK} position={[0, 0.25, 0.6]}><boxGeometry args={[0.5, 0.5, 0.1]} /></mesh>
    </group>
  </group>
);
export default VillageSanatorium;
