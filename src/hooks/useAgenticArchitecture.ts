/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * useAgenticArchitecture Hook
 * React integration for the Periodic Table Architecture
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PeriodicTableManager,
  MultiAgentSwarm,
  initializeAgenticArchitecture,
  getAgenticStatus,
  queueAgenticTask,
  getProcessingDecision,
  type AgentType,
  type PeriodicTableState,
  type SwarmMetrics,
  type ProcessingDecision,
  type DeviceTier
} from '@/core/agentic';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AgenticArchitectureStatus {
  initialized: boolean;
  periodicTable: PeriodicTableState;
  swarm: SwarmMetrics;
  health: 'optimal' | 'degraded' | 'critical';
  deviceTier: DeviceTier;
}

export interface UseAgenticArchitectureOptions {
  autoInitialize?: boolean;
  deviceTier?: DeviceTier;
  preferLocalProcessing?: boolean;
}

export interface UseAgenticArchitectureReturn {
  // State
  status: AgenticArchitectureStatus;
  isInitialized: boolean;
  isHealthy: boolean;
  
  // Actions
  initialize: () => void;
  queueTask: (
    agentType: AgentType,
    taskType: string,
    input: unknown,
    options?: { priority?: number; deadline?: number; maxRetries?: number }
  ) => string;
  getTaskStatus: (taskId: string) => ReturnType<typeof MultiAgentSwarm.getTaskStatus>;
  
  // Processing Decision
  getProcessingDecision: (
    taskType: string,
    options?: { preferLocal?: boolean; offlineMode?: boolean }
  ) => ProcessingDecision;
  
  // Health
  runHealthCheck: () => void;
  
  // Metrics
  getAgentsByType: (type: AgentType) => ReturnType<typeof MultiAgentSwarm.getAgentsByType>;
  getRecentEvents: (limit?: number) => ReturnType<typeof MultiAgentSwarm.getRecentEvents>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE TIER DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

function detectDeviceTier(): DeviceTier {
  if (typeof navigator === 'undefined') return 'mid';
  
  const memory = (navigator as any).deviceMemory;
  const cores = navigator.hardwareConcurrency || 4;
  
  if (memory >= 8 && cores >= 8) return 'flagship';
  if (memory >= 4 && cores >= 4) return 'mid';
  if (memory >= 2) return 'budget';
  return 'legacy';
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useAgenticArchitecture(
  options: UseAgenticArchitectureOptions = {}
): UseAgenticArchitectureReturn {
  const {
    autoInitialize = true,
    deviceTier: providedTier,
    preferLocalProcessing = false
  } = options;
  
  const detectedTier = useRef(providedTier || detectDeviceTier());
  
  const [status, setStatus] = useState<AgenticArchitectureStatus>({
    initialized: false,
    periodicTable: PeriodicTableManager.getState(),
    swarm: MultiAgentSwarm.getMetrics(),
    health: 'optimal',
    deviceTier: detectedTier.current
  });
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const initialize = useCallback(() => {
    if (status.initialized) return;
    
    initializeAgenticArchitecture();
    
    const newStatus = getAgenticStatus();
    setStatus({
      initialized: true,
      periodicTable: newStatus.periodicTable,
      swarm: newStatus.swarm,
      health: newStatus.health,
      deviceTier: detectedTier.current
    });
    
    console.log('[useAgenticArchitecture] Initialized', {
      deviceTier: detectedTier.current,
      health: newStatus.health
    });
  }, [status.initialized]);
  
  // Auto-initialize
  useEffect(() => {
    if (autoInitialize && !status.initialized) {
      initialize();
    }
  }, [autoInitialize, status.initialized, initialize]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STATUS UPDATES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (!status.initialized) return;
    
    // Listen for swarm events
    const handleSwarmEvent = (e: CustomEvent) => {
      if (e.detail?.type === 'multi_agent_swarm_event') {
        // Refresh metrics
        const newStatus = getAgenticStatus();
        setStatus(prev => ({
          ...prev,
          swarm: newStatus.swarm,
          health: newStatus.health
        }));
      }
    };
    
    window.addEventListener('zoe-core-event', handleSwarmEvent as EventListener);
    
    // Periodic refresh
    const interval = setInterval(() => {
      const newStatus = getAgenticStatus();
      setStatus(prev => ({
        ...prev,
        periodicTable: newStatus.periodicTable,
        swarm: newStatus.swarm,
        health: newStatus.health
      }));
    }, 5000);
    
    return () => {
      window.removeEventListener('zoe-core-event', handleSwarmEvent as EventListener);
      clearInterval(interval);
    };
  }, [status.initialized]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const queueTask = useCallback((
    agentType: AgentType,
    taskType: string,
    input: unknown,
    taskOptions?: { priority?: number; deadline?: number; maxRetries?: number }
  ): string => {
    return queueAgenticTask(agentType, taskType, input, taskOptions);
  }, []);
  
  const getTaskStatus = useCallback((taskId: string) => {
    return MultiAgentSwarm.getTaskStatus(taskId);
  }, []);
  
  const getDecision = useCallback((
    taskType: string,
    decisionOptions?: { preferLocal?: boolean; offlineMode?: boolean }
  ): ProcessingDecision => {
    return getProcessingDecision(taskType, detectedTier.current, {
      preferLocal: decisionOptions?.preferLocal ?? preferLocalProcessing,
      offlineMode: decisionOptions?.offlineMode ?? false
    });
  }, [preferLocalProcessing]);
  
  const runHealthCheck = useCallback(() => {
    PeriodicTableManager.runHealthCheck();
    const newStatus = getAgenticStatus();
    setStatus(prev => ({
      ...prev,
      periodicTable: newStatus.periodicTable,
      health: newStatus.health
    }));
  }, []);
  
  const getAgentsByType = useCallback((type: AgentType) => {
    return MultiAgentSwarm.getAgentsByType(type);
  }, []);
  
  const getRecentEvents = useCallback((limit?: number) => {
    return MultiAgentSwarm.getRecentEvents(limit);
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════════
  
  return {
    status,
    isInitialized: status.initialized,
    isHealthy: status.health === 'optimal',
    
    initialize,
    queueTask,
    getTaskStatus,
    getProcessingDecision: getDecision,
    runHealthCheck,
    getAgentsByType,
    getRecentEvents
  };
}

export default useAgenticArchitecture;
