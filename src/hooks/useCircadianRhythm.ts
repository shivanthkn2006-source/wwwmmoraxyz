// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 3: THE "MOONLIGHT" VOICE SHIFT - Circadian Rhythm System
// ═══════════════════════════════════════════════════════════════════════════════
//
// The app "feels sleepy" at night - voice becomes warmer, background darkens,
// and the BioKernel weights Empathy higher than Logic.
//
// Night Mode: 10 PM - 5 AM
// Day Mode: Default settings
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import type { VoiceSettings } from '@/hooks/useEmotionalVoice';
import { useTimeSimulationSafe } from '@/contexts/TimeSimulationContext';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CircadianPhase = 
  | 'DEEP_NIGHT'      // 12 AM - 4 AM: The soul hours
  | 'EARLY_MORNING'   // 4 AM - 6 AM: Awakening
  | 'MORNING'         // 6 AM - 12 PM: Day begins
  | 'AFTERNOON'       // 12 PM - 5 PM: Peak energy
  | 'EVENING'         // 5 PM - 8 PM: Winding down
  | 'NIGHT';          // 8 PM - 12 AM: Intimate hours

export interface CircadianState {
  phase: CircadianPhase;
  isNightMode: boolean;          // True for 10 PM - 5 AM
  isDeepNight: boolean;          // True for 12 AM - 4 AM
  hour: number;                  // Current hour (0-23)
  intimacyFactor: number;        // 0.0-1.0 (higher at night = more intimate)
  empathyWeight: number;         // 0.0-1.0 (higher at night = prioritize feelings)
  logicWeight: number;           // 0.0-1.0 (higher during day = prioritize logic)
  backgroundStyle: CircadianBackgroundStyle;
  voiceModifiers: VoiceSettings; // Overrides for night mode
}

