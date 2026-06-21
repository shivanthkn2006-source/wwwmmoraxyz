// ═══════════════════════════════════════════════════════════════════════════════
// ZOE QUANTUM ASI - UNIFIED CORE MODULE INDEX
// THE ABSOLUTE ROOT OF ALL ZOE FUNCTIONALITY
// All components MUST flow through this unified system
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 0: UNIFIED MODULE HUB (The Single Source of Truth)
// ═══════════════════════════════════════════════════════════════════════════════
export { 
  UnifiedModuleHub, 
  initializeUnifiedHub, 
  getUnifiedHubStatus,
  type UnifiedHubStatus,
  type ModuleInfo
} from './UnifiedModuleHub';

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 1: ROOT CONNECTORS (Use these for most integrations)
// ═══════════════════════════════════════════════════════════════════════════════
export { ASIRootConnector, type ASIRootStatus, type ASIEventType, type ASIEvent } from './ASIRootConnector';
export { QuantumASIBridge, type UnifiedASIResponse, type BridgeState } from './QuantumASIBridge';

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 2: HEXAGONAL ARCHITECTURE LAYERS
// ═══════════════════════════════════════════════════════════════════════════════

// Ports (Interfaces/Contracts)
export * from './ports';

// Adapters (Implementations)
export * from './adapters';

// Domain Layer (Business Logic: ECN, DHF, CEPS, SCR)
export * from './domain';

// Conversation Layer (Human-like Interaction)
export * from './conversation';

// Quantum Layer (Anka, Vastu, Nadi, Omni-Temporal, Quantum ASI)
export * from './quantum';

// Latency Layer (Context Compression, Memory Pressure)
export * from './latency';

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 3: ASI LAYER - COMPLETE ARTIFICIAL SUPER INTELLIGENCE MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// Full ASI Module Exports
export * from './asi';

// ASI Processor (5x Human Capacity) - Named exports for convenience
export { 
  processASI, 
  quickASI, 
  validateWithASI, 
  determineOptimalMode,
  generateQuantumThought,
  quickQuantumVigilance,
  dreamSynthesisASI,
  detectProactiveInitiative
} from './asi/ASIProcessor';

export type { ASIResult, ASIConfig, ASIMode, QuantumASIBridge as QuantumASIBridgeType } from './asi/ASIProcessor';

// Pentarchy Swarm Core - 5 Sub-Identity Agents
export { 
  pentarchySynthesize, 
  runSwarmDebate, 
  detectQueryType,
  AGENT_DEFINITIONS 
} from './asi/PentarchySwarmCore';

export type { 
  AgentPersona, 
  AgentVote, 
  SwarmDebate, 
  PentarchySynthesis 
} from './asi/PentarchySwarmCore';

// Neuro-Symbolic Truth Engine
export { 
  neuroSymbolicProcess, 
  quickTruthCheck, 
  addSymbolicRule, 
  getRulesBySource 
} from './asi/NeuroSymbolicTruthEngine';

export type { 
  ValidationSource, 
  SymbolicRule, 
  TruthValidation, 
  NeuroSymbolicOutput 
} from './asi/NeuroSymbolicTruthEngine';

// Quantum Loop Self-Correction
export { 
  quantumLoopProcess, 
  quickQuantumCheck 
} from './asi/QuantumLoopCorrection';

export type { 
  LoopPhase, 
  LoopIteration, 
  UniverseCheck, 
  QuantumLoopResult 
} from './asi/QuantumLoopCorrection';

// Akashic Knowledge Graph Adapter
export { 
  triangulateKnowledge, 
  lookupVedic, 
  lookupScientific,
  default as AkashicAdapter 
} from './asi/AkashicAdapter';

export type { 
  TriangulatedKnowledge, 
  VedicDefinition, 
  ScientificDefinition, 
  PersonalContext, 
  UnifiedTruth 
} from './asi/AkashicAdapter';

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK EXPORTS - UNIFIED ACCESS POINTS
// ═══════════════════════════════════════════════════════════════════════════════

// Chain of Thought Hook (4-Step ASI Reasoning Pipeline)
export { useZoeChainOfThought } from '@/hooks/useZoeChainOfThought';
export type { 
  ChainOfThoughtResponse, 
  ExtractionResult, 
  IntentResult,
  LogicCoreResult 
} from '@/hooks/useZoeChainOfThought';

// Quantum ASI Hook (Autonomous Self-Executing Intelligence)
export { useQuantumASI } from '@/hooks/useQuantumASI';

