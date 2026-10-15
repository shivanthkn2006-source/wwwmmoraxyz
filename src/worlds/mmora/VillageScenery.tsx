/**
 * Reference-screenshot scenery for M'Mora Village (rainy-night horror mood):
 * river + stone arch bridge beyond the church, mountain silhouettes with a
 * waterfall, a statue on a plinth, carts and barrels by the houses, and a crow
 * on a leaning grave cross. Placed only in empty ground so the layout stays.
 * All static pieces are merged vertex-coloured meshes (few draw calls).
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HOUSES } from './PickupHouses';
import { boxPoly, setSolidGroup } from '@/lib/vrSolids';

const rand = (s: number) => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };
function col(g: THREE.BufferGeometry, c: string) {
  const ng = g.index ? g.toNonIndexed() : g; if (ng.getAttribute('uv')) ng.deleteAttribute('uv');
  const k = new THREE.Color(c), n = ng.getAttribute('position').count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = 0.85 + rand(i * 0.37) * 0.3; a[i * 3] = k.r * v; a[i * 3 + 1] = k.g * v; a[i * 3 + 2] = k.b * v; }
  ng.setAttribute('color', new THREE.BufferAttribute(a, 3)); return ng;
}
const VC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
const FAR = new THREE.MeshBasicMaterial({ color: '#141a1b', fog: false });
const FAR2 = new THREE.MeshBasicMaterial({ color: '#1c2324', fog: false });

export const RIVER_Z = -104;
export const STATUE_POS: [number, number] = [-9, 14];

/** Stone bridge with two arches over the river, deck along z. */
function bridge(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  const deck = new THREE.BoxGeometry(5, 0.6, 16); deck.translate(0, 3.2, 0); p.push(col(deck, '#4c4a44'));
  for (const s of [-1, 1]) { const w = new THREE.BoxGeometry(0.4, 0.9, 16); w.translate(s * 2.3, 3.9, 0); p.push(col(w, '#3e3c37')); }
  for (const z of [-7.5, 0, 7.5]) { const pier = new THREE.BoxGeometry(5, 3, 1.4); pier.translate(0, 1.5, z); p.push(col(pier, '#45433d')); }
  for (const z of [-3.75, 3.75]) { const arch = new THREE.TorusGeometry(3.1, 0.45, 6, 14, Math.PI); arch.rotateY(Math.PI / 2); arch.scale(5 / 0.9, 1, 1); arch.translate(0, 0, z); p.push(col(arch, '#3a3833')); }
  for (let i = 0; i < 16; i++) { const st = new THREE.BoxGeometry(0.5, 0.35, 0.9); st.translate(i % 2 ? 2.35 : -2.35, 4.45, -7.2 + i * 0.95); p.push(col(st, '#56534b')); }
  return mergeGeometries(p)!;
}

/** Robed figure statue on a stepped plinth. */
function statue(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  const s1 = new THREE.BoxGeometry(3, 0.6, 3); s1.translate(0, 0.3, 0); p.push(col(s1, '#4a4842'));
  const s2 = new THREE.BoxGeometry(2.2, 2, 2.2); s2.translate(0, 1.6, 0); p.push(col(s2, '#555249'));
  const s3 = new THREE.BoxGeometry(2.5, 0.3, 2.5); s3.translate(0, 2.75, 0); p.push(col(s3, '#4a4842'));
  const robe = new THREE.CylinderGeometry(0.45, 0.75, 2.4, 10); robe.translate(0, 4.1, 0); p.push(col(robe, '#3d4038'));
  const chest = new THREE.CylinderGeometry(0.5, 0.45, 0.8, 10); chest.translate(0, 5.6, 0); p.push(col(chest, '#3d4038'));
  const head = new THREE.SphereGeometry(0.28, 10, 8); head.translate(0, 6.25, 0); p.push(col(head, '#454840'));
  const hood = new THREE.ConeGeometry(0.38, 0.6, 10); hood.translate(0, 6.45, -0.05); p.push(col(hood, '#373a33'));
  const staff = new THREE.CylinderGeometry(0.05, 0.05, 4, 6); staff.translate(0.7, 4.6, 0.2); p.push(col(staff, '#33352f'));
  const arm = new THREE.BoxGeometry(0.8, 0.22, 0.22); arm.translate(0.4, 5.4, 0.15); p.push(col(arm, '#3d4038'));
  return mergeGeometries(p)!;
}

