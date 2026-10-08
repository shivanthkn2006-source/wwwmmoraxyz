/**
 * M'Mora Village animals: cows, dogs and cats with jointed legs, and crows
 * that rest on the ground. Each group mounts only when the player is within
 * ~70 m, moves only within ~35 m, at real walking speeds, and calls with its
 * own voice when you come close (cows moo and turn, dogs trot up and bark,
 * cats slip away and meow, crows caw and take off).
 */
import React, { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { playAnimal, type AnimalKind } from '@/lib/vrAnimalSfx';

type Spec = { speed: number; s: number; body: string; spot?: string; legH: number; len: number; w: number; h: number };
const SPECS: Record<Exclude<AnimalKind, 'crow'>, Spec> = {
  cow: { speed: 1.0, s: 1, body: '#2f2925', spot: '#e8e2d6', legH: 0.75, len: 1.9, w: 0.75, h: 0.75 },
  dog: { speed: 1.9, s: 1, body: '#6a4e34', legH: 0.35, len: 0.75, w: 0.28, h: 0.32 },
  cat: { speed: 0.9, s: 1, body: '#3a3a3d', legH: 0.17, len: 0.42, w: 0.16, h: 0.18 },
};
const mats = new Map<string, THREE.MeshStandardMaterial>();
const mat = (c: string) => { let m = mats.get(c); if (!m) { m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }); mats.set(c, m); } return m; };

type Herd = { kind: AnimalKind; home: [number, number]; n: number; r: number };
const HERDS: Herd[] = [
  { kind: 'cow', home: [62, 46], n: 3, r: 10 },
  { kind: 'cow', home: [-60, -46], n: 2, r: 8 },
  { kind: 'dog', home: [10, 6], n: 1, r: 12 },
  { kind: 'dog', home: [-18, -8], n: 1, r: 10 },
  { kind: 'dog', home: [28, 16], n: 1, r: 8 },
  { kind: 'cat', home: [16, -6], n: 1, r: 5 },
  { kind: 'cat', home: [-24, -14], n: 1, r: 5 },
  { kind: 'cat', home: [4, -30], n: 1, r: 5 },
  { kind: 'cat', home: [-40, 8], n: 1, r: 5 },
  { kind: 'crow', home: [4, -64], n: 6, r: 6 },
  { kind: 'crow', home: [-30, 30], n: 4, r: 5 },
];
const MOUNT_R = 70, ACTIVE_R = 35;

