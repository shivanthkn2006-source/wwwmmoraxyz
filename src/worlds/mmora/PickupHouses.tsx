/**
 * Houses across M'Mora World: Use opens the door, inside is a wooden side
 * table with a potted Green Herb and antique coins (1, 3 or 5). More herbs
 * grow along the paths. Everything goes through the shared Use button.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { MMoraSigns } from './MMoraSigns';
import { setStaticSolids, boxPoly } from '@/lib/vrSolids';
import { usePickups, takePickup, isTaken, type Pickup } from '@/lib/vrPickups';
import { registerLit } from '@/lib/vrLights';

const WINDOW = registerLit(new THREE.MeshStandardMaterial({ color: '#4a5866', emissive: '#ffc56a', roughness: 0.4 }), 2.2);

const HOUSE_W = 5, HOUSE_D = 5, HOUSE_H = 3;
// [x, z, rotationY]
export const HOUSES: [number, number, number][] = [
  [18, -10, 0], [-26, -18, Math.PI / 2], [30, 22, Math.PI], [-20, 28, -Math.PI / 2],
  [6, -34, 0], [44, -6, Math.PI / 2], [-42, 4, 0], [12, 40, Math.PI],
];
const COIN_AMOUNTS = [1, 3, 5, 1, 3, 1, 5, 3];
const OUTDOOR_HERBS: [number, number][] = [[4, 10], [-8, -14], [22, 6], [-30, -2], [10, -22], [-14, 18], [36, 30], [-36, -30], [26, -28], [0, 26]];

const M = {
  wall: new THREE.MeshStandardMaterial({ color: '#6f675d', roughness: 0.95 }),
  roof: new THREE.MeshStandardMaterial({ color: '#3a2f28', roughness: 0.9 }),
  door: new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.8 }),
  wood: new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.55, metalness: 0.05 }),
  woodDark: new THREE.MeshStandardMaterial({ color: '#5b3a20', roughness: 0.6 }),
  knob: new THREE.MeshStandardMaterial({ color: '#b08a4a', metalness: 0.7, roughness: 0.35 }),
  pot: new THREE.MeshStandardMaterial({ color: '#5a2e24', roughness: 0.8 }),
  soil: new THREE.MeshStandardMaterial({ color: '#2b1f16', roughness: 1 }),
  stem: new THREE.MeshStandardMaterial({ color: '#9fc28a', roughness: 0.7 }),
  leaf: new THREE.MeshStandardMaterial({ color: '#4f8a3a', roughness: 0.65, side: THREE.DoubleSide, emissive: '#1f5a14', emissiveIntensity: 0.4 }),
  coin: new THREE.MeshStandardMaterial({ color: '#ffd24a', metalness: 0.85, roughness: 0.22, emissive: '#7a5410', emissiveIntensity: 0.45 }),
};
const GLOW_G = new THREE.MeshBasicMaterial({ color: '#5fb04a', transparent: true, opacity: 0.45, depthWrite: false });
const GLOW_C = new THREE.MeshBasicMaterial({ color: '#e3c15a', transparent: true, opacity: 0.45, depthWrite: false });
const leafGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.09, 0.12, 0, 0.3); s.quadraticCurveTo(-0.09, 0.12, 0, 0); return new THREE.ShapeGeometry(s, 6); })();

/** Potted Green Herb: thin pale stem with broad leaves, like the classic one. */
export const GreenHerb: React.FC<{ potted?: boolean }> = ({ potted = true }) => (
  <group>
    {potted && <>
      <mesh material={M.pot} position={[0, 0.09, 0]}><cylinderGeometry args={[0.11, 0.08, 0.18, 8]} /></mesh>
      <mesh material={M.soil} position={[0, 0.175, 0]}><cylinderGeometry args={[0.1, 0.1, 0.01, 8]} /></mesh>
    </>}
    <mesh material={M.stem} position={[0, 0.45, 0]}><cylinderGeometry args={[0.012, 0.018, 0.55, 5]} /></mesh>
    {Array.from({ length: 9 }, (_, i) => {
      const a = i * 2.4, y = 0.25 + i * 0.05;
      return <mesh key={i} geometry={leafGeo} material={M.leaf} position={[0, y, 0]} rotation={[-0.9 + (i % 3) * 0.15, a, 0]} scale={1 - i * 0.04} />;
    })}
  </group>
);

