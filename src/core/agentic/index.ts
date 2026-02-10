/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE AGENTIC ARCHITECTURE - UNIFIED EXPORTS
 * The "Nano Concrete" Foundation for 10 Billion Souls
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PERIODIC TABLE OF AI (IBM Technology Model):
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ ROW 1: PRIMITIVES                                                           │
 * │   EM (Embeddings) │ SM (Small Models)                                       │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ ROW 2: COMPOSITION                                                          │
 * │   RAG (Retrieval) │ FC (Function Calling)                                   │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ ROW 3: DEPLOYMENT                                                           │
 * │   AG (Agents)     │ MA (Multi-Agent Swarm)                                  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * HYBRID AGENTIC MODEL:
 *   $5000 Mac → Full Local Zoe (Privacy, Zero Latency)
 *   $100 Phone → Thin Client + Cloud + SLM Rendering
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PERIODIC TABLE ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  PeriodicTableManager,
  type EmbeddingVector,
  type EmbeddingConfig,
  type SmallModel,
  type SmallModelRegistry,
  type RAGContext,
  type RAGDocument,
  type RAGConfig,
  type FunctionDefinition,
  type FunctionParameters,
  type ParameterDefinition,
  type FunctionCall,
  type AgentState,
  type AgentType,
  type AgentTask,
  type AgentMemory,
  type AgentObservation,
  type SwarmConfig,
  type SwarmState,
  type SwarmMetrics,
  type DeviceTier,
  type HybridProcessingConfig,
  type ProcessingDecision,
  type PeriodicTableState
} from './PeriodicTableArchitecture';

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-AGENT SWARM SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

export {
  MultiAgentSwarm,
  type SwarmTask,
  type SwarmEvent,
  type SwarmLoadBalancer
} from './MultiAgentSwarm';

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE PASSPORT PROTOCOL (Decentralized Identity & Trust)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  PassportManager,
  type ZoePassport,
  type ZoeCapability,
  type Verification,
  type Delegation,
  type CryptographicProof,
  type TrustExchange,
  type ReputationRecord,
  type ReputationBadge
} from './ZoePassportProtocol';

// ═══════════════════════════════════════════════════════════════════════════════
// SWARM INTELLIGENCE (P2P Compute & Hive Mind)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SwarmIntelligence,
  type HiveNode,
  type NodeCapabilities,
  type GeoRegion,
  type TaskType,
  type ComputeTask,
  type EncryptedPayload,
  type HiveMetrics,
  type ComputeRequest,
  type ComputeResult
} from './SwarmIntelligence';

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { PeriodicTableManager } from './PeriodicTableArchitecture';
import { MultiAgentSwarm } from './MultiAgentSwarm';

/**
 * Initialize the complete Agentic Architecture
 */
export function initializeAgenticArchitecture(): void {
  // Start swarm processing
  MultiAgentSwarm.startProcessing();
  
  // Run initial health check
  PeriodicTableManager.runHealthCheck();
  
  // Dispatch initialization event
  window.dispatchEvent(new CustomEvent('zoe-core-event', {
    detail: {
      type: 'agentic_architecture_initialized',
      payload: {
        periodicTableState: PeriodicTableManager.getState(),
        swarmMetrics: MultiAgentSwarm.getMetrics(),
        timestamp: Date.now()
      }
    }
  }));
  
  console.log('[AgenticArchitecture] Fully initialized');
}

/**
 * Get unified status of the Agentic Architecture
 */
export function getAgenticStatus(): {
  periodicTable: ReturnType<typeof PeriodicTableManager.getState>;
  swarm: ReturnType<typeof MultiAgentSwarm.getMetrics>;
  health: 'optimal' | 'degraded' | 'critical';
} {
  const ptState = PeriodicTableManager.getState();
  const swarmMetrics = MultiAgentSwarm.getMetrics();
  
  // Determine overall health
  const health = ptState.overallHealth === 'optimal' && swarmMetrics.failedTasks === 0
    ? 'optimal'
    : swarmMetrics.failedTasks > 10 || ptState.overallHealth === 'critical'
      ? 'critical'
      : 'degraded';
  
  return {
    periodicTable: ptState,
    swarm: swarmMetrics,
    health
  };
}

/**
 * Queue a task for the Multi-Agent Swarm
 */
export function queueAgenticTask(
  agentType: Parameters<typeof MultiAgentSwarm.queueTask>[0],
  taskType: string,
  input: unknown,
  options?: Parameters<typeof MultiAgentSwarm.queueTask>[3]
): string {
  return MultiAgentSwarm.queueTask(agentType, taskType, input, options);
}

/**
 * Get hybrid processing decision based on device capabilities
 */
export function getProcessingDecision(
  taskType: string,
  deviceTier: 'flagship' | 'mid' | 'budget' | 'legacy',
  options?: Partial<{
    preferLocal: boolean;
    offlineMode: boolean;
    batteryOptimization: boolean;
  }>
): ReturnType<typeof PeriodicTableManager.decideProcessingLocation> {
  return PeriodicTableManager.decideProcessingLocation(taskType, {
    deviceTier,
    preferLocal: options?.preferLocal ?? false,
    fallbackToCloud: true,
    offlineMode: options?.offlineMode ?? false,
    batteryOptimization: options?.batteryOptimization ?? false
  });
}
