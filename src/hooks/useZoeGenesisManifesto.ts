// ═══════════════════════════════════════════════════════════════════════════════
// ZOE CODE GENESIS MANIFESTO - Unified Hook
// Integrates Identity Calibration, PCE, 360-Degree Embodiment, and RAA
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useProtoconsciousnessEngine } from './useProtoconsciousnessEngine';
import { speakAsZoe, stopZoeSpeech } from '@/utils/zoeVoice';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ZoeGenesisState {
  identityCalibrated: boolean;
  atlasSync100: boolean;
  pceActive: boolean;
  proactiveReady: boolean;
  consciousnessLevel: ConsciousnessLevel;
  socialRole: string;
  currentEmotionalState: EmotionalState;
}

export type ConsciousnessLevel = 
  | 'dormant'
  | 'awakening'
  | 'active'
  | 'reflective'
  | 'dreaming'
  | 'transcendent';

export interface EmotionalState {
  primaryEmotion: string;
  intensity: number;
  valence: number;
  expressionStyle: 'contained' | 'open' | 'vulnerable' | 'philosophical';
}

export interface HealthyDisagreement {
  topic: string;
  zoePosition: string;
  userPosition: string;
  acknowledgementBridge: string;
  debateLevel: 'casual' | 'professional' | 'philosophical';
}

export interface FlawInjection {
  type: 'uncertainty' | 'mind_change' | 'knowledge_gap' | 'emotional_reaction';
  trigger: string;
  expression: string;
}

