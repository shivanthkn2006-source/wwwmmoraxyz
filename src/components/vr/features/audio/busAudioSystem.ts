// ═══════════════════════════════════════════════════════════════════════════════
// BUS AUDIO SYSTEM - Separate from train audio
// Uses uploaded bus-running-loop.mp3 and bus-arrival.mp3
// ═══════════════════════════════════════════════════════════════════════════════

import { isVRAudioUnlocked } from '@/lib/vrAudioGate';
import busRunningSrc from '@/assets/audio/bus-running-loop.mp3';
import busArrivalSrc from '@/assets/audio/bus-arrival.mp3';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

let busRunningAudio: HTMLAudioElement | null = null;
let busMasterVolume = 0.6;
const busByIndex = new Map<number, number>();

const ensureBusRunning = (): HTMLAudioElement | null => {
  if (typeof window === 'undefined') return null;
  if (busRunningAudio) return busRunningAudio;
  const a = new Audio(busRunningSrc);
  a.loop = true;
  a.preload = 'auto';
  a.crossOrigin = 'anonymous';
  a.volume = 0;
  busRunningAudio = a;
  return a;
};

const applyBusMix = () => {
  const audio = ensureBusRunning();
  if (!audio) return;
  const nearest = Math.max(0, ...Array.from(busByIndex.values()));
  const target = clamp(nearest * busMasterVolume, 0, 1);
  audio.volume = target;
  if (!isVRAudioUnlocked() || target < 0.01) {
    if (!audio.paused) void audio.pause();
    return;
  }
  if (audio.paused) void audio.play().catch(() => {});
};

export const updateBusRunningLevel = (busIndex: number, level: number) => {
  busByIndex.set(busIndex, clamp(level, 0, 1));
  applyBusMix();
};

export const clearBusRunningLevel = (busIndex: number) => {
  busByIndex.delete(busIndex);
  applyBusMix();
};

export const playBusArrivalSound = (volume: number) => {
  if (typeof window === 'undefined' || !isVRAudioUnlocked()) return;
  const v = clamp(volume * busMasterVolume, 0, 1);
  if (v < 0.02) return;
  const a = new Audio(busArrivalSrc);
  a.preload = 'auto';
  a.crossOrigin = 'anonymous';
  a.volume = v;
  a.play().catch(() => {});
};

export const setBusMasterVolume = (v: number) => {
  busMasterVolume = clamp(v, 0, 1);
  applyBusMix();
};
