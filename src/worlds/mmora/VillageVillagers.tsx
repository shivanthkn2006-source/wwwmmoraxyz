/**
 * M'Mora Village people: men in long dark coats and caps, women in dark
 * shawls/headscarves and long skirts, walking slow loops on the village lanes
 * with swinging arms and legs. Mounted only within ~80 m, animated within 45 m.
 */
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WALK_MPS, RUN_MPS } from '@/lib/vrWalk';
import { registerUse } from '@/lib/vrUse';
import { getEquipped, gearStats, equippedWeapon, WEAPON_FIGHT } from '@/lib/vrGear';
import { fire, reload, canReload, usesAmmo, getAmmo, dropAmmo } from '@/lib/vrAmmo';
const lastSwing = { v: 0 };
import { getVRView } from '@/lib/vrView';
/** Where the player's body stands: the camera in first person, 2.8 m ahead of it in third person (matches ThirdPersonAvatar). */
const _e = new THREE.Euler();
function playerSpot(cam: THREE.Camera): { x: number; z: number } {
  if (!getVRView().thirdPerson) return { x: cam.position.x, z: cam.position.z };
  const yaw = _e.setFromQuaternion(cam.quaternion, 'YXZ').y;
  return { x: cam.position.x - Math.sin(yaw) * 2.8, z: cam.position.z - Math.cos(yaw) * 2.8 };
}
import { Html } from '@react-three/drei';
import { hasGear } from '@/lib/vrGear';
/** Story lines follow the quest board: what villagers say changes as missions are done. */
const STORY: Record<string, string[]> = {
  map: ['Lost the old village map near the lanes, I did. Find it, stranger.', 'Without the map you will never find the church secret.'],
  medallion: ['You have the map! The altar in the church hides a medallion.', 'Go to the church. Pray before you take the medallion.'],
  crest: ['The medallion… then the castle keep is next. The Lord\'s crest waits there.', 'Climb to the castle. Bring back the Lord\'s crest.'],
  done: ['You found the crest! The village is in your debt.', 'They say you are the new lord of M\'Mora now.'],
};
const storyStage = () => !hasGear('map') ? 'map' : !hasGear('medallion') ? 'medallion' : !hasGear('crest') ? 'crest' : 'done';
let lastSpoken = 0;
const LINES = ['Stranger… the church bell rang at midnight again.', 'Mind the castle on the hill. Nobody comes back the same.', 'Lost the old village map near the lanes, I did.', 'The altar holds a medallion. Pray before you take it.', 'Wolves came down from the hills last winter.', 'Warm yourself by the fire, traveller.', 'Have you seen the Lord\'s crest? It belongs in the keep.', 'Sit on a bench a while — it pays to rest here.'];
import { playPickup } from '@/lib/vrSfx';

