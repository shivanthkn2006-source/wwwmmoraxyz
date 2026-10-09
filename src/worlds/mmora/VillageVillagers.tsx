/**
 * M'Mora Village people: men in long dark coats and caps, women in dark
 * shawls/headscarves and long skirts, walking slow loops on the village lanes
 * with swinging arms and legs. Mounted only within ~80 m, animated within 45 m.
 */
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { headGeometry, HIP_Y, SHOULDER_Y, HIP_X, SHOULDER_X, HUMAN_MATERIAL } from '@/lib/vrHumanLook';

function part(g: THREE.BufferGeometry, color: string, x: number, y: number, z: number) {
  const ng = g.index ? g.toNonIndexed() : g;
  if (ng.getAttribute('uv')) ng.deleteAttribute('uv');
  ng.translate(x, y, z);
  const c = new THREE.Color(color), n = ng.getAttribute('position').count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  ng.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return ng;
}

const COAT = ['#1f1d1b', '#2a2620', '#24201c', '#1a1c20'];
function villagerGeo(female: boolean, v: number) {
  const coat = COAT[v % COAT.length];
  const head = headGeometry(female); head.translate(0, 1.66, 0);
  const torso = female
    ? [part(new THREE.CylinderGeometry(0.2, 0.36, 0.95, 10), '#2b2420', 0, 0.62, 0), // long skirt
       part(new THREE.BoxGeometry(0.4, 0.5, 0.24), coat, 0, 1.26, 0),
       part(new THREE.SphereGeometry(0.175, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), '#3a2a22', 0, 1.69, -0.01), // headscarf
       part(new THREE.BoxGeometry(0.46, 0.14, 0.28), '#3a2a22', 0, 1.46, 0)] // shawl
    : [part(new THREE.BoxGeometry(0.46, 0.95, 0.27), coat, 0, 1.06, 0), // long coat to the knee
       part(new THREE.BoxGeometry(0.48, 0.08, 0.29), '#120f0c', 0, 0.98, 0), // belt
       part(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 12), '#151310', 0, 1.82, 0), // flat cap
       part(new THREE.BoxGeometry(0.2, 0.02, 0.14), '#151310', 0, 1.8, 0.14)];
  const body = mergeGeometries([...torso, part(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), '#e1c3a4', 0, 1.55, 0), head])!;
  const leg = mergeGeometries([
    part(new THREE.CapsuleGeometry(0.07, 0.72, 3, 8), female ? '#1a1612' : '#2e2a26', 0, -0.42, 0),
    part(new THREE.BoxGeometry(0.13, 0.08, 0.26), '#14110e', 0, -0.86, 0.04),
  ])!;
  const arm = mergeGeometries([
    part(new THREE.CapsuleGeometry(0.06, 0.48, 3, 8), coat, 0, -0.26, 0),
    part(new THREE.SphereGeometry(0.05, 8, 6), '#d8b898', 0, -0.56, 0),
  ])!;
  return { body, leg, arm };
}

// Closed loops on open lanes between the houses.
const ROUTES: [number, number][][] = [
  [[-12, -12], [12, -12], [12, 12], [-12, 12]],
  [[-52, -28], [52, -28], [52, 50], [-52, 50]],
  [[0, -26], [24, 0], [0, 32], [-30, 0]],
];
const PEOPLE = [
  { r: 0, f: false, o: 0 }, { r: 0, f: true, o: 0.5 }, { r: 1, f: true, o: 0.1 },
  { r: 1, f: false, o: 0.6 }, { r: 2, f: false, o: 0.3 }, { r: 2, f: true, o: 0.8 },
];

function loopPoint(route: [number, number][], t: number, out: THREE.Vector3) {
  const segs = route.map((p, i) => { const q = route[(i + 1) % route.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); });
  const total = segs.reduce((a, b) => a + b, 0);
  let d = (((t % 1) + 1) % 1) * total;
  for (let i = 0; i < route.length; i++) {
    if (d <= segs[i]) { const p = route[i], q = route[(i + 1) % route.length], k = d / segs[i]; out.set(p[0] + (q[0] - p[0]) * k, 0, p[1] + (q[1] - p[1]) * k); return total; }
    d -= segs[i];
  }
  return total;
}

const Villager: React.FC<{ route: [number, number][]; female: boolean; offset: number; v: number }> = ({ route, female, offset, v }) => {
  const g = useMemo(() => villagerGeo(female, v), [female, v]);
  const root = useRef<THREE.Group>(null), l1 = useRef<THREE.Mesh>(null), l2 = useRef<THREE.Mesh>(null), a1 = useRef<THREE.Mesh>(null), a2 = useRef<THREE.Mesh>(null);
  const st = useRef({ t: offset, pause: 0 });
  const p = useMemo(() => new THREE.Vector3(), []), n = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();
  useFrame((s, raw) => {
    const dt = Math.min(raw, 0.05); if (!root.current) return;
    const near = root.current.position.distanceTo(camera.position);
    if (near > 45) return;
    const speed = female ? 1.1 : 1.25; // m/s, a slow village walk
    const total = loopPoint(route, st.current.t, p);
    // Stop and look at you when you come close.
    const stop = near < 3;
    if (!stop) st.current.t += (speed * dt) / total;
    loopPoint(route, st.current.t + 0.002, n);
    root.current.position.copy(p);
    if (stop) root.current.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
    else root.current.rotation.y = Math.atan2(n.x - p.x, n.z - p.z);
    const sw = stop ? 0 : Math.sin(s.clock.elapsedTime * speed * 4.2 + offset * 9) * 0.45;
    if (l1.current) l1.current.rotation.x = sw; if (l2.current) l2.current.rotation.x = -sw;
    if (a1.current) a1.current.rotation.x = -sw * 0.7; if (a2.current) a2.current.rotation.x = sw * 0.7;
  });
  useMemo(() => loopPoint(route, offset, p), [route, offset, p]);
  return (
    <group ref={root} position={p.toArray()}>
      <mesh geometry={g.body} material={HUMAN_MATERIAL} />
      <mesh ref={l1} geometry={g.leg} material={HUMAN_MATERIAL} position={[-HIP_X, HIP_Y, 0]} />
      <mesh ref={l2} geometry={g.leg} material={HUMAN_MATERIAL} position={[HIP_X, HIP_Y, 0]} />
      <mesh ref={a1} geometry={g.arm} material={HUMAN_MATERIAL} position={[-SHOULDER_X - (female ? 0 : 0.02), SHOULDER_Y, 0]} />
      <mesh ref={a2} geometry={g.arm} material={HUMAN_MATERIAL} position={[SHOULDER_X + (female ? 0 : 0.02), SHOULDER_Y, 0]} />
    </group>
  );
};

export const VillageVillagers: React.FC = () => {
  const { camera } = useThree();
  const [on, setOn] = React.useState(true);
  useFrame(() => {
    const d = Math.hypot(camera.position.x, camera.position.z);
    if (on && d > 140) setOn(false); else if (!on && d < 120) setOn(true);
  });
  if (!on) return null;
  return <>{PEOPLE.map((q, i) => <Villager key={i} route={ROUTES[q.r]} female={q.f} offset={q.o} v={i} />)}</>;
};
