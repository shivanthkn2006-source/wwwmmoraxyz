import { isVRAudioUnlocked } from '@/lib/vrAudioGate';
import runningLoopSrc from '@/assets/audio/train-running-loop.mp3';
import hornSrc from '@/assets/audio/train-horn.mp3';

type TrainMix = {
  master: number;
  running: number;
  horn: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const DEFAULT_MIX: TrainMix = {
  master: 1,
  running: 0.7,
  horn: 0.9,
};

const runningByTrain = new Map<number, number>();
let mix: TrainMix = { ...DEFAULT_MIX };
let runningAudio: HTMLAudioElement | null = null;
let volumeBridgeAttached = false;

const ensureRunningAudio = (): HTMLAudioElement | null => {
  if (typeof window === 'undefined') return null;
  if (runningAudio) return runningAudio;

  const audio = new Audio(runningLoopSrc);
  audio.loop = true;
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';
  audio.volume = 0;
  runningAudio = audio;
  return runningAudio;
};

const getTargetRunningVolume = (): number => {
  const nearestTrainVolume = Math.max(0, ...Array.from(runningByTrain.values()));
  return clamp(nearestTrainVolume * mix.running * mix.master, 0, 1);
};

const applyRunningMix = () => {
  const audio = ensureRunningAudio();
  if (!audio) return;

  const target = getTargetRunningVolume();
  audio.volume = target;

  if (!isVRAudioUnlocked() || target < 0.01) {
    if (!audio.paused) {
      void audio.pause();
    }
    return;
  }

  if (audio.paused) {
    void audio.play().catch(() => {
      /* autoplay guard */
    });
  }
};

export const ensureTrainAudioVolumeEvents = () => {
  if (typeof window === 'undefined' || volumeBridgeAttached) return;
  volumeBridgeAttached = true;

  window.addEventListener('vr-train-audio-volume', ((event: Event) => {
    const detail = (event as CustomEvent<Partial<TrainMix> & {
      runningDelta?: number;
      hornDelta?: number;
      masterDelta?: number;
    }>).detail || {};

    mix = {
      master: clamp((detail.master ?? mix.master) + (detail.masterDelta ?? 0), 0, 1),
      running: clamp((detail.running ?? mix.running) + (detail.runningDelta ?? 0), 0, 1),
      horn: clamp((detail.horn ?? mix.horn) + (detail.hornDelta ?? 0), 0, 1),
    };

    applyRunningMix();
  }) as EventListener);
};

export const getTrainMix = (): TrainMix => ({ ...mix });

export const updateTrainRunningLevel = (trainIndex: number, level: number) => {
  runningByTrain.set(trainIndex, clamp(level, 0, 1));
  applyRunningMix();
};

export const clearTrainRunningLevel = (trainIndex: number) => {
  runningByTrain.delete(trainIndex);
  applyRunningMix();
};

export const playTrainHornBurst = (requestedVolume: number, durationSeconds: number = 5, distanceToCamera: number = 0) => {
  if (typeof window === 'undefined' || !isVRAudioUnlocked()) return;

  // Distance-based attenuation: full volume at 0m, fades to 0.08 at 80m+
  const distanceFactor = distanceToCamera > 0 ? clamp(1 - distanceToCamera / 80, 0.08, 1) : 1;
  const burstVolume = clamp(requestedVolume * mix.horn * mix.master * distanceFactor, 0, 1);
  if (burstVolume < 0.02) return;

  const startedAt = Date.now();
  const durationMs = Math.max(500, Math.floor(durationSeconds * 1000));
  const pulseMs = 900;

  const triggerPulse = () => {
    if (Date.now() - startedAt > durationMs) return;

    const horn = new Audio(hornSrc);
    horn.preload = 'auto';
    horn.crossOrigin = 'anonymous';
    horn.volume = burstVolume;
    horn.play().catch(() => {
      /* autoplay guard */
    });
  };

  triggerPulse();
  const interval = window.setInterval(() => {
    if (Date.now() - startedAt > durationMs) {
      window.clearInterval(interval);
      return;
    }
    triggerPulse();
  }, pulseMs);
};
