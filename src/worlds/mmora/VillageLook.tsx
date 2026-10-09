/**
 * M'Mora Village outdoor look (Resident Evil Village mood): overcast winter
 * sky, cold fog, snowy ground with muddy paths between the houses, bare
 * trees, low stone walls, a stone church with a tower, and village animals
 * (dogs, cats, cows, crows). Everything repeated is one instanced mesh, so
 * the whole village stays a handful of draw calls on phones.
 */
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HOUSES } from './PickupHouses';
import { VillageAnimals } from './VillageAnimals';
import { VillageChurch } from './VillageChurch';
import { VillageCastle } from './VillageCastle';
import { VillageGear } from './VillageGear';
import { VillageVillagers } from './VillageVillagers';

const SIZE = 400;
const rand = (s: number) => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };

function col(g: THREE.BufferGeometry, c: string) {
  const ng = g.index ? g.toNonIndexed() : g; if (ng.getAttribute('uv')) ng.deleteAttribute('uv');
  const k = new THREE.Color(c), n = ng.getAttribute('position').count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = k.r; a[i * 3 + 1] = k.g; a[i * 3 + 2] = k.b; }
  ng.setAttribute('color', new THREE.BufferAttribute(a, 3)); return ng;
}
const VC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });

/** Snow with muddy footpaths from the centre to every house. */
function groundTexture(): THREE.CanvasTexture {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); if (!g) return null;
  g.fillStyle = '#d9dcdc'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) { const v = 200 + Math.floor(rand(i) * 45); g.fillStyle = `rgba(${v - 8},${v - 4},${v},0.35)`; g.fillRect(rand(i + 1) * S, rand(i + 2) * S, 2 + rand(i + 3) * 5, 2 + rand(i + 4) * 5); }
  const toPx = (x: number) => (x / SIZE + 0.5) * S;
  g.lineCap = 'round';
  const path = (x1: number, z1: number, x2: number, z2: number) => {
    g.strokeStyle = 'rgba(120,104,86,0.85)'; g.lineWidth = 7; g.beginPath(); g.moveTo(toPx(x1), toPx(z1)); g.lineTo(toPx(x2), toPx(z2)); g.stroke();
    g.strokeStyle = 'rgba(70,58,46,0.6)'; g.lineWidth = 3; g.stroke();
  };
  for (const [x, z] of HOUSES) path(0, 0, x, z);
  path(0, 0, 0, -78); // to the church
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(80,70,60,${0.05 + rand(i + 9) * 0.1})`; g.beginPath(); g.arc(rand(i + 5) * S, rand(i + 6) * S, 4 + rand(i + 7) * 14, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** One bare winter tree (trunk + crooked branches), feet at y=0. */
function bareTree(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bark = '#2e2620', twig = '#3a3028';
  const trunk = new THREE.CylinderGeometry(0.12, 0.28, 5, 6); trunk.translate(0, 2.5, 0); parts.push(col(trunk, bark));
  for (let i = 0; i < 7; i++) {
    const len = 1.4 + rand(i) * 1.8, b = new THREE.CylinderGeometry(0.03, 0.09, len, 4);
    b.translate(0, len / 2, 0); b.rotateZ(0.6 + rand(i + 3) * 0.5); b.rotateY((i / 7) * Math.PI * 2 + rand(i) * 0.6); b.translate(0, 2.2 + i * 0.4, 0);
    parts.push(col(b, i % 2 ? twig : bark));
  }
  return mergeGeometries(parts)!;
}

function stoneWall(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const s = new THREE.BoxGeometry(0.7 + rand(i) * 0.3, 0.35, 0.5); s.translate(-2.4 + i * 0.68, 0.18 + (i % 2) * 0.02, 0);
    const s2 = new THREE.BoxGeometry(0.6, 0.3, 0.45); s2.translate(-2.1 + i * 0.6, 0.5, 0);
    parts.push(col(s, i % 3 ? '#6d6a64' : '#5e5b55'), col(s2, i % 2 ? '#77736b' : '#66625b'));
  }
  const cap = new THREE.BoxGeometry(5.2, 0.08, 0.5); cap.translate(0, 0.68, 0); parts.push(col(cap, '#e4e7e8')); // snow on top
  return mergeGeometries(parts)!;
}

/** Quadruped animals; feet at y=0, facing +z. */
function animal(kind: 'dog' | 'cat' | 'cow'): THREE.BufferGeometry {
  const s = kind === 'cow' ? 1 : kind === 'dog' ? 0.45 : 0.25;
  const body = kind === 'cow' ? '#3b302a' : kind === 'dog' ? '#6b5038' : '#2a2a2c';
  const spot = kind === 'cow' ? '#e9e4da' : body;
  const L = (x: number, z: number) => { const g = new THREE.BoxGeometry(0.16 * s * 1.4, 0.8 * s, 0.16 * s * 1.4); g.translate(x * s, 0.4 * s, z * s); return col(g, body); };
  const torso = new THREE.BoxGeometry(0.7 * s, 0.6 * s, 1.5 * s); torso.translate(0, 1.05 * s, 0);
  const patch = new THREE.BoxGeometry(0.72 * s, 0.3 * s, 0.5 * s); patch.translate(0, 1.15 * s, -0.2 * s);
  const head = new THREE.BoxGeometry(0.4 * s, 0.4 * s, 0.5 * s); head.translate(0, 1.35 * s, 0.9 * s);
  const tail = new THREE.BoxGeometry(0.06 * s, 0.06 * s, 0.6 * s); tail.rotateX(kind === 'cat' ? -0.9 : 0.5); tail.translate(0, 1.2 * s, -0.95 * s);
  const ears = kind === 'cow' ? new THREE.BoxGeometry(0.6 * s, 0.08 * s, 0.1 * s) : new THREE.ConeGeometry(0.07 * s * 2, 0.2 * s, 4);
  ears.translate(0, 1.6 * s, 0.85 * s);
  return mergeGeometries([col(torso, body), col(patch, spot), col(head, body), col(tail, body), col(ears, body), L(-0.25, 0.55), L(0.25, 0.55), L(-0.25, -0.55), L(0.25, -0.55)])!;
}

function crow(): THREE.BufferGeometry {
  const b = new THREE.ConeGeometry(0.12, 0.5, 5); b.rotateX(Math.PI / 2);
  const w = new THREE.BoxGeometry(1, 0.02, 0.22);
  const beak = new THREE.ConeGeometry(0.04, 0.12, 4); beak.rotateX(Math.PI / 2); beak.translate(0, 0, 0.3);
  return mergeGeometries([col(b, '#111214'), col(w, '#16171a'), col(beak, '#3a3328')])!;
}

const Instances: React.FC<{ geo: THREE.BufferGeometry; items: [number, number, number, number][] }> = ({ geo, items }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return; const o = new THREE.Object3D();
    items.forEach(([x, z, r, sc], i) => { o.position.set(x, 0, z); o.rotation.set(0, r, 0); o.scale.setScalar(sc); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[geo, VC, items.length]} />;
};

const STONE = new THREE.MeshStandardMaterial({ color: '#77736c', roughness: 0.95 });
const SLATE = new THREE.MeshStandardMaterial({ color: '#4a4d52', roughness: 0.85 });
const GLASS = new THREE.MeshStandardMaterial({ color: '#2a2418', emissive: '#d89a48', emissiveIntensity: 0.6 });

const Crows: React.FC = () => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(crow, []);
  const o = useMemo(() => new THREE.Object3D(), []);
  const N = 5; // a few distant crows high above; the near ones live in VillageAnimals
  useFrame(({ clock }) => {
    const m = ref.current; if (!m) return; const t = clock.elapsedTime;
    for (let i = 0; i < N; i++) {
      const a = t * (0.15 + rand(i) * 0.1) + i, r = 18 + rand(i + 1) * 30, cx = i < 7 ? 0 : 20, cz = i < 7 ? -70 : 10;
      o.position.set(cx + Math.cos(a) * r, 22 + rand(i + 2) * 12 + Math.sin(t + i) * 1.5, cz + Math.sin(a) * r);
      o.rotation.set(0, -a, Math.sin(t * 8 + i) * 0.35); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, VC, N]} frustumCulled={false} />;
};

export const VillageLook: React.FC = () => {
  const tex = useMemo(groundTexture, []);
  const geos = useMemo(() => ({ tree: bareTree(), wall: stoneWall(), dog: animal('dog'), cat: animal('cat'), cow: animal('cow') }), []);
  const lay = useMemo(() => {
    const free = (x: number, z: number) => Math.hypot(x, z) > 12 && HOUSES.every(([hx, hz]) => Math.hypot(x - hx, z - hz) > 7) && !(Math.abs(x) < 10 && z < -70 && z > -102);
    const trees: [number, number, number, number][] = [];
    for (let i = 0; trees.length < 90 && i < 600; i++) {
      const a = rand(i) * Math.PI * 2, r = 20 + rand(i + 50) * 150, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (free(x, z)) trees.push([x, z, rand(i + 7) * 6, 0.8 + rand(i + 9) * 0.7]);
    }
    const walls: [number, number, number, number][] = [];
    HOUSES.forEach(([x, z, r]) => { walls.push([x + Math.cos(r) * 5, z - Math.sin(r) * 5, r + Math.PI / 2, 1]); walls.push([x - Math.cos(r) * 5, z + Math.sin(r) * 5, r + Math.PI / 2, 1]); });
    return {
      trees, walls,
      dogs: [[8, 4, 1, 1], [-14, -6, 2.5, 1], [26, 14, 4, 1]] as [number, number, number, number][],
      cats: [[16, -6, 0.5, 1], [-24, -14, 3, 1], [4, -30, 1.2, 1], [-40, 8, 5, 1]] as [number, number, number, number][],
      cows: [[60, 40, 1, 1], [66, 46, 2.2, 1], [56, 50, 4, 1], [-60, -46, 0.3, 1]] as [number, number, number, number][],
    };
  }, []);
  return (
    <>
      <color attach="background" args={['#9aa3ab']} />
      <fog attach="fog" args={['#a3abb2', 18, 140]} />
      <hemisphereLight args={['#c9d2da', '#5a5048', 0.85]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
      <Instances geo={geos.tree} items={lay.trees} />
      <Instances geo={geos.wall} items={lay.walls} />
      <VillageChurch />
      <VillageCastle />
      <VillageGear />
      <Crows />
      <VillageAnimals />
      <VillageVillagers />
    </>
  );
};
export default VillageLook;
