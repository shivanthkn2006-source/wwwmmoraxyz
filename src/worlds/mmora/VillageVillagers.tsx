import { VILLAGER_STORY, logStory } from '@/lib/vrStoryline';
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
import { setBodySolid } from '@/lib/vrSolids';
import { getEquipped, gearStats, equippedWeapon, WEAPON_FIGHT } from '@/lib/vrGear';
import { fire, reload, canReload, usesAmmo, getAmmo, dropAmmo } from '@/lib/vrAmmo';
const lastSwing = { v: 0 };
import { getVRView } from '@/lib/vrView';
/** Where the player's body stands: the camera in first person, 2.8 m ahead of it in third person (matches ThirdPersonAvatar). */
const _e = new THREE.Euler();
export function playerSpot(cam: THREE.Camera): { x: number; z: number } {
  if (!getVRView().thirdPerson) return { x: cam.position.x, z: cam.position.z };
  const yaw = _e.setFromQuaternion(cam.quaternion, 'YXZ').y;
  return { x: cam.position.x - Math.sin(yaw) * 2.8, z: cam.position.z - Math.cos(yaw) * 2.8 };
}
import { Html } from '@react-three/drei';
import { hasGear } from '@/lib/vrGear';
/** Story lines follow the quest board: what villagers say changes as missions are done. */
const STORY: Record<string, string[]> = VILLAGER_STORY;
const storyStage = () => !hasGear('map') ? 'map' : !hasGear('medallion') ? 'medallion' : !hasGear('crest') ? 'crest' : 'done';
let lastSpoken = 0;
const LINES = ['Stranger… the church bell rang at midnight again.', 'Mind the castle on the hill. Nobody comes back the same.', 'Lost the old village map near the lanes, I did.', 'The altar holds a medallion. Pray before you take it.', 'Wolves came down from the hills last winter.', 'Warm yourself by the fire, traveller.', 'Have you seen the Lord\'s crest? It belongs in the keep.', 'Sit on a bench a while — it pays to rest here.'];
import { playPickup } from '@/lib/vrSfx';
import { VILLAGER_ROUTES } from './villageMap';

const VILLAGER_HP = 60;
const RESPAWN_S = 60;
import { headGeometry, HIP_Y, SHOULDER_Y, HIP_X, SHOULDER_X, HUMAN_MATERIAL } from '@/lib/vrHumanLook';
import { choreFor, milkPlanFor, cowSpot, milkSeat, milkCows, milkerState, routeT } from './villageChores';

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
  // finer clothing detail: collar, buttons, satchel strap/bag (men) or apron + waist tie (women), sleeve-less vest edge
  const extra = female
    ? [part(new THREE.BoxGeometry(0.34, 0.62, 0.02), '#6b5e4c', 0, 0.78, 0.2), // apron
       part(new THREE.BoxGeometry(0.42, 0.04, 0.26), '#4e3f30', 0, 1.06, 0.01), // waist tie
       part(new THREE.TorusGeometry(0.1, 0.025, 6, 12), '#3a2a22', 0, 1.52, 0)] // shawl knot
    : [part(new THREE.BoxGeometry(0.3, 0.08, 0.06), '#141210', 0, 1.5, 0.12), // collar
       ...[1.4, 1.27, 1.14].map((y) => part(new THREE.SphereGeometry(0.018, 6, 4), '#8c7a55', 0, y, 0.14)), // buttons
       part(new THREE.BoxGeometry(0.05, 0.8, 0.02), '#3b2a1c', 0.05, 1.1, 0.145), // satchel strap
       part(new THREE.BoxGeometry(0.22, 0.2, 0.08), '#4a3424', 0.26, 0.84, 0.06)]; // satchel
  if (v % 3 === 1 && !female) extra.push(part(new THREE.BoxGeometry(0.16, 0.08, 0.1), '#5a5048', 0, 1.6, 0.12)); // grey beard
  const body = mergeGeometries([...torso, ...extra, part(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), '#e1c3a4', 0, 1.55, 0), head])!;
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

