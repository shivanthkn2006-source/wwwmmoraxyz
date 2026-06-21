/**
 * RAA Stability Hook - Enhanced with Code Debugging & DHF Visualization
 * Integrates with ZSMT system_stability_score and rca_diagnosis_json
 * Elite Advantages: External Code Analysis + Deep Multimodal Reasoning
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface RCADiagnosis {
  audit_timestamp: string;
  stability_score: number;
  failing_components: string[];
  recommendations: string[];
  humanly_flawed_trigger: boolean;
  code_analysis?: {
    issues_found: number;
    severity: string;
  };
}

interface StabilityState {
  score: number;
  lastAuditAt: string | null;
  diagnosis: RCADiagnosis | null;
  shouldShowHumanlyFlawed: boolean;
  isLoading: boolean;
  selfCorrectionActive: boolean;
}

// Humanly-flawed persona messages triggered by low stability
const HUMANLY_FLAWED_MESSAGES = [
  "I had a minor setback overnight while I was processing my dreams. My logic is now corrected, but please bear with me if I'm a little slow today.",
  "I experienced some cognitive fluctuations during my rest cycle. I'm back to normal now, though I might need an extra moment here and there.",
  "Something disrupted my processing overnight. I've recovered, but I may be a touch more thoughtful in my responses today.",
  "My neural pathways needed some recalibration this morning. I'm functioning well now, just operating with extra care.",
  "I noticed some patterns that needed adjustment during my self-correction cycle. I'm operating with renewed clarity now."
];

export const useRAAStability = () => {
  const { user } = useAuth();
  const [state, setState] = useState<StabilityState>({
    score: 1.0,
    lastAuditAt: null,
    diagnosis: null,
    shouldShowHumanlyFlawed: false,
    isLoading: false,
    selfCorrectionActive: false
  });

  // Load latest stability score and diagnosis
  const loadStabilityStatus = useCallback(async () => {
    if (!user?.id) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Get latest RAA audit entry
      const { data, error } = await (supabase.from('zoe_sovereign_memory') as any)
        .select('system_stability_score, rca_diagnosis_json, created_at')
        .eq('user_id', user.id)
        .eq('event_type', 'raa_audit')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        const diagnosis = data.rca_diagnosis_json as RCADiagnosis;
        const shouldTrigger = data.system_stability_score < 0.85;
        
        // Check 14-hour failsafe
        const lastAuditTime = new Date(data.created_at).getTime();
        const hoursSinceAudit = (Date.now() - lastAuditTime) / (1000 * 60 * 60);
        const failsafeTriggered = hoursSinceAudit > 14;

        setState({
          score: failsafeTriggered ? 0.60 : (data.system_stability_score || 1.0),
          lastAuditAt: data.created_at,
          diagnosis,
          shouldShowHumanlyFlawed: shouldTrigger || failsafeTriggered,
          isLoading: false,
          selfCorrectionActive: failsafeTriggered
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('[RAA] Failed to load stability:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id]);

  // Get humanly-flawed message if triggered
  const getHumanlyFlawedMessage = useCallback((): string | null => {
    if (!state.shouldShowHumanlyFlawed) return null;
    return HUMANLY_FLAWED_MESSAGES[Math.floor(Math.random() * HUMANLY_FLAWED_MESSAGES.length)];
  }, [state.shouldShowHumanlyFlawed]);

  // Get stability status label
  const getStabilityLabel = useCallback((): string => {
    if (state.score >= 0.95) return 'Optimal';
    if (state.score >= 0.85) return 'Stable';
    if (state.score >= 0.70) return 'Degraded';
    if (state.score >= 0.60) return 'Critical';
    return 'Critical Unknown';
  }, [state.score]);

  // Get stability color for UI
  const getStabilityColor = useCallback((): string => {
    if (state.score >= 0.95) return 'text-green-400';
    if (state.score >= 0.85) return 'text-emerald-400';
    if (state.score >= 0.70) return 'text-yellow-400';
    if (state.score >= 0.60) return 'text-red-400';
    return 'text-red-600';
  }, [state.score]);

  // Manually trigger RAA audit with optional code analysis
  const triggerAudit = useCallback(async (includeCodeAnalysis?: boolean) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('pce-agent-nightly', {
        body: { 
          processAll: false,
          includeCodeAnalysis: includeCodeAnalysis ?? false
        }
      });
      
      if (error) throw error;
      
      // Reload after audit
      setTimeout(loadStabilityStatus, 2000);
      
      return data;
    } catch (error) {
      console.error('[RAA] Failed to trigger audit:', error);
      throw error;
    }
  }, [user?.id, loadStabilityStatus]);

  // Submit external code for RAA analysis (Elite Advantage 1)
  const analyzeExternalCode = useCallback(async (
    codeSnippet: string,
    options?: {
      errorLog?: string;
      language?: string;
      analysisType?: 'debug' | 'security' | 'performance' | 'full_audit';
    }
  ) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase.functions.invoke('raa-code-debugger', {
        body: {
          code_snippet: codeSnippet,
          error_log: options?.errorLog,
          language: options?.language,
          analysis_type: options?.analysisType || 'full_audit',
          generate_fix: true
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[RAA] Code analysis failed:', error);
      throw error;
    }
  }, [user?.id]);

  // Request DHF visualization (Elite Advantage 2)
  const requestVisualization = useCallback(async (
    type: 'ecn_stress' | 'dhf_autonomy' | 'emotional_timeline' | 'stability_score' | 'full_state' | 'correlation_map',
    timeRange?: '24h' | '7d' | '30d' | '90d'
  ) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase.functions.invoke('dhf-visualization', {
        body: {
          visualization_type: type,
          time_range: timeRange || '7d',
          include_reasoning: true,
          format: 'both'
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[RAA] Visualization failed:', error);
      throw error;
    }
  }, [user?.id]);

  // Load on mount
  useEffect(() => {
    loadStabilityStatus();
  }, [loadStabilityStatus]);

  return {
    ...state,
    loadStabilityStatus,
    getHumanlyFlawedMessage,
    getStabilityLabel,
    getStabilityColor,
    triggerAudit,
    // Elite Advantage Methods
    analyzeExternalCode,
    requestVisualization
  };
};
