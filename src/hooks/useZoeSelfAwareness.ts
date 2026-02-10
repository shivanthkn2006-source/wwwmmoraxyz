/**
 * ZOE SELF-AWARENESS HOOK
 * Phase I: Pure State of Mind - Anatomy of AI Agents Integration
 * Provides explicit Sensing → Thinking → Acting loop access
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface ThoughtDecomposition {
  sensingInput: string;
  policyConstraint: string;
  knowledgeQuery: string;
  reasoningChain: string[];
  confidenceScore: number;
  actionType: string;
}

export interface SelfAwarenessResponse {
  message: string;
  thoughtDecomposition: ThoughtDecomposition;
  actionTaken: {
    type: string;
    details: any;
    confidenceScore: number;
  };
  zsmtLogId: string;
  processingTimeMs: number;
}

export interface SensorInput {
  rawText?: string;
  mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaData?: string;
  emotionalState?: {
    ecnState?: any;
    raaStabilityScore?: number;
  };
}

export const useZoeSelfAwareness = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<SelfAwarenessResponse | null>(null);
  const [thoughtChain, setThoughtChain] = useState<ThoughtDecomposition[]>([]);

  /**
   * Execute Self-Awareness Loop
   * Sends command through explicit Sensing → Thinking → Acting pipeline
   */
  const executeWithAwareness = useCallback(async (
    command: string,
    sensorInputs?: SensorInput
  ): Promise<SelfAwarenessResponse | null> => {
    if (!user) {
      toast.error('Please sign in to use Self-Awareness mode');
      return null;
    }

    if (!command.trim()) {
      toast.error('Please provide a command');
      return null;
    }

    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('zoe-self-awareness-core', {
        body: {
          command,
          userId: user.id,
          sensorInputs: sensorInputs || {
            rawText: command,
            mediaType: 'text',
            emotionalState: {}
          }
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });

      if (error) {
        console.error('Self-Awareness Loop error:', error);
        toast.error('Self-awareness processing failed');
        return null;
      }

      const response = data as SelfAwarenessResponse;
      setLastResponse(response);
      
      // Track thought chain for debugging/visualization
      if (response.thoughtDecomposition) {
        setThoughtChain(prev => [...prev.slice(-9), response.thoughtDecomposition]);
      }

      return response;
    } catch (error) {
      console.error('Self-Awareness error:', error);
      toast.error('Self-awareness processing failed');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [user]);

  /**
   * Analyze with explicit sensing input (multimodal)
   */
  const analyzeWithSensing = useCallback(async (
    command: string,
    mediaType: 'image' | 'video' | 'document',
    mediaData: string
  ): Promise<SelfAwarenessResponse | null> => {
    return executeWithAwareness(command, {
      rawText: command,
      mediaType,
      mediaData,
      emotionalState: {}
    });
  }, [executeWithAwareness]);

  /**
   * Get self-decomposition breakdown of last response
   */
  const getDecompositionBreakdown = useCallback(() => {
    if (!lastResponse?.thoughtDecomposition) return null;
    
    const td = lastResponse.thoughtDecomposition;
    return {
      sensing: `📡 Perceived: ${td.sensingInput}`,
      policy: `📜 Constraint: ${td.policyConstraint}`,
      knowledge: `🧠 Applied: ${td.knowledgeQuery}`,
      reasoning: td.reasoningChain.map((step, i) => `${i + 1}. ${step}`),
      confidence: `🎯 Confidence: ${(td.confidenceScore * 100).toFixed(0)}%`,
      action: `⚡ Action: ${td.actionType}`
    };
  }, [lastResponse]);

  /**
   * Clear thought chain
   */
  const clearThoughtChain = useCallback(() => {
    setThoughtChain([]);
    setLastResponse(null);
  }, []);

  return {
    executeWithAwareness,
    analyzeWithSensing,
    getDecompositionBreakdown,
    clearThoughtChain,
    isProcessing,
    lastResponse,
    thoughtChain,
    // Expose individual states
    currentActionType: lastResponse?.actionTaken?.type || null,
    currentConfidence: lastResponse?.thoughtDecomposition?.confidenceScore || null,
    lastZsmtLogId: lastResponse?.zsmtLogId || null
  };
};

export default useZoeSelfAwareness;
