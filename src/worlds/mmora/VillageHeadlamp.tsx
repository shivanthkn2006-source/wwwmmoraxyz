/**
 * Worn headlamp: one always-mounted spotlight (fixed light count, so no
 * material recompiles) that shines from the player's forehead where they face.
 * On only when the headlamp is equipped, switched on (L key) and it is dark
 * (street-lamp hours, local time).
 */
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEquipped } from '@/lib/vrGear';
import { scheduleOn } from '@/lib/vrLights';
import { playSfx } from '@/lib/vrSfx';
import { playerSpot } from './VillageVillagers';

const KEY = 'vr-headlamp-on';
export const headlampSwitchOn = () => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } };
export function toggleHeadlamp() {
  try { localStorage.setItem(KEY, headlampSwitchOn() ? '0' : '1'); } catch { /* */ }
  playSfx('metal');
}
/** Pure rule (tested): beam shines only when worn, switched on and dark. */
export const headlampLit = (worn: boolean, switchOn: boolean, dark: boolean) => worn && switchOn && dark;

const dir = new THREE.Vector3();
const WARM = new THREE.Color('#fff1d8');
const RED = new THREE.Color('#ff4a3c');
export const VillageHeadlamp: React.FC = () => {
  const { camera, scene } = useThree();
  const eq = useEquipped();
  const light = useRef<THREE.SpotLight>(null);
  const worn = eq.includes('headlamp');
  useEffect(() => {
    const t = light.current?.target; if (!t) return; scene.add(t); return () => { scene.remove(t); };
  }, [scene]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === 'KeyL' && worn && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) toggleHeadlamp(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [worn]);
  useFrame((_, raw) => {
    const l = light.current; if (!l) return;
    const dt = Math.min(raw, 0.05);
    camera.getWorldDirection(dir); dir.y = Math.max(-0.35, Math.min(0.25, dir.y)); dir.normalize();
    const p = playerSpot(camera);
    l.position.set(p.x + dir.x * 0.25, camera.position.y > 1 ? Math.min(camera.position.y, 1.75) : 1.7, p.z + dir.z * 0.25);
    l.target.position.set(l.position.x + dir.x * 20, l.position.y + dir.y * 20 - 3, l.position.z + dir.z * 20);
    const target = headlampLit(worn, headlampSwitchOn(), scheduleOn('street')) ? 24 : 0;
    l.intensity = THREE.MathUtils.damp(l.intensity, target, 8, dt);
    // Part 14: near the outpost cavern the beam runs through the red filter so it draws less attention.
    const nearOutpost = Math.hypot(p.x + 116, p.z + 30) < 30;
    l.color.lerp(nearOutpost ? RED : WARM, Math.min(1, dt * 3));
  });
  return <spotLight ref={light} angle={0.5} penumbra={0.55} distance={32} decay={1.5} intensity={0} color="#fff1d8" />;
};
