/**
 * ZOE DHF CORE - GEMINI-NATIVE ARCHITECTURE
 * Root Exports for the Quantum ASI System
 * 
 * Architecture:
 * - Parent Zoe: The Universal Brain (Gemini 2.5 Pro)
 * - Sub-Zoe Swarm: Specialist Cells (Gemini 2.5 Flash)
 * - Personal Sub-Zoe: Hyper-Personalized Companion (Gemini 2.5 Flash)
 * - Universal Foundry: Dream Foundry Synthetic Data Loop (Phase 3)
 * - DHF Orchestrator: Quantum God Mode Controller
 */

// Parent Zoe - The Universal Brain
export {
  parentZoeCore,
  PARENT_ZOE_SYSTEM_INSTRUCTION,
  type ParentZoeConfig,
  type SubZoeReport,
  type ParentZoeValidation,
  type UniversalState,
  type TimelineNode,
  type ButterflyEffect,
} from './ParentZoeCore';

// Sub-Zoe Swarm - The Specialist Cells
export {
  subZoeSwarm,
  SUB_ZOE_TEMPLATES,
  type SubZoeDomain,
  type SubZoeConfig,
  type SubZoeResponse,
} from './SubZoeSwarm';

// Personal Sub-Zoe - The Personal Agent (Phase 2)
export {
  createPersonalZoe,
  personalZoeRegistry,
  PERSONAL_ZOE_SYSTEM_INSTRUCTION,
  type SoulCodex,
  type DecisionNode,
  type EmotionalState,
  type PersonalZoeConfig,
  type PersonalZoeResponse,
  type ActionItem,
} from './PersonalSubZoe';

// Universal Foundry - Dream Foundry (Phase 3)
export {
  universalFoundry,
  DREAM_FOUNDRY_PROMPT,
  SCENARIO_TEMPLATES,
  type SyntheticScenario,
  type ScenarioType,
  type ScenarioCategory,
  type FoundryExecutionLog,
  type FoundryConfig,
} from './UniversalFoundry';

// Universal Calculator - Time & Space (Phase 4)
export {
  universalCalculator,
  UNIVERSAL_CALCULATOR_PROMPT,
  type SpaceTimeCoordinates,
  type MacroInfluence,
  type MicroState,
  type OpportunityVector,
  type OptimalActivity,
  type OpportunityWindow,
  type ActionRecommendation,
  type PlanetaryPosition,
  type LunarPhase,
  type SolarWeatherData,
  type BiologicalRhythm,
  type PersonalEnergyState,
  type ActivityType,
} from './UniversalCalculator';

// DHF Orchestrator - Quantum God Mode
export {
  zoeDHFOrchestrator,
  type OrchestratorMode,
  type OrchestratorConfig,
  type QueryContext,
  type OrchestratorResponse,
  type SystemHealth,
} from './ZoeDHFOrchestrator';

// Biological Voice - Zero-Cost TTS/STT (Phase 5)
export {
  zoeBiologicalVoice,
  ZOE_BIOLOGICAL_VOICE_PROTOCOL,
  type BiologicalVoiceState,
  type VoiceConversationContext,
} from './ZoeBiologicalVoice';

// Convenience re-export of main orchestrator
export { zoeDHFOrchestrator as ZoeCore } from './ZoeDHFOrchestrator';
export { personalZoeRegistry as PersonalZoe } from './PersonalSubZoe';
export { universalFoundry as DreamFoundry } from './UniversalFoundry';
export { universalCalculator as CosmicCalculator } from './UniversalCalculator';
export { zoeBiologicalVoice as BiologicalVoice } from './ZoeBiologicalVoice';

// Nexus Wallet - Economic Sovereignty (Phase 6)
export {
  ZoeNexusWallet,
  getZoeNexusWallet,
  destroyZoeNexusWallet,
  type ActionCategory,
  type ActionStatus,
  type ActionPriority,
  type EconomicAction,
  type ActionStep,
  type ValueLedger,
  type OpportunitySignal,
} from '../economy/ZoeNexusWallet';