// Walking loops that follow the village lanes and roads (villageMap), never through houses or gardens.
const ROUTES: [number, number][][] = VILLAGER_ROUTES;
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
  const tripRef = useRef<{ leg: 'road' | 'out' | 'milk' | 'back'; i: number }>({ leg: 'road', i: 0 });
  const hpBar = useRef<THREE.Mesh>(null);
  const pail = useRef<THREE.Group>(null), broom = useRef<THREE.Group>(null), logs = useRef<THREE.Group>(null);
  const p = useMemo(() => new THREE.Vector3(), []), n = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();
  React.useEffect(() => () => setBodySolid(`villager:${v}`, null), [v]);
  useFrame(() => { const r = root.current; setBodySolid(`villager:${v}`, r?.visible && st.current.down <= 0 ? { x: r.position.x, z: r.position.z, radius: 0.35 } : null); });
  useFrame((s, raw) => {
    const dt = Math.max(0, Math.min(raw, 0.05)); if (!root.current) return;
    const c = st.current;
    // Like real villagers: indoors asleep 22:00–06:00 local time (unless already chasing you).
    const hr = new Date().getHours();
    const asleep = (hr >= 22 || hr < 6) && !c.hostile && c.down <= 0;
    root.current.visible = !asleep;
    if (asleep) { if (bubble.current) bubble.current.style.display = 'none'; return; }
    if (milkPlanFor(v)) milkerState.set(v, { leg: tripRef.current.leg, x: root.current.position.x, z: root.current.position.z });
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
        if (near < 4 && !st.current.hostile && nowS - lastSpoken > 12000) { lastSpoken = nowS; logStory('villager', `${female ? 'female' : 'male'}:${storyStage()}`); void import('@/utils/deepgramTTS').then((m) => m.speakWithDeepgramVoice(line, female ? 'female' : 'male')).catch(() => {}); } } }
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
    // Daily chores by local hour (villageChores): milking, sweeping, carrying firewood.
    const chore = choreFor(v, hr);
    const tt = s.clock.elapsedTime;
    const plan = milkPlanFor(v), trip = tripRef.current;
    if (pail.current) pail.current.visible = chore === 'milk' || trip.leg !== 'road';
    if (broom.current) broom.current.visible = chore === 'sweep';
    if (logs.current) logs.current.visible = chore === 'wood';
    if (plan) {
      const cow = cowSpot(plan), seat = milkSeat(cow);
      const path: [number, number][] = [route[plan.gate], ...plan.track, seat];
      const walkTo = (tx: number, tz: number) => {
        const r = root.current!, dx = tx - r.position.x, dz = tz - r.position.z, d = Math.hypot(dx, dz);
        const step = Math.min(d, WALK_MPS * (female ? 0.95 : 1) * dt);
        if (d > 1e-3) { r.position.x += (dx / d) * step; r.position.z += (dz / d) * step; r.rotation.y = Math.atan2(dx, dz); }
        r.position.y = 0; r.rotation.x = 0;
        c.phase += (step / 1.4) * Math.PI * 2; const sw = Math.sin(c.phase) * 0.5;
        if (l1.current) l1.current.rotation.x = sw; if (l2.current) l2.current.rotation.x = -sw;
        if (a1.current) a1.current.rotation.x = -sw * 0.7; if (a2.current) a2.current.rotation.x = -0.5; // pail in hand
        return d < 0.25;
      };
      const held = milkCows.get(plan.cow);
      if (trip.leg === 'road' && chore === 'milk') {
        const g = route[plan.gate];
        if (Math.hypot(root.current.position.x - g[0], root.current.position.z - g[1]) < 1.2) { trip.leg = 'out'; trip.i = 1; }
      }
      if (trip.leg === 'out') {
        if (chore !== 'milk') { trip.leg = 'back'; trip.i = Math.max(0, trip.i - 1); }
        else if (walkTo(...((trip.i >= path.length - 1 ? seat : path[trip.i]) as [number, number]))) { if (trip.i >= path.length - 1) trip.leg = 'milk'; else trip.i++; }
        return;
      }
      if (trip.leg === 'milk') {
        if (chore !== 'milk') { if (held) held.held = false; trip.leg = 'back'; trip.i = path.length - 2; return; }
        if (held) held.held = true;
        root.current.position.set(seat[0], -0.32, seat[1]);
        root.current.rotation.y = Math.atan2(cow.x - seat[0], cow.z - seat[1]); // facing the cow's flank
        if (l1.current) l1.current.rotation.x = -1.3; if (l2.current) l2.current.rotation.x = -1.3; // crouched on a stool
        if (a1.current) a1.current.rotation.x = -1.0 + Math.sin(tt * 5) * 0.18;
        if (a2.current) a2.current.rotation.x = -1.0 - Math.sin(tt * 5) * 0.18;
        return;
      }
      if (trip.leg === 'back') {
        if (walkTo(...path[trip.i])) { if (trip.i <= 0) { trip.leg = 'road'; c.t = routeT(route, plan.gate); } else trip.i--; }
        return;
      }
    }
    if (chore === 'sweep') {
      loopPoint(route, st.current.t, p); root.current.position.copy(p);
      root.current.rotation.y = Math.sin(tt * 0.3) * 0.6; // sweeping the doorstep, turning slowly
      if (l1.current) l1.current.rotation.x = 0; if (l2.current) l2.current.rotation.x = 0;
      if (a1.current) a1.current.rotation.x = -0.6 + Math.sin(tt * 2.6) * 0.35;
      if (a2.current) a2.current.rotation.x = -0.6 + Math.sin(tt * 2.6) * 0.35;
      return;
    }
    root.current.position.y = 0;
    const speed = WALK_MPS * (female ? 0.95 : 1) * (chore === 'wood' ? 0.8 : 1); // same human pace as you
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
    if (chore === 'wood') { if (a1.current) a1.current.rotation.x = -1.1; if (a2.current) a2.current.rotation.x = -1.1; }
    else { if (a1.current) a1.current.rotation.x = -sw * 0.7; if (a2.current) a2.current.rotation.x = sw * 0.7; }
  });
  React.useEffect(() => registerUse(() => {
    const r = root.current; if (!r || st.current.down > 0) return null;
    const weapon = equippedWeapon();
    if (!weapon || !st.current.hostile) {
      // Any calm villager sells a headlamp for night walks.
      const ps0 = playerSpot(camera); const d0 = Math.hypot(ps0.x - r.position.x, ps0.z - r.position.z);
      if (!hasGear('headlamp') && !st.current.hostile && r.visible && d0 < 2.5) return { dist: d0 * 0.6, reach: 2.5, label: 'Buy Headlamp · 15 coins', run: () => {
        void import('@/lib/vrPickups').then(async (m) => {
          const gm = await import('@/lib/vrGear');
          if (gm.hasGear('headlamp')) return;
          if (!m.spendCoins(15)) { window.dispatchEvent(new CustomEvent('vr-toast', { detail: 'Not enough coins (15 needed)' })); return; }
          gm.takeGear(gm.GEAR.find((g) => g.id === 'headlamp')!); if (!gm.isEquipped('headlamp')) gm.toggleEquip('headlamp');
          window.dispatchEvent(new CustomEvent('vr-toast', { detail: 'Headlamp bought and worn · L to switch' }));
        });
      } };
      if (!weapon) return null;
    }
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
      const c = st.current; if (!c.hostile) window.dispatchEvent(new CustomEvent('vr-danger')); c.hostile = true; c.flash = 0.25;
      c.hp = Math.max(0, c.hp - attack);
      window.dispatchEvent(new CustomEvent('vr-hand-reach'));
      void import('@/lib/vrSfx').then((m) => m.playSfx(weapon === 'knife' ? 'knife' : weapon === 'rocket' ? 'rocket' : weapon === 'shotgun' ? 'shotgun' : 'gun'));
      if (c.hp <= 0) {
        c.down = RESPAWN_S; c.hostile = false; window.dispatchEvent(new CustomEvent('vr-kill'));
        void import('@/lib/vrPickups').then((m) => m.addCoins(5)); playPickup('coin');
        const wp = root.current?.getWorldPosition(new THREE.Vector3()); if (wp) window.dispatchEvent(new CustomEvent('vr-drop', { detail: { x: wp.x, z: wp.z } })); else dropAmmo();
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
      {/* chore props: milk pail + stool, broom, firewood bundle */}
      <group ref={pail} visible={false}>
        <mesh position={[0, 0.45, 0.45]}><cylinderGeometry args={[0.14, 0.11, 0.26, 12, 1, true]} /><meshStandardMaterial color="#8a8f94" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 0.5, 0.45]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.12, 12]} /><meshStandardMaterial color="#efeae0" roughness={0.3} /></mesh>
        <mesh position={[0, 0.42, -0.1]}><cylinderGeometry args={[0.16, 0.16, 0.06, 10]} /><meshStandardMaterial color="#4a3526" roughness={0.9} /></mesh>
      </group>
      <group ref={broom} visible={false} position={[0.15, 0.55, 0.35]} rotation={[0.5, 0, 0]}>
        <mesh><cylinderGeometry args={[0.02, 0.02, 1.3, 6]} /><meshStandardMaterial color="#5a4330" roughness={0.9} /></mesh>
        <mesh position={[0, -0.7, 0]}><coneGeometry args={[0.13, 0.3, 8]} /><meshStandardMaterial color="#a88a4f" roughness={1} /></mesh>
      </group>
      <group ref={logs} visible={false} position={[0, 1.15, 0.42]}>
        {[-0.08, 0, 0.08].map((y, i) => <mesh key={i} position={[0, y, i * 0.02]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 0.55, 7]} /><meshStandardMaterial color={i === 1 ? '#5b412c' : '#4a3424'} roughness={1} /></mesh>)}
      </group>
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
