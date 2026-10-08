/**
 * Sea life off the M'Mora beach: rolling waves, a few fish that swim up when
 * you stand at the shore, dolphins leaping in arcs and a whale that breaches
 * now and then far out (visible from the beach). ~10 meshes, no downloads.
 */
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SHORE_Z } from './MMoraBeach';

const DOLPHIN = new THREE.MeshStandardMaterial({ color: '#5d6f7f', roughness: 0.35 });
const WHALE = new THREE.MeshStandardMaterial({ color: '#2c3540', roughness: 0.5 });
const FISH = new THREE.MeshStandardMaterial({ color: '#c9a64a', roughness: 0.4, metalness: 0.3 });
const SPRAY = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false });

/** Body + fin + tail, facing +x. */
const Swimmer: React.FC<{ m: THREE.Material; len: number }> = ({ m, len }) => (
  <group>
    <mesh material={m} scale={[len, len * 0.28, len * 0.3]}><sphereGeometry args={[0.5, 12, 8]} /></mesh>
    <mesh material={m} position={[0, len * 0.16, 0]} rotation={[0, 0, -0.5]}><coneGeometry args={[len * 0.06, len * 0.18, 4]} /></mesh>
    <mesh material={m} position={[-len * 0.52, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.25]}><coneGeometry args={[len * 0.14, len * 0.16, 3]} /></mesh>
  </group>
);

const Leaper: React.FC<{ x: number; z: number; len: number; m: THREE.Material; period: number; height: number; span: number; offset: number }> = ({ x, z, len, m, period, height, span, offset }) => {
  const g = useRef<THREE.Group>(null), sp = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const o = g.current; if (!o) return;
    const t = ((clock.elapsedTime + offset) % period) / period; // 0..1
    const jump = t < 0.25 ? t / 0.25 : -1; // leap during first quarter
    if (jump >= 0) {
      o.visible = true;
      o.position.set(x + (jump - 0.5) * span, Math.sin(jump * Math.PI) * height - len * 0.1, z);
      o.rotation.z = Math.cos(jump * Math.PI) * 0.9; // nose up then down
    } else o.visible = false;
    if (sp.current) { const s = jump >= 0 && (jump < 0.12 || jump > 0.88) ? 1 : 0; sp.current.visible = s > 0; sp.current.position.set(o.position.x, 0.3, z); }
  });
  return (<>
    <group ref={g}><Swimmer m={m} len={len} /></group>
    <mesh ref={sp} material={SPRAY}><sphereGeometry args={[len * 0.35, 8, 6]} /></mesh>
  </>);
};

const Fish: React.FC<{ i: number }> = ({ i }) => {
  const g = useRef<THREE.Group>(null); const { camera } = useThree();
  const a = useRef(i * 2.1);
  useFrame((_, dt) => {
    const o = g.current; if (!o) return;
    const near = camera.position.z < SHORE_Z + 8; // standing at the water's edge
    o.visible = near; if (!near) return;
    a.current += dt * (0.6 + i * 0.1);
    const cx = camera.position.x, cz = SHORE_Z - 4;
    o.position.set(cx + Math.cos(a.current) * (2 + i * 0.6), -0.05, cz + Math.sin(a.current) * 1.5);
    o.rotation.y = -a.current - Math.PI / 2;
  });
  return <group ref={g}><Swimmer m={FISH} len={0.35} /></group>;
};

export const SeaLife: React.FC = () => {
  const waves = useMemo(() => new THREE.PlaneGeometry(400, 60, 80, 12), []);
  const base = useMemo(() => Float32Array.from(waves.attributes.position.array), [waves]);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const p = waves.attributes.position as THREE.BufferAttribute, t = clock.elapsedTime;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      p.setZ(i, Math.sin(x * 0.12 + t * 1.3) * 0.12 + Math.sin(y * 0.35 + t * 1.9) * 0.1);
    }
    p.needsUpdate = true;
  });
  return (
    <group>
      {/* rolling near-shore waves over the flat sea */}
      <mesh ref={ref} geometry={waves} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, SHORE_Z - 30]}>
        <meshStandardMaterial color="#3a86ad" roughness={0.2} metalness={0.25} transparent opacity={0.85} />
      </mesh>
      {[0, 1, 2].map((i) => <Fish key={i} i={i} />)}
      <Leaper x={-30} z={SHORE_Z - 40} len={2.2} m={DOLPHIN} period={4} height={3} span={9} offset={0} />
      <Leaper x={-24} z={SHORE_Z - 44} len={2} m={DOLPHIN} period={4} height={2.6} span={8} offset={0.5} />
      <Leaper x={35} z={SHORE_Z - 55} len={2.1} m={DOLPHIN} period={5} height={3.2} span={9} offset={1.7} />
      <Leaper x={10} z={SHORE_Z - 120} len={14} m={WHALE} period={14} height={6} span={10} offset={3} />
    </group>
  );
};
