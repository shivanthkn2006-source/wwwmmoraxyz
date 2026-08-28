// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL VOICE ENGINE
// Mounted ONCE in PlatformLayout, outside every page component, so the
// recognizer survives route changes across all agent sections. Opt-in only:
// the mic is never opened until the platform store flips voiceCommandActive
// (or a persisted user opt-in exists), so no surprise permission prompts.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { voiceCommandService, VoiceCommandService } from '@/services/voiceCommandService';
import { usePlatformStore } from '@/store/usePlatformStore';

const OPT_IN_KEY = 'mmora-voice-engine-opt-in';

export const isVoiceEngineOptedIn = (): boolean => {
  try {
    return localStorage.getItem(OPT_IN_KEY) === '1';
  } catch {
    return false;
  }
};

export const setVoiceEngineOptIn = (on: boolean) => {
  try {
    localStorage.setItem(OPT_IN_KEY, on ? '1' : '0');
  } catch {
    /* storage blocked */
  }
  usePlatformStore.getState().toggleVoiceCommand(on);
};

export function useVoiceEngine() {
  const location = useLocation();
  const active = usePlatformStore((s) => s.voiceCommandActive);
  const thermalSafeMode = usePlatformStore((s) => s.thermalSafeMode);
  const bootstrapped = useRef(false);

  // Restore a previous opt-in exactly once per session.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (isVoiceEngineOptedIn()) usePlatformStore.getState().toggleVoiceCommand(true);
  }, []);

  // Start / stop the singleton. Thermal-safe mode suspends the recognizer.
  useEffect(() => {
    if (!VoiceCommandService.isSupported()) return;
    if (active && !thermalSafeMode) {
      voiceCommandService.start();
    } else if (voiceCommandService.isRunning) {
      voiceCommandService.stop();
    }
    // No teardown on route change — persistence is the whole point. The service
    // is a process-wide singleton and stops only when the flag flips off.
  }, [active, thermalSafeMode]);

  // Route-safe cancellation: never let a command land on the wrong screen.
  useEffect(() => {
    if (voiceCommandService.isRunning) voiceCommandService.handleRouteChange();
  }, [location.pathname]);

  // Release the mic when the tab is hidden for long, to save battery/heat.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onVisibility = () => {
      if (document.hidden) {
        timer = setTimeout(() => voiceCommandService.stop(), 30_000);
      } else {
        if (timer) clearTimeout(timer);
        timer = null;
        if (usePlatformStore.getState().voiceCommandActive) voiceCommandService.start();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (timer) clearTimeout(timer);
    };
  }, []);
}

export default useVoiceEngine;
