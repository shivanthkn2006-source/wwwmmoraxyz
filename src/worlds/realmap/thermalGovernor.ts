/**
 * Slow-phone protection (from the thermal governor demo): watches frame time
 * and steps quality down when the phone struggles (lower resolution, fewer
 * cars and people), then steps back up after it has stayed smooth for a while.
 */
import { useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/** 0 = full, 1 = reduced, 2 = minimum. */
export type Level = 0 | 1 | 2;
export const SLOW_MS = 38;       // ~26 fps
export const SMOOTH_MS = 24;     // ~42 fps
export const DOWN_AFTER_S = 3;
export const UP_AFTER_S = 12;
export const TRAFFIC_SCALE: Record<Level, number> = { 0: 1, 1: 0.55, 2: 0.25 };
export const DPR_CAP: Record<Level, number> = { 0: 2, 1: 1.5, 2: 1 };

export type Gov = { level: Level; slowFor: number; smoothFor: number; avg: number };
/** Pure step: feed one frame's time (seconds). */
export function governorStep(g: Gov, dt: number): Gov {
  const avg = g.avg * 0.92 + dt * 1000 * 0.08;
  let { level, slowFor, smoothFor } = g;
  slowFor = avg > SLOW_MS ? slowFor + dt : 0;
  smoothFor = avg < SMOOTH_MS ? smoothFor + dt : 0;
  if (slowFor > DOWN_AFTER_S && level < 2) { level = (level + 1) as Level; slowFor = 0; smoothFor = 0; }
  else if (smoothFor > UP_AFTER_S && level > 0) { level = (level - 1) as Level; slowFor = 0; smoothFor = 0; }
  return { level, slowFor, smoothFor, avg };
}

const LOW_MEM = typeof navigator !== 'undefined' && (((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4);
let g: Gov = { level: LOW_MEM ? 1 : 0, slowFor: 0, smoothFor: 0, avg: 16 };
const ls = new Set<() => void>();
export const getGovLevel = () => g.level;
export const useGovLevel = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => g.level, () => g.level);
if (typeof window !== 'undefined') (window as unknown as { __vrGov: () => Gov }).__vrGov = () => g;

export function ThermalGovernor(): null {
  const { gl } = useThree();
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.25);
    const before = g.level;
    g = governorStep(g, dt);
    if (g.level !== before) {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP[g.level]);
      gl.setPixelRatio(dpr);
      ls.forEach((l) => l());
    }
  });
  return null;
}
