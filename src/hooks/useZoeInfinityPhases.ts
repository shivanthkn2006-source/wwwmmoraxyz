/**
 * ZOE INFINITY PHASES - The Traffic Light System
 * 
 * Prevents M1 Mac freeze by staging hook initialization over 2 seconds.
 * Instead of loading 38 hooks at 0ms, we queue them in 4 rapid stages.
 * 
 * Stage 1 (0ms):    Brain & Voice - Chat works instantly
 * Stage 2 (500ms):  Visuals & Effects - UI looks good
 * Stage 3 (1000ms): Destiny & Memory - Deep features load
 * Stage 4 (1500ms): Vision & Background - Heavy stuff loads silently
 * 
 * Result: Page renders instantly, Mac stays cool, ALL features present.
 */

import { useState, useEffect, useRef } from 'react';

export type LoadPhase = 0 | 1 | 2 | 3 | 4;

export interface PhaseState {
  phase: LoadPhase;
  isBrainReady: boolean;    // Phase 1: Brain + Voice
  isVisualsReady: boolean;  // Phase 2: Phantom + Effects + Companion
  isDestinyReady: boolean;  // Phase 3: Destiny + Vedic + Karmic + Bio
  isHeavyReady: boolean;    // Phase 4: Integration + Documents + Artifacts
  isFullyLoaded: boolean;   // All phases complete
  loadProgress: number;     // 0-100%
}

/**
 * Traffic Controller Hook
 * Spreads CPU load over 2 seconds instead of 0 seconds
 */
export function useZoeInfinityPhases(): PhaseState {
  const [phase, setPhase] = useState<LoadPhase>(0);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    console.log('[ZoePhases] 🚦 Starting Traffic Light System...');
    
    // Stage 1: Brain & Voice (Immediate - 0ms)
    // Chat functionality works instantly
    const t1 = setTimeout(() => {
      if (!mountedRef.current) return;
      console.log('[ZoePhases] ✅ Stage 1: Brain & Voice READY');
      setPhase(1);
    }, 0);
    
    // Stage 2: Visuals & Effects (500ms)
    // UI looks polished
    const t2 = setTimeout(() => {
      if (!mountedRef.current) return;
      console.log('[ZoePhases] ✅ Stage 2: Visuals & Effects READY');
      setPhase(2);
    }, 500);
    
    // Stage 3: Destiny & Memory (1000ms)
    // Deep personalization features
    const t3 = setTimeout(() => {
      if (!mountedRef.current) return;
      console.log('[ZoePhases] ✅ Stage 3: Destiny & Memory READY');
      setPhase(3);
    }, 1000);
    
    // Stage 4: Vision & Background (1500ms)
    // Heavy background processes
    const t4 = setTimeout(() => {
      if (!mountedRef.current) return;
      console.log('[ZoePhases] ✅ Stage 4: All Systems READY - Full Power!');
      setPhase(4);
    }, 1500);
    
    timersRef.current = [t1, t2, t3, t4];
    
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(t => clearTimeout(t));
      console.log('[ZoePhases] 🛑 Phase loader cleanup');
    };
  }, []);

  return {
    phase,
    isBrainReady: phase >= 1,
    isVisualsReady: phase >= 2,
    isDestinyReady: phase >= 3,
    isHeavyReady: phase >= 4,
    isFullyLoaded: phase === 4,
    loadProgress: (phase / 4) * 100,
  };
}

export default useZoeInfinityPhases;
