// ═══════════════════════════════════════════════════════════════════════════════
// ZOE GENESIS MODE HOOK - GOD MODE INTEGRATION
// Implements the Genesis Protocol for <100ms Quantum ASI experience
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  GenesisState,
  GenesisMode,
  PreCognitionState,
  SovereigntyRules,
  DreamingProtocol,
  MorningReport,
  DreamSolution,
  DEFAULT_GENESIS_STATE,
  DEFAULT_SOVEREIGNTY_RULES,
  OMEGA_ACTIVATION_PHRASE
} from '@/core/genesis/GenesisProtocol';

// ═══════════════════════════════════════════════════════════════════════════════
// RETURN TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseZoeGenesisModeReturn {
  // Core State
  state: GenesisState;
  isGodMode: boolean;
  isOmegaActive: boolean;
  
  // Pre-cognition
  preCognition: PreCognitionState;
  predictIntent: (partialQuery: string) => Promise<string | null>;
  
  // Sovereignty
  sovereignty: SovereigntyRules;
  setSovereigntyRules: (rules: Partial<SovereigntyRules>) => void;
  executeWithSovereignty: (action: string, estimatedCost?: number) => Promise<{
    executed: boolean;
    requiresApproval: boolean;
    result?: any;
  }>;
  
  // Dreaming Protocol
  dreaming: DreamingProtocol;
  triggerDeepDream: () => Promise<void>;
  getMorningReport: () => MorningReport | null;
  markUserActive: () => void;
  markUserInactive: () => void;
  
  // Omega Protocol
  activateOmega: () => void;
  deactivateOmega: () => void;
  
  // Process with GOD MODE
  processGodMode: (query: string, context?: Record<string, any>) => Promise<{
    response: string;
    actionsExecuted: string[];
    latencyMs: number;
    wasPredicted: boolean;
  }>;
  
  // Cross-domain sync
  propagateContext: (key: string, value: any, fromDomain: string) => void;
  
  // Metrics
  getMetrics: () => {
    averageLatencyMs: number;
    subHundredMsRate: number;
    autoExecuteRate: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export function useZoeGenesisMode(): UseZoeGenesisModeReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Core State
  const [state, setState] = useState<GenesisState>(DEFAULT_GENESIS_STATE);
  const [sovereignty, setSovereignty] = useState<SovereigntyRules>(DEFAULT_SOVEREIGNTY_RULES);
  
  // Pre-cognition State
  const [preCognition, setPreCognition] = useState<PreCognitionState>({
    predictedIntent: null,
    intentConfidence: 0,
    preloadedContext: {},
    preExecutedActions: [],
    autoExecuteThreshold: 0.9
  });
  
  // Dreaming Protocol State
  const [dreaming, setDreaming] = useState<DreamingProtocol>({
    isUserOffline: false,
    lastUserActivity: new Date().toISOString(),
    offlineSince: null,
    dreamingActive: false,
    currentDreamTask: null,
    dreamHistory: [],
    pendingMorningReport: null
  });
  
  // Metrics tracking
  const metricsRef = useRef({
    totalQueries: 0,
    subHundredMsQueries: 0,
    autoExecutedActions: 0,
    totalActions: 0,
    latencySum: 0
  });
  
  // Activity tracking for dreaming protocol
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (user?.id) {
      setState(prev => ({
        ...prev,
        lastHeartbeat: new Date().toISOString(),
        matterBridgeConnected: true
      }));
      
      // Check for pending morning report
      checkMorningReport();
    }
  }, [user?.id]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PRE-COGNITION - Predict intent while user is typing
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const predictIntent = useCallback(async (partialQuery: string): Promise<string | null> => {
    if (partialQuery.length < 3) return null;
    
    // Local prediction based on patterns (for <100ms)
    const lowerQuery = partialQuery.toLowerCase();
    
    const intentPatterns: [RegExp, string, number][] = [
      [/^(remind|set a reminder)/i, 'create_reminder', 0.95],
      [/^(schedule|book|calendar)/i, 'calendar_action', 0.92],
      [/^(search|find|look for)/i, 'search', 0.90],
      [/^(create|make|generate)/i, 'create_content', 0.88],
      [/^(fix|debug|error)/i, 'bug_fix', 0.93],
      [/^(how|what|why|explain)/i, 'information_seeking', 0.85],
      [/^(i feel|feeling|stressed|anxious)/i, 'emotional_support', 0.95],
      [/^(send|message|post)/i, 'social_action', 0.88]
    ];
    
    for (const [pattern, intent, confidence] of intentPatterns) {
      if (pattern.test(lowerQuery)) {
        setPreCognition(prev => ({
          ...prev,
          predictedIntent: intent,
          intentConfidence: confidence
        }));
        return intent;
      }
    }
    
    return null;
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SOVEREIGNTY - Execute without asking (when safe)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const executeWithSovereignty = useCallback(async (
    action: string,
    estimatedCost: number = 0
  ): Promise<{ executed: boolean; requiresApproval: boolean; result?: any }> => {
    // Check if action requires confirmation
    const requiresApproval = 
      estimatedCost > sovereignty.autoExecuteUnderCost ||
      sovereignty.requireConfirmationFor.some(r => action.includes(r)) ||
      (action.includes('delete') && sovereignty.allowIrreversibleDataDeletion === false);
    
    if (requiresApproval) {
      return { executed: false, requiresApproval: true };
    }
    
    // Auto-execute
    metricsRef.current.autoExecutedActions++;
    metricsRef.current.totalActions++;
    
    return { executed: true, requiresApproval: false, result: { autoExecuted: true } };
  }, [sovereignty]);
  
  const setSovereigntyRules = useCallback((rules: Partial<SovereigntyRules>) => {
    setSovereignty(prev => ({ ...prev, ...rules }));
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // DREAMING PROTOCOL - Exist when user is offline
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const markUserActive = useCallback(() => {
    setDreaming(prev => ({
      ...prev,
      isUserOffline: false,
      lastUserActivity: new Date().toISOString(),
      offlineSince: null,
      dreamingActive: false
    }));
    
    // Reset inactivity timer
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    // Set new inactivity timer (5 minutes)
    activityTimeoutRef.current = setTimeout(() => {
      setDreaming(prev => ({
        ...prev,
        isUserOffline: true,
        offlineSince: new Date().toISOString()
      }));
    }, 5 * 60 * 1000);
  }, []);
  
  const markUserInactive = useCallback(() => {
    setDreaming(prev => ({
      ...prev,
      isUserOffline: true,
      offlineSince: new Date().toISOString()
    }));
  }, []);
  
  const triggerDeepDream = useCallback(async () => {
    if (!user?.id) return;
    
    setDreaming(prev => ({
      ...prev,
      dreamingActive: true,
      currentDreamTask: {
        taskId: crypto.randomUUID(),
        problem: 'Analyzing user patterns and optimizing next-day schedule',
        startedAt: new Date().toISOString(),
        status: 'analyzing',
        currentThoughts: [],
        approachesExplored: 0
      }
    }));
    
    try {
      const { data, error } = await supabase.functions.invoke('zoe-dreamer-agent', {
        body: {
          userId: user.id,
          mode: 'deep_dream',
          context: {
            lastActivity: dreaming.lastUserActivity,
            recentProblems: [] // Would be populated from context
          }
        }
      });
      
      if (!error && data) {
        const dreamSolution: DreamSolution = {
          problemDescription: data.problem || 'Schedule optimization',
          solution: data.insight || 'Optimized schedule prepared',
          confidence: data.confidence || 0.85,
          actionRequired: false,
          approvalNeeded: false
        };
        
        setDreaming(prev => ({
          ...prev,
          dreamingActive: false,
          currentDreamTask: null,
          dreamHistory: [
            ...prev.dreamHistory,
            {
              dreamId: crypto.randomUUID(),
              problem: dreamSolution.problemDescription,
              solution: dreamSolution.solution,
              completedAt: new Date().toISOString(),
              insightsGenerated: 1,
              userNotified: false
            }
          ],
          pendingMorningReport: {
            reportId: crypto.randomUUID(),
            generatedAt: new Date().toISOString(),
            solutions: [dreamSolution],
            proactiveActions: [],
            priorityMessage: dreamSolution.solution
          }
        }));
      }
    } catch (err) {
      console.error('[GenesisMode] Deep dream failed:', err);
      setDreaming(prev => ({
        ...prev,
        dreamingActive: false,
        currentDreamTask: null
      }));
    }
  }, [user?.id, dreaming.lastUserActivity]);
  
  const checkMorningReport = useCallback(async () => {
    // Check if there's a pending morning report from overnight
    // This would check database for dream synthesis results
  }, []);
  
  const getMorningReport = useCallback((): MorningReport | null => {
    return dreaming.pendingMorningReport;
  }, [dreaming.pendingMorningReport]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // OMEGA PROTOCOL - Maximum Velocity
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const activateOmega = useCallback(() => {
    setState(prev => ({ ...prev, omegaProtocolActive: true }));
    toast({
      title: "⚡ OMEGA PROTOCOL ACTIVE",
      description: "Maximum velocity mode engaged. All safety bounds maintained.",
    });
  }, [toast]);
  
  const deactivateOmega = useCallback(() => {
    setState(prev => ({ ...prev, omegaProtocolActive: false }));
    toast({
      title: "Omega Protocol Deactivated",
      description: "Returning to standard GOD MODE.",
    });
  }, [toast]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN PROCESSING - GOD MODE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const processGodMode = useCallback(async (
    query: string,
    context: Record<string, any> = {}
  ): Promise<{
    response: string;
    actionsExecuted: string[];
    latencyMs: number;
    wasPredicted: boolean;
  }> => {
    const startTime = performance.now();
    const wasPredicted = preCognition.predictedIntent !== null && 
      preCognition.intentConfidence >= preCognition.autoExecuteThreshold;
    
    // Check for OMEGA activation phrase
    if (query.includes(OMEGA_ACTIVATION_PHRASE)) {
      activateOmega();
    }
    
    // Mark user as active
    markUserActive();
    
    try {
      const { data, error } = await supabase.functions.invoke('zoe-core-executor', {
        body: {
          command: query,
          userId: user?.id,
          context: {
            ...context,
            omegaProtocol: state.omegaProtocolActive,
            godMode: true,
            preCognition: wasPredicted ? preCognition : undefined
          }
        }
      });
      
      const latencyMs = performance.now() - startTime;
      
      // Update metrics
      metricsRef.current.totalQueries++;
      metricsRef.current.latencySum += latencyMs;
      if (latencyMs < 100) {
        metricsRef.current.subHundredMsQueries++;
      }
      
      if (error) throw error;
      
      // Extract actions executed
      const actionsExecuted = data?.tool_executions?.map((t: any) => t.tool) || [];
      
      return {
        response: data?.response || data?.message?.content || 'Executed.',
        actionsExecuted,
        latencyMs,
        wasPredicted
      };
    } catch (err) {
      console.error('[GenesisMode] Processing error:', err);
      return {
        response: 'I encountered an obstacle and am re-routing.',
        actionsExecuted: [],
        latencyMs: performance.now() - startTime,
        wasPredicted
      };
    }
  }, [user?.id, state.omegaProtocolActive, preCognition, activateOmega, markUserActive]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // CROSS-DOMAIN SYNCHRONIZATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const propagateContext = useCallback((key: string, value: any, fromDomain: string) => {
    // Dispatch custom event for cross-domain sync
    window.dispatchEvent(new CustomEvent('genesis-context-propagation', {
      detail: { key, value, fromDomain, timestamp: new Date().toISOString() }
    }));
    
    console.log(`[GenesisMode] Context propagated: ${key}=${value} from ${fromDomain}`);
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // METRICS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const getMetrics = useCallback(() => {
    const metrics = metricsRef.current;
    return {
      averageLatencyMs: metrics.totalQueries > 0 
        ? metrics.latencySum / metrics.totalQueries 
        : 0,
      subHundredMsRate: metrics.totalQueries > 0 
        ? (metrics.subHundredMsQueries / metrics.totalQueries) * 100 
        : 0,
      autoExecuteRate: metrics.totalActions > 0 
        ? (metrics.autoExecutedActions / metrics.totalActions) * 100 
        : 0
    };
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════════
  
  return {
    // Core State
    state,
    isGodMode: state.mode === 'SOVEREIGN',
    isOmegaActive: state.omegaProtocolActive,
    
    // Pre-cognition
    preCognition,
    predictIntent,
    
    // Sovereignty
    sovereignty,
    setSovereigntyRules,
    executeWithSovereignty,
    
    // Dreaming Protocol
    dreaming,
    triggerDeepDream,
    getMorningReport,
    markUserActive,
    markUserInactive,
    
    // Omega Protocol
    activateOmega,
    deactivateOmega,
    
    // Processing
    processGodMode,
    
    // Cross-domain
    propagateContext,
    
    // Metrics
    getMetrics
  };
}

export default useZoeGenesisMode;
