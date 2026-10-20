/**
 * Grenade throwing + effects, shared by both worlds (mounted beside the
 * avatar). Equip a grenade, then Use (or G) throws it in the camera's facing
 * direction on a real arc. Frag: fireball, sparks, shock ring, smoke.
 * Flash: blinding white burst + screen whiteout. Incendiary: bursts on
 * impact into a burning patch. Smoke: thick lasting cloud. One instance,
 * capped effects, soft sprite smoke (no downloads) to stay light on phones.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEquipped } from '@/lib/vrGear';
import { registerUse } from '@/lib/vrUse';
import { GRENADE_SPEC, emitBlast, grenadeCount, isGrenade, spendGrenade, throwArc, type GrenadeKind } from '@/lib/vrGrenades';
import { AVATAR_AHEAD, villageEyeHeight } from '@/lib/vrView';
import { getWorldState } from '@/worlds/worldMode';
import { avatarMotion } from '@/lib/vrAvatarMotion';
import { playSfx } from '@/lib/vrSfx';
import { HeldWeaponModel } from './features/HeldWeaponModel';

type Proj = { id: number; kind: GrenadeKind; o: THREE.Vector3; d: { x: number; z: number }; t: number; landed: THREE.Vector3 | null };
type Fx = { id: number; kind: GrenadeKind; x: number; z: number };
let seq = 0;

let puffTex: THREE.Texture | null = null;
function puff() {
  if (puffTex) return puffTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!; const r = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  puffTex = new THREE.CanvasTexture(c); return puffTex;
}

function whiteout(strength: number) {
  const el = document.createElement('div');
  Object.assign(el.style, { position: 'fixed', inset: '0', background: '#fff', opacity: String(strength), pointerEvents: 'none', zIndex: '9999', transition: 'opacity 2.6s ease-in' });
  el.setAttribute('data-testid', 'flash-whiteout');
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '0'; }));
  window.setTimeout(() => el.remove(), 2900);
}

const Effect: React.FC<{ fx: Fx; onDone: (id: number) => void }> = ({ fx, onDone }) => {
  const spec = GRENADE_SPEC[fx.kind];
  const age = useRef(0), tick = useRef(0);
  const ball = useRef<THREE.Mesh>(null), ring = useRef<THREE.Mesh>(null), light = useRef<THREE.PointLight>(null);
  const sparks = useRef<THREE.Points>(null), flames = useRef<THREE.Group>(null), smoke = useRef<THREE.Group>(null);
  const life = Math.max(spec.smoke, spec.burn, 1.2) + 1.5;
  const sparkData = useMemo(() => {
    const n = 48, pos = new Float32Array(n * 3), vel: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) vel.push(new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(6 + Math.random() * 8));
    return { pos, vel };
  }, []);
  const puffs = useMemo(() => Array.from({ length: fx.kind === 'smokegrenade' ? 18 : 10 }, (_, i) => ({
    x: (Math.random() - 0.5) * (fx.kind === 'smokegrenade' ? spec.radius : 2), z: (Math.random() - 0.5) * (fx.kind === 'smokegrenade' ? spec.radius : 2),
    rise: 0.4 + Math.random() * 0.8, delay: i * 0.08, size: 1.5 + Math.random() * 1.5,
  })), [fx.kind, spec.radius]);
  const flameSpots = useMemo(() => Array.from({ length: 12 }, () => { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spec.radius * 0.8; return [Math.cos(a) * r, Math.sin(a) * r, 0.6 + Math.random() * 0.8] as const; }), [spec.radius]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05); age.current += dt; const a = age.current;
    if (a > life) { onDone(fx.id); return; }
    if (ball.current) {
      const peak = fx.kind === 'flashgrenade' ? 0.12 : 0.35;
      const k = Math.min(1, a / peak), fade = Math.max(0, 1 - (a - peak) / (fx.kind === 'flashgrenade' ? 0.25 : 0.6));
      ball.current.scale.setScalar(0.2 + k * (fx.kind === 'flashgrenade' ? 3.5 : 2.6));
      const m = ball.current.material as THREE.MeshBasicMaterial; m.opacity = a < peak ? 1 : fade;
      if (fx.kind === 'fraggrenade') m.color.setRGB(1, 0.55 * fade + 0.15, 0.1 * fade);
      ball.current.visible = m.opacity > 0.01;
    }
    if (ring.current) { ring.current.scale.setScalar(0.5 + a * 14); (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - a * 1.6); }
    if (light.current) {
      const base = fx.kind === 'flashgrenade' ? 60 : fx.kind === 'incgrenade' ? 14 : 30;
      light.current.intensity = fx.kind === 'incgrenade' && a < spec.burn ? base * (0.6 + Math.random() * 0.4) : Math.max(0, base * (1 - a / 0.6));
    }
    if (sparks.current) {
      const { pos, vel } = sparkData;
      for (let i = 0; i < vel.length; i++) {
        const t = a; pos[i * 3] = vel[i].x * t * 0.6; pos[i * 3 + 1] = Math.max(0.02, 0.4 + vel[i].y * t - 4.9 * t * t); pos[i * 3 + 2] = vel[i].z * t * 0.6;
      }
      sparks.current.geometry.attributes.position.needsUpdate = true;
      (sparks.current.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - a / 1.2);
    }
    if (flames.current) {
      const burning = a < spec.burn;
      flames.current.visible = burning;
      flames.current.children.forEach((f, i) => { const s = (0.7 + Math.sin(a * 13 + i * 1.7) * 0.25 + Math.random() * 0.1) * Math.min(1, a * 4); f.scale.set(s, s * (1 + Math.sin(a * 9 + i) * 0.2), s); });
      if (burning) { tick.current -= dt; if (tick.current <= 0) { tick.current = 1; emitBlast({ kind: fx.kind, x: fx.x, z: fx.z, radius: spec.radius, damage: spec.damage, stun: 0 }); } }
    }
    if (smoke.current) {
      smoke.current.children.forEach((s, i) => {
        const p = puffs[i]; const t = Math.max(0, a - p.delay - (fx.kind === 'smokegrenade' ? 0 : 0.15));
        const grow = Math.min(1, t / (fx.kind === 'smokegrenade' ? 2.5 : 1.2));
        s.position.set(p.x * grow, 0.6 + t * p.rise * (fx.kind === 'smokegrenade' ? 0.15 : 1), p.z * grow);
        s.scale.setScalar(p.size * (0.3 + grow) * (fx.kind === 'smokegrenade' ? 1.8 : 1));
        const m = (s as THREE.Sprite).material; m.opacity = t <= 0 ? 0 : Math.min(0.85, grow) * Math.max(0, 1 - Math.max(0, t - spec.smoke + 2) / 2);
      });
    }
  });
  const smokeColor = fx.kind === 'incgrenade' ? '#2a2420' : fx.kind === 'fraggrenade' ? '#4a4540' : '#c9c9c4';
  return (
    <group position={[fx.x, 0, fx.z]} name={`grenade-fx-${fx.kind}`}>
      <pointLight ref={light} position={[0, 1, 0]} color={fx.kind === 'flashgrenade' ? '#ffffff' : '#ff8a3a'} distance={fx.kind === 'flashgrenade' ? 30 : 18} decay={1.6} />
      {fx.kind !== 'smokegrenade' && <mesh ref={ball} position={[0, 0.6, 0]}><sphereGeometry args={[1, 18, 12]} /><meshBasicMaterial color={fx.kind === 'flashgrenade' ? '#ffffff' : '#ffb347'} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>}
      {fx.kind === 'fraggrenade' && <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}><ringGeometry args={[0.85, 1, 40]} /><meshBasicMaterial color="#d9cbb0" transparent depthWrite={false} side={THREE.DoubleSide} /></mesh>}
      {fx.kind === 'fraggrenade' && <points ref={sparks}><bufferGeometry><bufferAttribute attach="attributes-position" args={[sparkData.pos, 3]} /></bufferGeometry><pointsMaterial color="#ffcc66" size={0.12} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></points>}
      {fx.kind === 'incgrenade' && <group ref={flames}>{flameSpots.map(([x, z, h], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, h / 2, 0]}><coneGeometry args={[0.32, h, 8, 1, true]} /><meshBasicMaterial color="#ff5a1a" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, h * 0.3, 0]}><coneGeometry args={[0.18, h * 0.6, 8, 1, true]} /><meshBasicMaterial color="#ffd36b" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
        </group>))}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}><circleGeometry args={[spec.radius * 0.85, 28]} /><meshBasicMaterial color="#1a0f08" transparent opacity={0.75} depthWrite={false} /></mesh>
      </group>}
      <group ref={smoke}>{puffs.map((_, i) => <sprite key={i}><spriteMaterial map={puff()} color={smokeColor} transparent opacity={0} depthWrite={false} /></sprite>)}</group>
    </group>
  );
};

const Projectile: React.FC<{ p: Proj }> = ({ p }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current; if (!g) return;
    if (p.landed) { g.position.copy(p.landed); return; }
    const a = throwArc(p.o, p.d, p.t); g.position.set(a.x, a.y, a.z); g.rotation.set(p.t * 9, p.t * 4, 0);
  });
  return <group ref={ref} name={`grenade-flying-${p.kind}`}><group scale={1.4}><HeldWeaponModel weapon={p.kind} /></group></group>;
};

export const GrenadeSystem: React.FC = () => {
  const { camera } = useThree();
  const eq = useEquipped();
  const held = eq.find((id) => isGrenade(id)) as GrenadeKind | undefined;
  const heldRef = useRef(held); heldRef.current = held;
  const projs = useRef<Proj[]>([]);
  const [fx, setFx] = useState<Fx[]>([]);
  const [, setN] = useState(0);
  const lastThrow = useRef(0);

  const throwIt = React.useCallback(() => {
    const kind = heldRef.current; if (!kind) return;
    const now = performance.now(); if (now - lastThrow.current < 900 || projs.current.length >= 3) return;
    if (!spendGrenade(kind)) { window.dispatchEvent(new CustomEvent('vr-toast', { detail: `No ${GRENADE_SPEC[kind].name}s left` })); playSfx('deny'); return; }
    lastThrow.current = now;
    const yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
    const d = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    const ground = Math.max(0, camera.position.y - (getWorldState().mode === 'mmora' ? villageEyeHeight() : 1.6));
    const o = new THREE.Vector3(camera.position.x + d.x * (AVATAR_AHEAD + 0.3), ground + 1.55, camera.position.z + d.z * (AVATAR_AHEAD + 0.3));
    projs.current.push({ id: ++seq, kind, o, d, t: 0, landed: null });
    avatarMotion.attackAt = now; window.dispatchEvent(new CustomEvent('vr-hand-reach'));
    playSfx('pin'); setN((n) => n + 1);
    window.dispatchEvent(new CustomEvent('vr-toast', { detail: `${GRENADE_SPEC[kind].name} thrown · ${grenadeCount(kind)} left` }));
  }, [camera]);

  useEffect(() => registerUse(() => {
    const k = heldRef.current; if (!k) return null;
    return { dist: 2.9, reach: 3, label: `Throw ${GRENADE_SPEC[k].name} (${grenadeCount(k)})`, run: throwIt };
  }), [throwIt]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.key === 'g' || e.key === 'G') && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) throwIt(); };
    const custom = () => throwIt();
    window.addEventListener('keydown', key); window.addEventListener('vr-throw-grenade', custom);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('vr-throw-grenade', custom); };
  }, [throwIt]);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05); if (!projs.current.length) return;
    let changed = false;
    for (const p of [...projs.current]) {
      p.t += dt;
      const spec = GRENADE_SPEC[p.kind];
      if (!p.landed) { const a = throwArc(p.o, p.d, p.t); if (a.y <= 0.06) p.landed = new THREE.Vector3(a.x, 0.06, a.z); }
      if ((spec.fuse === 0 && p.landed) || (spec.fuse > 0 && p.t >= spec.fuse) || p.t > 6) {
        const air = throwArc(p.o, p.d, p.t);
        const at = p.landed ?? new THREE.Vector3(air.x, Math.max(0.06, air.y), air.z);
        projs.current = projs.current.filter((x) => x !== p); changed = true;
        emitBlast({ kind: p.kind, x: at.x, z: at.z, radius: spec.radius, damage: p.kind === 'incgrenade' ? 0 : spec.damage, stun: spec.stun });
        playSfx(p.kind === 'fraggrenade' ? 'explosion' : p.kind === 'flashgrenade' ? 'flashbang' : p.kind === 'incgrenade' ? 'fire' : 'smoke');
        if (p.kind === 'flashgrenade') { const dist = Math.hypot(camera.position.x - at.x, camera.position.z - at.z); if (dist < 20) whiteout(Math.max(0.35, 1 - dist / 20)); }
        if (p.kind === 'fraggrenade') window.dispatchEvent(new CustomEvent('vr-shake', { detail: { strength: 0.6 } }));
        setFx((f) => [...f.slice(-3), { id: p.id, kind: p.kind, x: at.x, z: at.z }]);
      }
    }
    if (changed) setN((n) => n + 1);
  });

  const done = React.useCallback((id: number) => setFx((f) => f.filter((x) => x.id !== id)), []);
  return <>
    {projs.current.map((p) => <Projectile key={p.id} p={p} />)}
    {fx.map((f) => <Effect key={f.id} fx={f} onDone={done} />)}
  </>;
};
export default GrenadeSystem;
