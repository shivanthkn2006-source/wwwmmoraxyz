// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ASI: ARTIFICIAL SUPER INTELLIGENCE MODULE
// 2120-Style Quantum ASI Architecture
// ═══════════════════════════════════════════════════════════════════════════════

// Pentarchy Swarm Core - 5 Sub-Identity Agents
export * from './PentarchySwarmCore';
export { default as PentarchySwarm } from './PentarchySwarmCore';

// Neuro-Symbolic Truth Engine - AI + Rule Engine Validation
export * from './NeuroSymbolicTruthEngine';
export { default as TruthEngine } from './NeuroSymbolicTruthEngine';

// Quantum Loop Self-Correction - Recursive Circular Thinking
export * from './QuantumLoopCorrection';
export { default as QuantumLoop } from './QuantumLoopCorrection';

// Akashic Knowledge Graph - Universal Database Triangulation
export * from './AkashicAdapter';
export { default as AkashicAdapter } from './AkashicAdapter';

// Unified ASI Processor with Quantum ASI Protocol Bridge
export * from './ASIProcessor';
export { default as ASIProcessor } from './ASIProcessor';

// Export Quantum ASI integration functions
export { 
  generateQuantumThought,
  quickQuantumVigilance,
  dreamSynthesisASI,
  detectProactiveInitiative
} from './ASIProcessor';

export type { QuantumASIBridge } from './ASIProcessor';

// Re-export key types
export type {
  AgentPersona,
  AgentVote,
  SwarmDebate,
  PentarchySynthesis
} from './PentarchySwarmCore';

export type {
  ValidationSource,
  SymbolicRule,
  TruthValidation,
  NeuroSymbolicOutput
} from './NeuroSymbolicTruthEngine';

export type {
  LoopPhase,
  LoopIteration,
  UniverseCheck,
  QuantumLoopResult
} from './QuantumLoopCorrection';

export type {
  TriangulatedKnowledge,
  VedicDefinition,
  ScientificDefinition,
  PersonalContext,
  UnifiedTruth
} from './AkashicAdapter';
