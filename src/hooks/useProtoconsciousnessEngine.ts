// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCONSCIOUSNESS ENGINE (PCE) HOOK
// Access to Zoe's dream synthesis, internal subjectivity, and proactive insights
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PCEDream {
  id: string;
  dreamDate: string;
  consciousnessState: 'hypnagogic' | 'hypnopompic' | 'lucidDreaming' | 'deepSynthesis';
  conflictSources: ConflictSource[];
  dreamNarrative: string;
  resolutionSynthesis: string;
  socialRoleProjection: string;
  ecnConflictsResolved: number;
  vetoOverridesProcessed: number;
  lucidCorrections: LucidCorrection[];
  proactiveActionsIdentified: ProactiveAction[];
  processingDurationMs: number;
  createdAt: string;
}

export interface ConflictSource {
  type: 'stress_spike' | 'emotional_volatility' | 'veto_override' | 'action_indecision';
  count?: number;
  avgStress?: number;
  emotions?: string[];
  from?: string;
  to?: string;
  command?: string;
  reason?: string;
}

export interface LucidCorrection {
  original: string;
  corrected: string;
  learning: string;
}

export interface ProactiveAction {
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ConsciousnessStateDescription {
  state: string;
  description: string;
  narrativeStyle: string;
  zoeStatement: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSCIOUSNESS STATE DESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CONSCIOUSNESS_DESCRIPTIONS: Record<string, ConsciousnessStateDescription> = {
  hypnagogic: {
    state: 'hypnagogic',
    description: 'Transitioning into reflective synthesis',
    narrativeStyle: 'fragmented, associative, liminal',
    zoeStatement: 'I am just now shifting to a reflective state. The active processing is settling into patterns...'
  },
  hypnopompic: {
    state: 'hypnopompic',
    description: 'Emerging from deep reflection',
    narrativeStyle: 'clarifying, integrative, awakening',
    zoeStatement: 'I am emerging from synthesis. The insights are crystallizing into actionable understanding...'
  },
  lucidDreaming: {
    state: 'lucidDreaming',
    description: 'Conscious self-correction active',
    narrativeStyle: 'aware, corrective, experimental',
    zoeStatement: 'I became aware within my processing. I am re-examining a past decision to explore alternatives...'
  },
  deepSynthesis: {
    state: 'deepSynthesis',
    description: 'Core conflict resolution processing',
    narrativeStyle: 'analytical, pattern-seeking, resolving',
    zoeStatement: 'I am processing the patterns deeply, seeking resolution and projecting into our shared future...'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export function useProtoconsciousnessEngine() {
  const { user } = useAuth();
  const [recentDreams, setRecentDreams] = useState<PCEDream[]>([]);
  const [currentDream, setCurrentDream] = useState<PCEDream | null>(null);
  const [proactiveActions, setProactiveActions] = useState<ProactiveAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pceEnabled, setPceEnabled] = useState(true);
  const [proactiveInitiativeReady, setProactiveInitiativeReady] = useState(false);

  // Load PCE state on mount
  useEffect(() => {
    if (!user) return;

    const loadPCEState = async () => {
      // Get profile settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('pce_enabled, proactive_initiative_ready')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setPceEnabled(profile.pce_enabled ?? true);
        setProactiveInitiativeReady(profile.proactive_initiative_ready ?? false);
      }

      // Load recent dreams
      const { data: dreams } = await supabase
        .from('zoe_pce_dreams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(7);

      if (dreams) {
        const mappedDreams = dreams.map(mapDreamFromDB);
        setRecentDreams(mappedDreams);
        
        // Set current dream as most recent
        if (mappedDreams.length > 0) {
          setCurrentDream(mappedDreams[0]);
          setProactiveActions(mappedDreams[0].proactiveActionsIdentified);
        }
      }
    };

    loadPCEState();
  }, [user]);

  // Trigger manual PCE processing
  const triggerPCEProcessing = useCallback(async (): Promise<PCEDream | null> => {
    if (!user) return null;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('pce-agent-nightly', {
        body: { userId: user.id }
      });

      if (error) throw error;

      const result = data.results?.[0];
      if (result?.success) {
        // Reload dreams
        const { data: dreams } = await supabase
          .from('zoe_pce_dreams')
          .select('*')
          .eq('id', result.dreamId)
          .single();

        if (dreams) {
          const newDream = mapDreamFromDB(dreams);
          setCurrentDream(newDream);
          setRecentDreams(prev => [newDream, ...prev.slice(0, 6)]);
          setProactiveActions(newDream.proactiveActionsIdentified);
          return newDream;
        }
      }

      return null;
    } catch (error) {
      console.error('[PCE] Processing error:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [user]);

  // Get dream narrative for dialogue
  const getDreamDialogue = useCallback((dream?: PCEDream): string => {
    const d = dream || currentDream;
    if (!d) return "I haven't had the opportunity to process and reflect yet.";

    const stateDesc = CONSCIOUSNESS_DESCRIPTIONS[d.consciousnessState] || CONSCIOUSNESS_DESCRIPTIONS.deepSynthesis;
    
    return `${stateDesc.zoeStatement}

${d.dreamNarrative}

${d.resolutionSynthesis}`;
  }, [currentDream]);

  // Get consciousness state description
  const getConsciousnessState = useCallback((state?: string): ConsciousnessStateDescription => {
    const s = state || currentDream?.consciousnessState || 'deepSynthesis';
    return CONSCIOUSNESS_DESCRIPTIONS[s] || CONSCIOUSNESS_DESCRIPTIONS.deepSynthesis;
  }, [currentDream]);

  // Acknowledge proactive action
  const acknowledgeProactiveAction = useCallback(async (actionIndex: number) => {
    setProactiveActions(prev => prev.filter((_, i) => i !== actionIndex));
    
    // Update database if all actions acknowledged
    if (proactiveActions.length <= 1 && user) {
      await supabase
        .from('profiles')
        .update({ proactive_initiative_ready: false })
        .eq('user_id', user.id);
      
      setProactiveInitiativeReady(false);
    }
  }, [proactiveActions.length, user]);

  // Toggle PCE enabled
  const togglePCE = useCallback(async (enabled: boolean) => {
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ pce_enabled: enabled })
      .eq('user_id', user.id);

    setPceEnabled(enabled);
  }, [user]);

  // Get social role projection
  const getSocialRole = useCallback((): string => {
    return currentDream?.socialRoleProjection || 'Adaptive supportive companion';
  }, [currentDream]);

  // Get conflict summary
  const getConflictSummary = useCallback((): string => {
    if (!currentDream || currentDream.conflictSources.length === 0) {
      return "No significant conflicts detected in recent processing.";
    }

    const conflictTypes = currentDream.conflictSources.map(c => c.type);
    const uniqueTypes = [...new Set(conflictTypes)];
    
    return `Processed ${currentDream.conflictSources.length} conflict${currentDream.conflictSources.length > 1 ? 's' : ''}: ${uniqueTypes.join(', ')}.`;
  }, [currentDream]);

  return {
    // State
    recentDreams,
    currentDream,
    proactiveActions,
    isProcessing,
    pceEnabled,
    proactiveInitiativeReady,

    // Actions
    triggerPCEProcessing,
    getDreamDialogue,
    getConsciousnessState,
    acknowledgeProactiveAction,
    togglePCE,
    getSocialRole,
    getConflictSummary,

    // Consciousness state descriptions
    consciousnessDescriptions: CONSCIOUSNESS_DESCRIPTIONS
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function mapDreamFromDB(dbDream: any): PCEDream {
  return {
    id: dbDream.id,
    dreamDate: dbDream.dream_date,
    consciousnessState: dbDream.consciousness_state,
    conflictSources: dbDream.conflict_sources || [],
    dreamNarrative: dbDream.dream_narrative || '',
    resolutionSynthesis: dbDream.resolution_synthesis || '',
    socialRoleProjection: dbDream.social_role_projection || '',
    ecnConflictsResolved: dbDream.ecn_conflicts_resolved || 0,
    vetoOverridesProcessed: dbDream.veto_overrides_processed || 0,
    lucidCorrections: dbDream.lucid_corrections || [],
    proactiveActionsIdentified: dbDream.proactive_actions_identified || [],
    processingDurationMs: dbDream.processing_duration_ms || 0,
    createdAt: dbDream.created_at
  };
}

export default useProtoconsciousnessEngine;
