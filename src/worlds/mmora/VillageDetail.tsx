/**
 * Added village detail, placed onto the existing pieces (nothing moved or removed):
 *  - house fronts: carved stone door frame, chimney, ivy, wooden window balcony with flower box
 *  - lamp glow halos around every lantern (street-lamp schedule)
 *  - pine forest and boulders on the near mountain ridge
 * Instanced / shared materials so phones stay fast; nothing here blocks walking.
 */
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { HOUSES, villageLayout } from './villageMap';
import { registerToggle } from '@/lib/vrLights';

const HOUSE_W = 5, HOUSE_D = 5, HOUSE_H = 3; // same as PickupHouses
const rand = (s: number) => { const x = Math.sin(s * 91.7) * 43758.5453; return x - Math.floor(x); };

const CARVED = new THREE.MeshStandardMaterial({ color: '#8a857b', roughness: 0.9 });
const CHIM = new THREE.MeshStandardMaterial({ color: '#5d5952', roughness: 0.95 });
const WOOD = new THREE.MeshStandardMaterial({ color: '#3d2c1f', roughness: 0.85 });
const SOIL = new THREE.MeshStandardMaterial({ color: '#2a1f17', roughness: 1 });
const FLOWER = new THREE.MeshStandardMaterial({ color: '#8a2d3a', roughness: 0.8 });

function ivyTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d')!;
  g.strokeStyle = 'rgba(40,52,30,0.9)'; g.lineWidth = 2;
  for (let v = 0; v < 5; v++) { g.beginPath(); let x = 20 + v * 22; g.moveTo(x, 256); for (let y = 256; y > 30; y -= 12) { x += (rand(v * 40 + y) - 0.5) * 10; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 520; i++) {
    const y = 256 - Math.pow(rand(i), 0.7) * 230, x = rand(i + 7) * 128, s = 3 + rand(i + 3) * 5;
    g.fillStyle = `hsl(${95 + rand(i + 1) * 30}, ${30 + rand(i + 2) * 25}%, ${14 + rand(i + 4) * 16}%)`;
    g.beginPath(); g.ellipse(x, y, s, s * 0.7, rand(i + 5) * 3, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const HouseFront: React.FC<{ i: number; ivy: THREE.Material }> = ({ i, ivy }) => {
  const [x, z, r] = HOUSES[i];
  const fz = HOUSE_D / 2 + 0.06, side = i % 2 ? 1 : -1;
  return (
    <group position={[x, 0, z]} rotation={[0, r, 0]}>
      {/* carved stone door frame: two dressed pillars with bases + arched lintel + keystone */}
      {[-0.72, 0.72].map((dx) => (
        <group key={dx}>
          <mesh material={CARVED} position={[dx, 1.15, fz]}><boxGeometry args={[0.26, 2.3, 0.16]} /></mesh>
          <mesh material={CARVED} position={[dx, 0.12, fz + 0.02]}><boxGeometry args={[0.34, 0.24, 0.22]} /></mesh>
          <mesh material={CARVED} position={[dx, 2.28, fz + 0.02]}><boxGeometry args={[0.34, 0.1, 0.22]} /></mesh>
        </group>
      ))}
      <mesh material={CARVED} position={[0, 2.38, fz]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.72, 0.12, 6, 14, Math.PI]} /></mesh>
      <mesh material={CARVED} position={[0, 3.08, fz + 0.03]}><boxGeometry args={[0.2, 0.26, 0.14]} /></mesh>
      {/* chimney on the roof, with a cap */}
      <mesh material={CHIM} position={[side * 1.4, HOUSE_H + 1.5, -1]}><boxGeometry args={[0.6, 2.2, 0.6]} /></mesh>
      <mesh material={CARVED} position={[side * 1.4, HOUSE_H + 2.65, -1]}><boxGeometry args={[0.75, 0.12, 0.75]} /></mesh>
      {/* ivy climbing the front corner */}
      <mesh material={ivy} position={[-side * (HOUSE_W / 2 - 0.75), 1.5, fz + 0.03]}><planeGeometry args={[1.4, 3]} /></mesh>
      {i % 3 === 0 && <mesh material={ivy} position={[HOUSE_W / 2 + 0.03, 1.3, 0.6]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.8, 2.6]} /></mesh>}
      {/* small wooden balcony with a flower box under the front window */}
      <group position={[side * 1.55, 1.7, fz]}>
        <mesh material={WOOD} position={[0, 0, 0.22]}><boxGeometry args={[1.2, 0.06, 0.44]} /></mesh>
        {[-0.55, -0.27, 0, 0.27, 0.55].map((bx) => <mesh key={bx} material={WOOD} position={[bx, 0.25, 0.42]}><boxGeometry args={[0.04, 0.5, 0.04]} /></mesh>)}
        <mesh material={WOOD} position={[0, 0.5, 0.42]}><boxGeometry args={[1.2, 0.05, 0.06]} /></mesh>
        <mesh material={SOIL} position={[0, 0.1, 0.22]}><boxGeometry args={[1, 0.14, 0.24]} /></mesh>
        {[-0.35, -0.1, 0.15, 0.38].map((fx, k) => <mesh key={fx} material={k % 2 ? ivy : FLOWER} position={[fx, 0.22, 0.22]}><sphereGeometry args={[0.09, 6, 5]} /></mesh>)}
        {[-1, 1].map((s) => <mesh key={s} material={WOOD} position={[s * 0.5, -0.18, 0.15]} rotation={[s * 0.0, 0, 0]}><boxGeometry args={[0.06, 0.3, 0.06]} /></mesh>)}
      </group>
    </group>
  );
};

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(0.25, 'rgba(255,170,80,0.45)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

const LampGlow: React.FC = () => {
  const lamps = villageLayout().lamps;
  const mat = useMemo(() => registerToggle(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }), 'street'), []);
  return <>{lamps.map(([x, z, r], i) => <sprite key={i} material={mat} position={[x + Math.cos(-r) * 0.45, 2.85, z + Math.sin(-r) * 0.45]} scale={[2.2, 2.2, 1]} />)}</>;
};