const Animal: React.FC<{ kind: Exclude<AnimalKind, 'crow'>; home: [number, number]; r: number; seed: number }> = ({ kind, home, r, seed }) => {
  const sp = SPECS[kind];
  const { camera } = useThree();
  const g = useRef<THREE.Group>(null), head = useRef<THREE.Group>(null), tail = useRef<THREE.Group>(null);
  const legs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const st = useRef({ x: home[0] + Math.cos(seed) * r * 0.5, z: home[1] + Math.sin(seed) * r * 0.5, yaw: seed, tx: home[0], tz: home[1], wait: 1 + (seed % 3), phase: 0, call: 4 + (seed % 5), near: false });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), s = st.current, o = g.current; if (!o) return;
    const px = camera.position.x, pz = camera.position.z, dp = Math.hypot(px - s.x, pz - s.z);
    let moving = false;
    if (dp < ACTIVE_R) {
      let speed = sp.speed;
      // Reactions to the player
      if (kind === 'dog' && dp < 9 && dp > 1.8) { s.tx = px; s.tz = pz; s.wait = 0; speed = 2.6; }
      if (kind === 'cat' && dp < 3.5) { s.tx = s.x + (s.x - px) * 2; s.tz = s.z + (s.z - pz) * 2; s.wait = 0; speed = 3; }
      if (kind === 'cow' && dp < 5) { s.wait = Math.max(s.wait, 1); }
      if (dp < 6 && !s.near) { s.near = true; playAnimal(kind, dp); s.call = 6 + Math.random() * 6; }
      if (dp > 9) s.near = false;
      s.call -= dt; if (s.call <= 0) { s.call = (kind === 'cow' ? 12 : 9) + Math.random() * 10; playAnimal(kind, dp); }
      if (s.wait > 0) {
        s.wait -= dt;
        if (s.wait <= 0) { const a = Math.random() * Math.PI * 2, d = Math.random() * r; s.tx = home[0] + Math.cos(a) * d; s.tz = home[1] + Math.sin(a) * d; }
      } else {
        const dx = s.tx - s.x, dz = s.tz - s.z, d = Math.hypot(dx, dz);
        if (d < 0.3 || (kind === 'dog' && dp < 1.8)) s.wait = 2 + Math.random() * 5;
        else {
          const want = Math.atan2(dx, dz); let dy = want - s.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          s.yaw += dy * Math.min(1, dt * 3);
          const step = Math.min(d, speed * dt); s.x += Math.sin(s.yaw) * step; s.z += Math.cos(s.yaw) * step;
          // keep inside the roaming area (cats may flee a bit further)
          const hx = s.x - home[0], hz = s.z - home[1], hd = Math.hypot(hx, hz), lim = r * (kind === 'cat' ? 2 : 1.2);
          if (hd > lim) { s.x = home[0] + (hx / hd) * lim; s.z = home[1] + (hz / hd) * lim; s.wait = 1; }
          moving = true; s.phase += dt * speed * (kind === 'cow' ? 4 : 7);
        }
      }
      // cows look at you when close
      if (head.current) { let hy = 0; if (kind !== 'cat' && dp < 8) { hy = Math.atan2(px - s.x, pz - s.z) - s.yaw; hy = Math.max(-0.8, Math.min(0.8, Math.atan2(Math.sin(hy), Math.cos(hy)))); } head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, hy, 4, dt); }
    }
    o.position.set(s.x, 0, s.z); o.rotation.y = s.yaw;
    const sw = moving ? Math.sin(s.phase) * 0.55 : 0;
    legs.forEach((l, i) => { if (l.current) l.current.rotation.x = THREE.MathUtils.damp(l.current.rotation.x, (i === 0 || i === 3 ? sw : -sw), 10, dt); });
    if (tail.current) tail.current.rotation.y = Math.sin(performance.now() / (kind === 'dog' ? 120 : 600) + seed) * (kind === 'dog' ? 0.6 : 0.25);
  });
  const { len, w, h, legH, body, spot } = sp, B = mat(body), S = mat(spot ?? body), dark = mat('#1a1614'), pink = mat('#d8a8a0');
  const bodyY = legH + h / 2;
  return (
    <group ref={g}>
      <mesh material={B} position={[0, bodyY, 0]}><boxGeometry args={[w, h, len]} /></mesh>
      {spot && <mesh material={S} position={[0.01, bodyY + h * 0.15, -len * 0.15]}><boxGeometry args={[w * 1.02, h * 0.55, len * 0.35]} /></mesh>}
      {spot && <mesh material={S} position={[-0.01, bodyY - h * 0.1, len * 0.22]}><boxGeometry args={[w * 1.02, h * 0.45, len * 0.22]} /></mesh>}
      {kind === 'cow' && <mesh material={pink} position={[0, legH - 0.02, -len * 0.25]}><boxGeometry args={[0.28, 0.16, 0.3]} /></mesh>}
      <group ref={head} position={[0, bodyY + h * 0.25, len / 2]}>
        <mesh material={B} position={[0, 0, w * 0.45]}><boxGeometry args={[w * 0.7, h * 0.75, w * 0.9]} /></mesh>
        <mesh material={kind === 'cow' ? pink : dark} position={[0, -h * 0.15, w * 0.95]}><boxGeometry args={[w * 0.5, h * 0.35, w * 0.25]} /></mesh>
        {kind === 'cow' && [-1, 1].map((sx) => <mesh key={sx} material={mat('#d9cfb8')} position={[sx * w * 0.42, h * 0.38, w * 0.3]} rotation={[0, 0, sx * -0.9]}><coneGeometry args={[0.04, 0.22, 5]} /></mesh>)}
        {[-1, 1].map((sx) => <mesh key={`e${sx}`} material={B} position={[sx * w * 0.3, h * 0.42, w * 0.25]} rotation={[0, 0, sx * -0.3]}>{kind === 'cow' ? <boxGeometry args={[0.18, 0.06, 0.1]} /> : <coneGeometry args={[w * 0.14, h * 0.4, 4]} />}</mesh>)}
        {[-1, 1].map((sx) => <mesh key={`y${sx}`} material={dark} position={[sx * w * 0.2, h * 0.1, w * 0.91]}><sphereGeometry args={[w * 0.05, 6, 5]} /></mesh>)}
      </group>
      <group ref={tail} position={[0, bodyY + h * 0.3, -len / 2]}>
        <mesh material={B} position={[0, kind === 'cat' ? h * 0.8 : -h * 0.1, -0.05]} rotation={[kind === 'cat' ? 0.25 : kind === 'dog' ? -0.7 : 0.15, 0, 0]}><boxGeometry args={[w * 0.12, kind === 'cat' ? h * 2 : h * 1.2, w * 0.12]} /></mesh>
      </group>
      {([[-1, 1], [1, 1], [-1, -1], [1, -1]] as const).map(([sx, sz], i) => (
        <group key={i} ref={legs[i]} position={[sx * w * 0.32, legH, sz * len * 0.38]}>
          <mesh material={B} position={[0, -legH / 2, 0]}><boxGeometry args={[w * 0.22, legH, w * 0.22]} /></mesh>
          <mesh material={dark} position={[0, -legH + 0.03, 0.01]}><boxGeometry args={[w * 0.24, 0.06, w * 0.27]} /></mesh>
        </group>
      ))}
    </group>
  );
};

