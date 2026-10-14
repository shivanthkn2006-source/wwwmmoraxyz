/**
 * M'Mora Village towers: a 250-year-old stone clock tower that strikes the
 * hour on the member's local clock, and a 500-year-old two-floor bell tower
 * with a big black bell on brown ropes. The old bell-ringer (from the church)
 * lives beside it and rings the bell only when there is danger (a villager
 * turns hostile). Bell sounds are synthesized; volume falls off with distance.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { playBell } from '@/lib/vrSfx';
import { boxPoly, setSolidGroup } from '@/lib/vrSolids';
import { registerUse } from '@/lib/vrUse';
import { logStory } from '@/lib/vrStoryline';
import { registerLit, registerToggle } from '@/lib/vrLights';

export const CLOCK_POS: [number, number, number] = [34, 0, -30];
export const BELL_POS: [number, number, number] = [-40, 0, -40];
const HEAR_M = 260;

const mats = () => ({
  oldStone: new THREE.MeshStandardMaterial({ color: '#8d877b', roughness: 1 }),
  ancientStone: new THREE.MeshStandardMaterial({ color: '#6c665c', roughness: 1 }),
  moss: new THREE.MeshStandardMaterial({ color: '#4f5a3a', roughness: 1 }),
  roof: new THREE.MeshStandardMaterial({ color: '#3c3f44', roughness: 0.9 }),
  face: registerLit(new THREE.MeshStandardMaterial({ color: '#e9e0c8', roughness: 0.7, emissive: '#ffd98a', emissiveIntensity: 0 }), 1.2, 'street'),
  lantern: registerLit(new THREE.MeshStandardMaterial({ color: '#ffcf7a', emissive: '#ffb347', emissiveIntensity: 0 }), 2, 'street'),
  glow: registerToggle(new THREE.MeshBasicMaterial({ color: '#ffcf7a', transparent: true, opacity: 0.18, depthWrite: false }), 'street'),
  iron: new THREE.MeshStandardMaterial({ color: '#141414', metalness: 0.7, roughness: 0.45 }),
  wood: new THREE.MeshStandardMaterial({ color: '#4a3220', roughness: 0.95 }),
  rope: new THREE.MeshStandardMaterial({ color: '#7a5434', roughness: 1 }),
  robe: new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 1 }),
  skin: new THREE.MeshStandardMaterial({ color: '#c49a7e', roughness: 0.9 }),
  hair: new THREE.MeshStandardMaterial({ color: '#d9d6d0', roughness: 1 }),
});
const volAt = (cam: THREE.Camera, p: [number, number, number]) => { const d = Math.hypot(cam.position.x - p[0], cam.position.z - p[2]); return d > HEAR_M ? 0 : Math.max(0.08, 1 - d / HEAR_M); };

const ClockTower: React.FC<{ M: ReturnType<typeof mats> }> = ({ M }) => {
  const { camera } = useThree();
  const hour = useRef<THREE.Mesh>(null), min = useRef<THREE.Mesh>(null);
  const lastHour = useRef(new Date().getHours());
  useFrame(() => {
    const d = new Date(), h = d.getHours(), m = d.getMinutes() + d.getSeconds() / 60;
    if (hour.current) hour.current.rotation.z = -((h % 12) + m / 60) / 12 * Math.PI * 2;
    if (min.current) min.current.rotation.z = -m / 60 * Math.PI * 2;
    if (h !== lastHour.current) {
      lastHour.current = h;
      const strikes = h % 12 || 12, v = volAt(camera, CLOCK_POS);
      for (let i = 0; i < strikes; i++) window.setTimeout(() => playBell(v * 0.8, false), i * 2200);
    }
  });
  return (
    <group position={CLOCK_POS}>
      <mesh material={M.oldStone} position={[0, 7, 0]}><boxGeometry args={[4, 14, 4]} /></mesh>
      <mesh material={M.moss} position={[0, 0.4, 0]}><boxGeometry args={[4.4, 0.8, 4.4]} /></mesh>
      {[3.5, 7, 10.5].map((y) => <mesh key={y} material={M.ancientStone} position={[0, y, 0]}><boxGeometry args={[4.2, 0.25, 4.2]} /></mesh>)}
      <mesh material={M.roof} position={[0, 16, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[3.4, 4, 4]} /></mesh>
      {[[2.3, 2.6, 2.3], [-2.3, 2.6, 2.3]].map((q) => <group key={q[0]} position={q as [number, number, number]}><mesh material={M.lantern}><boxGeometry args={[0.25, 0.35, 0.25]} /></mesh><mesh material={M.glow}><sphereGeometry args={[0.9, 10, 8]} /></mesh></group>)}
      <mesh material={M.wood} position={[0, 1.3, 2.02]}><boxGeometry args={[1.2, 2.4, 0.06]} /></mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r) => (
        <group key={r} rotation={[0, r, 0]}>
          <group position={[0, 12, 2.03]}>
            <mesh material={M.ancientStone}><circleGeometry args={[1.45, 32]} /></mesh>
            <mesh material={M.face} position={[0, 0, 0.01]}><circleGeometry args={[1.25, 32]} /></mesh>
            {Array.from({ length: 12 }, (_, i) => <mesh key={i} material={M.iron} position={[Math.sin(i / 12 * Math.PI * 2) * 1.08, Math.cos(i / 12 * Math.PI * 2) * 1.08, 0.02]}><boxGeometry args={[0.07, 0.18, 0.01]} /></mesh>)}
            {r === 0 && <>
              
              <mesh ref={hour} material={M.iron} position={[0, 0, 0.04]}><planeGeometry args={[0.1, 1.3]} /></mesh>
              <mesh ref={min} material={M.iron} position={[0, 0, 0.05]}><planeGeometry args={[0.06, 2]} /></mesh>
            </>}
          </group>
        </group>
      ))}
    </group>
  );
};

const BellTower: React.FC<{ M: ReturnType<typeof mats> }> = ({ M }) => {
  const { camera } = useThree();
  const bell = useRef<THREE.Group>(null), arm = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const ring = useRef({ until: 0, last: 0, cool: 0 });
  useEffect(() => {
    const onDanger = () => {
      const now = performance.now(); if (now < ring.current.cool) return;
      ring.current.until = now + 9000; ring.current.cool = now + 40000; ring.current.last = 0;
    };
    window.addEventListener('vr-danger', onDanger);
    return () => window.removeEventListener('vr-danger', onDanger);
  }, []);
  useEffect(() => registerUse(() => {
    const d = Math.hypot(camera.position.x - (BELL_POS[0] + 2.6), camera.position.z - (BELL_POS[2] + 2.6));
    if (d > 3) return null;
    return { dist: d, reach: 3, label: 'Talk to the bell-ringer', run: () => {
      const line = 'For five hundred years this bell has warned M\'Mora. When the villagers turn, I ring it. Find the map, the medallion and the Lord\'s crest… before the castle wakes.';
      if (bubble.current) { bubble.current.textContent = line; bubble.current.style.display = 'block'; window.setTimeout(() => { if (bubble.current) bubble.current.style.display = 'none'; }, 9000); }
      logStory('character', 'bell-ringer');
      void import('@/utils/deepgramTTS').then((m) => m.speakWithDeepgramVoice(line, 'male')).catch(() => {});
    } };
  }), [camera]);
  useFrame(({ clock }) => {
    const now = performance.now(), on = now < ring.current.until;
    const t = clock.elapsedTime;
    if (bell.current) bell.current.rotation.z = on ? Math.sin(t * 2.2) * 0.55 : bell.current.rotation.z * 0.95;
    if (arm.current) arm.current.rotation.x = on ? -1.2 + Math.sin(t * 2.2) * 0.6 : -0.2;
    if (body.current) body.current.position.y = on ? Math.max(0, Math.sin(t * 2.2)) * -0.12 : 0;
    if (on && now - ring.current.last > 1430) { ring.current.last = now; playBell(volAt(camera, BELL_POS), true); }
    if (bubble.current && on && bubble.current.textContent !== 'Danger! The bell — run!') { bubble.current.textContent = 'Danger! The bell — run!'; bubble.current.style.display = 'block'; }
    if (bubble.current && !on && bubble.current.textContent === 'Danger! The bell — run!') bubble.current.style.display = 'none';
  });
  // Open two-floor stone tower: four corner pillars, floors, arched belfry.
  const pillars: [number, number][] = [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]];
  return (
    <group position={BELL_POS}>
      {pillars.map(([x, z]) => <mesh key={`${x}${z}`} material={M.ancientStone} position={[x, 5.5, z]}><boxGeometry args={[0.9, 11, 0.9]} /></mesh>)}
      <mesh material={M.ancientStone} position={[0, 2.5, -1.8]}><boxGeometry args={[3.6, 5, 0.5]} /></mesh>
      <mesh material={M.ancientStone} position={[-1.8, 2.5, 0]}><boxGeometry args={[0.5, 5, 3.6]} /></mesh>
      <mesh material={M.moss} position={[0, 5, 0]}><boxGeometry args={[4.6, 0.35, 4.6]} /></mesh>
      <mesh material={M.ancientStone} position={[0, 11.2, 0]}><boxGeometry args={[4.8, 0.5, 4.8]} /></mesh>
      <mesh material={M.roof} position={[0, 13.4, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[3.6, 4, 4]} /></mesh>
      <mesh material={M.lantern} position={[0, 5.6, 2.4]}><boxGeometry args={[0.25, 0.35, 0.25]} /></mesh>
      <mesh material={M.glow} position={[0, 5.6, 2.4]}><sphereGeometry args={[1.1, 10, 8]} /></mesh>
      <mesh material={M.lantern} position={[0, 11.6, 0]}><sphereGeometry args={[0.18, 8, 6]} /></mesh>
      <mesh material={M.wood} position={[0, 10.4, 0]}><boxGeometry args={[4, 0.3, 0.3]} /></mesh>
      <group ref={bell} position={[0, 10.3, 0]}>
        <mesh material={M.iron} position={[0, -1.1, 0]}><cylinderGeometry args={[0.55, 1.35, 2, 24, 1, true]} /></mesh>
        <mesh material={M.iron} position={[0, -0.05, 0]}><sphereGeometry args={[0.56, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh material={M.iron} position={[0, -2.1, 0]}><torusGeometry args={[1.33, 0.08, 8, 24]} /></mesh>
        <mesh material={M.iron} position={[0, -1.8, 0]}><sphereGeometry args={[0.2, 10, 8]} /></mesh>
        <mesh material={M.rope} position={[1.2, -3.8, 0]}><cylinderGeometry args={[0.035, 0.035, 5.6, 6]} /></mesh>
      </group>
      <mesh material={M.rope} position={[1.2, 3, 0.5]}><cylinderGeometry args={[0.035, 0.035, 6, 6]} /></mesh>
      {/* The old bell-ringer, hunched, grey hair, dark church robe. */}
      <group ref={body} position={[2.6, 0, 2.6]} rotation={[0, -Math.PI * 0.75, 0]}>
        <mesh material={M.robe} position={[0, 0.7, 0]}><coneGeometry args={[0.38, 1.4, 10]} /></mesh>
        <mesh material={M.robe} position={[0, 1.35, 0.06]} rotation={[0.35, 0, 0]}><cylinderGeometry args={[0.2, 0.28, 0.5, 10]} /></mesh>
        <mesh material={M.skin} position={[0, 1.7, 0.16]}><sphereGeometry args={[0.15, 12, 10]} /></mesh>
        <mesh material={M.hair} position={[0, 1.76, 0.12]}><sphereGeometry args={[0.155, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <group ref={arm} position={[0.22, 1.45, 0.1]}><mesh material={M.robe} position={[0, 0.25, 0]}><cylinderGeometry args={[0.05, 0.06, 0.5, 6]} /></mesh></group>
        <mesh material={M.wood} position={[-0.3, 0.6, 0.15]}><cylinderGeometry args={[0.025, 0.025, 1.2, 5]} /></mesh>
        <Html position={[0, 2.25, 0]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
          <div ref={bubble} style={{ display: 'none', maxWidth: 200, background: '#fff', color: '#000', fontFamily: 'Georgia, serif', fontSize: 12, lineHeight: 1.3, padding: '5px 9px', borderRadius: 12 }} />
        </Html>
      </group>
    </group>
  );
};

export const VillageBells: React.FC = () => {
  const M = useMemo(mats, []);
  useEffect(() => {
    setSolidGroup('village-towers', [boxPoly(CLOCK_POS[0], CLOCK_POS[2], 4.2, 4.2), boxPoly(BELL_POS[0], BELL_POS[2], 4.4, 4.4)]);
    return () => setSolidGroup('village-towers', null);
  }, []);
  return <><ClockTower M={M} /><BellTower M={M} /></>;
};
export default VillageBells;
