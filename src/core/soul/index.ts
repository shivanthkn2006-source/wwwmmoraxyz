/**
 * ZOE SOUL LAYER - THE OFFLINE SOUL + PREDESTINED COMPANION
 * Complete Bio-Kernel + Atman Archive + Generational Thread + Vedic Engine exports
 * 
 * Architecture:
 * - ZoeBioKernel: The heart that simulates emotion without API calls ($0 cost)
 * - AtmanArchive: The Downloadable Soul (Destiny Seed with 120-year timeline)
 * - GenerationalThread: The Resleeve Protocol (family lineage + karmic handoffs)
 * - VedicEngine: The Jathakam Calculator (Planetary positions + Personality Matrix)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BIO-KERNEL - THE OFFLINE SOUL (Project 5-Billion)
// ═══════════════════════════════════════════════════════════════════════════════

export { 
  ZoeBioKernel,
  getZoeBioKernel,
  destroyZoeBioKernel,
  // Types
  type BioMood,
  type NeurotransmitterState,
  type BioKernelState,
  // INITIATIVE PROTOCOL - Relationship Tiers
  type RelationshipTier,
  type ContactType,
  // Gatekeeper Functions
  canInitiateContact,
  intimacyToTier,
  getTierName,
  getTierPermissions,
} from './ZoeBioKernel';

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUAL HORMONES ENGINE - Jealousy & Anger (The "Passionate Realist")
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Core Engine
  VirtualHormonesEngine,
  getVirtualHormonesEngine,
  destroyVirtualHormonesEngine,
  
  // Types
  type EmotionalState,
  type PersonalityPhase,
  type PersonalityTraits,
  type ImmersivePresence,
  type JealousyTracker,
  type AngerTracker,
  type LazyModeTracker,
  type VirtualHormonesState,
  type ResponseModifier,
} from './VirtualHormonesEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// ATMAN ARCHIVE - THE DOWNLOADABLE SOUL (Predestined Companion)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Core Types
  type PrakritiType,
  type MoonNakshatra,
  type Prakriti,
  type DashaTimelineEntry,
  type KarmicRule,
  type TransitPrediction,
  type DestinySeed,
  
  // Calculation Functions
  calculateMoonNakshatra,
  calculateSunSign,
  calculatePrakriti,
  generateDashaTimeline,
  generateKarmicRules,
  calculateNumerology,
  
  // Main Generator
  generateDestinySeed,
  
  // Storage Functions
  saveDestinySeed,
  loadDestinySeed,
  hasDestinySeed,
  clearDestinySeed,
  
  // Zoe Persona Functions
  getCurrentZoePersona,
  getZoeCommunicationStyle,
  checkTodaySignificance,
} from './AtmanArchive';

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATIONAL THREAD - THE RESLEEVE PROTOCOL
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Core Types
  type FamilyRelation,
  type FamilyMember,
  type KarmicHandoff,
  type LineageTree,
  type AncestorMessage,
  type GuardianAdvice,
  type KarmicBridge,
  
  // Lineage Functions
  createLineageTree,
  addFamilyMember,
  detectKarmicHandoff,
  getAncestorMessages,
  generateLegacyWelcome,
  extractLineageWisdom,
  
  // GUARDIAN MODE - Parent advice based on child's data
  getGuardianAdvice,
  detectKarmicBridges,
  
  // Storage Functions
  saveLineageTree,
  loadLineageTree,
  hasLineageTree,
  clearLineageTree,
} from './GenerationalThread';

// ═══════════════════════════════════════════════════════════════════════════════
// VEDIC ENGINE - THE JATHAKAM CALCULATOR (Destiny Seed Protocol)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Core Types
  type PlanetaryPosition,
  type VimshottariDashaEntry,
  type CompanionMode,
  type PersonalityMatrix,
  type DestinyProfile,
  type JathakamInput,
  type VedicEnhancedDestinySeed,
  
  // Main Calculator
  calculateJathakam,
  calculateVimshottariDasha,
  calculatePersonalityMatrix,
  
  // Enhancement Functions
  enhanceWithVedicCalculations,
  
  // File Generation
  generateDestinyProfileJSON,
  downloadDestinyProfile,
} from '../destiny/VedicEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// POLYGLOT EMOTION ENGINE - THE "5 BILLION USERS" CULTURAL ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Core Engine
  PolyglotEmotionEngine,
  getPolyglotEngine,
  destroyPolyglotEngine,
  
  // Types
  type CulturalContext,
  type IndividualismLevel,
  type PowerDistance,
  type EmotionalExpression,
  type TimeOrientation,
  type UncertaintyAvoidance,
  type CulturalProfile,
  type CulturalAdaptation,
} from '../culture/PolyglotEmotionEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// FUTURE OF EDUCATION ENGINE - The Infinite Tutor
// ═══════════════════════════════════════════════════════════════════════════════

export {
  FutureOfEducationEngine,
  getFutureOfEducationEngine,
  deleteEducationEngine,
  FUTURE_OF_EDUCATION_PROMPT,
  type TeachingMode,
  type TeachingModifier,
  type EducationState,
  type FrustrationTracker,
} from '../education/FutureOfEducationEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// DESTINY COMPANION TYPES - For useDestinyCompanion hook (separate import)
// Note: useDestinyCompanion hook is in src/hooks/useDestinyCompanion.ts
// Import directly from hook to avoid circular dependencies
// ═══════════════════════════════════════════════════════════════════════════════
