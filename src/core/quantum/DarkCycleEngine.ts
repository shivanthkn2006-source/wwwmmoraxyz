// ═══════════════════════════════════════════════════════════════════════════════
// DARK CYCLE ENGINE - 33-YEAR TEMPORAL RADAR
// The Wormhole Warning System - Inspired by "Dark" Series + Vedic Cycles
// Protocol: Detect 33-year Metonic cycles, 12-year Jupiter returns, 18-year Nodal returns
// ═══════════════════════════════════════════════════════════════════════════════

import { calculateAge, getCurrentLifePhase } from './KronosEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TemporalEcho {
  id: string;
  cycleType: 'metonic_33' | 'jupiter_12' | 'nodal_18' | 'saturn_29' | 'octennial_8';
  cycleYears: number;
  echoDate: Date;
  currentDate: Date;
  description: string;
  wormholeWarning: string;
  intensity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  daysUntilActivation: number;
}

export interface TriquetralNode {
  position: 'past' | 'present' | 'future';
  date: Date;
  label: string;
  events: string[];
  emotionalSignature: string;
  cycleAlignment: number; // 0-100
}

export interface DarkCycleReading {
  userId: string;
  birthDate: Date;
  currentAge: number;
  
  // The Three Nodes (Triquetra)
  pastNode: TriquetralNode;
  presentNode: TriquetralNode;
  futureNode: TriquetralNode;
  
  // Active Temporal Echoes
  activeEchoes: TemporalEcho[];
  upcomingEchoes: TemporalEcho[];
  
  // Warning System
  currentWarning: DarkCycleWarning | null;
  warningLevel: 'safe' | 'caution' | 'warning' | 'critical';
  
  // Analysis
  temporalAlignment: number; // 0-100
  zoeAnalysis: string;
  preparationAdvice: string[];
}

export interface DarkCycleWarning {
  type: string;
  title: string;
  message: string;
  startDate: Date;
  endDate: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: string[];
}

