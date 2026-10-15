/**
 * M'Mora Village sky and weather.
 * Night (local clock): stars, an occasional shooting star, and the moon in
 * today's real phase (new → full → new, from the 29.53-day lunar cycle).
 * Weather comes from the member's real place (Open-Meteo, free, no key):
 * shown in both M'Mora Village and M'Mora World: rain / drizzle, snow, fog, and thunderstorms with lightning and thunder.
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

export type Wx = { kind: 'clear' | 'rain' | 'snow' | 'storm' | 'fog'; heavy: boolean };
function codeToWx(c: number): Wx {
  if (c >= 95) return { kind: 'storm', heavy: true };
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { kind: 'snow', heavy: c === 75 || c === 86 };
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return { kind: 'rain', heavy: c === 65 || c === 82 || c === 63 };
  if (c === 45 || c === 48) return { kind: 'fog', heavy: false };
  return { kind: 'clear', heavy: false };
}

/**
 * Turn an Open-Meteo reply into the village sky. Rain shows whenever the
 * station grid reports any precipitation now (even when the weather code is
 * only "overcast"), and thunder shows when the current hour or the hours
 * either side carry a thunderstorm code (95–99).
 */
export function readWeather(j: {
  current?: { weather_code?: number; precipitation?: number; rain?: number; showers?: number; snowfall?: number };
  hourly?: { weather_code?: (number | null)[] };
}): Wx | null {
  const c = j?.current; if (!c || typeof c.weather_code !== 'number') return null;
  const base = codeToWx(c.weather_code);
  const precip = Math.max(c.precipitation ?? 0, (c.rain ?? 0) + (c.showers ?? 0));
  const storm = c.weather_code >= 95 || (j.hourly?.weather_code ?? []).some((h) => typeof h === 'number' && h >= 95);
  if (storm) return { kind: 'storm', heavy: true };
  if ((c.snowfall ?? 0) > 0 && base.kind !== 'rain') return { kind: 'snow', heavy: (c.snowfall ?? 0) >= 1 };
  if (base.kind === 'rain' || precip > 0) return { kind: 'rain', heavy: base.heavy || precip >= 1 };
  return base;
}

/** One shared weather reading for the whole VR world (sky, rain, wet ground). */
let wxNow: Wx = { kind: 'clear', heavy: false };
const wxLs = new Set<() => void>();
const setWxNow = (w: Wx) => { if (w.kind === wxNow.kind && w.heavy === wxNow.heavy) return; wxNow = w; (window as unknown as { __vrWeather?: Wx }).__vrWeather = w; wxLs.forEach((l) => l()); };
export const getVillageWeather = () => wxNow;
export function useVillageWeather(): Wx {
  return React.useSyncExternalStore((l) => { wxLs.add(l); return () => { wxLs.delete(l); }; }, () => wxNow, () => wxNow);
}

/** Where to read the weather: the member's real device location first, then the map place they are playing at. */
async function weatherCoords(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { getGrantedCoords } = await import('@/utils/sharedGeolocation');
    const real = await getGrantedCoords();
    if (real) return real;
  } catch { /* fall through */ }
  const w = getWorldState();
  return w.origin.status === 'ready' ? w.origin.origin : null;
}

