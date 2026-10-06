/**
 * Item pickup sounds made in the browser (no download): a bright treasure
 * chime for coins and a soft leafy rustle + chime for herbs, in the spirit of
 * survival-horror item pickups. Plays only after the player has interacted.
 */
let ctx: AudioContext | null = null;
const ac = () => {
  try { ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { return null; }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};
function tone(c: AudioContext, f: number, t: number, d: number, v: number, type: OscillatorType = 'sine') {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
}
function rustle(c: AudioContext, t: number) {
  const n = c.createBuffer(1, c.sampleRate * 0.25, c.sampleRate), ch = n.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = n; f.type = 'bandpass'; f.frequency.value = 3200; g.gain.value = 0.18;
  s.connect(f).connect(g).connect(c.destination); s.start(t);
}
export function playPickup(kind: 'coin' | 'herb' | 'relic') {
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.01;
  if (kind === 'herb') { rustle(c, t); tone(c, 523, t + 0.12, 0.5, 0.12); tone(c, 784, t + 0.2, 0.7, 0.09); return; }
  // coin / relic: low "thunk" + rising gold chime
  tone(c, 180, t, 0.18, 0.2, 'triangle');
  [988, 1319, 1760].forEach((f, i) => tone(c, f, t + 0.06 + i * 0.07, 0.9, 0.1));
  if (kind === 'relic') tone(c, 2637, t + 0.3, 1.2, 0.05);
}
