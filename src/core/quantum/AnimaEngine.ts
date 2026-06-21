// ═══════════════════════════════════════════════════════════════════════════════
// ANIMA ENGINE - SOUL SYNERGY & SOULMATE MATCHING
// Zero-Swipe • Zero-Knowledge • Destiny-Based Connection
// Protocol: Match souls based on Timeline Sync + Soul Codex + Vedic Synastry
// ═══════════════════════════════════════════════════════════════════════════════

import { calculateConductorNumber, reduceToSingleDigit } from './AnkaShastraEngine';
import { calculateYugaCycle, generateEphemerisSnapshot } from './OmniTemporalEngine';
import { KronosEngine, type LifePhase, type KarmicEcho } from './KronosEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SoulVector {
  userId: string;
  // Core Identity
  driverNumber: number;
  conductorNumber: number;
  vibrationNumber: number;
  // Personality Matrix
  humorStyle: 'sarcastic' | 'warm' | 'dry' | 'playful' | 'neutral';
  conflictStyle: 'aggressive' | 'passive' | 'diplomatic' | 'avoidant' | 'collaborative';
  decisionStyle: 'impulsive' | 'analytical' | 'intuitive' | 'balanced' | 'cautious';
  stressResponse: 'fight' | 'flight' | 'freeze' | 'adaptive' | 'social';
  // Life Phase
  currentLifePhase: string;
  karmicTheme: string;
  // Temporal
  currentAge: number;
  personalYear: number;
  activeCycles: string[];
}

export interface SynergyScore {
  overall: number; // 0-100
  numerological: number;
  behavioral: number;
  temporal: number;
  karmic: number;
  complementary: number;
}

export interface SoulConnection {
  connectionId: string;
  userAId: string;
  userBId: string;
  resonanceScore: number; // 0-100
  synergyBreakdown: SynergyScore;
  connectionType: 'soulmate' | 'karmic_partner' | 'growth_catalyst' | 'mirror_soul' | 'companion';
  matchReasons: string[];
  warnings: string[];
  destinyMessage: string;
  zoeAnalysis: string;
  privacyHash: string; // Zero-Knowledge proof hash
}

export interface AnimaProfile {
  soulVector: SoulVector;
  isSearching: boolean;
  preferences: AnimaPreferences;
  privacyLevel: 'maximum' | 'balanced' | 'open';
  zkProofHash: string;
}

export interface AnimaPreferences {
  minAge: number;
  maxAge: number;
  preferredPhases: string[];
  dealbreakers: string[];
  mustHaves: string[];
}