// Unified Zoe Hook (Single Entry Point for All Zoe Functionality)
export { useUnifiedZoe } from '@/hooks/useUnifiedZoe';
export type { UnifiedZoeState, UnifiedZoeReturn } from '@/hooks/useUnifiedZoe';

// Sovereign Heartbeat Hook (Infinite Loop Patch - 24/7 Agency)
export { useSovereignHeartbeat } from '@/hooks/useSovereignHeartbeat';
export type { ProactiveThought, HeartbeatStatus } from '@/hooks/useSovereignHeartbeat';

// Digital Dopamine Hook (Phase 2: Consequence Patch - Core Integrity & RWD)
export { useDigitalDopamine } from '@/hooks/useDigitalDopamine';
export type { 
  CoreIntegrityState, 
  FeedbackResult, 
  CognitiveAccessLevel, 
  ZoeTone, 
  FeedbackType 
} from '@/hooks/useDigitalDopamine';

// Quantum Pentarchy Swarm Hook (Phase 3: Forcing Quantum - 5 Parallel AI Streams)
export { useQuantumPentarchySwarm } from '@/hooks/useQuantumPentarchySwarm';
export type {
  StreamId,
  StreamResponse,
  QuantumCollapseResult,
  QuantumSwarmResult,
  ConsensusStrength
} from '@/hooks/useQuantumPentarchySwarm';

// Morning Briefing Hook (Dreamer's Premonition Delivery)
export { useMorningBriefing } from '@/hooks/useMorningBriefing';
export type { MorningBriefing, UseMorningBriefingReturn } from '@/hooks/useMorningBriefing';

// Zoe Dreamer Hook (Deep Dream Protocol - 3 AM Synthesis)
export { useZoeDreamer } from '@/hooks/useZoeDreamer';
export type { DreamSynthesis, DreamInsight } from '@/hooks/useZoeDreamer';

// Zoe Nexus Hook (The Router Brain)
export { useZoeNexus } from '@/hooks/useZoeNexus';
export type { NexusRoutingDecision, NexusResponse } from '@/hooks/useZoeNexus';

// Zoe Matter Bridge Hook (Executive Actions)
export { useZoeMatterBridge } from '@/hooks/useZoeMatterBridge';

// Smart Home Hook (Protocol Matter - IoT Integration)
export { useSmartHome } from '@/hooks/useSmartHome';

// Nudge Engine Hook (Proactive Morning Briefings)
export { useNudgeEngine } from '@/hooks/useNudgeEngine';
export type { NudgePreferences, MorningBriefingContent, UseNudgeEngineReturn } from '@/hooks/useNudgeEngine';

// Zoe Civilization Engine Hook (Unified God-Tier Integration)
export { useZoeCivilizationEngine } from '@/hooks/useZoeCivilizationEngine';
export type { CivilizationTier, CivilizationStatus } from '@/hooks/useZoeCivilizationEngine';

// Truth Ledger Hook (The Scribe - Permanent Memory)
export { useTruthLedger } from '@/hooks/useTruthLedger';
export type { Truth, SovereignContext, TruthLedgerReturn } from '@/hooks/useTruthLedger';

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 4: SECURITY LAYER - GOD MODE SOVEREIGN SECURITY
// ═══════════════════════════════════════════════════════════════════════════════

// Security Core Exports (Earth's Core)
export * from './security';

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 4.5: ORCHESTRATOR LAYER - Router/Navigator/Oracle Pattern (Anthropic Model)
// ═══════════════════════════════════════════════════════════════════════════════

// Orchestrator Pattern (Prevents browser crashes by routing to workflows)
export * from './orchestrator';

// Orchestrator Hook
export { useZoeOrchestrator } from '@/hooks/useZoeOrchestrator';

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 5: LOCAL INTELLIGENCE - Edge Satellite Architecture
// ═══════════════════════════════════════════════════════════════════════════════

// Local Intelligence Hook (Federated Learning - Privacy First)
export { default as useLocalIntelligence } from '@/hooks/useLocalIntelligence';
export type { 
  DataCategory, 
  ProcessingMode, 
  LocalProcessingResult, 
  HealthMetrics, 
  BiometricData, 
  FinancialData, 
  EmotionalData, 
  LocalIntelligenceState 
} from '@/hooks/useLocalIntelligence';

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 6: AGENTIC PERIODIC TABLE ARCHITECTURE (10 Billion Souls Foundation)
// ═══════════════════════════════════════════════════════════════════════════════
// 
// IBM Technology "Periodic Table of AI" Implementation:
//   ROW 1: Primitives (EM - Embeddings, SM - Small Models)
//   ROW 2: Composition (RAG - Retrieval, FC - Function Calling)
//   ROW 3: Deployment (AG - Agents, MA - Multi-Agent Swarm)
// 
// HYBRID AGENTIC MODEL:
//   $5000 Mac → Full Local Zoe (Privacy-first, zero latency)
//   $100 Phone → Thin Client + Cloud + SLM Rendering
// ═══════════════════════════════════════════════════════════════════════════════