function cart(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  const bed = new THREE.BoxGeometry(1.6, 0.15, 2.6); bed.translate(0, 0.9, 0); p.push(col(bed, '#4a3a2a'));
  for (const s of [-1, 1]) { const side = new THREE.BoxGeometry(0.08, 0.5, 2.6); side.translate(s * 0.8, 1.2, 0); p.push(col(side, '#3e3022')); }
  for (const s of [-1, 1]) { const w = new THREE.TorusGeometry(0.55, 0.07, 5, 12); w.rotateY(Math.PI / 2); w.translate(s * 0.92, 0.6, 0.3); p.push(col(w, '#2c241b'));
    for (let k = 0; k < 4; k++) { const sp = new THREE.BoxGeometry(0.04, 1.05, 0.05); sp.rotateX((k * Math.PI) / 4); sp.translate(s * 0.92, 0.6, 0.3); p.push(col(sp, '#2c241b')); } }
  for (const s of [-1, 1]) { const sh = new THREE.BoxGeometry(0.07, 0.07, 2); sh.rotateX(-0.25); sh.translate(s * 0.4, 0.6, 2.1); p.push(col(sh, '#3e3022')); }
  const sack = new THREE.SphereGeometry(0.35, 8, 6); sack.scale(1, 0.7, 1.3); sack.translate(-0.3, 1.25, -0.6); p.push(col(sack, '#5c5240'));
  return mergeGeometries(p)!;
}

function barrel(): THREE.BufferGeometry {
  const b = new THREE.CylinderGeometry(0.38, 0.38, 1, 10); b.translate(0, 0.5, 0);
  const parts = [col(b, '#4b3824')];
  for (const y of [0.18, 0.82]) { const h = new THREE.CylinderGeometry(0.4, 0.4, 0.06, 10); h.translate(0, y, 0); parts.push(col(h, '#26231f')); }
  return mergeGeometries(parts)!;
}

function graveCross(): THREE.BufferGeometry {
  const v = new THREE.BoxGeometry(0.22, 2.6, 0.18); v.translate(0, 1.3, 0);
  const h = new THREE.BoxGeometry(1.4, 0.2, 0.18); h.translate(0, 2, 0);
  const g = mergeGeometries([col(v, '#2e2822'), col(h, '#2e2822')])!; g.rotateZ(0.12); return g;
}

