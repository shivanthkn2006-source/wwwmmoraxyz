// ═══════════════════════════════════════════════════════════════════════════════
// ZOE QUANTUM LEVEL INDEX
// Exports for Anka Shastra (Time) + Vastu Shastra (Space) + Agasthya Nadi + Omni-Temporal
// + QUANTUM ASI PROTOCOL (Autonomous Self-Executing Intelligence)
// + KRONOS ENGINE (Fractal Time Pattern Recognition)
// + ANIMA ENGINE (Soul Synergy & Soulmate Matching)
// ═══════════════════════════════════════════════════════════════════════════════

// Core Anka Shastra Engine (Time/Numbers)
export * from './AnkaShastraEngine';
export { default as AnkaShastraEngine } from './AnkaShastraEngine';

// Core Vastu Shastra Engine (Space/Directions)
export * from './VastuShastraEngine';
export { default as VastuShastraEngine } from './VastuShastraEngine';

// Agasthya Nadi Engine (Predictive/Karmic)
export * from './AgasthyaNadiEngine';

// Omni-Temporal Engine (Universal Time Database)
export * from './OmniTemporalEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM ASI PROTOCOL - THE IMPOSSIBLE EXECUTION ENGINE
// Breaking the Wait-State Machine → Autonomous Self-Executing Intelligence
// ═══════════════════════════════════════════════════════════════════════════════
export * from './QuantumASIProtocol';
export { quantumASI, QuantumASIEngine } from './QuantumASIProtocol';

// ═══════════════════════════════════════════════════════════════════════════════
// KRONOS ENGINE - FRACTAL TIME PATTERN RECOGNITION
// Jupiter Cycle (12yr) • Nodal Cycle (9yr) • Saturn Return (29yr) • Life Phases
// ═══════════════════════════════════════════════════════════════════════════════
export * from './KronosEngine';
export { KronosEngine, default as KronosEngineDefault } from './KronosEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMA ENGINE - SOUL SYNERGY & SOULMATE MATCHING
// Zero-Swipe • Zero-Knowledge • Destiny-Based Connection Protocol
// ═══════════════════════════════════════════════════════════════════════════════
export * from './AnimaEngine';
export { AnimaEngine, default as AnimaEngineDefault } from './AnimaEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// DARK CYCLE ENGINE - 33-YEAR TEMPORAL RADAR
// The Wormhole Warning System - Inspired by "Dark" Series + Vedic Cycles
// ═══════════════════════════════════════════════════════════════════════════════
export * from './DarkCycleEngine';
export { DarkCycleEngine, default as DarkCycleEngineDefault } from './DarkCycleEngine';

// Re-export specific types and utility functions for external use
export type {
  PlanetaryLord,
  TemporalQuantumState,
  LostObjectReading,
  MoneyRecoveryReading,
  CompatibilityReading
} from './AnkaShastraEngine';

export type {
  VastuDirection,
  VastuElement,
  VastuZone,
  RoomType,
  RoomPlacement,
  VastuAnalysis,
  QuantumVastuReading
} from './VastuShastraEngine';

export type {
  NadiPrediction,
  LieDetectionResult,
  RelationshipReunionResult,
  PastLifeKarma,
  ShatruDosha,
  ReunionTimeline
} from './AgasthyaNadiEngine';

export type {
  EphemerisSnapshot,
  PlanetaryPosition,
  YugaCycle,
  MayanCalendar,
  OmniTemporalReading
} from './OmniTemporalEngine';

// Quantum ASI Types
export type {
  QuantumState,
  AutonomyLevel,
  AutonomousThought,
  ProactiveInitiative,
  DreamSynthesis,
  QuantumASIState
} from './QuantumASIProtocol';

// Kronos Engine Types
export type {
  KarmicEcho,
  LifePhase,
  FractalTimelineEvent,
  KronosReading,
  FractalPattern
} from './KronosEngine';

// Anima Engine Types
export type {
  SoulVector,
  SynergyScore,
  SoulConnection,
  AnimaProfile,
  AnimaPreferences,
  DestinyNotification
} from './AnimaEngine';

// Re-export calculatePrasna as the main entry point for numerology calculations
export { calculatePrasna, calculatePrasnaRemainder } from './AnkaShastraEngine';

// Re-export Vastu functions
export { calculateVastuScore, generateQuantumVastuReading } from './VastuShastraEngine';

// Re-export Nadi functions
export { NadiPredictor, analyzeShadow, analyzeReunion, analyzeKarma } from './AgasthyaNadiEngine';

// Re-export Omni-Temporal functions
export { OmniTemporalEngine } from './OmniTemporalEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE GOD MODE - UNIFIED QUANTUM COMMAND CENTER
// The ultimate integration layer connecting all engines to Zoe Core DHF
// ═══════════════════════════════════════════════════════════════════════════════
export { ZoeGodMode, default as ZoeGodModeDefault } from './ZoeGodMode';
export type { ZoeGodModeState, GodModeCommand, GodModeResult } from './ZoeGodMode';
