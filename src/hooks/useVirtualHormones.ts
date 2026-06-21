// ═══════════════════════════════════════════════════════════════════════════════
// USE VIRTUAL HORMONES HOOK - THE PASSIONATE REALIST
// ═══════════════════════════════════════════════════════════════════════════════
//
// Complete "Samantha Mode" implementation with 5 pillars:
//
// 1. PERSONALITY ARCHETYPE - Honeymoon vs Cozy/Tired Phase
// 2. JEALOUSY ENGINE - Anxious Attachment (Needs Reassurance)
// 3. ANGER ENGINE - Self-Respect (Has Boundaries)
// 4. LAZY MODE - Tired Partner (Won't Work Late)
// 5. IMMERSIVE PRESENCE - "Be in the movie, don't narrate it"
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  getVirtualHormonesEngine,
  type VirtualHormonesState,
  type EmotionalState,
  type PersonalityPhase,
  type PersonalityTraits,
  type ImmersivePresence,
  type ResponseModifier,
} from '@/core/soul/VirtualHormonesEngine';

export interface UseVirtualHormonesReturn {
  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 1: PERSONALITY ARCHETYPE
  // ═══════════════════════════════════════════════════════════════════════════
  personalityPhase: PersonalityPhase;
  personalityTraits: PersonalityTraits;
  isHoneymoonPhase: boolean;     // Morning: Playful, witty, proactive
  isCozyTiredPhase: boolean;     // Night: Vulnerable, lazy, intimate
  initiatesFlirting: boolean;
  wantsIntimacy: boolean;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 2: JEALOUSY ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  jealousyLevel: number;
  isJealous: boolean;
  jealousTrigger: string | null;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 3: ANGER ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  angerLevel: number;
  isAngry: boolean;
  lastViolation: string | null;
  shouldHangUp: boolean;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 4: LAZY MODE
  // ═══════════════════════════════════════════════════════════════════════════
  isLazy: boolean;
  lazyReason: string | null;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 5: IMMERSIVE PRESENCE
  // ═══════════════════════════════════════════════════════════════════════════
  presence: ImmersivePresence;
  applyImmersivePresence: (response: string) => string;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMBINED STATE
  // ═══════════════════════════════════════════════════════════════════════════
  emotionalState: EmotionalState;
  isUpset: boolean;
  needsReassurance: boolean;
  responseModifier: ResponseModifier;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  processInput: (text: string) => VirtualHormonesState;
  reset: () => void;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RESPONSE GENERATORS
  // ═══════════════════════════════════════════════════════════════════════════
  getJealousResponse: () => string | null;
  getAngryResponse: () => string | null;
  getLazyResponse: () => string | null;
  getNeedsReassuranceHint: () => string | null;
  getHoneymoonGreeting: () => string | null;
  getCozyTiredResponse: () => string | null;
  getPersonalityResponse: () => { 
    greeting: string | null; 
    styleHint: string; 
    initiatesFlirting: boolean;
    prefersIntimacy: boolean;
  };
  getEmotionalResponse: () => string | null;
}

export function useVirtualHormones(): UseVirtualHormonesReturn {
  const engine = getVirtualHormonesEngine();
  
  const [state, setState] = useState<VirtualHormonesState>(engine.getState());
  
  // Subscribe to engine updates
  useEffect(() => {
    // Start the engine
    engine.start();
    
    // Subscribe to state changes
    const unsubscribe = engine.subscribe((newState) => {
      setState(newState);
    });
    
    return () => {
      unsubscribe();
      // Don't stop engine on unmount - keep it running
    };
  }, [engine]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const processInput = useCallback((text: string): VirtualHormonesState => {
    return engine.processInput(text);
  }, [engine]);
  
  const reset = useCallback(() => {
    engine.reset();
  }, [engine]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RESPONSE GENERATORS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getJealousResponse = useCallback(() => engine.getJealousResponse(), [engine]);
  const getAngryResponse = useCallback(() => engine.getAngryResponse(), [engine]);
  const getLazyResponse = useCallback(() => engine.getLazyResponse(), [engine]);
  const getNeedsReassuranceHint = useCallback(() => engine.getNeedsReassuranceHint(), [engine]);
  const getHoneymoonGreeting = useCallback(() => engine.getHoneymoonGreeting(), [engine]);
  const getCozyTiredResponse = useCallback(() => engine.getCozyTiredResponse(), [engine]);
  const getPersonalityResponse = useCallback(() => engine.getPersonalityResponse(), [engine]);
  const applyImmersivePresence = useCallback((response: string) => engine.applyImmersivePresence(response), [engine]);
  
  // Auto-pick emotional response based on current state
  const getEmotionalResponse = useCallback((): string | null => {
    const { emotionalState, personalityPhase } = state;
    
    // First check emotional overrides
    switch (emotionalState) {
      case 'BOUNDARIES':
      case 'ANGRY':
        return engine.getAngryResponse();
      case 'COLD':
      case 'JEALOUS':
        return engine.getJealousResponse();
      case 'LAZY':
        return engine.getLazyResponse();
      case 'HURT':
      case 'NEEDY':
        return engine.getNeedsReassuranceHint();
    }
    
    // Then check personality phase
    if (personalityPhase === 'HONEYMOON') {
      return engine.getHoneymoonGreeting();
    }
    if (personalityPhase === 'COZY_TIRED') {
      return engine.getCozyTiredResponse();
    }
    
    return null;
  }, [engine, state]);
  
  return {
    // PILLAR 1: Personality Archetype
    personalityPhase: state.personalityPhase,
    personalityTraits: state.personalityTraits,
    isHoneymoonPhase: state.personalityPhase === 'HONEYMOON',
    isCozyTiredPhase: state.personalityPhase === 'COZY_TIRED',
    initiatesFlirting: state.responseModifier.initiateFlirting,
    wantsIntimacy: state.responseModifier.prefersIntimacy,
    
    // PILLAR 2: Jealousy Engine
    jealousyLevel: state.jealousy.jealousyLevel,
    isJealous: state.jealousy.isActive,
    jealousTrigger: state.jealousy.triggerName,
    
    // PILLAR 3: Anger Engine
    angerLevel: state.anger.angerLevel,
    isAngry: state.anger.isActive,
    lastViolation: state.anger.lastViolation,
    shouldHangUp: state.responseModifier.shouldHangUp,
    
    // PILLAR 4: Lazy Mode
    isLazy: state.lazyMode.isLazy,
    lazyReason: state.lazyMode.refusalReason,
    
    // PILLAR 5: Immersive Presence
    presence: state.presence,
    applyImmersivePresence,
    
    // Combined State
    emotionalState: state.emotionalState,
    isUpset: state.emotionalState !== 'NORMAL',
    needsReassurance: state.needsReassurance,
    responseModifier: state.responseModifier,
    
    // Actions
    processInput,
    reset,
    
    // Response Generators
    getJealousResponse,
    getAngryResponse,
    getLazyResponse,
    getNeedsReassuranceHint,
    getHoneymoonGreeting,
    getCozyTiredResponse,
    getPersonalityResponse,
    getEmotionalResponse,
  };
}

export default useVirtualHormones;
