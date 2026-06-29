/**
 * zoeRuntimeSignalBus — tiny pub/sub for live runtime signals
 * (hormones snapshot, fusion result, urgent-call flag).
 *
 * The brain hook reads the latest snapshot synchronously when building a
 * payload; UI components (avatar, status panel) subscribe for live updates.
 */
import {
  computeHormoneSnapshot,
  type HormoneSnapshot,
  type LifestylePresetId,
} from '@/core/zoe/VirtualHormonesEngine';
import { fuseEmotions, FusionSignals, type FusedResult } from '@/core/zoe/EmotionalFusionLayer';

export interface RuntimeSignals {
  hormones: HormoneSnapshot;
  fusion: FusedResult;
  urgentCall: boolean;
  at: number;
}

const PRESET_KEY = 'zoe_infinity_lifestyle_preset';
const EVT = 'zoe:runtime-signals';

function readPreset(): LifestylePresetId {
  try {
    const v = localStorage.getItem(PRESET_KEY) as LifestylePresetId | null;
    if (v === 'night_owl' || v === 'early_bird' || v === 'balanced') return v;
  } catch {}
  return 'balanced';
}

let latest: RuntimeSignals = {
  hormones: computeHormoneSnapshot(readPreset(), new Date().getHours(), 50),
  fusion: fuseEmotions([FusionSignals.sentiment('happy', 0.4)]),
  urgentCall: false,
  at: Date.now(),
};

export function getRuntimeSignals(): RuntimeSignals {
  return latest;
}

export function publishRuntimeSignals(next: Partial<RuntimeSignals>): void {
  latest = { ...latest, ...next, at: Date.now() };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<RuntimeSignals>(EVT, { detail: latest }));
  }
}

export function subscribeRuntimeSignals(cb: (s: RuntimeSignals) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<RuntimeSignals>).detail);
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}

/** Refresh the hormone snapshot using current local hour + stored preset. */
export function refreshHormoneSnapshot(intimacy = 50): HormoneSnapshot {
  const snap = computeHormoneSnapshot(readPreset(), new Date().getHours(), intimacy);
  publishRuntimeSignals({ hormones: snap });
  return snap;
}

/** Fuse current sentiment + memory + hormones into one avatar emotion. */
export function recomputeFusion(opts: {
  sentiment?: { emotion: any; weight?: number } | null;
  memoryHit?: boolean;
  visionScanning?: boolean;
  festival?: boolean;
  urgentCall?: boolean;
} = {}): FusedResult {
  const signals = [];
  if (opts.sentiment) signals.push(FusionSignals.sentiment(opts.sentiment.emotion, opts.sentiment.weight ?? 0.6));
  if (opts.memoryHit) signals.push(FusionSignals.memoryRecall(0.5));
  if (opts.visionScanning) signals.push(FusionSignals.visionScanning(0.5));
  if (opts.festival) signals.push(FusionSignals.festival(0.7));
  if (opts.urgentCall) signals.push(FusionSignals.urgentCall(0.95));
  signals.push(FusionSignals.hormones(latest.hormones.phase, 0.35));
  const fused = fuseEmotions(signals);
  publishRuntimeSignals({ fusion: fused, urgentCall: !!opts.urgentCall });
  return fused;
}