let loaderUsers = 0;
let loaderTimer: number | undefined;
function startWeatherLoader() {
  loaderUsers++;
  if (loaderUsers > 1) return;
  // Preview-only test switch (?wx=rain|storm|snow) so the effects can be checked without waiting for real rain.
  if (import.meta.env.DEV) {
    const force = new URLSearchParams(location.search).get('wx');
    if (force === 'rain' || force === 'storm' || force === 'snow') { setWxNow({ kind: force, heavy: force === 'storm' }); return; }
  }
  const load = async () => {
    const o = await weatherCoords();
    if (!o) { loaderTimer = window.setTimeout(load, 4000); return; }
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${o.lat.toFixed(3)}&longitude=${o.lng.toFixed(3)}`
        + '&current=weather_code,precipitation,rain,showers,snowfall&hourly=weather_code&past_hours=1&forecast_hours=2&timezone=auto';
      const r = await fetch(url);
      const w = r.ok ? readWeather(await r.json()) : null;
      if (w) setWxNow(w);
    } catch { /* offline: keep the last sky */ }
    if (loaderUsers > 0) loaderTimer = window.setTimeout(load, 5 * 60_000);
  };
  void load();
}
function stopWeatherLoader() {
  loaderUsers = Math.max(0, loaderUsers - 1);
  if (!loaderUsers) window.clearTimeout(loaderTimer);
}

function useLocalWeather(): Wx {
  useEffect(() => { startWeatherLoader(); return stopWeatherLoader; }, []);
  return useVillageWeather();
}

/** Falling rain (slanted streaks) or snow (drifting flakes) around the player. */
const Precip: React.FC<{ snow: boolean; heavy: boolean }> = ({ snow, heavy }) => {
  const { camera } = useThree();
  const N = snow ? (heavy ? 1800 : 900) : (heavy ? 2600 : 1600);
  const L = 0.9; // streak length in metres
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(); const per = snow ? 1 : 2; const a = new Float32Array(N * 3 * per);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 50, y = Math.random() * 25, z = (Math.random() - 0.5) * 50;
      a.set([x, y, z], i * 3 * per); if (!snow) a.set([x + 0.08, y + L, z], i * 6 + 3);
    }
    g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g;
  }, [N, snow]);
  const obj = useRef<THREE.Object3D>(null);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05); const a = geo.attributes.position.array as Float32Array;
    if (snow) {
      for (let i = 0; i < N; i++) { a[i * 3 + 1] -= 1.4 * d; a[i * 3] += Math.sin((a[i * 3 + 1] + i) * 0.7) * d * 0.4; if (a[i * 3 + 1] < 0) a[i * 3 + 1] += 25; }
    } else {
      const v = heavy ? 18 : 14, dx = 1.2 * d;
      for (let i = 0; i < N; i++) {
        const k = i * 6; a[k + 1] -= v * d; a[k + 4] -= v * d; a[k] -= dx; a[k + 3] -= dx;
        if (a[k + 1] < 0) { a[k + 1] += 25; a[k + 4] += 25; a[k] = (Math.random() - 0.5) * 50; a[k + 3] = a[k] + 0.08; }
      }
    }
    geo.attributes.position.needsUpdate = true;
    obj.current?.position.set(camera.position.x, 0, camera.position.z);
  });
  return snow
    ? <points ref={obj as React.Ref<THREE.Points>} geometry={geo} frustumCulled={false}><pointsMaterial color="#ffffff" size={0.12} transparent opacity={0.9} depthWrite={false} /></points>
    : <lineSegments ref={obj as React.Ref<THREE.LineSegments>} geometry={geo} frustumCulled={false}><lineBasicMaterial color="#d6e2ee" transparent opacity={heavy ? 0.85 : 0.7} depthWrite={false} /></lineSegments>;
};

let actx: AudioContext | null = null;
/** Browsers start audio paused until the member taps or presses a key; resume then so rain and thunder are heard. */
function wakeAudio() {
  const go = () => { try { actx = actx ?? new AudioContext(); void actx.resume(); } catch { /* */ } };
  if (typeof window === 'undefined') return;
  window.addEventListener('pointerdown', go, { once: true }); window.addEventListener('keydown', go, { once: true }); window.addEventListener('touchstart', go, { once: true });
}
function thunder(near: boolean) {
  try {
    actx = actx ?? new AudioContext();
    const len = actx.sampleRate * 3, b = actx.createBuffer(1, len, actx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, near ? 1.5 : 3);
    const s = actx.createBufferSource(); s.buffer = b;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = near ? 400 : 180;
    const g = actx.createGain(); g.gain.value = near ? 0.7 : 0.35;
    if (actx.state === 'suspended') void actx.resume().catch(() => {});
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
    const g = actx.createGain(); g.gain.value = 0.09;
    s.connect(f).connect(g).connect(actx.destination); s.start(); w.__vrRain = s;
  } catch { /* */ }
}

/** Jagged bolt from the clouds to the hills, drawn only during a flash. */
function boltGeometry(): THREE.BufferGeometry {
  const pts: number[] = []; let x = 0, y = 0;
  for (let i = 0; i < 14; i++) { const nx = x + (Math.random() - 0.5) * 8, ny = y - 5 - Math.random() * 3; pts.push(x, y, 0, nx, ny, 0); x = nx; y = ny;
    if (i === 5 || i === 9) { let bx = x, by = y; for (let k = 0; k < 4; k++) { const cx = bx + (Math.random() - 0.3) * 7, cy = by - 4; pts.push(bx, by, 0, cx, cy, 0); bx = cx; by = cy; } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g;
}
const Lightning: React.FC = () => {
  const { camera } = useThree();
  const light = useRef<THREE.AmbientLight>(null);
  const bolt = useRef<THREE.LineSegments>(null);
  const s = useRef({ next: 3, flash: 0 });
  useFrame((_, dt) => {
    const st = s.current; st.next -= dt;
    if (st.next <= 0) {
      st.flash = 0.35; st.next = 7 + Math.random() * 12; const near = Math.random() < 0.4;
      window.setTimeout(() => thunder(near), near ? 300 : 1800);
      const b = bolt.current;
      if (b) {
        b.geometry.dispose(); b.geometry = boltGeometry();
        const a = Math.random() * Math.PI * 2, d = near ? 70 : 150;
        b.position.set(camera.position.x + Math.cos(a) * d, 95, camera.position.z + Math.sin(a) * d);
        b.lookAt(camera.position.x, 95, camera.position.z);
      }
    }
    st.flash = Math.max(0, st.flash - dt);
    const on = st.flash > 0 && Math.sin(st.flash * 60) > 0;
    if (light.current) light.current.intensity = st.flash > 0 ? 2.5 * (on ? 1 : 0.3) : 0;
    if (bolt.current) bolt.current.visible = st.flash > 0.12 || on;
  });
  return (
    <>
      <ambientLight ref={light} intensity={0} color="#dfe8ff" />
      <lineSegments ref={bolt} visible={false} frustumCulled={false}><bufferGeometry /><lineBasicMaterial color="#f4f7ff" fog={false} /></lineSegments>
    </>
  );
};

export const VillageSky: React.FC = () => {
  const { night } = useNight();
  const wx = useLocalWeather();
  const wet = wx.kind === 'rain' || wx.kind === 'storm';
  useEffect(() => { wakeAudio(); }, []);
  useEffect(() => { rainLoop(wet); return () => rainLoop(false); }, [wet]);
  const cloudy = wx.kind !== 'clear';
  return (
    <>
      {night && !cloudy && <Stars radius={260} depth={60} count={2500} factor={4} saturation={0} fade speed={0.4} />}
      {night && !cloudy && <ShootingStar />}
      {night && !wet && <Moon />}
      {(wet || wx.kind === 'snow') && <Precip snow={wx.kind === 'snow'} heavy={wx.heavy} />}
      {wx.kind === 'storm' && <Lightning />}
      {wx.kind === 'fog' && <fog attach="fog" args={['#1f2a26', 6, 60]} />}
    </>
  );
};