export interface CircadianBackgroundStyle {
  primaryColor: string;          // Main background color
  secondaryColor: string;        // Gradient end color
  glowColor: string;             // Subtle glow accents
  opacity: number;               // Overall opacity
  blur: number;                  // Background blur
  saturation: number;            // Color saturation (lower at night)
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const PHASE_CONFIGS: Record<CircadianPhase, {
  intimacyFactor: number;
  empathyWeight: number;
  logicWeight: number;
  voice: VoiceSettings;
  background: CircadianBackgroundStyle;
}> = {
  DEEP_NIGHT: {
    intimacyFactor: 1.0,
    empathyWeight: 0.9,
    logicWeight: 0.3,
    voice: {
      pitch: 0.75,   // Lower, warmer
      rate: 0.80,    // Slower, intimate
      volume: 0.55,  // Whisper soft
    },
    background: {
      primaryColor: 'hsl(220, 80%, 4%)',      // Deep OLED black
      secondaryColor: 'hsl(240, 70%, 8%)',    // Midnight blue
      glowColor: 'rgba(100, 120, 255, 0.1)',  // Subtle blue glow
      opacity: 1.0,
      blur: 0,
      saturation: 0.3,
    },
  },
  EARLY_MORNING: {
    intimacyFactor: 0.7,
    empathyWeight: 0.7,
    logicWeight: 0.5,
    voice: {
      pitch: 0.85,
      rate: 0.85,
      volume: 0.65,
    },
    background: {
      primaryColor: 'hsl(220, 50%, 8%)',
      secondaryColor: 'hsl(280, 40%, 15%)',   // Dawn purple
      glowColor: 'rgba(255, 180, 100, 0.1)',  // Warm dawn glow
      opacity: 0.9,
      blur: 5,
      saturation: 0.5,
    },
  },
  MORNING: {
    intimacyFactor: 0.3,
    empathyWeight: 0.5,
    logicWeight: 0.7,
    voice: {
      pitch: 1.0,
      rate: 1.0,
      volume: 0.85,
    },
    background: {
      primaryColor: 'hsl(210, 30%, 12%)',
      secondaryColor: 'hsl(200, 40%, 15%)',
      glowColor: 'rgba(100, 200, 255, 0.15)',
      opacity: 0.7,
      blur: 10,
      saturation: 0.7,
    },
  },
  AFTERNOON: {
    intimacyFactor: 0.2,
    empathyWeight: 0.4,
    logicWeight: 0.8,
    voice: {
      pitch: 1.05,
      rate: 1.05,
      volume: 0.9,
    },
    background: {
      primaryColor: 'hsl(210, 25%, 14%)',
      secondaryColor: 'hsl(200, 30%, 18%)',
      glowColor: 'rgba(0, 255, 255, 0.1)',
      opacity: 0.6,
      blur: 15,
      saturation: 0.8,
    },
  },
  EVENING: {
    intimacyFactor: 0.5,
    empathyWeight: 0.6,
    logicWeight: 0.6,
    voice: {
      pitch: 0.95,
      rate: 0.95,
      volume: 0.8,
    },
    background: {
      primaryColor: 'hsl(25, 60%, 10%)',      // Warm sunset
      secondaryColor: 'hsl(280, 50%, 12%)',   // Purple dusk
      glowColor: 'rgba(255, 150, 50, 0.15)',  // Golden hour
      opacity: 0.75,
      blur: 8,
      saturation: 0.6,
    },
  },
  NIGHT: {
    intimacyFactor: 0.8,
    empathyWeight: 0.8,
    logicWeight: 0.4,
    voice: {
      pitch: 0.80,
      rate: 0.85,
      volume: 0.6,
    },
    background: {
      primaryColor: 'hsl(230, 70%, 6%)',      // Dark navy
      secondaryColor: 'hsl(250, 60%, 10%)',   // Deep purple
      glowColor: 'rgba(150, 100, 255, 0.1)',  // Soft purple glow
      opacity: 0.95,
      blur: 0,
      saturation: 0.4,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: Determine phase from hour
// ═══════════════════════════════════════════════════════════════════════════════

const getPhaseFromHour = (hour: number): CircadianPhase => {
  if (hour >= 0 && hour < 4) return 'DEEP_NIGHT';
  if (hour >= 4 && hour < 6) return 'EARLY_MORNING';
  if (hour >= 6 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 17) return 'AFTERNOON';
  if (hour >= 17 && hour < 20) return 'EVENING';
  return 'NIGHT'; // 20-23 (8 PM - 12 AM)
};

const isNightModeHour = (hour: number): boolean => {
  // Night mode: 10 PM (22) - 5 AM
  return hour >= 22 || hour < 5;
};

const isDeepNightHour = (hour: number): boolean => {
  // Deep night: 12 AM - 4 AM
  return hour >= 0 && hour < 4;
};

// ═══════════════════════════════════════════════════════════════════════════════
// THE CIRCADIAN RHYTHM HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseCircadianRhythmReturn {
  state: CircadianState;
  phase: CircadianPhase;
  isNightMode: boolean;
  isDeepNight: boolean;
  intimacyFactor: number;
  getVoiceModifiers: () => VoiceSettings;
  getBackgroundStyle: () => CircadianBackgroundStyle;
  getEmpathyLogicBalance: () => { empathy: number; logic: number };
}

export const useCircadianRhythm = (): UseCircadianRhythmReturn => {
  // Get simulation context (safe version that works outside provider)
  const { getEffectiveHour, simulationEnabled } = useTimeSimulationSafe();
  
  const [state, setState] = useState<CircadianState>(() => {
    const hour = getEffectiveHour();
    const phase = getPhaseFromHour(hour);
    const config = PHASE_CONFIGS[phase];
    
    return {
      phase,
      isNightMode: isNightModeHour(hour),
      isDeepNight: isDeepNightHour(hour),
      hour,
      intimacyFactor: config.intimacyFactor,
      empathyWeight: config.empathyWeight,
      logicWeight: config.logicWeight,
      backgroundStyle: config.background,
      voiceModifiers: config.voice,
    };
  });

  // Update when simulation changes or every minute for real time
  useEffect(() => {
    const updateCircadian = () => {
      const hour = getEffectiveHour();
      const phase = getPhaseFromHour(hour);
      const config = PHASE_CONFIGS[phase];
      
      setState({
        phase,
        isNightMode: isNightModeHour(hour),
        isDeepNight: isDeepNightHour(hour),
        hour,
        intimacyFactor: config.intimacyFactor,
        empathyWeight: config.empathyWeight,
        logicWeight: config.logicWeight,
        backgroundStyle: config.background,
        voiceModifiers: config.voice,
      });
    };

    // Update immediately
    updateCircadian();

    // Check every minute for real time, or more frequently for simulation
    const interval = setInterval(updateCircadian, simulationEnabled ? 500 : 60000);

    // Log initial state with timezone info for debugging
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currentHour = getEffectiveHour();
    const simLabel = simulationEnabled ? ' [SIMULATED]' : '';
    console.log(`[CircadianRhythm] ⏰ TZ: ${timezone} | Hour: ${currentHour}${simLabel} | Phase: ${state.phase} | NightMode: ${state.isNightMode} | Empathy: ${(state.empathyWeight * 100).toFixed(0)}%`);

    return () => clearInterval(interval);
  }, [getEffectiveHour, simulationEnabled]);

  const getVoiceModifiers = useCallback((): VoiceSettings => {
    return state.voiceModifiers;
  }, [state.voiceModifiers]);

  const getBackgroundStyle = useCallback((): CircadianBackgroundStyle => {
    return state.backgroundStyle;
  }, [state.backgroundStyle]);

  const getEmpathyLogicBalance = useCallback(() => {
    return {
      empathy: state.empathyWeight,
      logic: state.logicWeight,
    };
  }, [state.empathyWeight, state.logicWeight]);

  return {
    state,
    phase: state.phase,
    isNightMode: state.isNightMode,
    isDeepNight: state.isDeepNight,
    intimacyFactor: state.intimacyFactor,
    getVoiceModifiers,
    getBackgroundStyle,
    getEmpathyLogicBalance,
  };
};

export default useCircadianRhythm;
