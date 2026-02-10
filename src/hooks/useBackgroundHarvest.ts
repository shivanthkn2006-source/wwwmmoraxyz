// ═══════════════════════════════════════════════════════════════════════════════
// USE BACKGROUND HARVEST - React hook for silent Soul Codex data collection
// Automatically starts harvesting on mount, integrates with app interactions
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  initializeBackgroundHarvest,
  harvestTypingPattern,
  harvestDecisionPattern,
  harvestBehavioralSignal,
  harvestVoiceTexture,
  getHarvestStatus,
} from '@/core/harvest/BackgroundHarvest';

interface TypingMetrics {
  keystrokes: number;
  startTime: number;
  corrections: number;
  pauses: number;
}

export const useBackgroundHarvest = () => {
  const { user } = useAuth();
  const isInitialized = useRef(false);
  const typingMetrics = useRef<TypingMetrics>({
    keystrokes: 0,
    startTime: 0,
    corrections: 0,
    pauses: 0,
  });
  const lastKeystroke = useRef(0);

  // Initialize harvest on mount
  useEffect(() => {
    if (user?.id && !isInitialized.current) {
      initializeBackgroundHarvest(user.id);
      isInitialized.current = true;
    }
  }, [user?.id]);

  // Track typing patterns
  const trackKeystroke = useCallback((key: string, isCorrection = false) => {
    const now = Date.now();
    
    // Start new typing session if gap > 2 seconds
    if (now - lastKeystroke.current > 2000) {
      // Flush previous session if exists
      if (typingMetrics.current.keystrokes > 5) {
        const duration = (lastKeystroke.current - typingMetrics.current.startTime) / 1000;
        const speed = typingMetrics.current.keystrokes / Math.max(duration, 0.1);
        
        harvestTypingPattern({
          avgSpeed: speed * 60, // WPM approximation
          pauseFrequency: typingMetrics.current.pauses / Math.max(typingMetrics.current.keystrokes, 1),
          correctionRate: typingMetrics.current.corrections / Math.max(typingMetrics.current.keystrokes, 1),
          rhythmSignature: [], // Placeholder for rhythm analysis
        });
      }
      
      // Reset for new session
      typingMetrics.current = {
        keystrokes: 0,
        startTime: now,
        corrections: 0,
        pauses: 0,
      };
    }
    
    // Update metrics
    typingMetrics.current.keystrokes++;
    if (isCorrection) typingMetrics.current.corrections++;
    if (now - lastKeystroke.current > 500) typingMetrics.current.pauses++;
    
    lastKeystroke.current = now;
  }, []);

  // Track decisions
  const trackDecision = useCallback((
    decisionType: string,
    timeToDecide: number,
    optionsConsidered: number,
    finalChoice: string,
    confidence = 0.5
  ) => {
    harvestDecisionPattern({
      decisionType,
      timeToDecide,
      optionsConsidered,
      finalChoice,
      confidence,
    });
  }, []);

  // Track behavioral signals
  const trackBehavior = useCallback((
    signalType: string,
    intensity: number,
    context = ''
  ) => {
    harvestBehavioralSignal({
      signalType,
      intensity,
      context,
    });
  }, []);

  // Track voice (for Quantum Calls integration)
  const trackVoice = useCallback((
    frequencyRange: [number, number],
    pitchVariance: number,
    speakingRate: number,
    emotionalTone: string
  ) => {
    harvestVoiceTexture({
      frequencyRange,
      pitchVariance,
      speakingRate,
      emotionalTone,
    });
  }, []);

  // Navigation tracking (automatic)
  useEffect(() => {
    if (!user) return;

    const handleNavigation = () => {
      harvestBehavioralSignal({
        signalType: 'navigation',
        intensity: 1,
        context: window.location.pathname,
      });
    };

    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, [user]);

  // Click tracking (automatic)
  useEffect(() => {
    if (!user) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      
      // Only track meaningful clicks
      if (['button', 'a', 'input', 'select'].includes(tagName)) {
        harvestBehavioralSignal({
          signalType: 'interaction',
          intensity: 0.5,
          context: `${tagName}_click`,
        });
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [user]);

  return {
    // Tracking functions (for manual integration)
    trackKeystroke,
    trackDecision,
    trackBehavior,
    trackVoice,
    
    // Status (admin only)
    getStatus: getHarvestStatus,
    isActive: isInitialized.current,
  };
};

export default useBackgroundHarvest;
