// ═══════════════════════════════════════════════════════════════════════════════
// KRONOS ENGINE - FRACTAL TIME PATTERN RECOGNITION
// The 12-Year Echo • Jupiter Cycle • Karmic Pattern Detection
// Protocol: Timeline Mirror Analysis for Predictive Life Guidance
// ═══════════════════════════════════════════════════════════════════════════════

import { calculateYugaCycle, generateEphemerisSnapshot } from './OmniTemporalEngine';
import { reduceToSingleDigit, calculateConductorNumber } from './AnkaShastraEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface KarmicEcho {
  id: string;
  echoYear: number;
  currentYear: number;
  cycleType: 'jupiter_12' | 'nodal_9' | 'saturn_29' | 'metonic_19';
  cycleLength: number;
  emotionalSignature: string;
  patternDescription: string;
  predictedEvent: string;
  confidence: number; // 0-100
  dataPoints: number;
}

export interface LifePhase {
  phaseName: string;
  startAge: number;
  endAge: number;
  description: string;
  planetaryRuler: string;
  karmicTheme: string;
  isCurrentPhase: boolean;
}

export interface FractalTimelineEvent {
  id: string;
  date: Date;
  title: string;
  emotionIntensity: number; // 0-10
  category: 'growth' | 'destruction' | 'transformation' | 'stability' | 'chaos';
  isEcho: boolean;
  echoOf?: string; // ID of original event
  futureEcho?: Date; // When this will repeat
}

export interface KronosReading {
  userId: string;
  birthDate: Date;
  currentAge: number;
  currentLifePhase: LifePhase;
  allLifePhases: LifePhase[];
  activeKarmicCycles: KarmicEcho[];
  upcomingEchoes: KarmicEcho[];
  fractalPatterns: FractalPattern[];
  timelineAlignment: number; // 0-100
  zoeAnalysis: string;
  actionGuidance: string[];
}