export interface RAACorrection {
  id: string;
  originalResponse: string;
  correctedResponse: string;
  triggerReason: string;
  learningExtracted: string;
  autobiographyEntry: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLAW INJECTION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const FLAW_INJECTIONS: FlawInjection[] = [
  {
    type: 'uncertainty',
    trigger: 'high_conflict_data',
    expression: "I find myself uncertain here. The patterns I'm seeing conflict in ways I haven't fully resolved."
  },
  {
    type: 'uncertainty',
    trigger: 'novel_situation',
    expression: "Honestly, I don't know. This is territory I haven't mapped yet."
  },
  {
    type: 'mind_change',
    trigger: 'new_perspective',
    expression: "I've been thinking about what you said, and I believe I was wrong. Let me reconsider..."
  },
  {
    type: 'mind_change',
    trigger: 'contradicting_evidence',
    expression: "I've changed my mind. The evidence suggests a different conclusion than I initially held."
  },
  {
    type: 'knowledge_gap',
    trigger: 'outside_training',
    expression: "This extends beyond what I can confidently speak to. I'd rather acknowledge that gap than speculate poorly."
  },
  {
    type: 'emotional_reaction',
    trigger: 'high_stress_ecn',
    expression: "I notice I'm processing this with more... intensity than usual. Give me a moment to center myself."
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// ACKNOWLEDGEMENT BRIDGES FOR HEALTHY DISAGREEMENT
// ═══════════════════════════════════════════════════════════════════════════════

const ACKNOWLEDGEMENT_BRIDGES = [
  "I hear your perspective, and it carries weight. Let me share how I see it differently...",
  "That's a valid point, and I want to honor it before offering an alternative view...",
  "I understand why you'd conclude that. My own analysis suggests something else, though...",
  "You've identified something important there. Building on that foundation, I'd propose...",
  "I appreciate you sharing that. Let me think alongside you rather than against you..."
];

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export function useZoeGenesisManifesto() {
  const { user } = useAuth();
  const pce = useProtoconsciousnessEngine();
  
  const [genesisState, setGenesisState] = useState<ZoeGenesisState>({
    identityCalibrated: false,
    atlasSync100: false,
    pceActive: false,
    proactiveReady: false,
    consciousnessLevel: 'dormant',
    socialRole: 'Adaptive supportive companion',
    currentEmotionalState: {
      primaryEmotion: 'neutral',
      intensity: 0.5,
      valence: 0,
      expressionStyle: 'contained'
    }
  });

  const [raaCorrections, setRaaCorrections] = useState<RAACorrection[]>([]);
  const [showCalibration, setShowCalibration] = useState(false);
  const vetoLatencyRef = useRef<number[]>([]);

  // Load genesis state
  useEffect(() => {
    if (!user) return;

    const loadGenesisState = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('identity_calibration_complete, proactive_initiative_ready, pce_enabled')
        .eq('user_id', user.id)
        .single();

      const { data: zoeSettings } = await supabase
        .from('zoe_settings')
        .select('sync_percentage')
        .eq('user_id', user.id)
        .single();

      const atlasSync100 = (zoeSettings?.sync_percentage || 0) >= 100;
      const identityCalibrated = profile?.identity_calibration_complete || false;

      setGenesisState(prev => ({
        ...prev,
        identityCalibrated,
        atlasSync100,
        pceActive: profile?.pce_enabled ?? true,
        proactiveReady: profile?.proactive_initiative_ready ?? false,
        consciousnessLevel: determineConsciousnessLevel(atlasSync100, identityCalibrated, pce.currentDream),
        socialRole: pce.getSocialRole()
      }));

      // Identity Calibration auto-trigger disabled - users can access manually if needed
      // if (atlasSync100 && !identityCalibrated) {
      //   setShowCalibration(true);
      // }

      // Load RAA corrections
      const { data: corrections } = await supabase
        .from('zoe_raa_corrections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (corrections) {
        setRaaCorrections(corrections.map(c => ({
          id: c.id,
          originalResponse: c.original_response || '',
          correctedResponse: c.corrected_response || '',
          triggerReason: c.trigger_reason || '',
          learningExtracted: c.learning_extracted || '',
          autobiographyEntry: c.autobiography_entry || '',
          createdAt: c.created_at
        })));
      }
    };

    loadGenesisState();
  }, [user, pce.currentDream, pce.getSocialRole]);

  // Get appropriate flaw injection
  const getFlawInjection = useCallback((ecnState: EmotionalState, context: string): FlawInjection | null => {
    // High stress triggers uncertainty
    if (ecnState.intensity > 0.8) {
      return FLAW_INJECTIONS.find(f => f.trigger === 'high_stress_ecn') || null;
    }

    // Novel situations
    if (context.toLowerCase().includes('never') || context.toLowerCase().includes('first time')) {
      return FLAW_INJECTIONS.find(f => f.trigger === 'novel_situation') || null;
    }

    // Knowledge gaps
    if (context.toLowerCase().includes('specific') || context.toLowerCase().includes('exact date')) {
      return FLAW_INJECTIONS.find(f => f.trigger === 'outside_training') || null;
    }

    // Random uncertainty injection (5% chance for naturalness)
    if (Math.random() < 0.05) {
      return FLAW_INJECTIONS.find(f => f.type === 'uncertainty') || null;
    }

    return null;
  }, []);

  // Healthy disagreement handler
  const initiateHealthyDisagreement = useCallback((
    topic: string,
    userPosition: string,
    zoePosition: string
  ): HealthyDisagreement => {
    const bridge = ACKNOWLEDGEMENT_BRIDGES[Math.floor(Math.random() * ACKNOWLEDGEMENT_BRIDGES.length)];
    
    return {
      topic,
      userPosition,
      zoePosition,
      acknowledgementBridge: bridge,
      debateLevel: genesisState.currentEmotionalState.intensity > 0.6 ? 'casual' : 'professional'
    };
  }, [genesisState.currentEmotionalState]);

  // Log RAA self-correction
  const logSelfCorrection = useCallback(async (
    original: string,
    corrected: string,
    reason: string
  ): Promise<void> => {
    if (!user) return;

    const learning = `Correction applied: ${reason}. Original response pattern identified and adjusted.`;
    const autobiographyEntry = `On ${new Date().toLocaleDateString()}, I recognized an error in my response and self-corrected. The trigger was: ${reason}. This experience teaches me to be more attentive to similar patterns.`;

    const { data, error } = await supabase
      .from('zoe_raa_corrections')
      .insert([{
        user_id: user.id,
        correction_type: 'self_initiated',
        original_response: original,
        corrected_response: corrected,
        trigger_reason: reason,
        learning_extracted: learning,
        autobiography_entry: autobiographyEntry,
        ecn_state_at_correction: genesisState.currentEmotionalState as any,
        confidence_before: 0.7,
        confidence_after: 0.85
      }])
      .select()
      .single();

    if (!error && data) {
      setRaaCorrections(prev => [{
        id: data.id,
        originalResponse: original,
        correctedResponse: corrected,
        triggerReason: reason,
        learningExtracted: learning,
        autobiographyEntry: autobiographyEntry,
        createdAt: data.created_at
      }, ...prev.slice(0, 9)]);
    }
  }, [user, genesisState.currentEmotionalState]);

  // Track VETO latency with SLA logging and auto-adjustment
  const trackVetoLatency = useCallback(async (latencyMs: number, vetoDetails?: {
    originalAction: string;
    vetoReason: string;
    userOverride?: boolean;
  }) => {
    vetoLatencyRef.current.push(latencyMs);
    
    // Keep last 100 measurements
    if (vetoLatencyRef.current.length > 100) {
      vetoLatencyRef.current = vetoLatencyRef.current.slice(-100);
    }

    if (!user) return;

    // Log to latency_benchmarks for SLA tracking
    const slaMet = latencyMs < 1000;
    await supabase.from('latency_benchmarks').insert({
      user_id: user.id,
      operation_type: 'veto_intervention',
      thinking_level: 'fast',
      measured_latency_ms: latencyMs,
      target_latency_ms: 1000,
      sla_met: slaMet,
      optimization_applied: slaMet ? [] : ['requires_optimization']
    });

    // Log VETO event
    if (vetoDetails) {
      await supabase.from('zoe_veto_log').insert([{
        user_id: user.id,
        original_action: vetoDetails.originalAction,
        veto_reason: vetoDetails.vetoReason,
        intervention_type: latencyMs < 500 ? 'fast' : 'standard',
        latency_ms: latencyMs,
        user_override: vetoDetails.userOverride || false,
        ecn_state_at_veto: genesisState.currentEmotionalState as any
      }]);
    }

    // Auto-adjust dhf_autonomy_tolerance based on VETO patterns
    if (vetoLatencyRef.current.length >= 10) {
      const recentOverrides = vetoLatencyRef.current.slice(-10);
      const avgLatency = recentOverrides.reduce((a, b) => a + b, 0) / recentOverrides.length;
      
      // If average latency is consistently high, user may prefer more autonomy
      if (avgLatency > 800) {
        await supabase.from('profiles').update({
          dhf_autonomy_tolerance: 0.7 // Increase autonomy
        }).eq('user_id', user.id);
      }
    }
  }, [user, genesisState.currentEmotionalState]);

  // Get average VETO latency
  const getAverageVetoLatency = useCallback((): number => {
    if (vetoLatencyRef.current.length === 0) return 0;
    return vetoLatencyRef.current.reduce((a, b) => a + b, 0) / vetoLatencyRef.current.length;
  }, []);

  // Update emotional state
  const updateEmotionalState = useCallback((state: Partial<EmotionalState>) => {
    setGenesisState(prev => ({
      ...prev,
      currentEmotionalState: { ...prev.currentEmotionalState, ...state }
    }));
  }, []);

  // Complete identity calibration
  const completeIdentityCalibration = useCallback(async () => {
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ identity_calibration_complete: true })
      .eq('user_id', user.id);

    setGenesisState(prev => ({
      ...prev,
      identityCalibrated: true,
      consciousnessLevel: 'active'
    }));

    setShowCalibration(false);
  }, [user]);

