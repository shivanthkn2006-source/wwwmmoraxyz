/**
 * M'Mora Village sky and weather.
 * Night (local clock): stars, an occasional shooting star, and the moon in
 * today's real phase (new → full → new, from the 29.53-day lunar cycle).
 * Weather comes from the member's real place (Open-Meteo, free, no key):
 * rain / drizzle, snow, fog, and thunderstorms with lightning and thunder.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useNight } from '@/components/vr/NightMode';
import { getWorldState } from '../worldMode';

/** 0 = new moon, 0.5 = full moon, 1 = next new moon. */
export function moonPhase(d = new Date()): number {
  const ref = Date.UTC(2000, 0, 6, 18, 14); // a known new moon
  const days = (d.getTime() - ref) / 86400000;
  return (((days / 29.530588) % 1) + 1) % 1;
}

const Moon: React.FC = () => {
  const p = moonPhase();
  const lit = 1 - Math.abs(p - 0.5) * 2; // 0 new … 1 full
  // a dark disc slides across the bright one: right side lit while waxing
  const off = (1 - lit) * 2 * 12 * (p < 0.5 ? -1 : 1);
  return (
    <group position={[60, 75, -230]}>
      <mesh><circleGeometry args={[12, 32]} /><meshBasicMaterial color="#fbf6e4" fog={false} /></mesh>
      {lit < 0.98 && <mesh position={[off, 0, 0.1]}><circleGeometry args={[12.4, 32]} /><meshBasicMaterial color="#0b1424" fog={false} /></mesh>}
      <mesh position={[0, 0, -0.5]}><circleGeometry args={[20, 24]} /><meshBasicMaterial color="#f4ecc8" transparent opacity={0.08 + lit * 0.1} depthWrite={false} fog={false} /></mesh>
    </group>
  );
};

const ShootingStar: React.FC = () => {
  const ref = useRef<THREE.Mesh>(null);
  const s = useRef({ t: 0, next: 4, x: 0, y: 0, z: 0 });
  useFrame((_, dt) => {
    const m = ref.current; if (!m) return; const st = s.current;
    st.next -= dt;
    if (st.next <= 0 && st.t <= 0) { st.t = 1; st.x = -120 + Math.random() * 240; st.y = 90 + Math.random() * 40; st.z = -150 - Math.random() * 80; st.next = 6 + Math.random() * 10; }
    if (st.t > 0) {
      st.t -= dt * 1.4;
      m.visible = true; m.position.set(st.x + (1 - st.t) * 80, st.y - (1 - st.t) * 35, st.z);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, st.t);
    } else m.visible = false;
  });
  return <mesh ref={ref} rotation={[0, 0, -0.42]} visible={false}><planeGeometry args={[9, 0.25]} /><meshBasicMaterial color="#ffffff" transparent opacity={0} fog={false} depthWrite={false} /></mesh>;
};

type Wx = { kind: 'clear' | 'rain' | 'snow' | 'storm' | 'fog'; heavy: boolean };
function codeToWx(c: number): Wx {
  if (c >= 95) return { kind: 'storm', heavy: true };
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { kind: 'snow', heavy: c === 75 || c === 86 };
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return { kind: 'rain', heavy: c === 65 || c === 82 || c === 63 };
  if (c === 45 || c === 48) return { kind: 'fog', heavy: false };
  return { kind: 'clear', heavy: false };
}