/** A crow: rests and pecks on the ground; caws and takes off when you come near, circles, then lands again. */
const Crow: React.FC<{ home: [number, number]; seed: number }> = ({ home, seed }) => {
  const { camera } = useThree();
  const g = useRef<THREE.Group>(null), wl = useRef<THREE.Mesh>(null), wr = useRef<THREE.Mesh>(null);
  const s = useRef({ x: home[0] + Math.cos(seed * 2.1) * 4, z: home[1] + Math.sin(seed * 2.1) * 4, y: 0, fly: 0, a: seed });
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05), o = g.current, c = s.current; if (!o) return;
    const dp = Math.hypot(camera.position.x - c.x, camera.position.z - c.z), t = clock.elapsedTime;
    if (c.fly <= 0 && dp < 9) { c.fly = 14 + Math.random() * 8; playAnimal('crow', dp); }
    let flap = 0;
    if (c.fly > 0) {
      c.fly -= dt; c.a += dt * 0.45; // ~10 m/s around a 22 m circle
      const tx = home[0] + Math.cos(c.a) * 22, tz = home[1] + Math.sin(c.a) * 22, ty = c.fly > 2 ? 14 + Math.sin(t + seed) * 2 : 0;
      c.x += (tx - c.x) * Math.min(1, dt * 1.5); c.z += (tz - c.z) * Math.min(1, dt * 1.5); c.y += (ty - c.y) * Math.min(1, dt * 1.2);
      o.rotation.set(0, -c.a, 0); flap = Math.sin(t * 16 + seed) * 0.9;
      if (c.fly <= 0 && dp < 9) c.fly = 6;
    } else {
      c.y = 0; o.rotation.set(Math.max(0, Math.sin(t * 2 + seed * 5)) * 0.5, seed, 0); // pecking
    }
    o.position.set(c.x, c.y + 0.12, c.z);
    if (wl.current) wl.current.rotation.z = c.fly > 0 ? flap : 1.2;
    if (wr.current) wr.current.rotation.z = c.fly > 0 ? -flap : -1.2;
  });
  const black = mat('#0f1012'), beak = mat('#3a3328');
  return (
    <group ref={g}>
      <mesh material={black} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.09, 0.4, 6]} /></mesh>
      <mesh material={black} position={[0, 0.06, 0.16]}><sphereGeometry args={[0.07, 8, 6]} /></mesh>
      <mesh material={beak} position={[0, 0.05, 0.25]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.025, 0.09, 4]} /></mesh>
      <mesh ref={wl} material={black} position={[-0.05, 0.03, 0]}><boxGeometry args={[0.45, 0.015, 0.18]} /></mesh>
      <mesh ref={wr} material={black} position={[0.05, 0.03, 0]}><boxGeometry args={[0.45, 0.015, 0.18]} /></mesh>
    </group>
  );
};

/** Mounts each herd only when the player is near it, stage by stage. */
export const VillageAnimals: React.FC = () => {
  const { camera } = useThree();
  const [near, setNear] = useState<boolean[]>(() => HERDS.map(() => false));
  const tick = useRef(0);
  useFrame((_, dt) => {
    tick.current += dt; if (tick.current < 0.5) return; tick.current = 0;
    const next = HERDS.map((h, i) => { const d = Math.hypot(camera.position.x - h.home[0], camera.position.z - h.home[1]); return near[i] ? d < MOUNT_R + 15 : d < MOUNT_R; });
    if (next.some((v, i) => v !== near[i])) setNear(next);
  });
  const list = useMemo(() => HERDS.flatMap((h, i) => Array.from({ length: h.n }, (_, k) => ({ h, i, k }))), []);
  return (
    <group>
      {list.map(({ h, i, k }) => !near[i] ? null : h.kind === 'crow'
        ? <Crow key={`${i}-${k}`} home={h.home} seed={i * 7 + k * 1.7} />
        : <Animal key={`${i}-${k}`} kind={h.kind} home={h.home} r={h.r} seed={i * 3 + k * 2.3} />)}
    </group>
  );
};
export default VillageAnimals;