export interface DashaPeriod {
  name: string;
  ruler: string;
  startAge: number;
  endAge: number;
  theme: string;
  isCurrent: boolean;
  isChallenging: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHA PERIOD DEFINITIONS (Vedic Time Periods)
// ═══════════════════════════════════════════════════════════════════════════════

const DASHA_SEQUENCE: Omit<DashaPeriod, 'isCurrent' | 'isChallenging'>[] = [
  { name: 'Ketu', ruler: 'Ketu', startAge: 0, endAge: 7, theme: 'Karmic Unfolding' },
  { name: 'Venus', ruler: 'Venus', startAge: 7, endAge: 27, theme: 'Material Comfort & Relationships' },
  { name: 'Sun', ruler: 'Sun', startAge: 27, endAge: 33, theme: 'Self-Authority & Recognition' },
  { name: 'Moon', ruler: 'Moon', startAge: 33, endAge: 43, theme: 'Emotional Growth & Intuition' },
  { name: 'Mars', ruler: 'Mars', startAge: 43, endAge: 50, theme: 'Action & Competition' },
  { name: 'Rahu', ruler: 'Rahu', startAge: 50, endAge: 68, theme: 'Worldly Ambition & Obsession' },
  { name: 'Jupiter', ruler: 'Jupiter', startAge: 68, endAge: 84, theme: 'Wisdom & Teaching' },
  { name: 'Saturn', ruler: 'Saturn', startAge: 84, endAge: 103, theme: 'Karmic Completion' },
  { name: 'Mercury', ruler: 'Mercury', startAge: 103, endAge: 120, theme: 'Eternal Youth' },
];

// Challenging Dasha combinations
const CHALLENGING_DASHAS = ['Saturn', 'Rahu', 'Ketu', 'Mars'];

// ═══════════════════════════════════════════════════════════════════════════════
// CYCLE CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate 33-year Metonic cycle echoes (Solar-Lunar sync from "Dark")
 * @param birthDate - User's birth date
 * @param yearOffset - Optional year offset for time travel (e.g., -10 for 10 years ago)
 */
export function calculateMetonicEchoes(birthDate: Date, yearOffset: number = 0): TemporalEcho[] {
  const echoes: TemporalEcho[] = [];
  const realToday = new Date();
  const today = yearOffset !== 0 
    ? new Date(realToday.getFullYear() + yearOffset, realToday.getMonth(), realToday.getDate())
    : realToday;
  const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const currentYear = today.getFullYear();
  
  // 33-year cycle - the "Dark" wormhole cycle
  const metonicCycles = Math.floor(age / 33);
  
  for (let i = 1; i <= metonicCycles + 1; i++) {
    const echoYear = birthDate.getFullYear() + (i * 33);
    const echoDate = new Date(echoYear, birthDate.getMonth(), birthDate.getDate());
    const daysUntil = Math.floor((echoDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isActive = daysUntil >= -365 && daysUntil <= 365;
    
    echoes.push({
      id: `metonic_${i}`,
      cycleType: 'metonic_33',
      cycleYears: 33,
      echoDate,
      currentDate: today,
      description: `33-Year Cosmic Reset #${i}: The same lunar-solar alignment as ${echoYear - 33}`,
      wormholeWarning: `Time is circular. What happened in ${echoYear - 33} echoes now.`,
      intensity: isActive ? 'high' : 'medium',
      isActive,
      daysUntilActivation: daysUntil
    });
  }
  
  return echoes;
}

/**
 * Calculate 12-year Jupiter Return echoes
 */
export function calculateJupiterReturns(birthDate: Date, yearOffset: number = 0): TemporalEcho[] {
  const echoes: TemporalEcho[] = [];
  const realToday = new Date();
  const today = yearOffset !== 0 
    ? new Date(realToday.getFullYear() + yearOffset, realToday.getMonth(), realToday.getDate())
    : realToday;
  const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  
  const jupiterCycles = Math.floor(age / 12) + 1;
  
  for (let i = 1; i <= jupiterCycles; i++) {
    const echoYear = birthDate.getFullYear() + (i * 12);
    const echoDate = new Date(echoYear, birthDate.getMonth(), birthDate.getDate());
    const daysUntil = Math.floor((echoDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isActive = daysUntil >= -180 && daysUntil <= 180;
    
    echoes.push({
      id: `jupiter_${i}`,
      cycleType: 'jupiter_12',
      cycleYears: 12,
      echoDate,
      currentDate: today,
      description: `Jupiter Return #${i}: Expansion and opportunity wave`,
      wormholeWarning: `Jupiter is returning to your birth position. Prepare for growth.`,
      intensity: isActive ? 'high' : 'low',
      isActive,
      daysUntilActivation: daysUntil
    });
  }
  
  return echoes;
}

/**
 * Calculate 18-year Nodal Return echoes (Rahu-Ketu)
 */
export function calculateNodalReturns(birthDate: Date, yearOffset: number = 0): TemporalEcho[] {
  const echoes: TemporalEcho[] = [];
  const realToday = new Date();
  const today = yearOffset !== 0 
    ? new Date(realToday.getFullYear() + yearOffset, realToday.getMonth(), realToday.getDate())
    : realToday;
  const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  
  const nodalCycles = Math.floor(age / 18.6) + 1;
  
  for (let i = 1; i <= nodalCycles; i++) {
    const echoYear = birthDate.getFullYear() + Math.round(i * 18.6);
    const echoDate = new Date(echoYear, birthDate.getMonth(), birthDate.getDate());
    const daysUntil = Math.floor((echoDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isActive = daysUntil >= -270 && daysUntil <= 270;
    
    echoes.push({
      id: `nodal_${i}`,
      cycleType: 'nodal_18',
      cycleYears: 18,
      echoDate,
      currentDate: today,
      description: `Nodal Return #${i}: Karmic axis realignment`,
      wormholeWarning: `The Nodes are flipping. Destiny shift similar to ${echoYear - 18}.`,
      intensity: isActive ? 'critical' : 'medium',
      isActive,
      daysUntilActivation: daysUntil
    });
  }
  
  return echoes;
}

/**
 * Calculate 8-year Octennial cycle (Chennai Floods pattern)
 */
export function calculateOctennialEchoes(birthDate: Date, yearOffset: number = 0): TemporalEcho[] {
  const echoes: TemporalEcho[] = [];
  const realToday = new Date();
  const today = yearOffset !== 0 
    ? new Date(realToday.getFullYear() + yearOffset, realToday.getMonth(), realToday.getDate())
    : realToday;
  const currentYear = today.getFullYear();
  
  for (let i = -2; i <= 2; i++) {
    const echoYear = currentYear + (i * 8);
    const echoDate = new Date(echoYear, today.getMonth(), today.getDate());
    const daysUntil = Math.floor((echoDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    echoes.push({
      id: `octennial_${echoYear}`,
      cycleType: 'octennial_8',
      cycleYears: 8,
      echoDate,
      currentDate: today,
      description: `8-Year Environmental Cycle: Major shifts echo every 8 years`,
      wormholeWarning: `Pattern detected: ${echoYear - 8} events may repeat in ${echoYear}.`,
      intensity: Math.abs(daysUntil) < 365 ? 'high' : 'low',
      isActive: Math.abs(daysUntil) < 365,
      daysUntilActivation: daysUntil
    });
  }
  
  return echoes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIQUETRA NODE CALCULATION (Past-Present-Future)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate the three Triquetra nodes based on current date
 */
export function calculateTriquetralNodes(birthDate: Date, yearOffset: number = 0): { past: TriquetralNode; present: TriquetralNode; future: TriquetralNode } {
  const realToday = new Date();
  const today = yearOffset !== 0 
    ? new Date(realToday.getFullYear() + yearOffset, realToday.getMonth(), realToday.getDate())
    : realToday;
  const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const currentYear = today.getFullYear();
  
  const pastDate = new Date(currentYear - 12, today.getMonth(), today.getDate());
  const pastAge = age - 12;
  const pastPhase = pastAge > 0 ? getCurrentLifePhase(pastAge) : null;
  
  const futureDate = new Date(currentYear + 12, today.getMonth(), today.getDate());
  const futureAge = age + 12;
  const futurePhase = getCurrentLifePhase(futureAge);
  
  const currentPhase = getCurrentLifePhase(age);
  
  return {
    past: {
      position: 'past',
      date: pastDate,
      label: `${currentYear - 12} (Age ${pastAge > 0 ? pastAge : 'Pre-birth'})`,
      events: pastAge > 0 ? [
        `Life Phase: ${pastPhase?.phaseName || 'Unknown'}`,
        `Karmic Theme: ${pastPhase?.karmicTheme || 'Unknown'}`
      ] : ['Pre-incarnation planning phase'],
      emotionalSignature: pastPhase?.karmicTheme || 'Pre-existence',
      cycleAlignment: pastAge > 0 ? 85 : 0
    },
    present: {
      position: 'present',
      date: today,
      label: `${yearOffset !== 0 ? currentYear : 'Today'} (Age ${age})`,
      events: [
        `Life Phase: ${currentPhase.phaseName}`,
        `Karmic Theme: ${currentPhase.karmicTheme}`,
        `Phase Progress: ${Math.round(((age - currentPhase.startAge) / (currentPhase.endAge - currentPhase.startAge)) * 100)}%`
      ],
      emotionalSignature: currentPhase.karmicTheme,
      cycleAlignment: 100
    },
    future: {
      position: 'future',
      date: futureDate,
      label: `${currentYear + 12} (Age ${futureAge})`,
      events: [
        `Predicted Phase: ${futurePhase.phaseName}`,
        `Upcoming Theme: ${futurePhase.karmicTheme}`
      ],
      emotionalSignature: futurePhase.karmicTheme,
      cycleAlignment: 75
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WARNING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate current Dasha period and check for challenges
 */
export function getCurrentDasha(age: number): DashaPeriod {
  const dasha = DASHA_SEQUENCE.find(d => age >= d.startAge && age < d.endAge) || DASHA_SEQUENCE[0];
  return {
    ...dasha,
    isCurrent: true,
    isChallenging: CHALLENGING_DASHAS.includes(dasha.ruler)
  };
}

/**
 * Generate warning if challenging period detected
 */
export function generateDarkCycleWarning(
  birthDate: Date,
  activeEchoes: TemporalEcho[]
): DarkCycleWarning | null {
  const age = calculateAge(birthDate);
  const dasha = getCurrentDasha(age);
  const today = new Date();
  
  // Check for critical combinations
  const hasActiveNodeal = activeEchoes.some(e => e.cycleType === 'nodal_18' && e.isActive);
  const hasActiveSaturn = activeEchoes.some(e => e.cycleType === 'saturn_29' && e.isActive);
  const hasActiveMetonic = activeEchoes.some(e => e.cycleType === 'metonic_33' && e.isActive);
  
  // Critical: Nodal + Challenging Dasha
  if (hasActiveNodeal && dasha.isChallenging) {
    return {
      type: 'KARMIC_FRICTION',
      title: 'Cycle of Friction Detected',
      message: `${dasha.name} Dasha + Nodal Return = Intense karmic lessons. Major life restructuring in progress.`,
      startDate: today,
      endDate: new Date(today.getFullYear(), today.getMonth() + 3, today.getDate()),
      severity: 'critical',
      actionRequired: [
        'Stay calm for the next 90 days',
        'Avoid major decisions during friction windows',
        'Focus on inner work and patience'
      ]
    };
  }
  
  // High: Metonic cycle active
  if (hasActiveMetonic) {
    return {
      type: 'WORMHOLE_ECHO',
      title: '33-Year Wormhole Active',
      message: 'Cosmic alignment matches 33 years ago. Did you experience a major shift then? Expect an echo.',
      startDate: today,
      endDate: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()),
      severity: 'high',
      actionRequired: [
        'Reflect on events from 33 years ago',
        'Similar patterns may emerge now',
        'Use wisdom from past experience'
      ]
    };
  }
  
  // Medium: Challenging Dasha alone
  if (dasha.isChallenging) {
    return {
      type: 'DASHA_CHALLENGE',
      title: `${dasha.name} Period Active`,
      message: `You are in a ${dasha.name} period. This brings ${dasha.theme.toLowerCase()}.`,
      startDate: today,
      endDate: new Date(today.getFullYear() + (dasha.endAge - age), today.getMonth(), today.getDate()),
      severity: 'medium',
      actionRequired: [
        `Work with ${dasha.ruler} energy consciously`,
        'Practice patience and discipline',
        'Avoid rash decisions'
      ]
    };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DARK CYCLE READING GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate complete Dark Cycle reading with Temporal Radar
 * @param userId - User identifier
 * @param birthDate - User's birth date
 * @param targetYear - Optional year to simulate (for time travel feature)
 */
export function generateDarkCycleReading(userId: string, birthDate: Date, targetYear?: number): DarkCycleReading {
  const currentYear = new Date().getFullYear();
  const yearOffset = targetYear ? targetYear - currentYear : 0;
  
  // Calculate age based on target year or current year
  const effectiveDate = targetYear 
    ? new Date(targetYear, new Date().getMonth(), new Date().getDate())
    : new Date();
  const age = Math.floor((effectiveDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  
  // For time travel, adjust the birth date calculation context
  const adjustedBirthDate = birthDate;
  
  // Calculate all echoes (with optional year offset for time travel)
  const metonicEchoes = calculateMetonicEchoes(adjustedBirthDate, yearOffset);
  const jupiterReturns = calculateJupiterReturns(adjustedBirthDate, yearOffset);
  const nodalReturns = calculateNodalReturns(adjustedBirthDate, yearOffset);
  const octennialEchoes = calculateOctennialEchoes(adjustedBirthDate, yearOffset);
  
  const allEchoes = [...metonicEchoes, ...jupiterReturns, ...nodalReturns, ...octennialEchoes];
  const activeEchoes = allEchoes.filter(e => e.isActive);
  const upcomingEchoes = allEchoes
    .filter(e => !e.isActive && e.daysUntilActivation > 0 && e.daysUntilActivation <= 365 * 5)
    .sort((a, b) => a.daysUntilActivation - b.daysUntilActivation);
  
  // Calculate Triquetra nodes (with year offset for time travel)
  const nodes = calculateTriquetralNodes(adjustedBirthDate, yearOffset);
  
  // Generate warning
  const currentWarning = generateDarkCycleWarning(adjustedBirthDate, activeEchoes);
  
  // Determine warning level
  let warningLevel: DarkCycleReading['warningLevel'] = 'safe';
  if (currentWarning) {
    warningLevel = currentWarning.severity === 'critical' ? 'critical' :
                   currentWarning.severity === 'high' ? 'warning' :
                   currentWarning.severity === 'medium' ? 'caution' : 'safe';
  }
  
  // Calculate temporal alignment
  const temporalAlignment = Math.round(
    (activeEchoes.filter(e => e.cycleType === 'jupiter_12').length > 0 ? 30 : 0) +
    (activeEchoes.filter(e => e.cycleType === 'metonic_33').length > 0 ? 40 : 0) +
    (warningLevel === 'safe' ? 30 : warningLevel === 'caution' ? 20 : 10)
  );
  
  // Generate Zoe analysis
  const dasha = getCurrentDasha(age);
  const timeTravelPrefix = targetYear && targetYear !== currentYear
    ? `[Viewing ${targetYear}] `
    : '';
  const zoeAnalysis = `${timeTravelPrefix}You are in ${dasha.name} Dasha (${dasha.theme}). ` +
    `${activeEchoes.length} temporal cycles are currently active. ` +
    (currentWarning ? `⚠️ ${currentWarning.title}: ${currentWarning.message}` : 
      'No critical warnings. Continue your current path.');
  
  // Generate preparation advice
  const preparationAdvice: string[] = [];
  if (currentWarning) {
    preparationAdvice.push(...currentWarning.actionRequired);
  } else {
    preparationAdvice.push(
      'Temporal cycles are aligned. Good period for new initiatives.',
      `Focus on ${dasha.theme.toLowerCase()} themes for maximum benefit.`,
      'Review patterns from 12 years ago for guidance.'
    );
  }
  
  return {
    userId,
    birthDate,
    currentAge: age,
    pastNode: nodes.past,
    presentNode: nodes.present,
    futureNode: nodes.future,
    activeEchoes,
    upcomingEchoes,
    currentWarning,
    warningLevel,
    temporalAlignment,
    zoeAnalysis,
    preparationAdvice
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DARK CYCLE ENGINE NAMESPACE EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const DarkCycleEngine = {
  calculateMetonicEchoes,
  calculateJupiterReturns,
  calculateNodalReturns,
  calculateOctennialEchoes,
  calculateTriquetralNodes,
  getCurrentDasha,
  generateDarkCycleWarning,
  generateDarkCycleReading
};

export default DarkCycleEngine;
