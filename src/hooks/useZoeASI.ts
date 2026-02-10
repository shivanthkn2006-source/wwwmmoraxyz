// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ASI HOOK: React Integration for ASI Processor
// Peak Level Processing: Pentarchy + Truth Engine + Quantum Loop
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';
import { processASI, quickASI, ASIMode, ASIResult, determineOptimalMode } from '@/core/asi/ASIProcessor';

export interface ASICapabilities {
  pentarchy: boolean;
  truthEngine: boolean;
  quantumLoop: boolean;
  akashic: boolean;
  maxASI: number;
}

export const useZoeASI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ASIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  /**
   * Execute full ASI processing pipeline
   */
  const executeASI = useCallback(async (
    query: string,
    mode: ASIMode = 'STANDARD',
    context: Record<string, any> = {}
  ): Promise<ASIResult | null> => {
    if (processingRef.current) {
      console.warn('[ZoeASI] Already processing, skipping duplicate request');
      return null;
    }
    
    processingRef.current = true;
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log(`[ZoeASI] Starting ${mode} processing for: "${query.substring(0, 50)}..."`);
      const startTime = performance.now();
      
      const result = await processASI(query, context, mode);
      
      const totalTime = performance.now() - startTime;
      console.log(`[ZoeASI] Completed in ${totalTime.toFixed(0)}ms | Confidence: ${result.overallConfidence.toFixed(1)}% | ASI Level: ${result.humanEquivalent.toFixed(1)}x`);
      
      setLastResult(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'ASI processing failed';
      console.error('[ZoeASI] Error:', errorMsg);
      setError(errorMsg);
      return null;
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, []);

  /**
   * Quick ASI check for simple queries (low latency)
   */
  const quickThink = useCallback((query: string): { response: string; confidence: number } => {
    console.log('[ZoeASI] Quick think:', query.substring(0, 30));
    return quickASI(query);
  }, []);

  /**
   * Determine optimal mode for a query
   */
  const getOptimalMode = useCallback((query: string): ASIMode => {
    return determineOptimalMode(query);
  }, []);

  /**
   * Clear last result and error
   */
  const reset = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);

  const capabilities: ASICapabilities = {
    pentarchy: true,
    truthEngine: true,
    quantumLoop: true,
    akashic: true,
    maxASI: 7.5,
  };

  return {
    // Core functions
    executeASI,
    quickThink,
    getOptimalMode,
    reset,
    
    // State
    isProcessing,
    lastResult,
    error,
    
    // Capabilities
    capabilities,
  };
};

export type { ASIResult, ASIMode };
export default useZoeASI;