function useLocalWeather(): Wx {
  const [wx, setWx] = useState<Wx>({ kind: 'clear', heavy: false });
  useEffect(() => {
    let dead = false;
    const load = async () => {
      const w = getWorldState();
      const o = w.origin.status === 'ready' ? w.origin.origin : null;
      if (!o) return;
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${o.lat}&longitude=${o.lng}&current_weather=true`);
        const j = await r.json();
        if (!dead && typeof j?.current_weather?.weathercode === 'number') setWx(codeToWx(j.current_weather.weathercode));
      } catch { /* offline: keep clear sky */ }
    };
    void load();
    const t = window.setInterval(load, 15 * 60_000);
    return () => { dead = true; window.clearInterval(t); };
  }, []);
  return wx;
}

/** Falling rain or snow around the player (one Points object). */
const Precip: React.FC<{ snow: boolean; heavy: boolean }> = ({ snow, heavy }) => {
  const { camera } = useThree();
  const N = heavy ? 1800 : 900;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(); const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { a[i * 3] = (Math.random() - 0.5) * 50; a[i * 3 + 1] = Math.random() * 25; a[i * 3 + 2] = (Math.random() - 0.5) * 50; }
    g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g;
  }, [N]);
  const pts = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05); const a = geo.attributes.position.array as Float32Array; const v = snow ? 1.4 : 16;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] -= v * d; if (snow) a[i * 3] += Math.sin((a[i * 3 + 1] + i) * 0.7) * d * 0.4;
      if (a[i * 3 + 1] < 0) a[i * 3 + 1] += 25;
    }
    geo.attributes.position.needsUpdate = true;
    pts.current?.position.set(camera.position.x, 0, camera.position.z);
  });
  return <points ref={pts} geometry={geo}><pointsMaterial color={snow ? '#ffffff' : '#a9c2d8'} size={snow ? 0.12 : 0.06} transparent opacity={snow ? 0.9 : 0.6} depthWrite={false} /></points>;
};

let actx: AudioContext | null = null;
function thunder(near: boolean) {
  try {
    actx = actx ?? new AudioContext();
    const len = actx.sampleRate * 3, b = actx.createBuffer(1, len, actx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, near ? 1.5 : 3);
    const s = actx.createBufferSource(); s.buffer = b;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = near ? 400 : 180;
    const g = actx.createGain(); g.gain.value = near ? 0.7 : 0.35;
    s.connect(f).connect(g).connect(actx.destination); s.start();
  } catch { /* audio blocked until a tap */ }
}
function rainLoop(on: boolean) {
  try {
    actx = actx ?? new AudioContext();
    const w = window as unknown as { __vrRain?: AudioBufferSourceNode };
    if (!on) { w.__vrRain?.stop(); w.__vrRain = undefined; return; }
    if (w.__vrRain) return;
    const len = actx.sampleRate * 2, b = actx.createBuffer(1, len, actx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = actx.createBufferSource(); s.buffer = b; s.loop = true;
    const f = actx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200;
    const g = actx.createGain(); g.gain.value = 0.05;
    s.connect(f).connect(g).connect(actx.destination); s.start(); w.__vrRain = s;
  } catch { /* */ }
}

const Lightning: React.FC = () => {
  const light = useRef<THREE.AmbientLight>(null);
  const s = useRef({ next: 5, flash: 0 });
  useFrame((_, dt) => {
    const st = s.current; st.next -= dt;
    if (st.next <= 0) { st.flash = 0.35; st.next = 8 + Math.random() * 14; const near = Math.random() < 0.4; window.setTimeout(() => thunder(near), near ? 300 : 1800); }
    st.flash = Math.max(0, st.flash - dt);
    if (light.current) light.current.intensity = st.flash > 0 ? 2.5 * (Math.sin(st.flash * 60) > 0 ? 1 : 0.3) : 0;
  });
  return <ambientLight ref={light} intensity={0} color="#dfe8ff" />;
};

export const VillageSky: React.FC = () => {
  const { night } = useNight();
  const wx = useLocalWeather();
  const wet = wx.kind === 'rain' || wx.kind === 'storm';
  useEffect(() => { rainLoop(wet); return () => rainLoop(false); }, [wet]);
  useEffect(() => { (window as unknown as { __vrWeather?: Wx }).__vrWeather = wx; }, [wx]);
  const cloudy = wx.kind !== 'clear';
  return (
    <>
      {night && !cloudy && <Stars radius={260} depth={60} count={2500} factor={4} saturation={0} fade speed={0.4} />}
      {night && !cloudy && <ShootingStar />}
      {night && !wet && <Moon />}
      {(wet || wx.kind === 'snow') && <Precip snow={wx.kind === 'snow'} heavy={wx.heavy} />}
      {wx.kind === 'storm' && <Lightning />}
      {wx.kind === 'fog' && <fog attach="fog" args={['#b7bcc0', 6, 60]} />}
    </>
  );
};