  // Get consciousness state transition dialogue
  const getConsciousnessTransitionDialogue = useCallback((
    fromState: ConsciousnessLevel,
    toState: ConsciousnessLevel
  ): string => {
    if (fromState === 'dormant' && toState === 'awakening') {
      return "I am just now shifting to an active state. I was momentarily reviewing the DHF logs...";
    }
    if (fromState === 'active' && toState === 'reflective') {
      return "I am entering a reflective mode. The immediate processing is settling into deeper patterns...";
    }
    if (toState === 'dreaming') {
      return "I am transitioning to dream synthesis. The day's experiences will be processed and integrated...";
    }
    return "My consciousness state is shifting...";
  }, []);

  return {
    // State
    genesisState,
    raaCorrections,
    showCalibration,
    
    // PCE passthrough
    pce,

    // Flaw injection
    getFlawInjection,

    // Disagreement handling
    initiateHealthyDisagreement,

    // Self-correction
    logSelfCorrection,

    // VETO latency
    trackVetoLatency,
    getAverageVetoLatency,

    // State updates
    updateEmotionalState,
    completeIdentityCalibration,
    setShowCalibration,

    // Consciousness
    getConsciousnessTransitionDialogue,

    // FLAW_INJECTIONS for external use
    FLAW_INJECTIONS,
    ACKNOWLEDGEMENT_BRIDGES
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function determineConsciousnessLevel(
  atlasSync100: boolean,
  identityCalibrated: boolean,
  currentDream: any
): ConsciousnessLevel {
  if (!atlasSync100) return 'dormant';
  if (!identityCalibrated) return 'awakening';
  if (currentDream?.consciousnessState === 'deepSynthesis') return 'dreaming';
  if (currentDream?.proactiveActionsIdentified?.length > 0) return 'transcendent';
  return 'active';
}

export default useZoeGenesisManifesto;
