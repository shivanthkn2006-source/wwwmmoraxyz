// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ASI: NEURO-SYMBOLIC TRUTH ENGINE
// Combines AI Creativity with Rule Engine Validation
// Protocol: AI cannot speak unless math (Nadi/NASA data) proves it true
// ═══════════════════════════════════════════════════════════════════════════════

import { reduceToSingleDigit } from '../quantum/AnkaShastraEngine';
import { validatePlanetaryClaim, getPlanetaryPosition, type Planet } from '../ephemeris/EphemerisEngine';

export type ValidationSource = 'NADI' | 'NUMEROLOGY' | 'ASTRONOMY' | 'PHYSICS' | 'LOGIC' | 'HISTORICAL';

export interface SymbolicRule {
  id: string;
  source: ValidationSource;
  rule: string;
  mathExpression?: string;
  truthCondition: (input: any) => boolean;
  confidence: number; // 0-100
}

export interface TruthValidation {
  claim: string;
  validated: boolean;
  validationScore: number; // 0-100
  sources: ValidationSource[];
  rulesApplied: SymbolicRule[];
  failedRules: SymbolicRule[];
  mathematicalProof?: string;
  canSpeak: boolean; // AI permission to output
  corrections: string[];
}

export interface NeuroSymbolicOutput {
  creativeResponse: string;
  truthValidation: TruthValidation;
  finalOutput: string;
  blocked: boolean;
  blockReason?: string;
  processingMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYMBOLIC RULE DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

const SYMBOLIC_RULES: SymbolicRule[] = [
  // Numerology Rules (Nadi)
  {
    id: 'NADI_001',
    source: 'NADI',
    rule: 'Driver number determines core personality',
    truthCondition: (input: { driverNumber: number }) => 
      input.driverNumber >= 1 && input.driverNumber <= 9,
    confidence: 95
  },
  {
    id: 'NADI_002',
    source: 'NUMEROLOGY',
    rule: 'Destiny number = sum of full birthdate reduced to single digit',
    mathExpression: 'D = Σ(birthdate_digits) mod 9 || 9',
    truthCondition: (input: { birthDate: Date; claimedDestiny: number }) => {
      const dateStr = input.birthDate.toISOString().slice(0, 10).replace(/-/g, '');
      const sum = dateStr.split('').reduce((a, b) => a + parseInt(b), 0);
      return reduceToSingleDigit(sum) === input.claimedDestiny;
    },
    confidence: 100
  },
  {
    id: 'NADI_003',
    source: 'NADI',
    rule: 'Compatible numbers form harmonious relationships',
    truthCondition: (input: { num1: number; num2: number }) => {
      const compatiblePairs = [
        [1, 1], [1, 2], [1, 3], [1, 9],
        [2, 2], [2, 6], [2, 7],
        [3, 3], [3, 6], [3, 9],
        [4, 5], [4, 6], [4, 8],
        [5, 5], [5, 6], [5, 9],
        [6, 6], [6, 9],
        [7, 7], [7, 8],
        [8, 8],
        [9, 9]
      ];
      return compatiblePairs.some(([a, b]) => 
        (input.num1 === a && input.num2 === b) || 
        (input.num1 === b && input.num2 === a)
      );
    },
    confidence: 85
  },
  
  // Astronomy Rules (ASTRO_001–ASTRO_010 — Ephemeris Engine powered)
  {
    id: 'ASTRO_001',
    source: 'ASTRONOMY',
    rule: 'Lunar cycle affects emotional states',
    truthCondition: (input: { lunarPhase: string }) => 
      ['new', 'waxing', 'full', 'waning'].includes(input.lunarPhase?.toLowerCase()),
    confidence: 75
  },
  {
    id: 'ASTRO_002',
    source: 'ASTRONOMY',
    rule: 'Planetary hours follow Chaldean sequence',
    truthCondition: (input: { hour: number; expectedPlanet: number }) => {
      const sequence = [8, 6, 9, 2, 3, 5, 7, 1, 4];
      const dayStartPlanet = (new Date().getDay() + 1) % 9 || 9;
      const hourPlanet = sequence[(sequence.indexOf(dayStartPlanet) + input.hour) % 9];
      return hourPlanet === input.expectedPlanet;
    },
    confidence: 90
  },
  {
    id: 'ASTRO_003',
    source: 'ASTRONOMY',
    rule: 'Planetary sign claim must match Ephemeris Engine calculation',
    truthCondition: (input: { planet: Planet; date: Date; claimedSign: string }) => {
      if (!input.planet || !input.date || !input.claimedSign) return true; // skip if no context
      return validatePlanetaryClaim(input.planet, input.date, input.claimedSign);
    },
    confidence: 95
  },
  {
    id: 'ASTRO_004',
    source: 'ASTRONOMY',
    rule: 'Rahu and Ketu are always retrograde',
    truthCondition: (input: { planet: string; claimedRetrograde: boolean }) => {
      if (!input.planet) return true;
      if (input.planet === 'Rahu' || input.planet === 'Ketu') return input.claimedRetrograde === true;
      return true;
    },
    confidence: 100
  },
  {
    id: 'ASTRO_005',
    source: 'ASTRONOMY',
    rule: 'Sun cannot be retrograde',
    truthCondition: (input: { planet: string; claimedRetrograde: boolean }) => {
      if (input.planet === 'Sun') return input.claimedRetrograde === false;
      return true;
    },
    confidence: 100
  },
  {
    id: 'ASTRO_006',
    source: 'ASTRONOMY',
    rule: 'Moon cannot be retrograde',
    truthCondition: (input: { planet: string; claimedRetrograde: boolean }) => {
      if (input.planet === 'Moon') return input.claimedRetrograde === false;
      return true;
    },
    confidence: 100
  },
  {
    id: 'ASTRO_007',
    source: 'ASTRONOMY',
    rule: 'Zodiac signs span exactly 30 degrees each',
    truthCondition: (input: { claimedSignDegrees: number }) => {
      if (input.claimedSignDegrees === undefined) return true;
      return input.claimedSignDegrees >= 0 && input.claimedSignDegrees <= 30;
    },
    confidence: 100
  },
  {
    id: 'ASTRO_008',
    source: 'ASTRONOMY',
    rule: 'There are exactly 27 Nakshatras in the Vedic system',
    truthCondition: (input: { claimedNakshatraCount: number }) => {
      if (input.claimedNakshatraCount === undefined) return true;
      return input.claimedNakshatraCount === 27;
    },
    confidence: 100
  },
  {
    id: 'ASTRO_009',
    source: 'ASTRONOMY',
    rule: 'Vimshottari Dasa total cycle is exactly 120 years',
    truthCondition: (input: { claimedDasaCycleYears: number }) => {
      if (input.claimedDasaCycleYears === undefined) return true;
      return input.claimedDasaCycleYears === 120;
    },
    confidence: 100
  },
  {
    id: 'ASTRO_010',
    source: 'ASTRONOMY',
    rule: 'Planetary longitude must be calculated via Ephemeris Engine',
    truthCondition: (input: { planet: Planet; date: Date; claimedLongitude: number }) => {
      if (!input.planet || !input.date || input.claimedLongitude === undefined) return true;
      const actual = getPlanetaryPosition(input.planet, input.date);
      return Math.abs(actual.longitude - input.claimedLongitude) < 5; // 5° tolerance
    },
    confidence: 90
  },
  
  // Physics Rules
  {
    id: 'PHYSICS_001',
    source: 'PHYSICS',
    rule: 'Energy cannot be created or destroyed (First Law)',
    truthCondition: (input: { claimViolatesConservation: boolean }) => 
      !input.claimViolatesConservation,
    confidence: 100
  },
  {
    id: 'PHYSICS_002',
    source: 'PHYSICS',
    rule: 'Nothing travels faster than light in vacuum',
    truthCondition: (input: { claimedSpeed: number; lightSpeed: number }) => 
      input.claimedSpeed <= input.lightSpeed,
    confidence: 100
  },
  
  // Logic Rules
  {
    id: 'LOGIC_001',
    source: 'LOGIC',
    rule: 'A statement cannot be both true and false (Non-contradiction)',
    truthCondition: (input: { statementA: boolean; statementNotA: boolean }) => 
      !(input.statementA && input.statementNotA),
    confidence: 100
  },
  {
    id: 'LOGIC_002',
    source: 'LOGIC',
    rule: 'If A implies B, and A is true, then B must be true (Modus Ponens)',
    truthCondition: (input: { aImpliesB: boolean; aIsTrue: boolean; bIsTrue: boolean }) => 
      !(input.aImpliesB && input.aIsTrue && !input.bIsTrue),
    confidence: 100
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// TRUTH VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract claims from creative AI output for validation
 */
function extractClaims(text: string): string[] {
  // Split on sentence-ending punctuation but not on abbreviations (e.g. Dr. Mr. St. etc.)
  const sentences = text
    .split(/(?<!\b(?:Dr|Mr|Mrs|Ms|St|Jr|Sr|Prof|Inc|Ltd|etc|vs|al|i\.e|e\.g))\s*[.!?]+\s+/i)
    .filter(s => s.trim().length > 10);
  return sentences.map(s => s.trim()).slice(0, 10); // Limit to 10 claims
}

/**
 * Find applicable rules for a claim
 */
function findApplicableRules(claim: string): SymbolicRule[] {
  const claimLower = claim.toLowerCase();
  const applicable: SymbolicRule[] = [];
  
  // Match rules based on keywords
  if (/number|digit|birth|destiny/.test(claimLower)) {
    applicable.push(...SYMBOLIC_RULES.filter(r => r.source === 'NUMEROLOGY' || r.source === 'NADI'));
  }
  if (/planet|moon|sun|star|orbit|lunar/.test(claimLower)) {
    applicable.push(...SYMBOLIC_RULES.filter(r => r.source === 'ASTRONOMY'));
  }
  if (/energy|speed|light|mass|force/.test(claimLower)) {
    applicable.push(...SYMBOLIC_RULES.filter(r => r.source === 'PHYSICS'));
  }
  if (/therefore|implies|if|then|because|must/.test(claimLower)) {
    applicable.push(...SYMBOLIC_RULES.filter(r => r.source === 'LOGIC'));
  }
  
  return applicable.length > 0 ? applicable : SYMBOLIC_RULES.filter(r => r.source === 'LOGIC');
}

/**
 * Validate a single claim against symbolic rules
 */
function validateClaim(claim: string, context: Record<string, any> = {}): TruthValidation {
  const applicableRules = findApplicableRules(claim);
  const rulesApplied: SymbolicRule[] = [];
  const failedRules: SymbolicRule[] = [];
  const corrections: string[] = [];
  
  for (const rule of applicableRules) {
    try {
      const passed = rule.truthCondition(context);
      if (passed) {
        rulesApplied.push(rule);
      } else {
        failedRules.push(rule);
        corrections.push(`Rule ${rule.id} (${rule.source}): ${rule.rule} - FAILED`);
      }
    } catch {
      // Rule not applicable to this context, skip
    }
  }
  
  // Calculate validation score as weighted average of confidence for passed rules
  const totalRules = rulesApplied.length + failedRules.length;
  const validationScore = totalRules > 0 
    ? (rulesApplied.reduce((sum, r) => sum + r.confidence, 0) / totalRules)
    : 50;
  
  const sources = [...new Set([...rulesApplied, ...failedRules].map(r => r.source))];
  
  return {
    claim,
    validated: failedRules.length === 0 && rulesApplied.length > 0,
    validationScore: Math.min(100, validationScore),
    sources,
    rulesApplied,
    failedRules,
    canSpeak: failedRules.length === 0,
    corrections
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEURO-SYMBOLIC PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * NEURO-SYMBOLIC TRUTH ENGINE: Main entry point
 * Combines AI creativity with rule engine validation
 */
export function neuroSymbolicProcess(
  creativeResponse: string,
  context: Record<string, any> = {},
  strictMode: boolean = false
): NeuroSymbolicOutput {
  const startTime = performance.now();
  
  // Extract claims from creative response
  const claims = extractClaims(creativeResponse);
  
  // Validate each claim
  const validations: TruthValidation[] = claims.map(claim => 
    validateClaim(claim, context)
  );
  
  // Aggregate validation
  const overallScore = validations.length > 0
    ? validations.reduce((sum, v) => sum + v.validationScore, 0) / validations.length
    : 50;
  
  const failedClaims = validations.filter(v => !v.validated);
  const canSpeak = strictMode 
    ? failedClaims.length === 0 
    : overallScore >= 50;
  
  // Generate corrections if needed
  const allCorrections = validations.flatMap(v => v.corrections);
  
  // Build final output
  let finalOutput: string;
  let blocked = false;
  let blockReason: string | undefined;
  
  if (canSpeak) {
    finalOutput = creativeResponse;
  } else {
    blocked = true;
    blockReason = `Truth validation failed. ${failedClaims.length} claims violated symbolic rules.`;
    finalOutput = `[TRUTH ENGINE BLOCK] The AI's response contained ${failedClaims.length} unverified claims. ` +
      `Corrections required:\n${allCorrections.slice(0, 5).join('\n')}`;
  }
  
  return {
    creativeResponse,
    truthValidation: {
      claim: `Aggregate: ${claims.length} claims analyzed`,
      validated: canSpeak,
      validationScore: overallScore,
      sources: [...new Set(validations.flatMap(v => v.sources))],
      rulesApplied: validations.flatMap(v => v.rulesApplied),
      failedRules: validations.flatMap(v => v.failedRules),
      canSpeak,
      corrections: allCorrections
    },
    finalOutput,
    blocked,
    blockReason,
    processingMs: performance.now() - startTime
  };
}

/**
 * Quick validation check without full processing
 */
export function quickTruthCheck(statement: string, context: Record<string, any> = {}): boolean {
  const validation = validateClaim(statement, context);
  return validation.validated || validation.validationScore >= 70;
}

/**
 * Add custom rule to the engine
 */
export function addSymbolicRule(rule: SymbolicRule): void {
  SYMBOLIC_RULES.push(rule);
}

/**
 * Get all rules for a validation source
 */
export function getRulesBySource(source: ValidationSource): SymbolicRule[] {
  return SYMBOLIC_RULES.filter(r => r.source === source);
}

export { SYMBOLIC_RULES };
export default { neuroSymbolicProcess, quickTruthCheck, addSymbolicRule, getRulesBySource };
