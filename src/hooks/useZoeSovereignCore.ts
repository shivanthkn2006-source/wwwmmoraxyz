import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE SOVEREIGN CORE (Z3-PRO) - UNIFIED COGNITIVE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export type ThinkingLevel = 'low' | 'medium' | 'high';

export interface ECNAnalysis {
  L1_physiological: {
    stress_level: number;
    energy_state: string;
    alertness: number;
  };
  L2_emotional: {
    primary_emotion: string;
    intensity: number;
    valence: number;
  };
  L3_cognitive: {
    drive_need: string;
    action_tendency: string;
    cognitive_load: number;
  };
  L4_reappraisal: {
    target_outcome: string;
    strategy: string;
    intervention_type: string;
  };
}

export interface ThoughtSignature {
  signature_id: string;
  timestamp: string;
  thinking_level: ThinkingLevel;
  ecn_state: ECNAnalysis;
  context_hash: string;
  chain_depth: number;
  parent_signature?: string;
}

export interface ToolExecution {
  tool: string;
  args: Record<string, any>;
  result: Record<string, any>;
}

export interface SovereignCoreResponse {
  success: boolean;
  message: string;
  thought_signature: ThoughtSignature;
  ecn_analysis: ECNAnalysis;
  tool_executions: ToolExecution[];
  metadata: {
    model: string;
    thinking_level: ThinkingLevel;
    intent: string;
    latency_ms: number;
    sla_compliant: boolean;
  };
  vetoed?: boolean;
}

export interface SovereignCoreContext {
  currentPage?: string;
  userTier?: string;
  dhfStatus?: 'active' | 'inactive';
  activeDhfRules?: any[];
  contextualCues?: string[];
  recentActivity?: string[];
  thoughtSignature?: ThoughtSignature;
  emotionalContext?: {
    mood?: string;
    stressLevel?: number;
    engagement?: number;
  };
}

export interface SovereignCoreOptions {
  forceThinkingLevel?: ThinkingLevel;
  verboseReasoning?: boolean;
  includeAuditLog?: boolean;
}

/**
 * Hook for interacting with the Zoe Sovereign Core (Z3-PRO)
 * 
 * The Sovereign Core is a unified cognitive system that consolidates
 * all Zoe AI functionality into a single, coherent intelligence powered
 * by Gemini 3 Pro with:
 * 
 * - CEPS (Cognitive-Emotional Predictive Synthesis)
 * - ECN (Emotion-Cognition Network) analysis
 * - Thought Signatures for state management
 * - Dynamic thinking levels for cost/latency optimization
 * - SOC 2/ISO 27001 compliant audit logging
 * - DHF (Digital Human Freight) stack management
 */
