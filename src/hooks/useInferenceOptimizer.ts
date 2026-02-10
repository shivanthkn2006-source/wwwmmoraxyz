// ═══════════════════════════════════════════════════════════════════════════════
// useInferenceOptimizer Hook
// React integration for IBM Inference Optimization Stack
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  InferenceOptimizer, 
  HardwareCapabilities, 
  InferenceDecision, 
  InferenceMetrics,
  initializeInferenceOptimizer,
  executeOptimizedInference,
} from '@/core/inference';

export interface UseInferenceOptimizerReturn {
  isInitialized: boolean;
  capabilities: HardwareCapabilities | null;
  metrics: InferenceMetrics;
  lastDecision: InferenceDecision | null;
  execute: (query: string, cloudFn: (q: string, ctx?: any) => Promise<any>) => Promise<any>;
  decideBrain: (query: string) => Promise<InferenceDecision>;
  getCostSavings: () => { totalSaved: number; percentSaved: number; localRatio: number };
}

export function useInferenceOptimizer(): UseInferenceOptimizerReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [capabilities, setCapabilities] = useState<HardwareCapabilities | null>(null);
  const [metrics, setMetrics] = useState<InferenceMetrics>(InferenceOptimizer.getMetrics());
  const [lastDecision, setLastDecision] = useState<InferenceDecision | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    initializeInferenceOptimizer().then(caps => {
      setCapabilities(caps);
      setIsInitialized(true);
      console.log('[useInferenceOptimizer] ✅ Ready');
    });
  }, []);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(InferenceOptimizer.getMetrics());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const execute = useCallback(async (
    query: string, 
    cloudFn: (q: string, ctx?: any) => Promise<any>
  ) => {
    const result = await executeOptimizedInference(query, cloudFn);
    setMetrics(InferenceOptimizer.getMetrics());
    return result;
  }, []);

  const decideBrain = useCallback(async (query: string) => {
    const decision = await InferenceOptimizer.decideBrain(query);
    setLastDecision(decision);
    return decision;
  }, []);

  const getCostSavings = useCallback(() => {
    return InferenceOptimizer.getCostSavingsReport();
  }, []);

  return {
    isInitialized,
    capabilities,
    metrics,
    lastDecision,
    execute,
    decideBrain,
    getCostSavings,
  };
}

export default useInferenceOptimizer;
