// ═══════════════════════════════════════════════════════════════════════════════
// USE ZOE ORCHESTRATOR HOOK
// React hook for the Orchestrator Pattern (Router/Navigator/Oracle)
// Provides seamless integration with existing Zoe systems
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { 
  zoeOrchestrator, 
  type OrchestratorResult,
  type RoutingDecision,
  type TaskCategory,
} from '@/core/orchestrator/ZoeOrchestrator';

interface UseZoeOrchestratorReturn {
  // Core functions
  process: (command: string, context?: Record<string, any>) => Promise<OrchestratorResult | null>;
  
  // State
  isProcessing: boolean;
  lastResult: OrchestratorResult | null;
  lastRouting: RoutingDecision | null;
  
  // Performance metrics
  avgLatencyMs: number;
  totalCommands: number;
  
  // Status
  status: {
    router: { size: number; maxSize: number; hitRate: number };
    oracle: { activeRequests: number; maxConcurrent: number; queueLength: number };
    isHealthy: boolean;
  };
  
  // Utilities
  clearStats: () => void;
  getLatencyBreakdown: () => LatencyBreakdown;
}

interface LatencyBreakdown {
  instant: number; // Navigator commands
  fast: number;    // Simple Oracle
  slow: number;    // Quantum/Complex Oracle
}

export const useZoeOrchestrator = (): UseZoeOrchestratorReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<OrchestratorResult | null>(null);
  const [lastRouting, setLastRouting] = useState<RoutingDecision | null>(null);
  const [status, setStatus] = useState(zoeOrchestrator.getStatus());
  
  // Performance tracking
  const [latencies, setLatencies] = useState<number[]>([]);
  const [latencyBreakdown, setLatencyBreakdown] = useState<LatencyBreakdown>({
    instant: 0,
    fast: 0,
    slow: 0,
  });
  
  // Refresh status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(zoeOrchestrator.getStatus());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Listen for orchestrator events (for async Oracle results)
  useEffect(() => {
    const handleQuantumComplete = (e: CustomEvent) => {
      console.log('[useZoeOrchestrator] Quantum processing complete:', e.detail);
    };
    
    const handleCreativeComplete = (e: CustomEvent) => {
      console.log('[useZoeOrchestrator] Creative processing complete:', e.detail);
    };
    
    const handleReasoningComplete = (e: CustomEvent) => {
      console.log('[useZoeOrchestrator] Reasoning complete:', e.detail);
    };
    
    window.addEventListener('zoe-quantum-complete', handleQuantumComplete as EventListener);
    window.addEventListener('zoe-creative-complete', handleCreativeComplete as EventListener);
    window.addEventListener('zoe-reasoning-complete', handleReasoningComplete as EventListener);
    
    return () => {
      window.removeEventListener('zoe-quantum-complete', handleQuantumComplete as EventListener);
      window.removeEventListener('zoe-creative-complete', handleCreativeComplete as EventListener);
      window.removeEventListener('zoe-reasoning-complete', handleReasoningComplete as EventListener);
    };
  }, []);
  
  /**
   * Process a command through the Orchestrator
   */
  const process = useCallback(async (
    command: string,
    context?: Record<string, any>
  ): Promise<OrchestratorResult | null> => {
    if (isProcessing) {
      console.warn('[useZoeOrchestrator] Already processing a command');
      return null;
    }
    
    setIsProcessing(true);
    
    try {
      const result = await zoeOrchestrator.process(command, context);
      
      setLastResult(result);
      setLastRouting(result.routing);
      
      // Track latency
      setLatencies(prev => [...prev.slice(-99), result.totalLatencyMs]);
      
      // Update breakdown
      setLatencyBreakdown(prev => {
        const key = result.routing.estimatedLatency;
        return {
          ...prev,
          [key]: prev[key] + 1,
        };
      });
      
      // Refresh status
      setStatus(zoeOrchestrator.getStatus());
      
      return result;
    } catch (error) {
      console.error('[useZoeOrchestrator] Error processing command:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);
  
  /**
   * Clear performance stats
   */
  const clearStats = useCallback(() => {
    setLatencies([]);
    setLatencyBreakdown({ instant: 0, fast: 0, slow: 0 });
  }, []);
  
  /**
   * Get latency breakdown
   */
  const getLatencyBreakdown = useCallback((): LatencyBreakdown => {
    return latencyBreakdown;
  }, [latencyBreakdown]);
  
  // Calculate average latency
  const avgLatencyMs = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0;
  
  return {
    process,
    isProcessing,
    lastResult,
    lastRouting,
    avgLatencyMs,
    totalCommands: latencies.length,
    status,
    clearStats,
    getLatencyBreakdown,
  };
};

export default useZoeOrchestrator;