export const useZoeSovereignCore = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<SovereignCoreResponse | null>(null);
  const [thoughtChain, setThoughtChain] = useState<ThoughtSignature[]>([]);
  const [ecnHistory, setEcnHistory] = useState<ECNAnalysis[]>([]);
  
  // Track conversation context for multi-turn interactions
  const contextRef = useRef<SovereignCoreContext>({
    currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
    dhfStatus: 'inactive',
    contextualCues: [],
    recentActivity: []
  });

  /**
   * Execute a command through the Sovereign Core
   */
  const execute = useCallback(async (
    command: string,
    intent?: string,
    context?: Partial<SovereignCoreContext>,
    options?: SovereignCoreOptions
  ): Promise<SovereignCoreResponse | null> => {
    if (!user) {
      toast.error('Please sign in to use Zoe Sovereign Core');
      return null;
    }

    if (!command.trim()) {
      toast.error('Please provide a command');
      return null;
    }

    setIsProcessing(true);

    try {
      // Merge context with persistent state
      const fullContext: SovereignCoreContext = {
        ...contextRef.current,
        ...context,
        currentPage: context?.currentPage || window.location.pathname,
        thoughtSignature: thoughtChain[thoughtChain.length - 1],
        recentActivity: [
          ...(contextRef.current.recentActivity || []),
          `Command: ${command.substring(0, 50)}`
        ].slice(-10)
      };

      const { data, error } = await supabase.functions.invoke('zoe-core-executor', {
        body: {
          command,
          userId: user.id,
          intent,
          context: fullContext,
          options
        }
      });

      if (error) {
        console.error('Sovereign Core error:', error);
        toast.error(error.message || 'Sovereign Core execution failed');
        return null;
      }

      const response = data as SovereignCoreResponse;

      // Handle veto responses
      if (response.vetoed) {
        toast.warning(response.message, {
          description: 'Action blocked by security policy'
        });
        return response;
      }

      // Update state
      setLastResponse(response);
      
      // Track thought chain
      if (response.thought_signature) {
        setThoughtChain(prev => [...prev, response.thought_signature].slice(-20));
      }
      
      // Track ECN history for pattern analysis
      if (response.ecn_analysis) {
        setEcnHistory(prev => [...prev, response.ecn_analysis].slice(-50));
      }

      // Update persistent context
      contextRef.current = {
        ...contextRef.current,
        ...fullContext,
        contextualCues: [
          ...(contextRef.current.contextualCues || []),
          response.metadata.intent
        ].slice(-10)
      };

      return response;
    } catch (error) {
      console.error('Sovereign Core error:', error);
      toast.error('Sovereign Core execution failed');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [user, thoughtChain]);

  // ═══════════════════════════════════════════════════════════════════
  // CONVENIENCE METHODS FOR COMMON OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Quick chat with low thinking level
   */
  const chat = useCallback((message: string) => 
    execute(message, 'general_chat', undefined, { forceThinkingLevel: 'low' }), 
    [execute]
  );

  /**
   * Deep analysis with high thinking level
   */
  const analyze = useCallback((query: string) => 
    execute(query, 'strategic_planning', undefined, { 
      forceThinkingLevel: 'high', 
      verboseReasoning: true 
    }), 
    [execute]
  );

  /**
   * Run compliance audit
   */
  const runAudit = useCallback((scope: 'security' | 'performance' | 'compliance' | 'full_platform' = 'security') => 
    execute(`Run a ${scope} compliance audit`, 'compliance_audit', undefined, { 
      forceThinkingLevel: 'high',
      includeAuditLog: true 
    }), 
    [execute]
  );

  /**
   * Fix an error with diagnostic mode
   */
  const fixError = useCallback((errorDescription: string) => 
    execute(`Fix this error: ${errorDescription}`, 'bug_fix', undefined, { 
      forceThinkingLevel: 'high' 
    }), 
    [execute]
  );

  /**
   * Create content with creative mode
   */
  const create = useCallback((prompt: string, type: string = 'post') => 
    execute(`Create a ${type}: ${prompt}`, 'content_creation', undefined, { 
      forceThinkingLevel: 'medium' 
    }), 
    [execute]
  );

  /**
   * Manage DHF (Digital Human Freight) stack
   */
  const manageDHF = useCallback((action: 'create' | 'retrieve' | 'update_rules' | 'execute_autonomy' | 'sync_memory') => 
    execute(`Manage DHF stack: ${action}`, 'dhf_management', { dhfStatus: 'active' }, { 
      forceThinkingLevel: 'high' 
    }), 
    [execute]
  );

  /**
   * Get predictive intelligence
   */
  const predict = useCallback((predictionType: 'intent' | 'need' | 'behavior' | 'preference' | 'risk') => 
    execute(`Generate ${predictionType} prediction`, 'strategic_planning', undefined, { 
      forceThinkingLevel: 'medium' 
    }), 
    [execute]
  );

  /**
   * Clear thought chain and reset state
   */
  const resetCore = useCallback(() => {
    setThoughtChain([]);
    setEcnHistory([]);
    setLastResponse(null);
    contextRef.current = {
      currentPage: window.location.pathname,
      dhfStatus: 'inactive',
      contextualCues: [],
      recentActivity: []
    };
  }, []);

  /**
   * Get ECN trends from history
   */
  const getECNTrends = useCallback(() => {
    if (ecnHistory.length < 2) return null;
    
    const recentStress = ecnHistory.slice(-5).map(e => e.L1_physiological.stress_level);
    const avgStress = recentStress.reduce((a, b) => a + b, 0) / recentStress.length;
    
    const recentValence = ecnHistory.slice(-5).map(e => e.L2_emotional.valence);
    const avgValence = recentValence.reduce((a, b) => a + b, 0) / recentValence.length;
    
    const emotionCounts = ecnHistory.slice(-10).reduce((acc, e) => {
      acc[e.L2_emotional.primary_emotion] = (acc[e.L2_emotional.primary_emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const dominantEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    
    return {
      averageStress: avgStress,
      averageValence: avgValence,
      stressTrend: recentStress[recentStress.length - 1] > avgStress ? 'increasing' : 'decreasing',
      dominantEmotion,
      sampleSize: ecnHistory.length
    };
  }, [ecnHistory]);

  return {
    // Core execution
    execute,
    
    // Convenience methods
    chat,
    analyze,
    runAudit,
    fixError,
    create,
    manageDHF,
    predict,
    
    // State management
    resetCore,
    getECNTrends,
    
    // State
    isProcessing,
    lastResponse,
    thoughtChain,
    ecnHistory,
    currentContext: contextRef.current,
    
    // Capabilities
    capabilities: {
      ceps: true,           // Cognitive-Emotional Predictive Synthesis
      ecn: true,            // Emotion-Cognition Network
      thoughtSignatures: true,
      dynamicThinking: true,
      dhfStack: true,       // Digital Human Freight
      auditLogging: true,   // SOC 2/ISO 27001
      vetoChecks: true      // Autonomy safety
    }
  };
};

export default useZoeSovereignCore;
