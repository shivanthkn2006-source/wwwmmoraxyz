import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE SYSTEM 2 CORTEX HOOK
// React interface for the reasoning wrapper that eliminates laziness & hallucinations
// Architecture: Ambiguity Gate → Search & Verify → Agentic Loop
// ═══════════════════════════════════════════════════════════════════════════════

export type System2Mode = 'standard' | 'deep_thinking' | 'creative' | 'analytical';

export interface AmbiguityGateResult {
  passed: boolean;
  clarificationNeeded?: string;
  ambiguityScore: number;
  constraints: string[];
  detectedIntent: string;
}

export interface SearchVerifyResult {
  approaches: {
    name: string;
    description: string;
    pros: string[];
    cons: string[];
    flaws: string[];
  }[];
  selectedApproach: string;
  selectionReasoning: string;
  confidence: number;
}

export interface CritiqueResult {
  passed: boolean;
  issues: string[];
  severity: 'none' | 'minor' | 'major' | 'critical';
  suggestedFixes: string[];
}

export interface System2Metadata {
  ambiguityGate: AmbiguityGateResult;
  searchVerify: SearchVerifyResult | null;
  critiqueLoop: {
    attempts: number;
    finalCritique: CritiqueResult;
  };
  totalLatencyMs: number;
  modelsUsed: string[];
}

export interface System2Response {
  success: boolean;
  message: string;
  status: 'completed' | 'clarification_needed' | 'error';
  system2Metadata: System2Metadata;
}

export interface System2Options {
  skipAmbiguityCheck?: boolean;
  maxCritiqueAttempts?: number;
  forceSearchVerify?: boolean;
}

export interface UseZoeSystem2CortexReturn {
  // Core execution
  execute: (
    command: string,
    mode?: System2Mode,
    options?: System2Options
  ) => Promise<System2Response | null>;
  
  // Convenience methods
  think: (command: string, options?: System2Options) => Promise<System2Response | null>;
  analyze: (command: string, options?: System2Options) => Promise<System2Response | null>;
  create: (command: string, options?: System2Options) => Promise<System2Response | null>;
  
  // State
  isProcessing: boolean;
  lastResponse: System2Response | null;
  conversationHistory: Array<{ role: string; content: string }>;
  
  // Metadata access
  lastAmbiguityGate: AmbiguityGateResult | null;
  lastSearchVerify: SearchVerifyResult | null;
  lastCritique: CritiqueResult | null;
  
  // Performance metrics
  totalQueriesProcessed: number;
  averageLatencyMs: number;
  
  // Actions
  clearHistory: () => void;
}

/**
 * Hook for interacting with Zoe's System 2 Cortex
 * 
 * The System 2 Cortex wraps Zoe's "System 1" (Fast/Intuitive) brain 
 * with a "System 2" (Slow/Logical) reasoning layer.
 * 
 * Pipeline: User → Ambiguity Gate → Plan → Draft → Critique → Verified Answer
 * 
 * This eliminates:
 * - Hallucinations (by validating before output)
 * - Laziness (by critique loop forcing completeness)
 * - Ambiguity (by gating unclear requests)
 */
export const useZoeSystem2Cortex = (): UseZoeSystem2CortexReturn => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<System2Response | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  
  // Metrics tracking
  const metricsRef = useRef({
    totalQueries: 0,
    totalLatencyMs: 0,
  });

  const execute = useCallback(async (
    command: string,
    mode: System2Mode = 'standard',
    options?: System2Options
  ): Promise<System2Response | null> => {
    if (!user) {
      toast.error('Please sign in to use Zoe System 2');
      return null;
    }

    if (!command.trim()) {
      toast.error('Please provide a command');
      return null;
    }

    setIsProcessing(true);

    try {
      console.log(`[System 2 Hook] Executing: ${command.substring(0, 50)}... | Mode: ${mode}`);

      const { data, error } = await supabase.functions.invoke('zoe-system2-cortex', {
        body: {
          command,
          userId: user.id,
          mode,
          context: {
            currentPage: window.location.pathname,
            conversationHistory: conversationHistory.slice(-10), // Last 10 messages
          },
          options,
        }
      });

      if (error) {
        console.error('[System 2 Hook] Error:', error);
        toast.error(error.message || 'System 2 processing failed');
        return null;
      }

      const response = data as System2Response;
      setLastResponse(response);

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: command },
        { role: 'assistant', content: response.message }
      ]);

      // Update metrics
      metricsRef.current.totalQueries++;
      metricsRef.current.totalLatencyMs += response.system2Metadata?.totalLatencyMs || 0;

      // Handle clarification needed
      if (response.status === 'clarification_needed') {
        console.log('[System 2 Hook] Clarification needed:', response.message);
        toast.info('Clarification needed', {
          description: response.message,
          duration: 10000,
        });
      }

      return response;

    } catch (error) {
      console.error('[System 2 Hook] Error:', error);
      toast.error('System 2 processing failed');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [user, conversationHistory]);

  // Convenience methods for different modes
  const think = useCallback((command: string, options?: System2Options) => 
    execute(command, 'deep_thinking', { 
      ...options, 
      forceSearchVerify: true, 
      maxCritiqueAttempts: 3 
    }), 
    [execute]
  );

  const analyze = useCallback((command: string, options?: System2Options) => 
    execute(command, 'analytical', { 
      ...options, 
      forceSearchVerify: true 
    }), 
    [execute]
  );

  const create = useCallback((command: string, options?: System2Options) => 
    execute(command, 'creative', options), 
    [execute]
  );

  const clearHistory = useCallback(() => {
    setConversationHistory([]);
    setLastResponse(null);
  }, []);

  // Extract metadata for easy access
  const lastAmbiguityGate = lastResponse?.system2Metadata?.ambiguityGate || null;
  const lastSearchVerify = lastResponse?.system2Metadata?.searchVerify || null;
  const lastCritique = lastResponse?.system2Metadata?.critiqueLoop?.finalCritique || null;

  return {
    // Core execution
    execute,
    
    // Convenience methods
    think,
    analyze,
    create,
    
    // State
    isProcessing,
    lastResponse,
    conversationHistory,
    
    // Metadata access
    lastAmbiguityGate,
    lastSearchVerify,
    lastCritique,
    
    // Performance metrics
    totalQueriesProcessed: metricsRef.current.totalQueries,
    averageLatencyMs: metricsRef.current.totalQueries > 0 
      ? metricsRef.current.totalLatencyMs / metricsRef.current.totalQueries 
      : 0,
    
    // Actions
    clearHistory,
  };
};

export default useZoeSystem2Cortex;
