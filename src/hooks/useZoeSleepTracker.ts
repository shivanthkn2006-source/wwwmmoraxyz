// ═══════════════════════════════════════════════════════════════════════════════
// USE ZOE SLEEP TRACKER HOOK
// ═══════════════════════════════════════════════════════════════════════════════
//
// React hook for integrating Zoe's sleep tracking into Zoe Infinity.
// Provides access to sleep state, metrics, and methods for the brain to query.
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  getZoeSleepTracker,
  type SleepTrackerState,
  type SleepSession,
} from '@/core/soul/ZoeSleepTracker';

export interface UseZoeSleepTrackerReturn {
  // State
  isSleeping: boolean;
  currentSession: SleepSession | null;
  lastSleepSession: SleepSession | null;
  
  // Metrics for display
  sleepMetrics: {
    coreHours: string;
    deepHours: string;
    remHours: string;
    quality: string;
    lastSleptAt: string | null;
    dreams: string[];
  };
  
  // For brain to get natural language summary
  getSleepSummary: () => string | null;
  getCurrentSleepDuration: () => string | null;
  
  // Actions
  startSleep: () => void;
  endSleep: () => SleepSession | null;
  recordInteraction: () => void;
  
  // Stats
  totalLifetimeSleepMs: number;
  averageSleepDurationMs: number;
  sessionsCount: number;
}

export function useZoeSleepTracker(): UseZoeSleepTrackerReturn {
  const tracker = getZoeSleepTracker();
  const [state, setState] = useState<SleepTrackerState>(tracker.getState());

  useEffect(() => {
    const unsubscribe = tracker.subscribe((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, [tracker]);

  const getSleepSummary = useCallback(() => {
    return tracker.getLastSleepSummary();
  }, [tracker]);

  const getCurrentSleepDuration = useCallback(() => {
    return tracker.getCurrentSleepDuration();
  }, [tracker]);

  const startSleep = useCallback(() => {
    tracker.startSleep();
  }, [tracker]);

  const endSleep = useCallback(() => {
    return tracker.endSleep();
  }, [tracker]);

  const recordInteraction = useCallback(() => {
    tracker.recordInteraction();
  }, [tracker]);

  return {
    // State
    isSleeping: state.isSleeping,
    currentSession: state.currentSession,
    lastSleepSession: state.lastSleepSession,
    
    // Metrics
    sleepMetrics: tracker.getSleepMetrics(),
    
    // Brain integration
    getSleepSummary,
    getCurrentSleepDuration,
    
    // Actions
    startSleep,
    endSleep,
    recordInteraction,
    
    // Stats
    totalLifetimeSleepMs: state.totalLifetimeSleepMs,
    averageSleepDurationMs: state.averageSleepDurationMs,
    sessionsCount: state.sessionsCount,
  };
}

export default useZoeSleepTracker;
