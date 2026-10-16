/**
 * Stage 2 — the Hollow Warden: a tall stalker that hunts by sound during the
 * Medallion and Crest chapters. Walking keeps it slow; running makes it fast.
 * Enough hits end this encounter permanently and save the next objective.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { gearStats, getEquipped, useGear, equippedWeapon, WEAPON_FIGHT } from '@/lib/vrGear';
import { fire } from '@/lib/vrAmmo';
import { readVillage, WARDEN_DONE, VILLAGE_EVENT, completeVillageEncounter } from '@/lib/vrVillageProgress';
import { WALK_MPS, RUN_MPS } from '@/lib/vrWalk';
import { logStory } from '@/lib/vrStoryline';
import { playerSpot } from './VillageVillagers';

const BODY = new THREE.MeshStandardMaterial({ color: '#1b1a1e', roughness: 0.9 });
const EYE = new THREE.MeshBasicMaterial({ color: '#9cff6a' });

export const HollowWarden: React.FC = () => {
  const owned = useGear();
  const [done, setDone] = useState(() => readVillage().steps.includes(WARDEN_DONE));
  useEffect(() => { const refresh = () => setDone(readVillage().steps.includes(WARDEN_DONE)); window.addEventListener(VILLAGE_EVENT, refresh); return () => window.removeEventListener(VILLAGE_EVENT, refresh); }, []);
  const active = owned.includes('map') && !owned.includes('crest') && !done;
  return active ? <Warden /> : null;
};

const Warden: React.FC = () => {
  const { camera } = useThree();
  const root = useRef<THREE.Group>(null);
  const lastStrike = useRef(-Infinity);
  const st = useRef({ hp: 3, stagger: 0, state: 'idle' as 'idle' | 'stalk' | 'lunge', lost: 0, hitCd: 0, warned: false, last: new THREE.Vector3(), speed: 0, phase: 0 });

  useEffect(() => {
    const p = root.current; if (!p) return;
    p.position.set(camera.position.x + 30, 0, camera.position.z + 30);
    st.current.last.copy(camera.position);
    logStory('enemy', 'hollow-warden:appear');
  }, [camera]);

  useEffect(() => registerUse(() => {
    const p = root.current; if (!p || st.current.stagger > 0) return null;
    const ps = playerSpot(camera); const d = Math.hypot(ps.x - p.position.x, ps.z - p.position.z);
    const weapon = equippedWeapon(), fight = weapon ? WEAPON_FIGHT[weapon] : null;
    return { dist: d, reach: fight?.reach ?? 2.2, label: `${fight?.label ?? 'Strike'} the Warden`, run: () => {
      const now = performance.now();
      if (now - lastStrike.current < (fight?.cooldown ?? 0.7) * 1000) return;
      if (weapon && !fire(weapon)) { window.dispatchEvent(new CustomEvent('vr-toast', { detail: 'Reload or equip another weapon' })); return; }
      lastStrike.current = now;
      const c = st.current; c.hp -= Math.max(1, Math.round(gearStats(getEquipped()).attack / 15));
      window.dispatchEvent(new Event('vr-hand-reach'));
      void import('@/lib/vrSfx').then((m) => m.playSfx(weapon === 'pistol' ? 'gun' : weapon === 'shotgun' ? 'shotgun' : weapon === 'rocket' ? 'rocket' : weapon === 'knife' ? 'knife' : 'metal'));
      if (c.hp <= 0) { c.stagger = Infinity; completeVillageEncounter(WARDEN_DONE); logStory('enemy', 'hollow-warden:defeated');
        window.dispatchEvent(new CustomEvent('vr-toast', { detail: 'Warden defeated · continue to the church altar, then the Lord’s Keep' })); }
    } };
  }), [camera]);

  useFrame((_, dtRaw) => {
    const p = root.current; if (!p) return; const dt = Math.min(dtRaw, 0.1); const c = st.current;
    // Player noise = how fast you move.
    const moved = camera.position.distanceTo(c.last) / Math.max(dt, 1e-3); c.last.copy(camera.position);
    c.speed += (moved - c.speed) * (1 - Math.exp(-6 * dt));
    if (c.stagger > 0) { c.stagger -= dt; p.visible = c.stagger < 1; if (c.stagger <= 0) p.position.set(camera.position.x - 35, 0, camera.position.z - 35); return; }
    p.visible = true;
    const ps = playerSpot(camera); const dx = ps.x - p.position.x, dz = ps.z - p.position.z, dd = Math.hypot(dx, dz) || 1;
    if (dd > 80) { p.position.set(ps.x + 40, 0, ps.z + 40); return; }
    const loud = c.speed > WALK_MPS * 1.3;
    // Blueprint state machine: IDLE → (noise) STALK → (sees you < 12 m) LUNGE → (lost > 5 s) STALK.
    if (c.state === 'idle') { if (loud || dd < 10) c.state = 'stalk'; else return; }
    if (c.state === 'stalk' && dd < 12) { c.state = 'lunge'; c.lost = 0; }
    if (c.state === 'lunge') { if (dd > 12) { c.lost += dt; if (c.lost > 5) c.state = 'stalk'; } else c.lost = 0; }
    const v = c.state === 'lunge' ? RUN_MPS * (loud ? 0.9 : 0.75) : loud ? RUN_MPS * 0.6 : WALK_MPS * 0.55;
    p.rotation.y = Math.atan2(dx, dz);
    if (dd > 1.4) { p.position.x += (dx / dd) * v * dt; p.position.z += (dz / dd) * v * dt; c.phase += dt * (loud ? 9 : 4); }
    p.position.y = Math.abs(Math.sin(c.phase)) * 0.05;
    if (dd < 15 && !c.warned) { c.warned = true; window.dispatchEvent(new CustomEvent('vr-danger')); }
    if (dd > 30) c.warned = false;
    c.hitCd -= dt;
    if (dd <= 1.8 && c.hitCd <= 0) {
      c.hitCd = 2;
      const { defence } = gearStats(getEquipped());
      window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: Math.max(5, Math.round(25 * (1 - defence / 60))) } }));
    }
  });

  return (
    <group ref={root}>
      <mesh material={BODY} position={[0, 1.3, 0]}><cylinderGeometry args={[0.28, 0.45, 2.2, 8]} /></mesh>
      <mesh material={BODY} position={[0, 2.6, 0]}><sphereGeometry args={[0.26, 10, 8]} /></mesh>
      <mesh material={EYE} position={[-0.09, 2.63, 0.22]}><sphereGeometry args={[0.035, 6, 4]} /></mesh>
      <mesh material={EYE} position={[0.09, 2.63, 0.22]}><sphereGeometry args={[0.035, 6, 4]} /></mesh>
      <mesh material={BODY} position={[-0.45, 1.6, 0.1]} rotation={[0.3, 0, 0.15]}><cylinderGeometry args={[0.06, 0.05, 1.5, 5]} /></mesh>
      <mesh material={BODY} position={[0.45, 1.6, 0.1]} rotation={[0.3, 0, -0.15]}><cylinderGeometry args={[0.06, 0.05, 1.5, 5]} /></mesh>
    </group>
  );
};