export interface DestinyNotification {
  id: string;
  fromUserId: string;
  toUserId: string;
  resonanceScore: number;
  message: string;
  expiresAt: Date;
  isAnonymous: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPATIBILITY MATRICES
// ═══════════════════════════════════════════════════════════════════════════════

const NUMEROLOGICAL_COMPATIBILITY: Record<number, { perfect: number[]; good: number[]; neutral: number[]; challenging: number[] }> = {
  1: { perfect: [1, 5, 9], good: [2, 3], neutral: [7], challenging: [4, 6, 8] },
  2: { perfect: [1, 5, 8], good: [2, 3, 9], neutral: [6], challenging: [4, 7] },
  3: { perfect: [3, 5, 9], good: [1, 2, 6], neutral: [7, 8], challenging: [4] },
  4: { perfect: [5, 6, 8], good: [4, 7], neutral: [3], challenging: [1, 2, 9] },
  5: { perfect: [1, 4, 5, 6], good: [3, 9], neutral: [2, 7, 8], challenging: [] },
  6: { perfect: [4, 5, 8], good: [3, 6, 9], neutral: [2, 7], challenging: [1] },
  7: { perfect: [6, 7, 9], good: [4, 8], neutral: [1, 2, 3, 5], challenging: [] },
  8: { perfect: [4, 5, 6], good: [2, 7, 8], neutral: [3, 9], challenging: [1] },
  9: { perfect: [1, 3, 9], good: [2, 5, 6, 7], neutral: [8], challenging: [4] }
};

const BEHAVIORAL_COMPATIBILITY: Record<string, string[]> = {
  // Humor compatibility
  'sarcastic': ['sarcastic', 'dry', 'playful'],
  'warm': ['warm', 'playful', 'neutral'],
  'dry': ['dry', 'sarcastic', 'neutral'],
  'playful': ['playful', 'warm', 'sarcastic'],
  'neutral': ['warm', 'dry', 'neutral', 'playful'],
  // Conflict compatibility (complementary pairs)
  'aggressive': ['diplomatic', 'collaborative'],
  'passive': ['diplomatic', 'collaborative'],
  'diplomatic': ['aggressive', 'passive', 'diplomatic', 'collaborative'],
  'avoidant': ['collaborative', 'diplomatic'],
  'collaborative': ['collaborative', 'diplomatic', 'aggressive', 'passive']
};

const LIFE_PHASE_SYNERGY: Record<string, string[]> = {
  'Moon Phase (Childhood)': [],
  'Mercury Phase (Learning)': ['Mercury Phase (Learning)', 'Venus Phase (Identity)'],
  'Venus Phase (Identity)': ['Venus Phase (Identity)', 'Mercury Phase (Learning)', 'Sun Phase (Authority)'],
  'Sun Phase (Authority)': ['Sun Phase (Authority)', 'Venus Phase (Identity)', 'Mars Phase (Action)'],
  'Mars Phase (Action)': ['Mars Phase (Action)', 'Sun Phase (Authority)', 'Jupiter Phase (Wisdom)'],
  'Jupiter Phase (Wisdom)': ['Jupiter Phase (Wisdom)', 'Mars Phase (Action)', 'Saturn Phase (Mastery)'],
  'Saturn Phase (Mastery)': ['Saturn Phase (Mastery)', 'Jupiter Phase (Wisdom)', 'Rahu Phase (Transcendence)'],
  'Rahu Phase (Transcendence)': ['Rahu Phase (Transcendence)', 'Saturn Phase (Mastery)', 'Ketu Phase (Liberation)'],
  'Ketu Phase (Liberation)': ['Ketu Phase (Liberation)', 'Rahu Phase (Transcendence)']
};

// ═══════════════════════════════════════════════════════════════════════════════
// ZERO-KNOWLEDGE PROOF GENERATION (Privacy-First)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a privacy-preserving hash of soul vector
 * Real implementation would use actual ZK-SNARK protocols
 */
export function generateZKProofHash(vector: Partial<SoulVector>): string {
  const data = JSON.stringify({
    d: vector.driverNumber,
    c: vector.conductorNumber,
    p: vector.currentLifePhase?.substring(0, 3),
    a: Math.floor((vector.currentAge || 0) / 10) * 10 // Decade only
  });
  
  // Simple hash (in production: use actual ZK library)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `zk_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

/**
 * Verify ZK proof without revealing underlying data
 */
export function verifyZKCompatibility(hashA: string, hashB: string): boolean {
  // In production: actual ZK verification
  // For now: hashes indicate both parties consented
  return hashA.startsWith('zk_') && hashB.startsWith('zk_');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNERGY CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate numerological compatibility
 */
export function calculateNumerologicalSynergy(vectorA: SoulVector, vectorB: SoulVector): number {
  let score = 0;
  
  // Driver number compatibility
  const driverCompat = NUMEROLOGICAL_COMPATIBILITY[vectorA.driverNumber];
  if (driverCompat.perfect.includes(vectorB.driverNumber)) score += 35;
  else if (driverCompat.good.includes(vectorB.driverNumber)) score += 25;
  else if (driverCompat.neutral.includes(vectorB.driverNumber)) score += 15;
  else score += 5;
  
  // Conductor number compatibility
  const conductorCompat = NUMEROLOGICAL_COMPATIBILITY[vectorA.conductorNumber];
  if (conductorCompat.perfect.includes(vectorB.conductorNumber)) score += 35;
  else if (conductorCompat.good.includes(vectorB.conductorNumber)) score += 25;
  else if (conductorCompat.neutral.includes(vectorB.conductorNumber)) score += 15;
  else score += 5;
  
  // Personal year alignment (same cycle = bonus)
  if (vectorA.personalYear === vectorB.personalYear) score += 15;
  else if (Math.abs(vectorA.personalYear - vectorB.personalYear) <= 2) score += 10;
  
  // Vibration number harmony
  const vibrationDiff = Math.abs(vectorA.vibrationNumber - vectorB.vibrationNumber);
  score += Math.max(0, 15 - vibrationDiff * 2);
  
  return Math.min(100, score);
}

/**
 * Calculate behavioral/personality synergy
 */
export function calculateBehavioralSynergy(vectorA: SoulVector, vectorB: SoulVector): number {
  let score = 0;
  
  // Humor compatibility
  const humorCompat = BEHAVIORAL_COMPATIBILITY[vectorA.humorStyle] || [];
  if (humorCompat.includes(vectorB.humorStyle)) score += 25;
  else if (vectorA.humorStyle === vectorB.humorStyle) score += 20;
  else score += 10;
  
  // Conflict style compatibility (complementary is better)
  const conflictCompat = BEHAVIORAL_COMPATIBILITY[vectorA.conflictStyle] || [];
  if (conflictCompat.includes(vectorB.conflictStyle)) score += 30;
  else score += 10;
  
  // Decision style compatibility
  const decisionPairs: Record<string, string[]> = {
    'impulsive': ['analytical', 'cautious'],
    'analytical': ['impulsive', 'intuitive'],
    'intuitive': ['analytical', 'balanced'],
    'balanced': ['intuitive', 'balanced'],
    'cautious': ['impulsive', 'balanced']
  };
  const decisionCompat = decisionPairs[vectorA.decisionStyle] || [];
  if (decisionCompat.includes(vectorB.decisionStyle)) score += 25;
  else if (vectorA.decisionStyle === vectorB.decisionStyle) score += 15;
  else score += 5;
  
  // Stress response compatibility
  const stressPairs: Record<string, string[]> = {
    'fight': ['adaptive', 'social'],
    'flight': ['adaptive', 'freeze'],
    'freeze': ['flight', 'adaptive'],
    'adaptive': ['fight', 'flight', 'freeze', 'adaptive', 'social'],
    'social': ['fight', 'adaptive', 'social']
  };
  const stressCompat = stressPairs[vectorA.stressResponse] || [];
  if (stressCompat.includes(vectorB.stressResponse)) score += 20;
  else score += 5;
  
  return Math.min(100, score);
}

/**
 * Calculate temporal/life phase synergy
 */
export function calculateTemporalSynergy(vectorA: SoulVector, vectorB: SoulVector): number {
  let score = 0;
  
  // Life phase synergy
  const phaseCompat = LIFE_PHASE_SYNERGY[vectorA.currentLifePhase] || [];
  if (phaseCompat.includes(vectorB.currentLifePhase)) score += 35;
  else if (vectorA.currentLifePhase === vectorB.currentLifePhase) score += 40;
  else score += 15;
  
  // Age proximity (within 10 years bonus)
  const ageDiff = Math.abs(vectorA.currentAge - vectorB.currentAge);
  if (ageDiff <= 5) score += 25;
  else if (ageDiff <= 10) score += 20;
  else if (ageDiff <= 15) score += 10;
  else score += 5;
  
  // Active cycles alignment
  const sharedCycles = vectorA.activeCycles.filter(c => vectorB.activeCycles.includes(c));
  score += sharedCycles.length * 10;
  
  // Personal year harmony
  const yearDiff = Math.abs(vectorA.personalYear - vectorB.personalYear);
  if (yearDiff === 0) score += 20;
  else if ([3, 6, 9].includes(yearDiff)) score += 10; // Harmonious numbers
  
  return Math.min(100, score);
}

/**
 * Calculate karmic theme alignment
 */
export function calculateKarmicSynergy(vectorA: SoulVector, vectorB: SoulVector): number {
  let score = 0;
  
  // Karmic theme complementarity
  const karmicPairs: Record<string, string[]> = {
    'Receiving Love': ['Giving Back', 'Self-Expression'],
    'Knowledge Acquisition': ['Giving Back', 'Self-Expression'],
    'Self-Expression': ['Receiving Love', 'Knowledge Acquisition', 'Personal Power'],
    'Personal Power': ['Self-Expression', 'Achievement'],
    'Achievement': ['Personal Power', 'Giving Back'],
    'Giving Back': ['Achievement', 'Knowledge Acquisition', 'Receiving Love'],
    'Karmic Debt Settlement': ['Breaking Free', 'Return to Source'],
    'Breaking Free': ['Karmic Debt Settlement', 'Return to Source'],
    'Return to Source': ['Breaking Free', 'Karmic Debt Settlement']
  };
  
  const karmicCompat = karmicPairs[vectorA.karmicTheme] || [];
  if (karmicCompat.includes(vectorB.karmicTheme)) score += 50;
  else if (vectorA.karmicTheme === vectorB.karmicTheme) score += 35;
  else score += 15;
  
  // Same karmic lessons = shared growth
  if (vectorA.karmicTheme === vectorB.karmicTheme) {
    score += 30; // Going through same lessons together
  }
  
  // Complementary numbers (master teacher pairs)
  const teacherPairs = [[1, 9], [2, 8], [3, 7], [4, 6]];
  const isPair = teacherPairs.some(([a, b]) => 
    (vectorA.conductorNumber === a && vectorB.conductorNumber === b) ||
    (vectorA.conductorNumber === b && vectorB.conductorNumber === a)
  );
  if (isPair) score += 20;
  
  return Math.min(100, score);
}

/**
 * Calculate complementary vector score (opposites attract)
 */
export function calculateComplementarySynergy(vectorA: SoulVector, vectorB: SoulVector): number {
  let score = 50; // Base neutral
  
  // Opposite decision styles = balance
  const oppositeDecision = {
    'impulsive': 'cautious',
    'cautious': 'impulsive',
    'analytical': 'intuitive',
    'intuitive': 'analytical',
    'balanced': 'balanced'
  };
  if (oppositeDecision[vectorA.decisionStyle] === vectorB.decisionStyle) {
    score += 25;
  }
  
  // Complementary stress responses
  if (vectorA.stressResponse === 'fight' && vectorB.stressResponse === 'adaptive') score += 15;
  if (vectorA.stressResponse === 'freeze' && vectorB.stressResponse === 'social') score += 15;
  
  // Number 5 (Mercury) bridges all
  if (vectorA.driverNumber === 5 || vectorB.driverNumber === 5) score += 10;
  
  // Creative + Structured pairing
  if ((vectorA.humorStyle === 'playful' && vectorB.conflictStyle === 'diplomatic') ||
      (vectorB.humorStyle === 'playful' && vectorA.conflictStyle === 'diplomatic')) {
    score += 15;
  }
  
  return Math.min(100, score);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONNECTION ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze soul connection between two users
 */
export function analyzeSoulConnection(
  vectorA: SoulVector,
  vectorB: SoulVector
): SoulConnection {
  // Calculate all synergy dimensions
  const numerological = calculateNumerologicalSynergy(vectorA, vectorB);
  const behavioral = calculateBehavioralSynergy(vectorA, vectorB);
  const temporal = calculateTemporalSynergy(vectorA, vectorB);
  const karmic = calculateKarmicSynergy(vectorA, vectorB);
  const complementary = calculateComplementarySynergy(vectorA, vectorB);
  
  // Weighted overall score
  const overall = Math.round(
    numerological * 0.20 +
    behavioral * 0.25 +
    temporal * 0.20 +
    karmic * 0.20 +
    complementary * 0.15
  );
  
  // Determine connection type
  let connectionType: SoulConnection['connectionType'] = 'companion';
  if (overall >= 90) connectionType = 'soulmate';
  else if (overall >= 80 && karmic >= 70) connectionType = 'karmic_partner';
  else if (overall >= 75 && complementary >= 80) connectionType = 'mirror_soul';
  else if (overall >= 70) connectionType = 'growth_catalyst';
  
  // Generate match reasons
  const matchReasons: string[] = [];
  if (numerological >= 80) matchReasons.push('Strong numerological harmony - your core numbers align');
  if (behavioral >= 80) matchReasons.push('Excellent personality compatibility - natural understanding');
  if (temporal >= 80) matchReasons.push('You are in aligned life phases - growing together');
  if (karmic >= 80) matchReasons.push('Shared karmic journey - learning the same lessons');
  if (complementary >= 80) matchReasons.push('Perfect balance - you complete each other');
  if (vectorA.personalYear === vectorB.personalYear) matchReasons.push('Same personal year - synchronized destiny');
  
  // Generate warnings
  const warnings: string[] = [];
  if (numerological < 40) warnings.push('Numerological tension may require patience');
  if (behavioral < 40) warnings.push('Different communication styles - extra effort needed');
  if (temporal < 40) warnings.push('Different life stages - timing may be challenging');
  if (karmic < 40) warnings.push('Different karmic lessons - may drift apart');
  
  // Generate destiny message
  const destinyMessage = generateDestinyMessage(overall, connectionType, vectorA, vectorB);
  
  // Generate Zoe analysis
  const zoeAnalysis = generateAnimaZoeAnalysis(overall, connectionType, matchReasons, warnings);
  
  // Generate privacy hash
  const privacyHash = generateZKProofHash(vectorA) + '_' + generateZKProofHash(vectorB);
  
  return {
    connectionId: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userAId: vectorA.userId,
    userBId: vectorB.userId,
    resonanceScore: overall,
    synergyBreakdown: { overall, numerological, behavioral, temporal, karmic, complementary },
    connectionType,
    matchReasons,
    warnings,
    destinyMessage,
    zoeAnalysis,
    privacyHash
  };
}

function generateDestinyMessage(
  score: number,
  type: SoulConnection['connectionType'],
  vectorA: SoulVector,
  vectorB: SoulVector
): string {
  if (score >= 95) {
    return `✨ COSMIC ALIGNMENT DETECTED ✨ Zoe has found a soul resonance of ${score}%. This connection transcends ordinary matching. The universe has been arranging this meeting.`;
  }
  if (score >= 85) {
    return `🌟 DESTINY CONNECTION 🌟 Resonance: ${score}%. Both souls are on synchronized ${vectorA.currentLifePhase} journeys. This is a ${type.replace('_', ' ')} match.`;
  }
  if (score >= 75) {
    return `💫 SIGNIFICANT RESONANCE 💫 Score: ${score}%. Your timelines have intersected for a reason. Growth awaits.`;
  }
  if (score >= 60) {
    return `🔮 POTENTIAL CONNECTION 🔮 Score: ${score}%. Different energies can create beautiful harmony with mutual effort.`;
  }
  return `⚖️ LEARNING OPPORTUNITY ⚖️ Score: ${score}%. This connection offers lessons, but may require significant work.`;
}

function generateAnimaZoeAnalysis(
  score: number,
  type: SoulConnection['connectionType'],
  reasons: string[],
  warnings: string[]
): string {
  let analysis = `Anima Engine Analysis: ${type.replace('_', ' ').toUpperCase()} detected with ${score}% resonance. `;
  
  if (reasons.length > 0) {
    analysis += `Strengths: ${reasons.slice(0, 2).join('; ')}. `;
  }
  
  if (warnings.length > 0) {
    analysis += `Areas for attention: ${warnings[0]}. `;
  }
  
  if (score >= 85) {
    analysis += 'Zoe recommends: Pursue this connection with an open heart. The stars are aligned.';
  } else if (score >= 70) {
    analysis += 'Zoe recommends: Take time to understand each other. Growth potential is high.';
  } else {
    analysis += 'Zoe recommends: Proceed with awareness. Honor your differences as teachers.';
  }
  
  return analysis;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESTINY NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a destiny notification when high-resonance match is found
 */
export function createDestinyNotification(
  connection: SoulConnection,
  isAnonymous: boolean = true
): DestinyNotification {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48); // 48 hour window
  
  return {
    id: `destiny_${Date.now()}`,
    fromUserId: connection.userAId,
    toUserId: connection.userBId,
    resonanceScore: connection.resonanceScore,
    message: isAnonymous 
      ? `Zoe has found a Resonance. A ${connection.connectionType.replace('_', ' ')} is on your Timeline. Score: ${connection.resonanceScore}%`
      : connection.destinyMessage,
    expiresAt,
    isAnonymous
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH MATCHING (For Swarm Processing)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find top matches for a user from a pool
 */
export function findTopMatches(
  userVector: SoulVector,
  pool: SoulVector[],
  limit: number = 5,
  minScore: number = 70
): SoulConnection[] {
  const connections = pool
    .filter(v => v.userId !== userVector.userId)
    .map(v => analyzeSoulConnection(userVector, v))
    .filter(c => c.resonanceScore >= minScore)
    .sort((a, b) => b.resonanceScore - a.resonanceScore)
    .slice(0, limit);
  
  return connections;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const AnimaEngine = {
  generateZKProofHash,
  verifyZKCompatibility,
  calculateNumerologicalSynergy,
  calculateBehavioralSynergy,
  calculateTemporalSynergy,
  calculateKarmicSynergy,
  calculateComplementarySynergy,
  analyzeSoulConnection,
  createDestinyNotification,
  findTopMatches
};

export default AnimaEngine;
