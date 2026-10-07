/**
 * Night in VR World (follows the member's local clock, 18:00–06:00): dark
 * fog, a flashlight on the camera (Light button / F key) and quiet night
 * sounds (wind + crickets, made in the browser, no downloads).
 * NightMode goes inside the 3D scene; NightAmbience is the sound, outside it.
 */
import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const isNightHour = (h: number) => h < 6 || h >= 18;
type S = { night: boolean; flashlight: boolean };
let st: S = { night: isNightHour(new Date().getHours()), flashlight: true };
const ls = new Set<() => void>();
const set = (p: Partial<S>) => { st = { ...st, ...p }; ls.forEach((l) => l()); };
export const useNight = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => st, () => st);
export const toggleFlashlight = () => set({ flashlight: !st.flashlight });

let wired = false;
function wire() {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  setInterval(() => { const n = isNightHour(new Date().getHours()); if (n !== st.night) set({ night: n }); }, 60_000);
  window.addEventListener('sky-phase-change', (e) => { const d = (e as CustomEvent<{ isNight?: boolean }>).detail; if (typeof d?.isNight === 'boolean') set({ night: d.isNight }); });
  window.addEventListener('keydown', (e) => { const t = e.target as HTMLElement | null; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return; if (e.code === 'KeyF' && !e.repeat) toggleFlashlight(); });
}

export const NightMode: React.FC = () => {
  const { night, flashlight } = useNight();
  const { scene, camera } = useThree();
  const light = useRef<THREE.SpotLight>(null);
  const target = useRef(new THREE.Object3D());
  useEffect(() => { wire(); }, []);
  useEffect(() => {
    if (!night) return;
    const prev = scene.fog;
    scene.fog = new THREE.FogExp2('#0b1018', 0.028);
    scene.add(target.current);
    return () => { scene.fog = prev; scene.remove(target.current); };
  }, [night, scene]);
  useFrame(() => {
    // From the sky (aerial view) thin the night fog so lit windows show across the city.
    if (night && scene.fog instanceof THREE.FogExp2) {
      const want = camera.position.y > 30 ? 0.0025 : 0.028;
      scene.fog.density += (want - scene.fog.density) * 0.1;
    }
    const l = light.current;
    if (!l) return;
    l.position.copy(camera.position);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    target.current.position.copy(camera.position).addScaledVector(dir, 10);
    l.target = target.current;
  });
  if (!night) return null;
  return (
    <>
      <ambientLight intensity={0.12} color="#8fa3c8" />
      {flashlight && <spotLight ref={light} intensity={3.2} distance={28} angle={0.42} penumbra={0.55} decay={1.4} color="#fff3dc" />}
    </>
  );
};

/** Quiet procedural night sounds; starts after the first tap (browsers need one). */
export const NightAmbience: React.FC = () => {
  const { night } = useNight();
  useEffect(() => {
    if (!night) return;
    let ctx: AudioContext | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (ctx) return;
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const c = ctx;
      // wind: filtered noise
      const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
      const g = c.createGain(); g.gain.value = 0.035;
      src.connect(f).connect(g).connect(c.destination); src.start();
      // crickets: short chirps now and then
      timer = setInterval(() => {
        if (Math.random() > 0.55) return;
        const o = c.createOscillator(); const og = c.createGain();
        o.frequency.value = 4200 + Math.random() * 600; og.gain.value = 0;
        o.connect(og).connect(c.destination);
        const t = c.currentTime;
        for (let k = 0; k < 3; k++) { og.gain.setValueAtTime(0.012, t + k * 0.09); og.gain.setValueAtTime(0, t + k * 0.09 + 0.04); }
        o.start(t); o.stop(t + 0.3);
      }, 1400);
    };
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    return () => { window.removeEventListener('pointerdown', start); window.removeEventListener('keydown', start); clearInterval(timer); void ctx?.close(); };
  }, [night]);
  return null;
};
