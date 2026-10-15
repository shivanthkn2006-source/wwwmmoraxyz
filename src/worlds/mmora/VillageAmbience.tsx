/**
 * Village ambience made in the browser (no downloads), mixed by where you stand:
 *  - wind through the valley, in slow gusts
 *  - river rush near the river and a deeper roar near the waterfall
 *  - wet footsteps on the mud while you walk (squelchier when raining)
 *  - crickets at night, distant crows and dogs now and then, creaking wood/shutters near houses
 * Sound starts after the first tap (browser rule) and stops when you leave the village.
 */
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { HOUSES } from './villageMap';
import { getVillageWeather } from './VillageSky';

const RIVER_Z = -104, FALLS: [number, number] = [-30, -199];

function noiseBuffer(c: AudioContext, secs: number, brown = false) {
  const b = c.createBuffer(1, c.sampleRate * secs, c.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
  return b;
}
function loop(c: AudioContext, buf: AudioBuffer, type: BiquadFilterType, f: number, q: number) {
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0;
  s.connect(fl).connect(g).connect(c.destination); s.start();
  return { g, fl, s };
}

type Bed = ReturnType<typeof loop>;
interface Mix { c: AudioContext; wind: Bed; river: Bed; falls: Bed; noise: AudioBuffer }

function step(m: Mix, wet: boolean, vol: number) {
  const { c } = m, t = c.currentTime;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = m.noise; f.type = 'lowpass'; f.frequency.setValueAtTime(wet ? 900 : 1400, t); f.frequency.exponentialRampToValueAtTime(wet ? 260 : 400, t + 0.14);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + (wet ? 0.22 : 0.12));
  s.connect(f).connect(g).connect(c.destination); s.start(t, Math.random() * 1.5, 0.3);
}
function cricket(c: AudioContext, vol: number) {
  const t = c.currentTime, base = 4200 + Math.random() * 600;
  for (let k = 0; k < 3; k++) {
    const o = c.createOscillator(), g = c.createGain(); o.frequency.value = base; o.type = 'sine';
    const t0 = t + k * 0.07; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + 0.06);
  }
}
function creak(c: AudioContext, vol: number) {
  const t = c.currentTime, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(90 + Math.random() * 40, t); o.frequency.linearRampToValueAtTime(140 + Math.random() * 80, t + 0.6);
  f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 6;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  o.connect(f).connect(g).connect(c.destination); o.start(t); o.stop(t + 0.75);
}

export const VillageAmbience: React.FC = () => {
  const { camera } = useThree();
  const mix = useRef<Mix | null>(null);
  const st = useRef({ lx: camera.position.x, lz: camera.position.z, walked: 0, next: 4, cr: 0, gust: 0 });

  useEffect(() => {
    const start = () => {
      if (mix.current) { void mix.current.c.resume(); return; }
      try {
        const c = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const white = noiseBuffer(c, 3), brown = noiseBuffer(c, 4, true);
        mix.current = { c, noise: white, wind: loop(c, brown, 'bandpass', 380, 0.7), river: loop(c, white, 'bandpass', 1100, 0.5), falls: loop(c, brown, 'lowpass', 520, 0.4) };
      } catch { /* no audio on this device */ }
    };
    window.addEventListener('pointerdown', start); window.addEventListener('keydown', start);
    return () => {
      window.removeEventListener('pointerdown', start); window.removeEventListener('keydown', start);
      void mix.current?.c.close(); mix.current = null;
    };
  }, []);

  useFrame(({ clock }, raw) => {
    const m = mix.current; if (!m || m.c.state !== 'running') return;
    const dt = Math.min(raw, 0.1), s = st.current, t = clock.elapsedTime, now = m.c.currentTime;
    const x = camera.position.x, z = camera.position.z;
    const k = getVillageWeather()?.kind; const rain = k === 'rain' || k === 'storm';
    // wind gusts
    const gust = 0.05 + 0.04 * Math.max(0, Math.sin(t * 0.13) + Math.sin(t * 0.31) * 0.5) + (rain ? 0.03 : 0);
    m.wind.g.gain.setTargetAtTime(gust, now, 0.8); m.wind.fl.frequency.setTargetAtTime(300 + gust * 2500, now, 1);
    // river and waterfall by distance
    const dr = Math.abs(z - RIVER_Z), df = Math.hypot(x - FALLS[0], z - FALLS[1]);
    m.river.g.gain.setTargetAtTime(dr < 40 ? 0.12 * (1 - dr / 40) ** 2 : 0, now, 0.4);
    m.falls.g.gain.setTargetAtTime(df < 160 ? 0.3 * (1 - df / 160) ** 2 : 0, now, 0.5);
    // footsteps from real movement (~0.75 m per step)
    const moved = Math.hypot(x - s.lx, z - s.lz); s.lx = x; s.lz = z;
    if (moved < 2) { s.walked += moved; if (s.walked > 0.75) { s.walked = 0; step(m, rain, rain ? 0.18 : 0.12); } }
    // occasional sounds
    s.next -= dt; s.cr -= dt;
    const hr = new Date().getHours(), night = hr >= 19 || hr < 6;
    if (night && s.cr <= 0) { s.cr = 0.6 + Math.random() * 1.8; if (!rain) cricket(m.c, 0.015); }
    if (s.next <= 0) {
      s.next = 7 + Math.random() * 12;
      const nearHouse = HOUSES.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < 12);
      const roll = Math.random();
      if (nearHouse && roll < 0.4) creak(m.c, 0.05);
      else void import('@/lib/vrAnimalSfx').then((a) => a.playAnimal(roll < 0.7 ? 'crow' : 'dog', 20 + Math.random() * 12)).catch(() => {});
    }
  });
  return null;
};