const PINE = new THREE.MeshStandardMaterial({ color: '#16211b', roughness: 1 });
const ROCK = new THREE.MeshStandardMaterial({ color: '#3b3d3c', roughness: 0.95, flatShading: true });

const MountainDetail: React.FC = () => {
  const pines = useRef<THREE.InstancedMesh>(null), rocks = useRef<THREE.InstancedMesh>(null);
  const N = 420, R = 90;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      // band along the front ridge (z≈-205) and the slopes toward the river
      const x = -280 + rand(i) * 560, z = -150 - rand(i + 1) * 60, h = 5 + rand(i + 2) * 7;
      const y = Math.max(0, (z + 150) * -0.35) + h / 2 - 1;
      p.set(x, y, z); s.set(1, h / 6, 1); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand(i + 3) * 6);
      pines.current?.setMatrixAt(i, m.compose(p, q, s));
    }
    for (let i = 0; i < R; i++) {
      const x = -280 + rand(i + 900) * 560, z = -135 - rand(i + 901) * 75, sc = 1.5 + rand(i + 902) * 5;
      p.set(x, Math.max(0, (z + 150) * -0.35) + sc * 0.3, z); s.set(sc, sc * (0.5 + rand(i + 903) * 0.5), sc * 1.2);
      q.setFromEuler(new THREE.Euler(rand(i) * 2, rand(i + 4) * 6, 0));
      rocks.current?.setMatrixAt(i, m.compose(p, q, s));
    }
    if (pines.current) pines.current.instanceMatrix.needsUpdate = true;
    if (rocks.current) rocks.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={pines} args={[undefined, PINE, N]} frustumCulled={false}><coneGeometry args={[1.8, 6, 6]} /></instancedMesh>
      <instancedMesh ref={rocks} args={[undefined, ROCK, R]} frustumCulled={false}><dodecahedronGeometry args={[1, 0]} /></instancedMesh>
    </>
  );
};

export const VillageDetail: React.FC = () => {
  const ivy = useMemo(() => new THREE.MeshStandardMaterial({ map: ivyTexture(), transparent: true, alphaTest: 0.3, roughness: 0.9, side: THREE.DoubleSide }), []);
  return (
    <group>
      {HOUSES.map((_, i) => <HouseFront key={i} i={i} ivy={ivy} />)}
      <LampGlow />
      <MountainDetail />
    </group>
  );
};