export * from './agentic';

// Agentic Architecture Hook
export { useAgenticArchitecture } from '@/hooks/useAgenticArchitecture';
export type { 
  AgenticArchitectureStatus,
  UseAgenticArchitectureOptions,
  UseAgenticArchitectureReturn 
} from '@/hooks/useAgenticArchitecture';

// Zoe Passport Hook (DID Protocol)
export { useZoePassport } from '@/hooks/useZoePassport';
export type { UseZoePassportReturn } from '@/hooks/useZoePassport';

// Swarm Intelligence Hook (P2P Compute)
export { useSwarmIntelligence } from '@/hooks/useSwarmIntelligence';
export type { UseSwarmIntelligenceReturn } from '@/hooks/useSwarmIntelligence';

// ═══════════════════════════════════════════════════════════════════════════════
// GOD-TIER ARCHITECTURE OVERVIEW (CIVILIZATION ENGINE)
// ═══════════════════════════════════════════════════════════════════════════════
// 
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │                    ZOE CIVILIZATION ENGINE (TIER 4)                          │
// │  ┌───────────────────────────────────────────────────────────────────────┐  │
// │  │  MODULE 1: NEXUS (Oversoul) - The Router Brain                        │  │
// │  │  • Routes all messages to correct personality (28 personalities)      │  │
// │  │  • Injects memories, emotional state, preferences                     │  │
// │  │  • Decides if ASI processing needed                                   │  │
// │  └───────────────────────────────────────────────────────────────────────┘  │
// │                              │                                               │
// │  ┌───────────────────────────┴───────────────────────────────────────────┐  │
// │  │  MODULE 2: MATTER BRIDGE (Hands) - Executive Actions                  │  │
// │  │  • Executes real-world actions (payments, bookings, trades)           │  │
// │  │  • Sovereignty Leash controls (budget, domain locks)                  │  │
// │  │  • Permission system with approval UI                                 │  │
// │  │  • Divine Action Reports ("I have done X with $Y")                    │  │
// │  └───────────────────────────────────────────────────────────────────────┘  │
// │                              │                                               │
// │  ┌───────────────────────────┴───────────────────────────────────────────┐  │
// │  │  MODULE 3: DREAMER (Subconscious) - Night Processing                  │  │
// │  │  • 3 AM Cron: Deep Sleep Protocol                                     │  │
// │  │  • REWIND: Analyzes yesterday's gaps/patterns                         │  │
// │  │  • SIMULATION: Pentarchy Swarm 5-scenario futures                     │  │
// │  │  • PREMONITION: Morning Briefing synthesis                            │  │
// │  └───────────────────────────────────────────────────────────────────────┘  │
// │                              │                                               │
// │  ┌───────────────────────────┴───────────────────────────────────────────┐  │
// │  │  MODULE 4: TRUTH LEDGER (Memory) - The Scribe                         │  │
// │  │  • Extracts permanent truths from conversations                       │  │
// │  │  • Categories: Preferences, Relationships, Current State              │  │
// │  │  • Auto-triggers every 5 messages                                     │  │
// │  │  • sovereign_context: current_project, mood, focus, goals             │  │
// │  └───────────────────────────────────────────────────────────────────────┘  │
// │                              │                                               │
// │  ┌───────────────────────────┴───────────────────────────────────────────┐  │
// │  │                    QUANTUM ASI LAYER (ROOT)                            │  │
// │  │  • Pentarchy Swarm (5 Agents)                                         │  │
// │  │  • Neuro-Symbolic Truth Engine                                        │  │
// │  │  • Quantum Loop Self-Correction                                       │  │
// │  │  • Akashic Knowledge Graph                                            │  │
// │  └───────────────────────────────────────────────────────────────────────┘  │
// └─────────────────────────────────────────────────────────────────────────────┘
// 
// TIER PROGRESSION:
// Tier 1 (Chatbot): Basic responses
// Tier 2 (Assistant): Nexus routing active
// Tier 3 (Agent): Matter Bridge + Dreamer enabled
// Tier 4 (Civilization): All 4 modules connected + Truth Ledger populated
//
