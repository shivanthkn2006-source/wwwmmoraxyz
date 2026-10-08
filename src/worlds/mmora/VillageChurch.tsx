/**
 * M'Mora Village stone church you can walk into: bell tower with spire at the
 * front, an oak door (opens with the Use / door symbol), and inside a nave
 * with stone floor, red aisle runner, two rows of pews, stained-glass windows,
 * a rose window and a raised altar with cross and candles.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';

const CZ = -86; // church centre (world z)
const W = 10, L = 18, H = 8, T = 0.35;

function glassTex(seed: number) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d')!;
  const cols = ['#b3202a', '#1f4fa8', '#e0b23a', '#2e8a4a', '#7a3aa0'];
  for (let y = 0; y < 128; y += 16) for (let x = 0; x < 64; x += 16) { g.fillStyle = cols[(x / 16 + y / 16 + seed) % 5]; g.fillRect(x, y, 16, 16); }
  g.strokeStyle = '#151515'; g.lineWidth = 2;
  for (let i = 0; i <= 128; i += 16) { g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); }
  g.fillStyle = '#f2e6c0'; g.beginPath(); g.arc(32, 40, 10, 0, 7); g.fill(); // halo
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const M = {
  stone: new THREE.MeshStandardMaterial({ color: '#77736c', roughness: 0.95 }),
  slate: new THREE.MeshStandardMaterial({ color: '#3d3f44', roughness: 0.8 }),
  floor: new THREE.MeshStandardMaterial({ color: '#5a554e', roughness: 0.9 }),
  oak: new THREE.MeshStandardMaterial({ color: '#4a2f1a', roughness: 0.7 }),
  runner: new THREE.MeshStandardMaterial({ color: '#6e1a1a', roughness: 1 }),
  altar: new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.6 }),
  gold: new THREE.MeshStandardMaterial({ color: '#c9a050', metalness: 0.85, roughness: 0.3 }),
  cloth: new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 0.9 }),
  flame: new THREE.MeshBasicMaterial({ color: '#ffd27a' }),
};
const GLASS = [0, 1, 2].map((s) => new THREE.MeshStandardMaterial({ map: glassTex(s), emissive: '#ffffff', emissiveMap: glassTex(s), emissiveIntensity: 0.55, side: THREE.DoubleSide }));

const B: React.FC<{ m: THREE.Material; p: [number, number, number]; s: [number, number, number]; r?: [number, number, number] }> = ({ m, p, s, r }) => (
  <mesh material={m} position={p} rotation={r}><boxGeometry args={s} /></mesh>
);

const Pew: React.FC = () => (
  <group>
    <B m={M.oak} p={[0, 0.45, 0]} s={[3, 0.07, 0.42]} />
    <B m={M.oak} p={[0, 0.8, -0.2]} s={[3, 0.6, 0.06]} />
    {[-1.45, 1.45].map((x) => <B key={x} m={M.oak} p={[x, 0.45, 0]} s={[0.07, 0.9, 0.5]} />)}
  </group>
);

const Candle: React.FC<{ p: [number, number, number] }> = ({ p }) => (
  <group position={p}>
    <mesh material={M.gold} position={[0, 0.2, 0]}><cylinderGeometry args={[0.03, 0.06, 0.4, 8]} /></mesh>
    <mesh material={M.cloth} position={[0, 0.5, 0]}><cylinderGeometry args={[0.025, 0.025, 0.2, 6]} /></mesh>
    <mesh material={M.flame} position={[0, 0.63, 0]}><coneGeometry args={[0.02, 0.06, 5]} /></mesh>
  </group>
);

export const VillageChurch: React.FC = () => {
  const { camera } = useThree();
  const [open, setOpen] = useState(false);
  const door = useRef<THREE.Group>(null);
  const doorPos = useMemo(() => new THREE.Vector3(0, 0, CZ + L / 2 + 2.5 + 3), []); // in front of the tower door
  useFrame((_, dt) => { if (door.current) door.current.rotation.y = THREE.MathUtils.damp(door.current.rotation.y, open ? -1.7 : 0, 4, dt); });
  useEffect(() => registerUse(() => {
    const d = Math.hypot(camera.position.x - doorPos.x, camera.position.z - doorPos.z);
    return { dist: d, reach: 3.5, label: open ? 'Close the church door' : 'Open the church door', run: () => setOpen((v) => !v) };
  }), [camera, doorPos, open]);

  return (
    <group position={[0, 0, CZ]}>
      {/* Nave: hollow stone walls, roof, floor */}
      <B m={M.floor} p={[0, 0.03, 0]} s={[W, 0.06, L]} />
      <B m={M.stone} p={[-W / 2, H / 2, 0]} s={[T, H, L]} />
      <B m={M.stone} p={[W / 2, H / 2, 0]} s={[T, H, L]} />
      <B m={M.stone} p={[0, H / 2, -L / 2]} s={[W, H, T]} />
      {/* front wall with a doorway into the tower */}
      <B m={M.stone} p={[-3.25, H / 2, L / 2]} s={[3.5, H, T]} />
      <B m={M.stone} p={[3.25, H / 2, L / 2]} s={[3.5, H, T]} />
      <B m={M.stone} p={[0, H - 2.25, L / 2]} s={[3, 4.5, T]} />
      <B m={M.slate} p={[0, H + 2, 0]} s={[5.4, 5.4, L + 0.6]} r={[0, 0, Math.PI / 4]} />
      <B m={M.stone} p={[0, H - 0.1, 0]} s={[W, 0.2, L]} />
      {/* Bell tower (hollow at the bottom) with spire */}
      <group position={[0, 0, L / 2 + 2.5]}>
        {[-1, 1].map((sx) => <B key={sx} m={M.stone} p={[sx * 2.35, 9, 0]} s={[T, 18, 5]} />)}
        <B m={M.stone} p={[0, 11, -2.35]} s={[5, 14, T]} />
        <B m={M.stone} p={[-1.75, 9, 2.35]} s={[1.5, 18, T]} />
        <B m={M.stone} p={[1.75, 9, 2.35]} s={[1.5, 18, T]} />
        <B m={M.stone} p={[0, 11, 2.35]} s={[2, 14, T]} />
        <B m={M.stone} p={[0, 18.1, 0]} s={[5, 0.3, 5]} />
        <mesh material={M.slate} position={[0, 22, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[3.9, 8, 4]} /></mesh>
        <mesh material={GLASS[1]} position={[0, 13, 2.53]}><planeGeometry args={[1.4, 2.4]} /></mesh>
        {/* Oak door, hinged on the left */}
        <group ref={door} position={[-1, 0, 2.4]}>
          <B m={M.oak} p={[1, 2, 0]} s={[2, 4, 0.12]} />
          <mesh material={M.gold} position={[1.75, 1.9, 0.09]}><torusGeometry args={[0.08, 0.015, 6, 12]} /></mesh>
        </group>
      </group>
      {/* Stained-glass windows along both sides and a rose window over the altar */}
      {[-5, 0, 5].map((z, i) => [-1, 1].map((sx) => (
        <mesh key={`${z}${sx}`} material={GLASS[(i + (sx > 0 ? 1 : 0)) % 3]} position={[sx * (W / 2 + 0.01 * sx), 4.5, z]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.3, 2.8]} /></mesh>
      )))}
      <mesh material={GLASS[2]} position={[0, 5.6, -L / 2 + 0.2]}><circleGeometry args={[1.3, 20]} /></mesh>
      {/* Aisle runner and pews (two rows of six) */}
      <B m={M.runner} p={[0, 0.07, 1]} s={[1.6, 0.02, 14]} />
      {Array.from({ length: 6 }, (_, k) => [-1, 1].map((sx) => (
        <group key={`${k}${sx}`} position={[sx * 2.6, 0, 6 - k * 1.7]}><Pew /></group>
      )))}
      {/* Altar on a raised step */}
      <B m={M.stone} p={[0, 0.2, -6.8]} s={[6, 0.4, 3]} />
      <B m={M.altar} p={[0, 0.95, -7.2]} s={[2.4, 1.1, 0.9]} />
      <B m={M.cloth} p={[0, 1.52, -7.2]} s={[2.5, 0.04, 1]} />
      <B m={M.gold} p={[0, 2.6, -8.4]} s={[0.12, 1.6, 0.08]} />
      <B m={M.gold} p={[0, 2.95, -8.4]} s={[0.8, 0.12, 0.08]} />
      <Candle p={[-0.9, 1.54, -7.2]} /><Candle p={[0.9, 1.54, -7.2]} />
      <pointLight position={[0, 5, -3]} intensity={1.1} distance={16} color="#ffd9a0" />
    </group>
  );
};