const CoinStack: React.FC<{ n: number }> = ({ n }) => (
  <group>{Array.from({ length: Math.min(n, 5) }, (_, i) => (
    <mesh key={i} material={M.coin} position={[(i % 2) * 0.09 - 0.04, 0.008 + Math.floor(i / 2) * 0.014, (i % 3) * 0.05 - 0.05]} rotation={[0, i, 0]}>
      <cylinderGeometry args={[0.045, 0.045, 0.012, 16]} />
    </mesh>
  ))}</group>
);

/** Small wooden bedside table with a drawer and knob. */
const SideTable: React.FC = () => (
  <group>
    <mesh material={M.wood} position={[0, 0.72, 0]}><boxGeometry args={[0.7, 0.05, 0.5]} /></mesh>
    <mesh material={M.woodDark} position={[0, 0.4, 0]}><boxGeometry args={[0.62, 0.6, 0.44]} /></mesh>
    <mesh material={M.wood} position={[0, 0.52, 0.225]}><boxGeometry args={[0.56, 0.2, 0.02]} /></mesh>
    <mesh material={M.wood} position={[0, 0.25, 0.225]}><boxGeometry args={[0.56, 0.2, 0.02]} /></mesh>
    <mesh material={M.knob} position={[0, 0.52, 0.245]}><sphereGeometry args={[0.025, 8, 8]} /></mesh>
    <mesh material={M.knob} position={[0, 0.25, 0.245]}><sphereGeometry args={[0.02, 8, 8]} /></mesh>
  </group>
);

const DOORS_KEY = 'vr-house-doors';
const readDoors = (): string[] => { try { return JSON.parse(localStorage.getItem(DOORS_KEY) || '[]'); } catch { return []; } };

export const ALL_PICKUPS: Pickup[] = [
  ...HOUSES.flatMap(([x, z, r], i): Pickup[] => {
    const c = Math.cos(r), s = Math.sin(r), w = (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c];
    const [hx, hz] = w(-0.15, -1.6), [cx, cz] = w(0.18, -1.6);
    return [
      { id: `house${i}-herb`, kind: 'herb', amount: 1, pos: [hx, 0.75, hz] },
      { id: `house${i}-coin`, kind: 'coin', amount: COIN_AMOUNTS[i], pos: [cx, 0.75, cz] },
    ];
  }),
  ...OUTDOOR_HERBS.map(([x, z], i): Pickup => ({ id: `path-herb${i}`, kind: 'herb', amount: 1, pos: [x, 0, z] })),
];

const House: React.FC<{ i: number; open: boolean }> = ({ i, open }) => {
  const [x, z, r] = HOUSES[i];
  const door = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (door.current) door.current.rotation.y = THREE.MathUtils.damp(door.current.rotation.y, open ? -1.6 : 0, 6, dt); });
  const side = (HOUSE_W - 1.1) / 2;
  return (
    <group position={[x, 0, z]} rotation={[0, r, 0]}>
      <mesh material={M.wall} position={[0, HOUSE_H / 2, -HOUSE_D / 2]}><boxGeometry args={[HOUSE_W, HOUSE_H, 0.2]} /></mesh>
      <mesh material={M.wall} position={[-HOUSE_W / 2, HOUSE_H / 2, 0]}><boxGeometry args={[0.2, HOUSE_H, HOUSE_D]} /></mesh>
      <mesh material={M.wall} position={[HOUSE_W / 2, HOUSE_H / 2, 0]}><boxGeometry args={[0.2, HOUSE_H, HOUSE_D]} /></mesh>
      <mesh material={M.wall} position={[-(1.1 / 2 + side / 2), HOUSE_H / 2, HOUSE_D / 2]}><boxGeometry args={[side, HOUSE_H, 0.2]} /></mesh>
      <mesh material={M.wall} position={[1.1 / 2 + side / 2, HOUSE_H / 2, HOUSE_D / 2]}><boxGeometry args={[side, HOUSE_H, 0.2]} /></mesh>
      <mesh material={M.wall} position={[0, HOUSE_H - 0.4, HOUSE_D / 2]}><boxGeometry args={[1.1, 0.8, 0.2]} /></mesh>
      {/* Windows: glow 17:54–22:00 */}
      {([[-HOUSE_W / 2 - 0.11, -Math.PI / 2], [HOUSE_W / 2 + 0.11, Math.PI / 2]] as const).map(([wx, ry], k) => (
        <mesh key={k} material={WINDOW} position={[wx, 1.6, 0]} rotation={[0, ry, 0]}><planeGeometry args={[1.4, 0.9]} /></mesh>
      ))}
      <mesh material={WINDOW} position={[-1.6, 1.6, HOUSE_D / 2 + 0.11]}><planeGeometry args={[0.9, 0.8]} /></mesh>
      <mesh material={WINDOW} position={[1.6, 1.6, HOUSE_D / 2 + 0.11]}><planeGeometry args={[0.9, 0.8]} /></mesh>
      <mesh material={WINDOW} position={[0, HOUSE_H + 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.2, 1.2]} /></mesh>
      <mesh material={M.roof} position={[0, HOUSE_H + 0.1, 0]}><boxGeometry args={[HOUSE_W + 0.4, 0.2, HOUSE_D + 0.4]} /></mesh>
      <group ref={door} position={[-0.55, 0, HOUSE_D / 2]}>
        <mesh material={M.door} position={[0.55, 1.1, 0]}><boxGeometry args={[1.1, 2.2, 0.08]} /></mesh>
        <mesh material={M.knob} position={[0.95, 1.05, 0.06]}><sphereGeometry args={[0.04, 8, 8]} /></mesh>
      </group>
      <pointLight position={[0, 2.4, -1]} intensity={0.6} distance={5} color="#ffcf8a" />
      <group position={[0, 0, -1.6]}><SideTable /></group>
    </group>
  );
};

