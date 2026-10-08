/**
 * Village animal voices made in the browser (no download): cow moo, dog bark,
 * cat meow, crow caw. Volume falls off with distance from the player.
 */
let ctx: AudioContext | null = null;
const ac = () => {
  try { ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { return null; }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

function voice(c: AudioContext, vol: number, type: OscillatorType, pts: [number, number][], filt: { f: number; q: number; type?: BiquadFilterType }, dur: number, t0: number) {
  const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
  o.type = type; f.type = filt.type ?? 'bandpass'; f.frequency.value = filt.f; f.Q.value = filt.q;
  pts.forEach(([at, hz], i) => (i ? o.frequency.linearRampToValueAtTime(hz, t0 + at) : o.frequency.setValueAtTime(hz, t0)));
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.08, dur * 0.2));
  g.gain.setValueAtTime(vol, t0 + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f).connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(c: AudioContext, vol: number, f: number, dur: number, t0: number) {
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
  s.buffer = b; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.2; g.gain.value = vol;
  s.connect(bp).connect(g).connect(c.destination); s.start(t0);
}

export type AnimalKind = 'cow' | 'dog' | 'cat' | 'crow';

/** Plays the animal's call; `dist` in metres (silent beyond ~35 m). */
export function playAnimal(kind: AnimalKind, dist: number) {
  const c = ac(); if (!c) return;
  const v = Math.max(0, 1 - dist / 35) * 0.5; if (v < 0.01) return;
  const t = c.currentTime + 0.02;
  if (kind === 'cow') {
    const d = 1.4 + Math.random() * 0.5, base = 105 + Math.random() * 25;
    voice(c, v, 'sawtooth', [[0, base * 0.9], [0.25, base * 1.15], [d * 0.8, base], [d, base * 0.8]], { f: 420, q: 1.5, type: 'lowpass' }, d, t);
    voice(c, v * 0.35, 'sawtooth', [[0, base * 1.8], [0.25, base * 2.3], [d, base * 1.6]], { f: 700, q: 4 }, d, t);
  } else if (kind === 'dog') {
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) { const s = t + i * 0.28; voice(c, v, 'sawtooth', [[0, 420], [0.05, 520], [0.14, 300]], { f: 900, q: 2 }, 0.16, s); noise(c, v * 0.5, 1400, 0.12, s); }
  } else if (kind === 'cat') {
    voice(c, v * 0.8, 'triangle', [[0, 520], [0.15, 880], [0.45, 700], [0.7, 480]], { f: 1300, q: 3 }, 0.75, t);
  } else {
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) { const s = t + i * 0.32; voice(c, v * 0.9, 'square', [[0, 760], [0.08, 640], [0.2, 560]], { f: 1100, q: 2.5 }, 0.22, s); noise(c, v * 0.3, 2000, 0.18, s); }
  }
}
