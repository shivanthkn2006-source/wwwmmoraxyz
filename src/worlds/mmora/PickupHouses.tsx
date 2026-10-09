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
import { setSolidGroup, wallPieces } from '@/lib/vrSolids';
import { usePickups, takePickup, isTaken, type Pickup } from '@/lib/vrPickups';
import { registerLit } from '@/lib/vrLights';
import { coinMaterial } from '@/lib/vrCoinLook';
import { ManorFurniture, CarvedMantel } from './ManorFurniture';

const WINDOW = registerLit(new THREE.MeshStandardMaterial({ color: '#4a5866', emissive: '#ffc56a', roughness: 0.4 }), 2.2);

function stoneTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); if (!g) return null;
  g.fillStyle = '#4c4842'; g.fillRect(0, 0, 256, 256);
  for (let y = 0, r = 0; y < 256; y += 28, r++) for (let x = (r % 2) * -24; x < 256; x += 48) {
    const v = 95 + ((x * 7 + y * 13) % 40); g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(x + 2, y + 2, 44, 24);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1.2); return t;
}
function rugTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); if (!g) return null;
  g.fillStyle = '#5a1e1a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#c49a52'; g.lineWidth = 6; g.strokeRect(8, 8, 112, 112);
  g.strokeStyle = '#2a1c3a'; g.lineWidth = 3; g.strokeRect(20, 20, 88, 88);
  g.fillStyle = '#c49a52'; g.beginPath(); g.moveTo(64, 34); g.lineTo(94, 64); g.lineTo(64, 94); g.lineTo(34, 64); g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const HOUSE_W = 5, HOUSE_D = 5, HOUSE_H = 3;
// [x, z, rotationY]
export const HOUSES: [number, number, number][] = [
  [18, -10, 0], [-26, -18, Math.PI / 2], [30, 22, Math.PI], [-20, 28, -Math.PI / 2],
  [6, -34, 0], [44, -6, Math.PI / 2], [-42, 4, 0], [12, 40, Math.PI],
];
// Gable roof: a triangular prism that sits wholly on top of the walls.
const ROOF_RISE = 1.9;
const GABLE = (() => {
  const w = (HOUSE_W + 0.6) / 2, sh = new THREE.Shape();
  sh.moveTo(-w, 0); sh.lineTo(w, 0); sh.lineTo(0, ROOF_RISE); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: HOUSE_D + 0.6, bevelEnabled: false });
  g.translate(0, 0, -(HOUSE_D + 0.6) / 2); return g;
})();
const COIN_AMOUNTS = [1, 3, 5, 1, 3, 1, 5, 3];
const OUTDOOR_HERBS: [number, number][] = [[4, 10], [-8, -14], [22, 6], [-30, -2], [10, -22], [-14, 18], [36, 30], [-36, -30], [26, -28], [0, 26]];

const M = {
  wall: new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.95 }),
  roof: new THREE.MeshStandardMaterial({ color: '#4d4a47', roughness: 0.85 }),
  beam: new THREE.MeshStandardMaterial({ color: '#2f2218', roughness: 0.9 }),
  panel: new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.7 }),
  rug: new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }),
  hearth: new THREE.MeshStandardMaterial({ color: '#4b4741', roughness: 1 }),
  fire: new THREE.MeshBasicMaterial({ color: '#ff9a3c' }),
  snow: new THREE.MeshStandardMaterial({ color: '#e6e9ea', roughness: 1 }),
  door: new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.8 }),
  wood: new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.55, metalness: 0.05 }),
  woodDark: new THREE.MeshStandardMaterial({ color: '#5b3a20', roughness: 0.6 }),
  knob: new THREE.MeshStandardMaterial({ color: '#b08a4a', metalness: 0.7, roughness: 0.35 }),
  pot: new THREE.MeshStandardMaterial({ color: '#5a2e24', roughness: 0.8 }),
  soil: new THREE.MeshStandardMaterial({ color: '#2b1f16', roughness: 1 }),
  stem: new THREE.MeshStandardMaterial({ color: '#9fc28a', roughness: 0.7 }),
  leaf: new THREE.MeshStandardMaterial({ color: '#4f8a3a', roughness: 0.65, side: THREE.DoubleSide, emissive: '#1f5a14', emissiveIntensity: 0.4 }),
  coin: coinMaterial(),
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
      {/* Steep gabled roof with snow on the ridge, timber beams on the corners */}
      <mesh material={M.roof} geometry={GABLE} position={[0, HOUSE_H + 0.2, 0]} />
      <mesh material={M.snow} position={[0, HOUSE_H + 0.2 + ROOF_RISE, 0]}><boxGeometry args={[0.35, 0.12, HOUSE_D + 0.6]} /></mesh>
      {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([a, b], k) => <mesh key={`b${k}`} material={M.beam} position={[a * (HOUSE_W / 2 + 0.06), HOUSE_H / 2, b * (HOUSE_D / 2 + 0.06)]}><boxGeometry args={[0.22, HOUSE_H, 0.22]} /></mesh>)}
      <mesh material={M.beam} position={[0, HOUSE_H - 0.05, HOUSE_D / 2 + 0.12]}><boxGeometry args={[HOUSE_W + 0.2, 0.2, 0.08]} /></mesh>
      {/* Interior: wood panelling, patterned rug, stone fireplace with fire, chair */}
      <mesh material={M.panel} position={[0, 0.6, -HOUSE_D / 2 + 0.12]}><boxGeometry args={[HOUSE_W - 0.3, 1.2, 0.04]} /></mesh>
      <group position={[HOUSE_W / 2 - 0.45, 0, -0.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh material={M.hearth} position={[0, 0.9, 0]}><boxGeometry args={[1.6, 1.8, 0.5]} /></mesh>
        <mesh material={M.beam} position={[0, 1.4, 0.28]}><boxGeometry args={[1.8, 0.12, 0.2]} /></mesh>
        <mesh material={M.fire} position={[0, 0.45, 0.26]}><coneGeometry args={[0.25, 0.5, 6]} /></mesh>
        <CarvedMantel />
      </group>
      <ManorFurniture />
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
    // Every wall is solid; the doorway is only open while the door is open.
    const side = (HOUSE_W - 1.1) / 2, t = 0.3;
    setSolidGroup('houses', HOUSES.flatMap(([x, z, r], i) => wallPieces(x, z, r, [
      [0, -HOUSE_D / 2, HOUSE_W, t], [-HOUSE_W / 2, 0, t, HOUSE_D], [HOUSE_W / 2, 0, t, HOUSE_D],
      [-(1.1 / 2 + side / 2), HOUSE_D / 2, side, t], [1.1 / 2 + side / 2, HOUSE_D / 2, side, t],
      ...(doors.includes(`h${i}`) ? [] : [[0, HOUSE_D / 2, 1.1, t] as [number, number, number, number]]),
    ])));
    return () => setSolidGroup('houses', null);
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
      const label = k.kind === 'herb' ? 'Picked up a Green Herb' : `Picked up ${k.amount} M'Mora Coin${k.amount > 1 ? 's' : ''}`;
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
