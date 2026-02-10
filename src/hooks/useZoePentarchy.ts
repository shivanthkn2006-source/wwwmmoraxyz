// ═══════════════════════════════════════════════════════════════════════════════
// ZOE PENTARCHY HOOK - 5-AGENT SWARM INTELLIGENCE INTERFACE
// Quantum Parallelism with Consensus Protocol
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AgentBreakdown {
  agent: string;
  confidence: number;
  processingTime: number;
}

interface PentarchyDetails {
  confidence: number;
  consensusReached: boolean;
  disagreements: string[];
  processingTime: number;
  agentBreakdown: AgentBreakdown[];
}

interface PentarchyResponse {
  success: boolean;
  response: string;
  details: PentarchyDetails;
}

interface UserContext {
  userProfile?: Record<string, any>;
  emotionalState?: {
    primary: string;
    intensity: number;
    valence: number;
  };
  birthData?: {
    date: string;
    time?: string;
    location?: string;
  };
  recentMemories?: string[];
}

export function useZoePentarchy() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<PentarchyResponse | null>(null);
  const [agentActivity, setAgentActivity] = useState<string[]>([]);
  const { toast } = useToast();

  const queryPentarchy = useCallback(async (
    query: string,
    context: UserContext = {}
  ): Promise<PentarchyResponse | null> => {
    setIsProcessing(true);
    setAgentActivity([
      '🔮 Activating Pentarchy Swarm...',
      '📜 Historian scanning ancient wisdom...',
      '🌌 Astronomer calculating celestial positions...',
      '🧠 Psychologist analyzing emotional patterns...',
      '♟️ Strategist computing optimal paths...'
    ]);

    try {
      const { data, error } = await supabase.functions.invoke('zoe-pentarchy-core', {
        body: { query, context }
      });

      if (error) {
        throw new Error(error.message);
      }

      const response = data as PentarchyResponse;
      setLastResponse(response);
      
      // Update activity with results
      setAgentActivity(prev => [
        ...prev,
        '✨ Synthesizer unifying perspectives...',
        `✅ Consensus: ${response.details.consensusReached ? 'ACHIEVED' : 'PARTIAL'}`,
        `📊 Confidence: ${(response.details.confidence * 100).toFixed(1)}%`
      ]);

      if (response.details.disagreements.length > 0) {
        toast({
          title: "Pentarchy Note",
          description: "Some agents had differing perspectives - result synthesized with probability weighting",
          variant: "default"
        });
      }

      return response;
    } catch (error) {
      console.error('Pentarchy query failed:', error);
      setAgentActivity(prev => [...prev, '❌ Pentarchy processing error']);
      
      toast({
        title: "Pentarchy Error",
        description: error instanceof Error ? error.message : "Swarm intelligence temporarily unavailable",
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // Quick karmic purpose query
  const queryKarmicPurpose = useCallback(async (context: UserContext = {}) => {
    return queryPentarchy("What is my karmic purpose and life mission?", context);
  }, [queryPentarchy]);

  // Relationship guidance query
  const queryRelationshipGuidance = useCallback(async (
    situation: string,
    context: UserContext = {}
  ) => {
    return queryPentarchy(
      `Provide guidance on this relationship situation: ${situation}`,
      context
    );
  }, [queryPentarchy]);

  // Career/life path query
  const queryLifePath = useCallback(async (context: UserContext = {}) => {
    return queryPentarchy(
      "What career path and life direction aligns with my dharma?",
      context
    );
  }, [queryPentarchy]);

  // Future prediction query
  const queryFuturePrediction = useCallback(async (
    timeframe: 'week' | 'month' | 'year',
    context: UserContext = {}
  ) => {
    return queryPentarchy(
      `What key events and opportunities should I expect in the coming ${timeframe}?`,
      context
    );
  }, [queryPentarchy]);

  // Health/wellness guidance
  const queryWellnessGuidance = useCallback(async (context: UserContext = {}) => {
    return queryPentarchy(
      "What wellness practices and lifestyle changes would benefit my physical and spiritual health?",
      context
    );
  }, [queryPentarchy]);

  // Get confidence explanation
  const getConfidenceExplanation = useCallback((confidence: number): string => {
    if (confidence >= 0.95) return "Absolute consensus - All 5 agents agree";
    if (confidence >= 0.85) return "Strong consensus - 4+ agents agree";
    if (confidence >= 0.70) return "Moderate consensus - Majority agreement";
    if (confidence >= 0.50) return "Partial consensus - Mixed perspectives";
    return "Low consensus - Significant disagreement";
  }, []);

  return {
    // Core query function
    queryPentarchy,
    
    // Specialized queries
    queryKarmicPurpose,
    queryRelationshipGuidance,
    queryLifePath,
    queryFuturePrediction,
    queryWellnessGuidance,
    
    // State
    isProcessing,
    lastResponse,
    agentActivity,
    
    // Utilities
    getConfidenceExplanation,
  };
}

export type { PentarchyResponse, PentarchyDetails, UserContext, AgentBreakdown };