export const PickupHouses: React.FC = () => {
  const { camera } = useThree();
  const p = usePickups();
  const [doors, setDoors] = React.useState<string[]>(readDoors);
  useEffect(() => { try { localStorage.setItem(DOORS_KEY, JSON.stringify(doors)); } catch { /* */ } }, [doors]);
  // Closed houses are solid: you stop at the walls; open the door with Use to walk in.
  useEffect(() => {
    setStaticSolids(HOUSES.map(([x, z, r], i) => (doors.includes(`h${i}`) ? null : boxPoly(x, z, HOUSE_W, HOUSE_D, r))).filter(Boolean) as ReturnType<typeof boxPoly>[]);
    return () => setStaticSolids([]);
  }, [doors]);

  useEffect(() => registerUse(() => {
    const c = camera.position;
    let best: { dist: number; label: string; run: () => void } | null = null;
    HOUSES.forEach(([x, z, r], i) => {
      if (doors.includes(`h${i}`)) return;
      const dx = x + Math.sin(r) * HOUSE_D / 2, dz = z + Math.cos(r) * HOUSE_D / 2;
      const d = Math.hypot(c.x - dx, c.z - dz);
      if (!best || d < best.dist) best = { dist: d, label: 'Opened the door', run: () => setDoors((v) => [...v, `h${i}`]) };
    });
    for (const k of ALL_PICKUPS) {
      if (isTaken(k.id)) continue;
      const d = Math.hypot(c.x - k.pos[0], c.z - k.pos[2]);
      const label = k.kind === 'herb' ? 'Picked up a Green Herb' : `Picked up ${k.amount} Antique Coin${k.amount > 1 ? 's' : ''}`;
      if (!best || d < best.dist) best = { dist: d, label, run: () => takePickup(k) };
    }
    return best;
  }), [camera, doors]);

  const left = useMemo(() => ALL_PICKUPS.filter((k) => !p.taken.includes(k.id)), [p.taken]);
  return (
    <group>
      {HOUSES.map((_, i) => <House key={i} i={i} open={doors.includes(`h${i}`)} />)}
      {HOUSES.map(([x, z], i) => {
        const herb = !p.taken.includes(`house${i}-herb`), coin = !p.taken.includes(`house${i}-coin`);
        return <React.Fragment key={`g${i}`}>
          {herb && <mesh position={[x - 0.6, HOUSE_H + 3, z]} material={GLOW_G}><cylinderGeometry args={[0.35, 0.35, 6, 8, 1, true]} /></mesh>}
          {coin && <mesh position={[x + 0.6, HOUSE_H + 3, z]} material={GLOW_C}><cylinderGeometry args={[0.35, 0.35, 6, 8, 1, true]} /></mesh>}
        </React.Fragment>;
      })}
      <MMoraSigns />
      {left.filter((k) => k.id.startsWith('path-herb')).map((k) => (
        <mesh key={`gl-${k.id}`} position={[k.pos[0], 2.5, k.pos[2]]} material={GLOW_G}><cylinderGeometry args={[0.2, 0.2, 4, 6, 1, true]} /></mesh>
      ))}
      {left.map((k) => (
        <group key={k.id} position={k.pos}>
          {k.kind === 'herb' ? <GreenHerb potted={k.id.startsWith('house')} /> : <CoinStack n={k.amount} />}
        </group>
      ))}
    </group>
  );
};
export default PickupHouses;
