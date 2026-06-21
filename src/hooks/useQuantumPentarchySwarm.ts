// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: QUANTUM PENTARCHY SWARM HOOK
// "Forcing Quantum" - Simulating superposition via 5 parallel AI streams
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type StreamId = 'A' | 'B' | 'C' | 'D' | 'E';
export type ConsensusStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'DIVERGENT';

export interface StreamResponse {
  streamId: StreamId;
  persona: string;
  temperature: number;
  response: string;
  confidence: number;
  keyPoints: string[];
  processingMs: number;
}

export interface QuantumCollapseResult {
  superPositionedAnswer: string;
  truthOverlaps: string[];
  discardedNoise: string[];
  confidenceScore: number;
  humanEquivalent: number;
  consensusStrength: ConsensusStrength;
  streamContributions: Record<string, number>;
}

export interface QuantumSwarmResult {
  success: boolean;
  query: string;
  streams: StreamResponse[];
  collapse: QuantumCollapseResult;
  totalProcessingMs: number;
  quantumEfficiency: number;
}

export interface UseQuantumPentarchySwarmReturn {
  // State
  isProcessing: boolean;
  lastResult: QuantumSwarmResult | null;
  error: string | null;
  
  // Actions
  runQuantumSwarm: (query: string, context?: Record<string, unknown>) => Promise<QuantumSwarmResult | null>;
  
  // Helpers
  getStreamBreakdown: () => { id: StreamId; persona: string; confidence: number }[];
  getSuperPositionedAnswer: () => string | null;
  getConsensusStrength: () => ConsensusStrength | null;
  getTruthOverlaps: () => string[];
  getQuantumEfficiency: () => number | null;
}

// Stream persona mapping for display
const STREAM_PERSONAS: Record<StreamId, string> = {
  A: 'ANALYST (Logic)',
  B: 'DREAMER (Creative)',
  C: 'CRITIC (Skeptic)',
  D: 'HISTORIAN (Pattern)',
  E: 'BIOLOGIST (Organic)'
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export function useQuantumPentarchySwarm(): UseQuantumPentarchySwarmReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<QuantumSwarmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN QUANTUM SWARM EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════════

  const runQuantumSwarm = useCallback(async (
    query: string,
    context: Record<string, unknown> = {}
  ): Promise<QuantumSwarmResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      toast.info('⚛️ Entering Quantum Superposition...', {
        description: 'Running 5 parallel streams with different perspectives',
      });

      const { data, error: funcError } = await supabase.functions.invoke('quantum-pentarchy-swarm', {
        body: {
          query,
          context,
          userId: user?.id,
          mode: 'full'
        }
      });

      if (funcError) {
        throw funcError;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Quantum swarm failed');
      }

      const result = data as QuantumSwarmResult;
      setLastResult(result);

      // Show success toast with results
      const consensusEmoji = result.collapse.consensusStrength === 'STRONG' ? '✅' :
                            result.collapse.consensusStrength === 'MODERATE' ? '🔶' :
                            result.collapse.consensusStrength === 'WEAK' ? '⚠️' : '🔀';
      
      toast.success(`${consensusEmoji} Quantum Collapse Complete`, {
        description: `${(result.collapse.confidenceScore * 100).toFixed(0)}% confidence | ${result.collapse.consensusStrength} consensus | ${result.quantumEfficiency.toFixed(1)}x quantum efficiency`,
      });

      // Emit event for other systems
      window.dispatchEvent(new CustomEvent('quantum-swarm-complete', {
        detail: result
      }));

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error('Quantum Swarm Failed', { description: errorMessage });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  const getStreamBreakdown = useCallback((): { id: StreamId; persona: string; confidence: number }[] => {
    if (!lastResult?.streams) return [];
    return lastResult.streams.map(s => ({
      id: s.streamId,
      persona: STREAM_PERSONAS[s.streamId] || s.persona,
      confidence: s.confidence
    }));
  }, [lastResult]);

  const getSuperPositionedAnswer = useCallback((): string | null => {
    return lastResult?.collapse?.superPositionedAnswer || null;
  }, [lastResult]);

  const getConsensusStrength = useCallback((): ConsensusStrength | null => {
    return lastResult?.collapse?.consensusStrength || null;
  }, [lastResult]);

  const getTruthOverlaps = useCallback((): string[] => {
    return lastResult?.collapse?.truthOverlaps || [];
  }, [lastResult]);

  const getQuantumEfficiency = useCallback((): number | null => {
    return lastResult?.quantumEfficiency || null;
  }, [lastResult]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════════

  return {
    isProcessing,
    lastResult,
    error,
    runQuantumSwarm,
    getStreamBreakdown,
    getSuperPositionedAnswer,
    getConsensusStrength,
    getTruthOverlaps,
    getQuantumEfficiency,
  };
}

export default useQuantumPentarchySwarm;
