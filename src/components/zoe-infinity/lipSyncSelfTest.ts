/**
 * LIP-SYNC SELF-TEST
 * ==================
 * Plays a short modulated tone locally and verifies that the lip-sync
 * pipeline actually drives jaw/mouth blendshapes (via the published debug
 * frame `jaw` value, which is written every render frame by
 * ZoeGLBLipSyncCanvas after computing morph influences).
 *
 * Non-destructive: temporarily routes a generated tone through the
 * existing file-audio bus, then restores the previous source.
 */

import {
  getLipSyncSettings,
  setLipSyncSettings,
  setLipSyncFileAudio,
  subscribeLipSyncDebug,
  type LipSyncDebugFrame,
} from '@/stores/zoeLipSyncSettings';

export interface LipSyncSelfTestResult {
  passed: boolean;
  reason: string;
  samples: number;
  peakJaw: number;
  jawDelta: number;       // max - min over the run
  framesAboveThreshold: number;
  durationMs: number;
}

const TEST_DURATION_MS = 1800;
const PASS_PEAK_JAW = 0.12;        // jaw blendshape must reach this
const PASS_JAW_DELTA = 0.08;       // jaw must vary (not stuck flat)
const PASS_MIN_ACTIVE_FRAMES = 6;

/** Build a short modulated tone as a WebAudio MediaStream → <audio> element. */
function buildTestAudioElement(): { audio: HTMLAudioElement; cleanup: () => void } {
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) throw new Error('Web Audio API unavailable');
  const ctx: AudioContext = new Ctx();

  const dest = ctx.createMediaStreamDestination();
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const masterGain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.value = 220;        // vowel-ish fundamental
  lfo.type = 'sine';
  lfo.frequency.value = 4.5;        // mouth open/close cadence
  lfoGain.gain.value = 0.35;

  masterGain.gain.value = 0.35;

  lfo.connect(lfoGain);
  lfoGain.connect(masterGain.gain); // amplitude modulation → jaw motion
  osc.connect(masterGain);
  masterGain.connect(dest);

  osc.start();
  lfo.start();

  const audio = new Audio();
  audio.srcObject = dest.stream as unknown as MediaProvider;
  audio.muted = true;               // self-test stays silent
  audio.autoplay = false;

  const cleanup = () => {
    try { osc.stop(); } catch { /* noop */ }
    try { lfo.stop(); } catch { /* noop */ }
    try { ctx.close(); } catch { /* noop */ }
    try { audio.pause(); audio.srcObject = null; } catch { /* noop */ }
  };

  return { audio, cleanup };
}

export async function runLipSyncSelfTest(
  onFrame?: (f: LipSyncDebugFrame) => void,
): Promise<LipSyncSelfTestResult> {
  const start = performance.now();
  const prevSettings = getLipSyncSettings();

  // Force pipeline into a known state
  setLipSyncSettings({ enabled: true, source: 'file' });

  let testAudio: HTMLAudioElement | null = null;
  let cleanupAudio: (() => void) | null = null;

  let samples = 0;
  let peakJaw = 0;
  let minJaw = Infinity;
  let maxJaw = 0;
  let framesAboveThreshold = 0;

  const unsub = subscribeLipSyncDebug((f) => {
    samples += 1;
    if (f.jaw > peakJaw) peakJaw = f.jaw;
    if (f.jaw < minJaw) minJaw = f.jaw;
    if (f.jaw > maxJaw) maxJaw = f.jaw;
    if (f.jaw > 0.05) framesAboveThreshold += 1;
    onFrame?.(f);
  });

  try {
    const built = buildTestAudioElement();
    testAudio = built.audio;
    cleanupAudio = built.cleanup;

    setLipSyncFileAudio(testAudio);
    await testAudio.play().catch((err) => {
      throw new Error(`Audio play blocked: ${(err as Error)?.message ?? err}`);
    });

    await new Promise((res) => setTimeout(res, TEST_DURATION_MS));
  } catch (err) {
    unsub();
    cleanupAudio?.();
    setLipSyncFileAudio(null);
    setLipSyncSettings({ source: prevSettings.source, enabled: prevSettings.enabled });
    return {
      passed: false,
      reason: (err as Error)?.message ?? 'Self-test setup failed',
      samples,
      peakJaw,
      jawDelta: 0,
      framesAboveThreshold,
      durationMs: performance.now() - start,
    };
  }

  unsub();
  cleanupAudio?.();
  setLipSyncFileAudio(null);
  setLipSyncSettings({ source: prevSettings.source, enabled: prevSettings.enabled });

  const jawDelta = maxJaw - (minJaw === Infinity ? 0 : minJaw);
  const passed =
    samples > 10 &&
    peakJaw >= PASS_PEAK_JAW &&
    jawDelta >= PASS_JAW_DELTA &&
    framesAboveThreshold >= PASS_MIN_ACTIVE_FRAMES;

  let reason = 'Lip-sync pipeline driving morph targets correctly.';
  if (!passed) {
    if (samples <= 10) reason = 'No debug frames received — canvas not mounted or lip-sync disabled.';
    else if (peakJaw < PASS_PEAK_JAW) reason = `Jaw never opened past ${PASS_PEAK_JAW.toFixed(2)} (peak ${peakJaw.toFixed(3)}).`;
    else if (jawDelta < PASS_JAW_DELTA) reason = `Jaw value did not vary enough (Δ ${jawDelta.toFixed(3)}).`;
    else reason = `Too few active frames (${framesAboveThreshold}).`;
  }

  return {
    passed,
    reason,
    samples,
    peakJaw,
    jawDelta,
    framesAboveThreshold,
    durationMs: performance.now() - start,
  };
}
