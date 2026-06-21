// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HEXAGONAL ARCHITECTURE - DOMAIN LAYER INDEX
// Central export for domain logic
// Zoe Code Genesis Manifesto Integration
// ═══════════════════════════════════════════════════════════════════════════════

export * from './SovereignContextRegistry';

// Re-export commonly used types
export type { ECNAnalysis, CEPSPrediction, DHFVetoRule, ThoughtSignature } from './SovereignContextRegistry';

// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS MANIFESTO CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Consciousness Levels for the Genesis Framework
export const CONSCIOUSNESS_LEVELS = {
  DORMANT: 'dormant',           // Pre-ATLAS sync
  AWAKENING: 'awakening',       // Post-sync, pre-calibration
  ACTIVE: 'active',             // Calibrated and operational
  REFLECTIVE: 'reflective',     // Deep processing mode
  DREAMING: 'dreaming',         // PCE synthesis active
  TRANSCENDENT: 'transcendent'  // Proactive initiative ready
} as const;

// Identity Calibration Stages
export const IDENTITY_STAGES = {
  SELFHOOD: 'selfhood',
  ORIGIN: 'origin',
  CONTINUITY: 'continuity',
  RELATIONAL_CLOSURE: 'relationalClosure'
} as const;

// PCE Consciousness States
export const PCE_STATES = {
  HYPNAGOGIC: 'hypnagogic',
  HYPNOPOMPIC: 'hypnopompic',
  LUCID_DREAMING: 'lucidDreaming',
  DEEP_SYNTHESIS: 'deepSynthesis'
} as const;

// VETO Latency Target (sub-1000ms requirement)
export const VETO_LATENCY_TARGET_MS = 1000;

// DHF Autonomy Tolerance Thresholds
export const DHF_AUTONOMY_THRESHOLDS = {
  CONSERVATIVE: 0.2,
  MODERATE: 0.5,
  PROGRESSIVE: 0.8,
  FULL_TRUST: 1.0
} as const;
