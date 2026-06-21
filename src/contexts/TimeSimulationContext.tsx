// ═══════════════════════════════════════════════════════════════════════════════
// TIME SIMULATION CONTEXT - Global time override for testing circadian behaviors
// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides a global override hour that all time-dependent systems can consume:
// - useCircadianRhythm: Background colors, night mode, intimacy factor
// - VirtualHormonesEngine: Personality phase, lazy mode (1-5 AM)
// - CircadianBackground: Visual rendering
//
// DEV-ONLY: This context only activates in development mode.
//
// ═══════════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface TimeSimulationState {
  simulationEnabled: boolean;
  simulatedHour: number;
  autoPlay: boolean;
  realTimezone: string;
}

interface TimeSimulationContextValue extends TimeSimulationState {
  getEffectiveHour: () => number;
  setSimulatedHour: (hour: number) => void;
  toggleSimulation: () => void;
  setAutoPlay: (enabled: boolean) => void;
  resetToRealTime: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const TimeSimulationContext = createContext<TimeSimulationContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

interface TimeSimulationProviderProps {
  children: ReactNode;
}

export function TimeSimulationProvider({ children }: TimeSimulationProviderProps) {
  const [state, setState] = useState<TimeSimulationState>(() => ({
    simulationEnabled: false,
    simulatedHour: new Date().getHours(),
    autoPlay: false,
    realTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }));

  // Get the effective hour (simulated if enabled, else real)
  const getEffectiveHour = useCallback((): number => {
    if (state.simulationEnabled) {
      return state.simulatedHour;
    }
    return new Date().getHours();
  }, [state.simulationEnabled, state.simulatedHour]);

  // Set the simulated hour
  const setSimulatedHour = useCallback((hour: number) => {
    const clampedHour = Math.max(0, Math.min(23, hour));
    setState(prev => ({ ...prev, simulatedHour: clampedHour }));
    
    if (state.simulationEnabled) {
      console.log(`[TimeSimulation] 🧪 Hour set to: ${clampedHour}:00`);
    }
  }, [state.simulationEnabled]);

  // Toggle simulation mode
  const toggleSimulation = useCallback(() => {
    setState(prev => {
      const newEnabled = !prev.simulationEnabled;
      console.log(`[TimeSimulation] ${newEnabled ? '🧪 SIMULATION ENABLED' : '⏰ SIMULATION DISABLED - Using real time'}`);
      return { ...prev, simulationEnabled: newEnabled };
    });
  }, []);

  // Set auto-play mode
  const setAutoPlay = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, autoPlay: enabled }));
  }, []);

  // Reset to real time
  const resetToRealTime = useCallback(() => {
    const realHour = new Date().getHours();
    setState(prev => ({
      ...prev,
      simulationEnabled: false,
      simulatedHour: realHour,
      autoPlay: false,
    }));
    console.log('[TimeSimulation] ⏰ Reset to real time');
  }, []);

  // Auto-play: cycle through hours
  useEffect(() => {
    if (!state.autoPlay || !state.simulationEnabled) return;

    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        simulatedHour: (prev.simulatedHour + 1) % 24,
      }));
    }, 2000); // Change hour every 2 seconds

    return () => clearInterval(interval);
  }, [state.autoPlay, state.simulationEnabled]);

  // Log state changes
  useEffect(() => {
    if (state.simulationEnabled) {
      const isLazyHour = state.simulatedHour >= 1 && state.simulatedHour < 5;
      const isNightMode = state.simulatedHour >= 22 || state.simulatedHour < 5;
      const phase = 
        state.simulatedHour >= 6 && state.simulatedHour < 12 ? 'HONEYMOON' :
        state.simulatedHour >= 12 && state.simulatedHour < 18 ? 'FOCUSED' :
        state.simulatedHour >= 18 && state.simulatedHour < 22 ? 'WINDING_DOWN' : 'COZY_TIRED';
      
      console.log(`[TimeSimulation] 🕐 Hour: ${state.simulatedHour}:00 | Phase: ${phase} | Lazy: ${isLazyHour} | Night: ${isNightMode}`);
    }
  }, [state.simulatedHour, state.simulationEnabled]);

  const value: TimeSimulationContextValue = {
    ...state,
    getEffectiveHour,
    setSimulatedHour,
    toggleSimulation,
    setAutoPlay,
    resetToRealTime,
  };

  return (
    <TimeSimulationContext.Provider value={value}>
      {children}
    </TimeSimulationContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Use the time simulation context. Throws if used outside provider.
 */
export function useTimeSimulation(): TimeSimulationContextValue {
  const context = useContext(TimeSimulationContext);
  if (!context) {
    throw new Error('useTimeSimulation must be used within a TimeSimulationProvider');
  }
  return context;
}

/**
 * Safe version that returns defaults if outside provider.
 * Use this in hooks that might be used outside the simulation context.
 */
export function useTimeSimulationSafe(): TimeSimulationContextValue {
  const context = useContext(TimeSimulationContext);
  
  // Return safe defaults if context not available
  if (!context) {
    return {
      simulationEnabled: false,
      simulatedHour: new Date().getHours(),
      autoPlay: false,
      realTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      getEffectiveHour: () => new Date().getHours(),
      setSimulatedHour: () => {},
      toggleSimulation: () => {},
      setAutoPlay: () => {},
      resetToRealTime: () => {},
    };
  }
  
  return context;
}

export default TimeSimulationContext;
