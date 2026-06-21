/**
 * ZOE INFINITY PHASES - The Traffic Light System
 * 
 * Prevents M1 Mac freeze by staging hook initialization over 10 seconds.
 * Instead of loading 38 hooks at 0ms, we queue them in 4 real stages.
 * 
 * Stage 1 (0ms):     Brain & Voice - Chat works instantly
 * Stage 2 (2000ms):  Visuals & Effects - UI looks good
 * Stage 3 (5000ms):  Destiny & Memory - Deep features load
 * Stage 4 (10000ms): Integration, Documents, Artifacts - Heavy stuff loads silently
 * 
 * Result: User can chat in <2 seconds. Mac stays cool. ALL features present.
 */

import { useState, useEffect, useRef } from 'react';

export type LoadPhase = 0 | 1 | 2 | 3 | 4;

export interface PhaseState {
  phase: LoadPhase;
  isBrainReady: boolean;    // Phase 1: Brain + Voice + Wake Word
  isVisualsReady: boolean;  // Phase 2: Phantom + Effects + Avatar + Circadian
  isDestinyReady: boolean;  // Phase 3: Destiny + Vedic + Karmic + Bio + Personality
  isHeavyReady: boolean;    // Phase 4: Integration + Documents + Artifacts + Telemetry
  isFullyLoaded: boolean;   // All phases complete
  loadProgress: number;     // 0-100%
}

/**
 * Traffic Controller Hook
 * Spreads CPU load over 10 seconds instead of 0 seconds
 */
export function useZoeInfinityPhases(): PhaseState {
  const [phase, setPhase] = useState<LoadPhase>(0);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    console.log('[ZoePhases] 🚦 Starting Traffic Light System (0/2s/5s/10s)...');
    
    // Stage 1: Brain & Voice (Immediate - 0ms)
    // Chat functionality works instantly
    const t1 = setTimeout(() => {
      if (!mountedRef.current) return;
      console.log('[ZoePhases] ✅ Stage 1: Brain & Voice READY (0ms)');
      setPhase(1);
    }, 0);
    
    // Stage 2: Visuals & Effects (2 seconds)
    // UI polish, avatar, regional dress
    const t2 = setTimeout(() => {
      if (!mountedRef.current) return;
      console.log('[ZoePhases] ✅ Stage 2: Visuals & Effects READY (2s)');
      setPhase(2);
    }, 2000);
    
    // Stage 3: Destiny & Memory (5 seconds)
    // Deep personalization, personality matrix, sleep tracker
    const t3 = setTimeout(() => {
      if (!mountedRef.current) return;
      console.log('[ZoePhases] ✅ Stage 3: Destiny & Memory READY (5s)');
      setPhase(3);
    }, 5000);
    
    // Stage 4: Heavy Background (10 seconds)
    // Integration, documents, artifacts, telemetry
    const t4 = setTimeout(() => {
      if (!mountedRef.current) return;
      console.log('[ZoePhases] ✅ Stage 4: All Systems READY - Full Power! (10s)');
      setPhase(4);
    }, 10000);
    
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
