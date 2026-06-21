/**
 * REALISTIC TRAIN HORN SYNTHESIZER v3
 * Deep, powerful locomotive horn using layered oscillators with
 * air-pressure simulation, resonant body, and proper Doppler warmth.
 * Based on real K5LA 5-chime horn frequencies with air-rush and
 * resonant cavity modeling for authentic railroad sound.
 */

export interface TrainHornOptions {
  volume: number;
  duration?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* Soft-clip waveshaper for warm saturation */
const createSoftClipCurve = (amount: number = 2.0): Float32Array => {
  const n = 8192;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
};

/* Band-limited noise for air-rush texture */
const createNoiseBuffer = (ctx: AudioContext, dur: number): AudioBuffer => {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // Brown noise (integrated white) for deeper, more natural air rush
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
};

export const playRealisticTrainHorn = (ctx: AudioContext, options: TrainHornOptions) => {
  const duration = clamp(options.duration ?? 4, 1.5, 8);
  const intensity = clamp(options.volume, 0.05, 1);
  const t0 = ctx.currentTime + 0.005;
  const tEnd = t0 + duration;

  // ── Master chain ──────────────────────────────────────────────────────────
  const hornBus = ctx.createGain();
  const airBus = ctx.createGain();

  // Resonant body filter (simulates the bell of the horn)
  const bodyResonance = ctx.createBiquadFilter();
  bodyResonance.type = 'peaking';
  bodyResonance.frequency.value = 420;
  bodyResonance.Q.value = 2.5;
  bodyResonance.gain.value = 6;

  const toneLowPass = ctx.createBiquadFilter();
  toneLowPass.type = 'lowpass';
  toneLowPass.frequency.value = 1800; // Tighter LP to remove harsh highs
  toneLowPass.Q.value = 0.7;

  const toneHighPass = ctx.createBiquadFilter();
  toneHighPass.type = 'highpass';
  toneHighPass.frequency.value = 65;
  toneHighPass.Q.value = 0.5;

  const clipper = ctx.createWaveShaper();
  clipper.curve = new Float32Array(createSoftClipCurve(2.8));
  clipper.oversample = '4x';

  const masterGain = ctx.createGain();

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 20;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  // Master envelope — slow attack like real air horn building pressure
  const peak = clamp(0.38 + intensity * 0.42, 0.35, 0.8);
  masterGain.gain.setValueAtTime(0.0001, t0);
  masterGain.gain.exponentialRampToValueAtTime(peak * 0.6, t0 + 0.15); // initial air burst
  masterGain.gain.exponentialRampToValueAtTime(peak, t0 + 0.6);        // full pressure
  masterGain.gain.setValueAtTime(peak * 0.92, tEnd - 1.0);
  masterGain.gain.exponentialRampToValueAtTime(peak * 0.3, tEnd - 0.15); // pressure release
  masterGain.gain.exponentialRampToValueAtTime(0.0001, tEnd);

  // Routing: hornBus + airBus → bodyResonance → LP → HP → clipper → master → compressor → out
  hornBus.connect(bodyResonance);
  airBus.connect(bodyResonance);
  bodyResonance.connect(toneLowPass);
  toneLowPass.connect(toneHighPass);
  toneHighPass.connect(clipper);
  clipper.connect(masterGain);
  masterGain.connect(compressor);
  compressor.connect(ctx.destination);

  // ── K5LA 5-chime horn voices ──────────────────────────────────────────────
  // Real K5LA frequencies: 311, 370, 415, 466, 554 Hz
  const hornVoices = [
    { freq: 311, detune: -8, level: 0.72, waveA: 'sawtooth' as OscillatorType, waveB: 'triangle' as OscillatorType },
    { freq: 370, detune: 5,  level: 0.65, waveA: 'sawtooth' as OscillatorType, waveB: 'sine' as OscillatorType },
    { freq: 415, detune: -3, level: 0.58, waveA: 'sawtooth' as OscillatorType, waveB: 'triangle' as OscillatorType },
    { freq: 466, detune: 4,  level: 0.48, waveA: 'triangle' as OscillatorType, waveB: 'sine' as OscillatorType },
    { freq: 554, detune: -6, level: 0.35, waveA: 'sine' as OscillatorType, waveB: 'triangle' as OscillatorType },
  ];

  const allNodes: AudioNode[] = [];

  for (let i = 0; i < hornVoices.length; i++) {
    const v = hornVoices[i];

    // Primary oscillator (sawtooth-ish for brass harmonics)
    const oscA = ctx.createOscillator();
    oscA.type = v.waveA;
    oscA.frequency.setValueAtTime(v.freq, t0);
    oscA.detune.setValueAtTime(v.detune, t0);

    // Secondary oscillator (sub-octave body)
    const oscB = ctx.createOscillator();
    oscB.type = v.waveB;
    oscB.frequency.setValueAtTime(v.freq * 0.5, t0);
    oscB.detune.setValueAtTime(v.detune * 0.6, t0);

    // Third oscillator — slight sharp for chorus width
    const oscC = ctx.createOscillator();
    oscC.type = 'sine';
    oscC.frequency.setValueAtTime(v.freq * 1.002, t0); // micro-detuned for width
    oscC.detune.setValueAtTime(v.detune + 12, t0);

    // Slow vibrato (air pressure fluctuation)
    const vibOsc = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vibOsc.type = 'sine';
    vibOsc.frequency.setValueAtTime(1.8 + i * 0.15, t0);
    vibGain.gain.setValueAtTime(0.9 + i * 0.1, t0);
    vibOsc.connect(vibGain);
    vibGain.connect(oscA.frequency);
    vibGain.connect(oscB.frequency);

    // Voice gain envelope — staggered attack like real chimes engaging
    const vGain = ctx.createGain();
    const vPeak = clamp(v.level * (0.7 + intensity * 0.5), 0.25, 0.95);
    const attackOffset = 0.08 + i * 0.07; // Each chime opens slightly later
    vGain.gain.setValueAtTime(0.0001, t0);
    vGain.gain.exponentialRampToValueAtTime(vPeak * 0.5, t0 + attackOffset);
    vGain.gain.exponentialRampToValueAtTime(vPeak, t0 + attackOffset + 0.3);
    vGain.gain.setValueAtTime(vPeak * 0.9, tEnd - 1.0);
    vGain.gain.exponentialRampToValueAtTime(0.0001, tEnd - 0.05);

    oscA.connect(vGain);
    oscB.connect(vGain);
    oscC.connect(vGain);
    vGain.connect(hornBus);

    oscA.start(t0); oscA.stop(tEnd);
    oscB.start(t0); oscB.stop(tEnd);
    oscC.start(t0); oscC.stop(tEnd);
    vibOsc.start(t0); vibOsc.stop(tEnd);

    allNodes.push(oscA, oscB, oscC, vibOsc, vibGain, vGain);
  }

  // ── Low rumble (air tank resonance) ───────────────────────────────────────
  const rumbleOsc = ctx.createOscillator();
  const rumbleGain = ctx.createGain();
  rumbleOsc.type = 'triangle';
  rumbleOsc.frequency.setValueAtTime(72, t0);
  const rumblePeak = clamp(0.18 + intensity * 0.12, 0.15, 0.35);
  rumbleGain.gain.setValueAtTime(0.0001, t0);
  rumbleGain.gain.exponentialRampToValueAtTime(rumblePeak, t0 + 0.5);
  rumbleGain.gain.setValueAtTime(rumblePeak * 0.85, tEnd - 1.2);
  rumbleGain.gain.exponentialRampToValueAtTime(0.0001, tEnd);
  rumbleOsc.connect(rumbleGain);
  rumbleGain.connect(hornBus);
  rumbleOsc.start(t0); rumbleOsc.stop(tEnd);

  // ── Air rush noise (compressed air escaping through horn bells) ────────────
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = createNoiseBuffer(ctx, duration + 0.3);

  const noiseBP = ctx.createBiquadFilter();
  noiseBP.type = 'bandpass';
  noiseBP.frequency.value = 380; // Lower center for warmer air rush
  noiseBP.Q.value = 0.45;

  const noiseLP = ctx.createBiquadFilter();
  noiseLP.type = 'lowpass';
  noiseLP.frequency.value = 900;
  noiseLP.Q.value = 0.3;

  const noiseGain = ctx.createGain();
  const noisePeak = clamp(0.12 + intensity * 0.14, 0.1, 0.28);
  noiseGain.gain.setValueAtTime(0.0001, t0);
  noiseGain.gain.exponentialRampToValueAtTime(noisePeak * 0.8, t0 + 0.1);
  noiseGain.gain.exponentialRampToValueAtTime(noisePeak, t0 + 0.5);
  noiseGain.gain.setValueAtTime(noisePeak * 0.85, tEnd - 1.3);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, tEnd);

  noiseSource.connect(noiseBP);
  noiseBP.connect(noiseLP);
  noiseLP.connect(noiseGain);
  noiseGain.connect(airBus);
  noiseSource.start(t0); noiseSource.stop(tEnd);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanupMs = (duration + 0.4) * 1000;
  window.setTimeout(() => {
    [
      ...allNodes,
      rumbleOsc, rumbleGain,
      noiseSource, noiseBP, noiseLP, noiseGain,
      hornBus, airBus, bodyResonance,
      toneLowPass, toneHighPass, clipper,
      masterGain, compressor,
    ].forEach((node) => {
      try { node.disconnect(); } catch { /* no-op */ }
    });
  }, cleanupMs);
};
