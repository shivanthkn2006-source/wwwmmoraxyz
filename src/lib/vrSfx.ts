/**
 * Item sounds made in the browser (no download), survival-horror style:
 * pickups, coins spent at the merchant, herb healing, weapon equips, armour,
 * paper, medallions and the village bells. Plays only after the player has interacted.
 */
let ctx: AudioContext | null = null;
const ac = () => {
  try { ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { return null; }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};
function tone(c: AudioContext, f: number, t: number, d: number, v: number, type: OscillatorType = 'sine', out: AudioNode = c.destination) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.05);
}
function noise(c: AudioContext, t: number, d: number, freq: number, v: number, type: BiquadFilterType = 'bandpass') {
  const n = c.createBuffer(1, Math.max(1, c.sampleRate * d), c.sampleRate), ch = n.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = n; f.type = type; f.frequency.value = freq; g.gain.value = v;
  s.connect(f).connect(g).connect(c.destination); s.start(t);
}
const rustle = (c: AudioContext, t: number) => noise(c, t, 0.25, 3200, 0.18);
const clink = (c: AudioContext, t: number, v = 0.08) => { tone(c, 2900 + Math.random() * 600, t, 0.25, v, 'triangle'); tone(c, 4200 + Math.random() * 500, t, 0.18, v * 0.6); };

export function playPickup(kind: 'coin' | 'herb' | 'relic') {
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.01;
  if (kind === 'herb') { rustle(c, t); tone(c, 523, t + 0.12, 0.5, 0.12); tone(c, 784, t + 0.2, 0.7, 0.09); return; }
  tone(c, 180, t, 0.18, 0.2, 'triangle');
  [988, 1319, 1760].forEach((f, i) => tone(c, f, t + 0.06 + i * 0.07, 0.9, 0.1));
  if (kind === 'relic') tone(c, 2637, t + 0.3, 1.2, 0.05);
}

export type Sfx = 'coins' | 'heal' | 'goldheal' | 'gun' | 'shotgun' | 'rocket' | 'knife' | 'leather' | 'metal' | 'paper' | 'medallion' | 'deny' | 'typewriter';
/** Using an item: each has its own real-world-like sound. */
export function playSfx(kind: Sfx) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.01;
  switch (kind) {
    case 'coins': for (let i = 0; i < 7; i++) clink(c, t + i * 0.045 + Math.random() * 0.02, 0.06); noise(c, t, 0.35, 5000, 0.05, 'highpass'); break;
    case 'heal': case 'goldheal':
      rustle(c, t); noise(c, t + 0.15, 0.4, 900, 0.08, 'lowpass'); // crushing the leaves
      [392, 523, 659, 784].forEach((f, i) => tone(c, kind === 'goldheal' ? f * 1.5 : f, t + 0.35 + i * 0.12, 1.1, 0.08));
      break;
    case 'gun': noise(c, t, 0.06, 2500, 0.3); tone(c, 1400, t, 0.05, 0.1, 'square'); noise(c, t + 0.18, 0.05, 3500, 0.25); break; // slide racked
    case 'shotgun': noise(c, t, 0.12, 900, 0.35); noise(c, t + 0.22, 0.1, 1200, 0.35); break; // pump chk-chk
    case 'rocket': noise(c, t, 0.2, 400, 0.3, 'lowpass'); tone(c, 90, t, 0.4, 0.15, 'sawtooth'); noise(c, t + 0.3, 0.06, 3000, 0.25); break;
    case 'knife': { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(3000, t); o.frequency.exponentialRampToValueAtTime(7000, t + 0.3); g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.4); break; }
    case 'leather': noise(c, t, 0.3, 600, 0.25, 'lowpass'); noise(c, t + 0.25, 0.2, 800, 0.15, 'lowpass'); break;
    case 'metal': tone(c, 620, t, 0.9, 0.12, 'triangle'); tone(c, 1530, t, 0.6, 0.06); noise(c, t, 0.05, 4000, 0.2); break;
    case 'paper': noise(c, t, 0.18, 6000, 0.12, 'highpass'); noise(c, t + 0.2, 0.25, 5000, 0.1, 'highpass'); break;
    case 'medallion': tone(c, 1320, t, 1.6, 0.08); tone(c, 1980, t + 0.05, 1.2, 0.05); clink(c, t); break;
    case 'typewriter': for (let i = 0; i < 9; i++) { noise(c, t + i * 0.11, 0.04, 2500, 0.3, 'highpass'); tone(c, 180, t + i * 0.11, 0.05, 0.08, 'square'); } tone(c, 2100, t + 1.1, 0.6, 0.1); break;
    case 'deny': tone(c, 160, t, 0.25, 0.15, 'square'); tone(c, 120, t + 0.12, 0.3, 0.12, 'square'); break;
  }
}

/** A big cast church bell (inharmonic partials, long decay). volume 0..1 by distance. */
export function playBell(volume = 1, deep = true) {
  const c = ac(); if (!c || volume <= 0.01) return;
  const t = c.currentTime + 0.01;
  const base = deep ? 110 : 196;
  [[0.5, 0.35, 7], [1, 0.5, 6], [1.2, 0.28, 4], [1.5, 0.2, 3.5], [2, 0.22, 3], [2.5, 0.1, 2], [3, 0.08, 1.6]].forEach(([r, v, d]) => tone(c, base * r, t, d, v * 0.25 * volume));
  noise(c, t, 0.05, 2000, 0.08 * volume);
}