const VILLAGER_HP = 60;
const RESPAWN_S = 60;
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
  const bubble = useRef<HTMLDivElement>(null);
  const talkT = useRef(0), lineI = useRef(v);
  const g = useMemo(() => villagerGeo(female, v), [female, v]);
  const root = useRef<THREE.Group>(null), l1 = useRef<THREE.Mesh>(null), l2 = useRef<THREE.Mesh>(null), a1 = useRef<THREE.Mesh>(null), a2 = useRef<THREE.Mesh>(null);
  const st = useRef({ t: offset, pause: 0, phase: offset * 9, sw: 0, hp: VILLAGER_HP, hostile: false, down: 0, hitCd: 0, flash: 0 });
  const hpBar = useRef<THREE.Mesh>(null);
  const p = useMemo(() => new THREE.Vector3(), []), n = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();
  useFrame((s, raw) => {
    const dt = Math.min(raw, 0.05); if (!root.current) return;
    const c = st.current;
    if (c.down > 0) {
      // knocked down: lie on the ground, get up later with full health
      c.down -= dt; root.current.rotation.x = -Math.PI / 2; root.current.position.y = 0.2;
      if (c.down <= 0) { c.hp = VILLAGER_HP; root.current.rotation.x = 0; root.current.position.y = 0; }
      if (hpBar.current) hpBar.current.visible = false;
      return;
    }
    if (hpBar.current) { hpBar.current.visible = c.hp < VILLAGER_HP; hpBar.current.scale.x = Math.max(0.01, c.hp / VILLAGER_HP); }
    const near = root.current.position.distanceTo(camera.position);
    if (bubble.current) {
      const show = near < 6 && st.current.down <= 0;
      bubble.current.style.display = show ? 'block' : 'none';
      if (show) { talkT.current -= dt; if (talkT.current <= 0) { talkT.current = 6; lineI.current = (lineI.current + 1) % LINES.length; const story = STORY[storyStage()];
        const line = st.current.hostile ? 'Get away from me!' : lineI.current % 2 === 0 ? story[(lineI.current / 2) % story.length] : LINES[lineI.current];
        bubble.current.textContent = line;
        // Zoe reads the story line aloud when you stand close (one villager every 12 s at most).
        const nowS = performance.now();
        if (near < 4 && !st.current.hostile && nowS - lastSpoken > 12000) { lastSpoken = nowS; void import('@/utils/deepgramTTS').then((m) => m.speakWithDeepgramVoice(line, female ? 'female' : 'male')).catch(() => {}); } } }
      else talkT.current = 0;
    }
    if (near > 45) { c.hostile = false; return; }
    if (c.hostile) {
      // chase you and swing; Defence softens each hit
      const ps = playerSpot(camera); const dx = ps.x - root.current.position.x, dz = ps.z - root.current.position.z, dd = Math.hypot(dx, dz) || 1;
      root.current.rotation.y = Math.atan2(dx, dz);
      if (dd > 1.3) { root.current.position.x += (dx / dd) * RUN_MPS * 0.7 * dt; root.current.position.z += (dz / dd) * RUN_MPS * 0.7 * dt; c.phase += dt * 11; }
      c.hitCd -= dt;
      if (dd <= 1.6 && c.hitCd <= 0) {
        c.hitCd = 1.4;
        const { defence } = gearStats(getEquipped());
        window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: Math.max(2, Math.round(12 * (1 - defence / 60))) } }));
        if (defence > 0) window.dispatchEvent(new CustomEvent('vr-shield'));
      }
      if (dd > 25) c.hostile = false;
      const sw = Math.sin(c.phase) * 0.6;
      if (l1.current) l1.current.rotation.x = sw; if (l2.current) l2.current.rotation.x = -sw;
      if (a1.current) a1.current.rotation.x = -sw; if (a2.current) a2.current.rotation.x = c.hitCd > 1.1 ? -1.6 : sw;
      return;
    }
    const speed = WALK_MPS * (female ? 0.95 : 1); // same human pace as you
    const total = loopPoint(route, st.current.t, p);
    // Stop and look at you when you come close.
    const stop = near < 3;
    if (!stop) st.current.t += (speed * dt) / total;
    loopPoint(route, st.current.t + 0.002, n);
    root.current.position.copy(p);
    if (stop) root.current.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
    else root.current.rotation.y = Math.atan2(n.x - p.x, n.z - p.z);
    // Stride follows distance walked (about 1.4 m per full step cycle), easing in/out when stopping.
    if (!stop) st.current.phase += (speed * dt / 1.4) * Math.PI * 2;
    const target = stop ? 0 : Math.sin(st.current.phase) * 0.5;
    st.current.sw += (target - st.current.sw) * (1 - Math.exp(-dt * 18));
    const sw = st.current.sw;
    if (l1.current) l1.current.rotation.x = sw; if (l2.current) l2.current.rotation.x = -sw;
    if (a1.current) a1.current.rotation.x = -sw * 0.7; if (a2.current) a2.current.rotation.x = sw * 0.7;
  });
  React.useEffect(() => registerUse(() => {
    const r = root.current; if (!r || st.current.down > 0) return null;
    const weapon = equippedWeapon();
    if (!weapon) return null;
    const wf = WEAPON_FIGHT[weapon];
    const ps = playerSpot(camera); const d = Math.hypot(ps.x - r.position.x, ps.z - r.position.z);
    if (d > wf.reach) return null;
    const empty = usesAmmo(weapon) && (getAmmo()[weapon]?.inMag ?? 0) <= 0;
    if (empty) return { dist: d, reach: wf.reach, label: canReload(weapon) ? 'Reload' : 'No ammo', run: () => { reload(weapon); } };
    return { dist: d, reach: wf.reach, label: wf.label, run: () => {
      const now = performance.now() / 1000;
      if (now < lastSwing.v + wf.cooldown) return;
      if (!fire(weapon)) return;
      lastSwing.v = now;
      const { attack } = gearStats(getEquipped());
      const c = st.current; c.hostile = true; c.flash = 0.25;
      c.hp = Math.max(0, c.hp - attack);
      window.dispatchEvent(new CustomEvent('vr-hand-reach'));
      if (weapon !== 'knife') playPickup('coin');
      if (c.hp <= 0) {
        c.down = RESPAWN_S; c.hostile = false;
        void import('@/lib/vrPickups').then((m) => m.addCoins(5)); dropAmmo(); playPickup('coin');
      }
    } };
  }), [camera]);
  useMemo(() => loopPoint(route, offset, p), [route, offset, p]);
  return (
    <group ref={root} position={p.toArray()}>
      <mesh geometry={g.body} material={HUMAN_MATERIAL} />
      <mesh ref={l1} geometry={g.leg} material={HUMAN_MATERIAL} position={[-HIP_X, HIP_Y, 0]} />
      <mesh ref={l2} geometry={g.leg} material={HUMAN_MATERIAL} position={[HIP_X, HIP_Y, 0]} />
      <mesh ref={a1} geometry={g.arm} material={HUMAN_MATERIAL} position={[-SHOULDER_X - (female ? 0 : 0.02), SHOULDER_Y, 0]} />
      <Html position={[0, 2.35, 0]} center occlude={false} zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={bubble} style={{ display: 'none', maxWidth: 180, background: '#fff', color: '#000', fontFamily: 'Georgia, serif', fontSize: 12, lineHeight: 1.3, padding: '5px 9px', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,.35)' }} />
      </Html>
      <mesh ref={hpBar} position={[0, 2.15, 0]} visible={false}><planeGeometry args={[0.6, 0.06]} /><meshBasicMaterial color="#c0392b" side={THREE.DoubleSide} /></mesh>
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