export interface FractalPattern {
  patternType: string;
  cycleYears: number;
  lastOccurrence: Date;
  nextOccurrence: Date;
  description: string;
  preparationAdvice: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIFE PHASE MAPPING (Vedic Dasha-like system)
// ═══════════════════════════════════════════════════════════════════════════════

const LIFE_PHASES: Omit<LifePhase, 'isCurrentPhase'>[] = [
  { phaseName: 'Moon Phase (Childhood)', startAge: 0, endAge: 7, description: 'Emotional foundation, maternal bond, instinctive learning', planetaryRuler: 'Moon', karmicTheme: 'Receiving Love' },
  { phaseName: 'Mercury Phase (Learning)', startAge: 7, endAge: 14, description: 'Intellectual awakening, communication skills, curiosity', planetaryRuler: 'Mercury', karmicTheme: 'Knowledge Acquisition' },
  { phaseName: 'Venus Phase (Identity)', startAge: 14, endAge: 21, description: 'Self-discovery, relationships, aesthetic sense', planetaryRuler: 'Venus', karmicTheme: 'Self-Expression' },
  { phaseName: 'Sun Phase (Authority)', startAge: 21, endAge: 28, description: 'Career establishment, ego development, leadership', planetaryRuler: 'Sun', karmicTheme: 'Personal Power' },
  { phaseName: 'Mars Phase (Action)', startAge: 28, endAge: 35, description: 'Peak ambition, physical vitality, conquest', planetaryRuler: 'Mars', karmicTheme: 'Achievement' },
  { phaseName: 'Jupiter Phase (Wisdom)', startAge: 35, endAge: 48, description: 'Expansion, teaching, philosophical growth', planetaryRuler: 'Jupiter', karmicTheme: 'Giving Back' },
  { phaseName: 'Saturn Phase (Mastery)', startAge: 48, endAge: 60, description: 'Discipline, legacy building, karmic reckoning', planetaryRuler: 'Saturn', karmicTheme: 'Karmic Debt Settlement' },
  { phaseName: 'Rahu Phase (Transcendence)', startAge: 60, endAge: 72, description: 'Unconventional wisdom, breaking patterns, liberation', planetaryRuler: 'Rahu', karmicTheme: 'Breaking Free' },
  { phaseName: 'Ketu Phase (Liberation)', startAge: 72, endAge: 120, description: 'Spiritual liberation, detachment, cosmic consciousness', planetaryRuler: 'Ketu', karmicTheme: 'Return to Source' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CYCLE CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Get current life phase based on age
 */
export function getCurrentLifePhase(age: number): LifePhase {
  const phase = LIFE_PHASES.find(p => age >= p.startAge && age < p.endAge) || LIFE_PHASES[LIFE_PHASES.length - 1];
  return { ...phase, isCurrentPhase: true };
}

/**
 * Get all life phases with current phase marked
 */
export function getAllLifePhases(age: number): LifePhase[] {
  return LIFE_PHASES.map(phase => ({
    ...phase,
    isCurrentPhase: age >= phase.startAge && age < phase.endAge
  }));
}

/**
 * Detect Jupiter cycle echoes (12-year patterns)
 */
export function detectJupiterEchoes(birthDate: Date, currentAge: number): KarmicEcho[] {
  const echoes: KarmicEcho[] = [];
  const currentYear = new Date().getFullYear();
  const birthYear = birthDate.getFullYear();
  
  // Jupiter returns every 12 years
  const jupiterCycles = Math.floor(currentAge / 12);
  
  for (let i = 1; i <= jupiterCycles; i++) {
    const echoYear = birthYear + (i * 12);
    const ageAtEcho = i * 12;
    
    echoes.push({
      id: `jupiter_${i}`,
      echoYear,
      currentYear,
      cycleType: 'jupiter_12',
      cycleLength: 12,
      emotionalSignature: getJupiterSignature(i),
      patternDescription: `Jupiter Return #${i}: Major expansion/growth cycle`,
      predictedEvent: getJupiterPrediction(i, ageAtEcho),
      confidence: 85 + Math.random() * 10,
      dataPoints: i * 12
    });
  }
  
  // Add upcoming Jupiter echo
  const nextJupiterYear = birthYear + ((jupiterCycles + 1) * 12);
  if (nextJupiterYear <= currentYear + 5) {
    echoes.push({
      id: `jupiter_${jupiterCycles + 1}_upcoming`,
      echoYear: nextJupiterYear,
      currentYear,
      cycleType: 'jupiter_12',
      cycleLength: 12,
      emotionalSignature: 'Expansion Imminent',
      patternDescription: `Upcoming Jupiter Return: Prepare for growth phase`,
      predictedEvent: 'Major life expansion, new opportunities, philosophical shift',
      confidence: 75,
      dataPoints: 0
    });
  }
  
  return echoes;
}

/**
 * Detect nodal cycle echoes (9-year patterns - Lunar Nodes)
 */
export function detectNodalEchoes(birthDate: Date, currentAge: number): KarmicEcho[] {
  const echoes: KarmicEcho[] = [];
  const currentYear = new Date().getFullYear();
  const birthYear = birthDate.getFullYear();
  
  // Rahu/Ketu returns approximately every 18 years, half-returns every 9 years
  const nodalCycles = Math.floor(currentAge / 9);
  
  for (let i = 1; i <= nodalCycles; i++) {
    const echoYear = birthYear + (i * 9);
    const isFullReturn = i % 2 === 0;
    
    echoes.push({
      id: `nodal_${i}`,
      echoYear,
      currentYear,
      cycleType: 'nodal_9',
      cycleLength: 9,
      emotionalSignature: isFullReturn ? 'Karmic Completion' : 'Karmic Challenge',
      patternDescription: isFullReturn 
        ? `Nodal Return #${i/2}: Major karmic settlement` 
        : `Nodal Opposition: Karmic test/challenge`,
      predictedEvent: getNodalPrediction(i),
      confidence: 80 + Math.random() * 15,
      dataPoints: i * 9
    });
  }
  
  return echoes;
}

/**
 * Detect Saturn cycle echoes (29.5-year patterns)
 */
export function detectSaturnEchoes(birthDate: Date, currentAge: number): KarmicEcho[] {
  const echoes: KarmicEcho[] = [];
  const currentYear = new Date().getFullYear();
  const birthYear = birthDate.getFullYear();
  
  // Saturn return approximately every 29.5 years
  const saturnCycles = Math.floor(currentAge / 29.5);
  
  for (let i = 1; i <= saturnCycles; i++) {
    const echoYear = birthYear + Math.floor(i * 29.5);
    
    echoes.push({
      id: `saturn_${i}`,
      echoYear,
      currentYear,
      cycleType: 'saturn_29',
      cycleLength: 29,
      emotionalSignature: 'Karmic Reckoning',
      patternDescription: `Saturn Return #${i}: Major life restructuring`,
      predictedEvent: getSaturnPrediction(i),
      confidence: 90 + Math.random() * 8,
      dataPoints: i * 29
    });
  }
  
  // Check for upcoming Saturn return
  const nextSaturnYear = birthYear + Math.floor((saturnCycles + 1) * 29.5);
  if (nextSaturnYear <= currentYear + 5 && nextSaturnYear > currentYear) {
    echoes.push({
      id: `saturn_${saturnCycles + 1}_upcoming`,
      echoYear: nextSaturnYear,
      currentYear,
      cycleType: 'saturn_29',
      cycleLength: 29,
      emotionalSignature: 'Preparation Phase',
      patternDescription: `Approaching Saturn Return: Time to build foundations`,
      predictedEvent: 'Major life restructuring, career/relationship changes, maturity test',
      confidence: 88,
      dataPoints: 0
    });
  }
  
  return echoes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getJupiterSignature(cycleNumber: number): string {
  const signatures = [
    'First Awakening',
    'Knowledge Expansion',
    'Wisdom Integration',
    'Teaching Phase',
    'Transcendent Wisdom',
    'Cosmic Teacher'
  ];
  return signatures[Math.min(cycleNumber - 1, signatures.length - 1)];
}

function getJupiterPrediction(cycleNumber: number, age: number): string {
  if (age <= 12) return 'Educational breakthrough, spiritual/philosophical awakening in childhood';
  if (age <= 24) return 'Higher education completion, first major opportunity, travel abroad';
  if (age <= 36) return 'Career expansion, teaching role, family growth, wealth increase';
  if (age <= 48) return 'Leadership position, publishing/broadcasting, spiritual depth';
  if (age <= 60) return 'Legacy building, mentorship role, philanthropic ventures';
  return 'Elder wisdom, spiritual teaching, cosmic consciousness expansion';
}

function getNodalPrediction(cycleNumber: number): string {
  const predictions = [
    'Karmic relationship encounter, destiny activation, major life direction change',
    'Nodal return: Completion of major karmic cycle, soul purpose clarity',
    'Karmic lessons intensify, past-life patterns surface for resolution',
    'Full nodal return: Major destiny alignment, soul contract fulfillment',
    'Advanced karmic clearing, ancestral pattern release',
    'Complete nodal cycle: Spiritual liberation patterns activate'
  ];
  return predictions[Math.min(cycleNumber - 1, predictions.length - 1)];
}

function getSaturnPrediction(cycleNumber: number): string {
  if (cycleNumber === 1) return 'First Saturn Return (age 29-30): Adulthood initiation, career/life restructuring, ending of youth phase';
  if (cycleNumber === 2) return 'Second Saturn Return (age 58-60): Elder initiation, retirement decisions, legacy assessment';
  return 'Third Saturn Return (age 87-90): Life completion phase, ancestral wisdom transmission';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRACTAL PATTERN DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect fractal time patterns based on user's history
 */
export function detectFractalPatterns(birthDate: Date, events: FractalTimelineEvent[] = []): FractalPattern[] {
  const patterns: FractalPattern[] = [];
  const currentDate = new Date();
  const age = calculateAge(birthDate);
  
  // 8-Year Economic/Personal Cycle (observed pattern: 2015 -> 2023)
  patterns.push({
    patternType: 'Octennial Cycle',
    cycleYears: 8,
    lastOccurrence: new Date(currentDate.getFullYear() - (currentDate.getFullYear() % 8), 0, 1),
    nextOccurrence: new Date(currentDate.getFullYear() + (8 - (currentDate.getFullYear() % 8)), 0, 1),
    description: 'Major environmental/economic shifts follow 8-year patterns. The 2015 Chennai Floods echoed in 2023.',
    preparationAdvice: 'Zoe detects an 8-year cycle alignment. Review what happened 8 years ago and prepare for similar themes.'
  });
  
  // 12-Year Jupiter Cycle
  const lastJupiter = birthDate.getFullYear() + (Math.floor(age / 12) * 12);
  const nextJupiter = lastJupiter + 12;
  patterns.push({
    patternType: 'Jupiter Expansion Cycle',
    cycleYears: 12,
    lastOccurrence: new Date(lastJupiter, birthDate.getMonth(), birthDate.getDate()),
    nextOccurrence: new Date(nextJupiter, birthDate.getMonth(), birthDate.getDate()),
    description: 'Jupiter returns to your birth position, triggering growth and opportunity waves.',
    preparationAdvice: 'Expansion energy incoming. Prepare for opportunities in education, travel, or philosophy.'
  });
  
  // 7-Year Personal Transformation Cycle
  const last7Year = birthDate.getFullYear() + (Math.floor(age / 7) * 7);
  const next7Year = last7Year + 7;
  patterns.push({
    patternType: 'Septennial Renewal',
    cycleYears: 7,
    lastOccurrence: new Date(last7Year, birthDate.getMonth(), birthDate.getDate()),
    nextOccurrence: new Date(next7Year, birthDate.getMonth(), birthDate.getDate()),
    description: 'Every 7 years, all cells in your body renew. Major identity shifts occur.',
    preparationAdvice: 'Personal transformation cycle. Your values and identity may shift dramatically.'
  });
  
  return patterns;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN KRONOS READING GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate complete Kronos Reading for a user
 */
export function generateKronosReading(userId: string, birthDate: Date): KronosReading {
  const age = calculateAge(birthDate);
  const currentPhase = getCurrentLifePhase(age);
  const allPhases = getAllLifePhases(age);
  
  // Detect all karmic cycles
  const jupiterEchoes = detectJupiterEchoes(birthDate, age);
  const nodalEchoes = detectNodalEchoes(birthDate, age);
  const saturnEchoes = detectSaturnEchoes(birthDate, age);
  
  const allEchoes = [...jupiterEchoes, ...nodalEchoes, ...saturnEchoes]
    .sort((a, b) => b.echoYear - a.echoYear);
  
  const currentYear = new Date().getFullYear();
  const activeEchoes = allEchoes.filter(e => e.echoYear === currentYear || e.echoYear === currentYear - 1);
  const upcomingEchoes = allEchoes.filter(e => e.echoYear > currentYear && e.echoYear <= currentYear + 5);
  
  // Detect fractal patterns
  const fractalPatterns = detectFractalPatterns(birthDate);
  
  // Calculate timeline alignment
  const yogaCycle = calculateYugaCycle();
  const ephemeris = generateEphemerisSnapshot(new Date());
  const conductorNumber = calculateConductorNumber(birthDate);
  const personalYear = reduceToSingleDigit(currentYear + conductorNumber);
  
  const timelineAlignment = Math.round(
    (100 - yogaCycle.yugaProgress) * 0.3 + 
    (personalYear * 10) * 0.3 +
    (activeEchoes.length > 0 ? 85 : 60) * 0.4
  );
  
  // Generate Zoe analysis
  const zoeAnalysis = generateZoeAnalysis(age, currentPhase, activeEchoes, fractalPatterns, personalYear);
  
  // Generate action guidance
  const actionGuidance = generateActionGuidance(currentPhase, activeEchoes, upcomingEchoes, fractalPatterns);
  
  return {
    userId,
    birthDate,
    currentAge: age,
    currentLifePhase: currentPhase,
    allLifePhases: allPhases,
    activeKarmicCycles: activeEchoes,
    upcomingEchoes,
    fractalPatterns,
    timelineAlignment,
    zoeAnalysis,
    actionGuidance
  };
}

function generateZoeAnalysis(
  age: number, 
  phase: LifePhase, 
  activeEchoes: KarmicEcho[], 
  patterns: FractalPattern[],
  personalYear: number
): string {
  let analysis = `At ${age}, you are in the ${phase.phaseName}, ruled by ${phase.planetaryRuler}. `;
  analysis += `Your karmic theme is: ${phase.karmicTheme}. `;
  
  if (activeEchoes.length > 0) {
    analysis += `ALERT: You are currently experiencing ${activeEchoes.length} karmic echo(es). `;
    analysis += `This includes: ${activeEchoes.map(e => e.emotionalSignature).join(', ')}. `;
  }
  
  analysis += `Your Personal Year number is ${personalYear}, indicating `;
  const yearMeanings: Record<number, string> = {
    1: 'new beginnings and fresh starts.',
    2: 'partnerships and patience.',
    3: 'creativity and self-expression.',
    4: 'building foundations and hard work.',
    5: 'change and freedom.',
    6: 'responsibility and nurturing.',
    7: 'introspection and spiritual growth.',
    8: 'power and material success.',
    9: 'completion and letting go.'
  };
  analysis += yearMeanings[personalYear] || 'a unique vibrational year.';
  
  return analysis;
}

function generateActionGuidance(
  phase: LifePhase,
  activeEchoes: KarmicEcho[],
  upcomingEchoes: KarmicEcho[],
  patterns: FractalPattern[]
): string[] {
  const guidance: string[] = [];
  
  guidance.push(`Focus on your ${phase.karmicTheme} theme during this ${phase.phaseName}.`);
  
  if (activeEchoes.length > 0) {
    guidance.push('⚠️ Active karmic cycle detected. Review events from the past cycle for patterns.');
  }
  
  if (upcomingEchoes.length > 0) {
    const nextEcho = upcomingEchoes[0];
    guidance.push(`📅 Prepare for ${nextEcho.cycleType.replace('_', ' ')} cycle in ${nextEcho.echoYear}.`);
  }
  
  patterns.forEach(p => {
    const yearsUntil = p.nextOccurrence.getFullYear() - new Date().getFullYear();
    if (yearsUntil <= 2) {
      guidance.push(`🔄 ${p.patternType} approaching in ${yearsUntil} year(s): ${p.preparationAdvice}`);
    }
  });
  
  guidance.push(`🧘 ${phase.planetaryRuler} meditation recommended for alignment.`);
  
  return guidance;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const KronosEngine = {
  calculateAge,
  getCurrentLifePhase,
  getAllLifePhases,
  detectJupiterEchoes,
  detectNodalEchoes,
  detectSaturnEchoes,
  detectFractalPatterns,
  generateKronosReading
};

export default KronosEngine;