/** Ridge of mountains as silhouettes past the fog, with one lit waterfall. */
const Mountains: React.FC = () => {
  const peaks = useMemo(() => Array.from({ length: 11 }, (_, i) => ({ x: -260 + i * 52 + rand(i) * 20, h: 70 + rand(i + 3) * 70, r: 50 + rand(i + 5) * 30, z: -230 - rand(i + 7) * 40 })), []);
  const fall = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 256; const g = c.getContext('2d')!;
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(200,215,220,${0.15 + rand(i) * 0.4})`; g.fillRect(rand(i + 1) * 32, rand(i + 2) * 256, 1 + rand(i + 3) * 2, 6 + rand(i + 4) * 30); }
    const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping; return t;
  }, []);
  useFrame((_, dt) => { if (fall.current?.map) fall.current.map.offset.y += dt * 0.6; });
  return (
    <group>
      {peaks.map((p, i) => <mesh key={i} position={[p.x, p.h / 2 - 4, p.z]} material={i % 2 ? FAR : FAR2}><coneGeometry args={[p.r, p.h, 7]} /></mesh>)}
      <mesh position={[-30, 38, -205]}><planeGeometry args={[7, 80]} /><meshBasicMaterial ref={fall} map={tex} transparent opacity={0.55} fog={false} depthWrite={false} /></mesh>
      <mesh position={[-30, 0.5, -200]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[9, 16]} /><meshBasicMaterial color="#7f9396" transparent opacity={0.25} fog={false} depthWrite={false} /></mesh>
    </group>
  );
};

const River: React.FC = () => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#16241f', roughness: 0.15, metalness: 0.6, emissive: '#0d2a1c', emissiveIntensity: 0.4 }), []);
  useFrame(({ clock }) => { mat.emissiveIntensity = 0.35 + Math.sin(clock.elapsedTime * 0.8) * 0.08; });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, RIVER_Z]} material={mat}><planeGeometry args={[400, 12]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[0, 0.25, RIVER_Z + s * 6.3]}><boxGeometry args={[400, 0.5, 0.8]} /><meshStandardMaterial color="#3a3a35" roughness={1} /></mesh>)}
      <mesh position={[0, 0.9, RIVER_Z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[60, 10]} /><meshBasicMaterial color="#5f9a6a" transparent opacity={0.12} depthWrite={false} /></mesh>
    </group>
  );
};

const Crow: React.FC<{ at: [number, number, number] }> = ({ at }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { const g = ref.current; if (!g) return; const t = clock.elapsedTime; g.rotation.y = Math.sin(t * 0.4) * 0.8; g.children[1].rotation.x = Math.max(0, Math.sin(t * 3)) * 0.4; });
  return (
    <group ref={ref} position={at}>
      <mesh position={[0, 0.14, 0]} scale={[1, 1, 1.5]}><sphereGeometry args={[0.13, 8, 6]} /><meshStandardMaterial color="#0e0f11" roughness={0.6} /></mesh>
      <group position={[0, 0.3, 0.14]}>
        <mesh><sphereGeometry args={[0.08, 8, 6]} /><meshStandardMaterial color="#0e0f11" /></mesh>
        <mesh position={[0, -0.01, 0.1]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.025, 0.1, 4]} /><meshStandardMaterial color="#2a2620" /></mesh>
      </group>
      <mesh position={[0, 0.12, -0.25]} rotation={[0.3, 0, 0]}><boxGeometry args={[0.1, 0.02, 0.22]} /><meshStandardMaterial color="#0e0f11" /></mesh>
    </group>
  );
};

const Static: React.FC<{ geo: THREE.BufferGeometry; items: [number, number, number][] }> = ({ geo, items }) => (
  <>{items.map(([x, z, r], i) => <mesh key={i} geometry={geo} material={VC} position={[x, 0, z]} rotation={[0, r, 0]} />)}</>
);

export const VillageScenery: React.FC = () => {
  const G = useMemo(() => ({ bridge: bridge(), statue: statue(), cart: cart(), barrel: barrel(), cross: graveCross() }), []);
  const lay = useMemo(() => {
    // Carts and barrels sit beside (not in front of) every other house, along its side wall.
    const carts: [number, number, number][] = [], barrels: [number, number, number][] = [];
    HOUSES.forEach(([x, z, r], i) => {
      const sx = Math.cos(r), sz = -Math.sin(r);
      if (i % 2 === 0) carts.push([x + sx * 6.5, z + sz * 6.5, r + 0.3]);
      barrels.push([x - sx * 4.6 + 0.5, z - sz * 4.6, 0], [x - sx * 4.6 - 0.4, z - sz * 4.6 + 0.6, 1]);
    });
    return { carts, barrels };
  }, []);
  const crosses: [number, number, number][] = [[14, -62, 0.3], [18, -66, -0.2], [11, -68, 0.6]];
  useEffect(() => {
    setSolidGroup('scenery', [boxPoly(STATUE_POS[0], STATUE_POS[1], 1.6, 1.6)]);
    return () => setSolidGroup('scenery', null);
  }, []);
  return (
    <>
      <Mountains />
      <River />
      <mesh geometry={G.bridge} material={VC} position={[0, 0, RIVER_Z]} />
      <pointLight position={[2.6, 5, RIVER_Z - 8]} color="#ffb257" intensity={1.6} distance={12} />
      <mesh position={[2.6, 4.9, RIVER_Z - 8]}><boxGeometry args={[0.18, 0.26, 0.18]} /><meshBasicMaterial color="#ffc06a" /></mesh>
      <mesh geometry={G.statue} material={VC} position={[STATUE_POS[0], 0, STATUE_POS[1]]} rotation={[0, 2.4, 0]} />
      <Static geo={G.cart} items={lay.carts} />
      <Static geo={G.barrel} items={lay.barrels} />
      <Static geo={G.cross} items={crosses} />
      <Crow at={[14.25, 2.15, -62]} />
    </>
  );
};
export default VillageScenery;
