import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export type IntelligenceMode = 'standard' | 'deep_thinking' | 'creative' | 'analytical' | 'empathetic' | 'strategic';

export interface IntelligenceOptions {
  reasoning_depth?: number;
  creativity_level?: number;
  precision_level?: number;
  verbose_reasoning?: boolean;
}

export interface IntelligenceContext {
  currentPage?: string;
  recentActivity?: string[];
  userPreferences?: Record<string, any>;
  conversationHistory?: Array<{ role: string; content: string }>;
  emotionalContext?: {
    mood?: string;
    sentiment?: number;
    engagement?: number;
  };
}

export interface IntelligenceResponse {
  message: string;
  toolCalls?: Array<{
    tool: string;
    args: Record<string, any>;
    result: Record<string, any>;
  }>;
  model: string;
  intelligence: {
    version: string;
    architecture: string;
    capabilities: string[];
    confidence: number;
  };
  reasoning?: string;
  metacognition?: {
    internalMonologue: string[];
    confidence: number;
    uncertainClaims: string[];
    clarifyingQuestion: string | null;
    needsClarification: boolean;
    deepMode: boolean;
  };
}


/**
 * Hook for interacting with Zoe's Core Intelligence powered by Gemini 3 Pro
 * 
 * Features:
 * - Neural reasoning with self-correction
 * - Metacognitive analysis
 * - Emergent pattern synthesis
 * - Predictive modeling
 * - Creative ideation
 * - Emotional intelligence
 */
export const useZoeCoreIntelligence = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMode, setCurrentMode] = useState<IntelligenceMode>('standard');
  const [lastResponse, setLastResponse] = useState<IntelligenceResponse | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);

  const executeIntelligence = useCallback(async (
    command: string,
    mode: IntelligenceMode = 'standard',
    context?: IntelligenceContext,
    options?: IntelligenceOptions
  ): Promise<IntelligenceResponse | null> => {
    if (!user) {
      toast.error('Please sign in to use Zoe Intelligence');
      return null;
    }

    if (!command.trim()) {
      toast.error('Please provide a command');
      return null;
    }

    setIsProcessing(true);
    setCurrentMode(mode);

    try {
      // Build context with conversation history
      const fullContext: IntelligenceContext = {
        ...context,
        currentPage: context?.currentPage || window.location.pathname,
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: command }
        ]
      };

      const { data, error } = await supabase.functions.invoke('zoe-core-intelligence', {
        body: {
          command,
          userId: user.id,
          mode,
          context: fullContext,
          options
        }
      });

      if (error) {
        console.error('Zoe Core Intelligence error:', error);
        toast.error(error.message || 'Intelligence processing failed');
        return null;
      }

      const response = data as IntelligenceResponse;
      setLastResponse(response);

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: command },
        { role: 'assistant', content: response.message }
      ]);

      return response;
    } catch (error) {
      console.error('Zoe Core Intelligence error:', error);
      toast.error('Intelligence processing failed');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [user, conversationHistory]);

  // Convenience methods for different modes
  const think = useCallback((command: string, context?: IntelligenceContext) => 
    executeIntelligence(command, 'deep_thinking', context, { reasoning_depth: 8, verbose_reasoning: true }), 
    [executeIntelligence]
  );

  const create = useCallback((command: string, context?: IntelligenceContext) => 
    executeIntelligence(command, 'creative', context, { creativity_level: 9 }), 
    [executeIntelligence]
  );

  const analyze = useCallback((command: string, context?: IntelligenceContext) => 
    executeIntelligence(command, 'analytical', context, { precision_level: 9 }), 
    [executeIntelligence]
  );

  const empathize = useCallback((command: string, context?: IntelligenceContext) => 
    executeIntelligence(command, 'empathetic', context), 
    [executeIntelligence]
  );

  const strategize = useCallback((command: string, context?: IntelligenceContext) => 
    executeIntelligence(command, 'strategic', context, { reasoning_depth: 9 }), 
    [executeIntelligence]
  );

  // Clear conversation history
  const clearHistory = useCallback(() => {
    setConversationHistory([]);
    setLastResponse(null);
  }, []);

  return {
    // Core execution
    executeIntelligence,
    
    // Mode-specific shortcuts
    think,      // Deep thinking mode
    create,     // Creative mode
    analyze,    // Analytical mode
    empathize,  // Empathetic mode
    strategize, // Strategic mode
    
    // State
    isProcessing,
    currentMode,
    lastResponse,
    conversationHistory,
    
    // Actions
    clearHistory,
    setCurrentMode,
    
    // Capabilities
    capabilities: [
      'neural_reasoning',
      'metacognition', 
      'pattern_synthesis',
      'predictive_modeling',
      'creative_ideation',
      'emotional_intelligence',
      'strategic_planning'
    ]
  };
};

export default useZoeCoreIntelligence;
