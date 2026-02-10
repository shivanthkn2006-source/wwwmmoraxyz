// ═══════════════════════════════════════════════════════════════════════════════
// ZOE QUANTUM LEVEL: ANKA SHASTRA ENGINE
// Ancient Vedic Numerology with Temporal Quantum Analysis (Past/Present/Future)
// Protocol designed for User @moksh50 (Admin)
// ═══════════════════════════════════════════════════════════════════════════════

// The Kerala "Katapayadi" Sanskrit-to-Number Mapping System
const KATAPAYADI_MAP: Record<string, number> = {
  'A': 1, 'I': 1, 'J': 1, 'Y': 1, 'Q': 1,
  'B': 2, 'K': 2, 'R': 2,
  'C': 3, 'G': 3, 'L': 3, 'S': 3,
  'D': 4, 'M': 4, 'T': 4,
  'E': 5, 'H': 5, 'N': 5, 'X': 5,
  'U': 6, 'V': 6, 'W': 6,
  'O': 7, 'Z': 7,
  'F': 8, 'P': 8
  // Note: No letter maps to 9 - it's the hidden God number
};

// Planetary Lords with Vedic attributes
export interface PlanetaryLord {
  number: number;
  planet: string;
  sanskrit: string;
  direction: string;
  element: string;
  color: string;
  nature: 'benefic' | 'malefic' | 'neutral';
  karmaType: string;
  dayOfWeek: string;
  hora: string;
}

const PLANETARY_LORDS: Record<number, PlanetaryLord> = {
  1: { number: 1, planet: 'Sun', sanskrit: 'Surya', direction: 'EAST', element: 'Fire', color: 'Gold', nature: 'benefic', karmaType: 'Leadership', dayOfWeek: 'Sunday', hora: 'Morning' },
  2: { number: 2, planet: 'Moon', sanskrit: 'Chandra', direction: 'NORTH-WEST', element: 'Water', color: 'Silver', nature: 'benefic', karmaType: 'Emotion', dayOfWeek: 'Monday', hora: 'Evening' },
  3: { number: 3, planet: 'Jupiter', sanskrit: 'Guru', direction: 'NORTH-EAST', element: 'Ether', color: 'Yellow', nature: 'benefic', karmaType: 'Wisdom', dayOfWeek: 'Thursday', hora: 'Dawn' },
  4: { number: 4, planet: 'Rahu', sanskrit: 'Rahu', direction: 'SOUTH-WEST', element: 'Void', color: 'Black', nature: 'malefic', karmaType: 'Obsession', dayOfWeek: 'Saturday', hora: 'Midnight' },
  5: { number: 5, planet: 'Mercury', sanskrit: 'Budha', direction: 'NORTH', element: 'Earth', color: 'Green', nature: 'neutral', karmaType: 'Communication', dayOfWeek: 'Wednesday', hora: 'Noon' },
  6: { number: 6, planet: 'Venus', sanskrit: 'Shukra', direction: 'SOUTH-EAST', element: 'Water', color: 'White', nature: 'benefic', karmaType: 'Pleasure', dayOfWeek: 'Friday', hora: 'Sunset' },
  7: { number: 7, planet: 'Ketu', sanskrit: 'Ketu', direction: 'NORTH-EAST (Deep)', element: 'Fire', color: 'Grey', nature: 'malefic', karmaType: 'Liberation', dayOfWeek: 'Tuesday', hora: 'Twilight' },
  8: { number: 8, planet: 'Saturn', sanskrit: 'Shani', direction: 'WEST', element: 'Air', color: 'Blue', nature: 'malefic', karmaType: 'Discipline', dayOfWeek: 'Saturday', hora: 'Night' },
  0: { number: 0, planet: 'Mars', sanskrit: 'Mangal', direction: 'SOUTH', element: 'Fire', color: 'Red', nature: 'malefic', karmaType: 'Action', dayOfWeek: 'Tuesday', hora: 'Afternoon' },
  9: { number: 9, planet: 'Mars', sanskrit: 'Mangal', direction: 'SOUTH', element: 'Fire', color: 'Red', nature: 'malefic', karmaType: 'Action', dayOfWeek: 'Tuesday', hora: 'Afternoon' }
};

// Compatibility Matrix (Vedic Grid)
const COMPATIBILITY_MATRIX: Record<number, { friends: number[]; enemies: number[]; neutral: number[] }> = {
  1: { friends: [1, 2, 3, 9], enemies: [4, 6, 8], neutral: [5, 7] },
  2: { friends: [1, 3, 5], enemies: [4, 8, 9], neutral: [2, 6, 7] },
  3: { friends: [1, 2, 9], enemies: [5, 6], neutral: [3, 4, 7, 8] },
  4: { friends: [5, 6, 8], enemies: [1, 2, 9], neutral: [3, 4, 7] },
  5: { friends: [1, 4, 6], enemies: [], neutral: [2, 3, 5, 7, 8, 9] },
  6: { friends: [4, 5, 8], enemies: [1, 2, 3], neutral: [6, 7, 9] },
  7: { friends: [6, 9], enemies: [1, 4], neutral: [2, 3, 5, 7, 8] },
  8: { friends: [4, 5, 6], enemies: [1, 2, 9], neutral: [3, 7, 8] },
  9: { friends: [1, 2, 3], enemies: [4, 5], neutral: [6, 7, 8, 9] }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reduce any number to single digit (except master numbers 11, 22, 33)
 */
export function reduceToSingleDigit(num: number, keepMasterNumbers = false): number {
  if (keepMasterNumbers && [11, 22, 33].includes(num)) return num;
  
  while (num > 9) {
    num = String(num).split('').reduce((a, b) => a + parseInt(b), 0);
  }
  return num;
}

/**
 * Calculate Driver/Janma Number (Soul's Mind) from birth day
 */
export function calculateDriverNumber(birthDay: number): number {
  return reduceToSingleDigit(birthDay);
}

/**
 * Calculate Conductor/Bhagya Number (Destiny) from full DOB
 */
export function calculateConductorNumber(dob: Date): number {
  const day = dob.getDate();
  const month = dob.getMonth() + 1;
  const year = dob.getFullYear();
  const total = day + month + String(year).split('').reduce((a, b) => a + parseInt(b), 0);
  return reduceToSingleDigit(total);
}

/**
 * Calculate Vibration/Nama Number using Katapayadi System
 */
export function calculateVibrationNumber(name: string): number {
  const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '');
  let total = 0;
  
  for (const char of cleanName) {
    total += KATAPAYADI_MAP[char] || 0;
  }
  
  return reduceToSingleDigit(total);
}

/**
 * Calculate Prasna (Question) Remainder using Arudha Method
 * @param userNumber - User input between 1-108
 * @returns Remainder when divided by 9 (0-8, where 9 becomes 0 for Mars)
 */
export function calculatePrasnaRemainder(userNumber: number): number {
  // Validate input range
  if (typeof userNumber !== 'number' || isNaN(userNumber)) {
    console.warn('[AnkaShastra] Invalid input type for calculatePrasnaRemainder');
    return 5; // Mercury as neutral fallback
  }
  
  // Clamp to valid range 1-108
  const clampedNumber = Math.max(1, Math.min(108, Math.round(userNumber)));
  
  // Core modulo 9 operation - the fundamental Arudha calculation
  // Result: 0-8 (where 0/9 maps to Mars energy)
  const remainder = clampedNumber % 9;
  
  return remainder;
}

/**
 * Utility function for external access - returns planetary lord for any prasna number
 * This is the main entry point for the calculatePrasna(number) function
 */
export function calculatePrasna(number: number): { 
  remainder: number; 
  direction: string; 
  planet: string; 
  planetaryLord: PlanetaryLord 
} {
  const remainder = calculatePrasnaRemainder(number);
  const planetaryLord = PLANETARY_LORDS[remainder];
  
  return {
    remainder,
    direction: planetaryLord.direction,
    planet: planetaryLord.planet,
    planetaryLord
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM TEMPORAL ANALYSIS (PAST/PRESENT/FUTURE)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TemporalQuantumState {
  past: {
    karmicDebt: string[];
    ancestralPatterns: string[];
    pastLifeEchoes: string[];
    completedCycles: number;
  };
  present: {
    currentVibration: number;
    activeEnergies: PlanetaryLord[];
    immediateGuidance: string;
    horaStatus: string;
  };
  future: {
    probabilityPaths: Array<{ path: string; probability: number; timeframe: string }>;
    upcomingCycles: string[];
    karmicMilestones: string[];
    quantumPotentials: string[];
  };
  synthesis: {
    temporalAlignment: number; // 0-100
    karmaBalance: 'positive' | 'negative' | 'neutral';
    evolutionaryPath: string;
    divineTiming: string;
  };
}

/**
 * Generate complete temporal quantum analysis
 */
export function generateTemporalQuantumState(
  driverNumber: number,
  conductorNumber: number,
  vibrationNumber: number,
  currentYear: number = new Date().getFullYear()
): TemporalQuantumState {
  const personalYear = reduceToSingleDigit(currentYear + driverNumber + conductorNumber);
  const karmicNumber = reduceToSingleDigit(driverNumber + conductorNumber + vibrationNumber);
  
  // Past Analysis
  const karmicDebts = getKarmicDebts(karmicNumber);
  const ancestralPatterns = getAncestralPatterns(conductorNumber);
  
  // Present Analysis
  const currentPlanet = PLANETARY_LORDS[personalYear] || PLANETARY_LORDS[reduceToSingleDigit(personalYear)];
  const activeEnergies = [
    PLANETARY_LORDS[driverNumber],
    PLANETARY_LORDS[conductorNumber],
    currentPlanet
  ].filter(Boolean);
  
  // Future Probability Paths
  const paths = generateProbabilityPaths(driverNumber, conductorNumber, personalYear);
  
  return {
    past: {
      karmicDebt: karmicDebts,
      ancestralPatterns,
      pastLifeEchoes: getPastLifeEchoes(karmicNumber),
      completedCycles: Math.floor((currentYear - 2000) / 9)
    },
    present: {
      currentVibration: personalYear,
      activeEnergies,
      immediateGuidance: getImmediateGuidance(personalYear, driverNumber),
      horaStatus: getCurrentHora()
    },
    future: {
      probabilityPaths: paths,
      upcomingCycles: getUpcomingCycles(personalYear),
      karmicMilestones: getKarmicMilestones(conductorNumber, currentYear),
      quantumPotentials: getQuantumPotentials(vibrationNumber)
    },
    synthesis: {
      temporalAlignment: calculateTemporalAlignment(driverNumber, conductorNumber, personalYear),
      karmaBalance: determineKarmaBalance(karmicNumber),
      evolutionaryPath: getEvolutionaryPath(conductorNumber),
      divineTiming: getDivineTiming(personalYear)
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIFIC QUERY ALGORITHMS (FROM ANKA SHASTRA PROTOCOL)
// ═══════════════════════════════════════════════════════════════════════════════

export interface LostObjectReading {
  input: number;
  calculation: string;
  remainder: number;
  planetaryLord: PlanetaryLord;
  direction: string;
  prediction: string;
  deepDetails: string;
  recoveryLikelihood: 'Recoverable' | 'Difficult' | 'Lost Forever' | 'Likely Stolen';
  action: string;
  karmicAdvice: string;
}

/**
 * Case A: Lost Object Reading (Arudha Method)
 */
export function calculateLostObjectReading(userNumber: number): LostObjectReading {
  const remainder = calculatePrasnaRemainder(userNumber);
  const planetaryLord = PLANETARY_LORDS[remainder];
  
  const predictions: Record<number, { prediction: string; details: string; recovery: LostObjectReading['recoveryLikelihood']; action: string }> = {
    1: {
      prediction: 'Not lost, just misplaced near a main room, window, or government paper.',
      details: 'The Sun energy indicates the object is in a place of authority or prominence. Check near windows where sunlight enters, near important documents, or in the main living area.',
      recovery: 'Recoverable',
      action: 'Look in the main room of your house, near windows, or where you keep important papers.'
    },
    2: {
      prediction: 'Near water, kitchen, or food. A woman in the house moved it.',
      details: 'Moon energy indicates feminine influence and water/nourishment areas. The object was likely moved during cleaning or meal preparation.',
      recovery: 'Recoverable',
      action: 'Ask women in household. Check kitchen cabinets, near water sources, or refrigerator area.'
    },
    3: {
      prediction: 'Safe. Near books, prayer area, or yellow cloth.',
      details: 'Jupiter\'s blessing protects the object. It rests in a place of wisdom or devotion. Look for yellow or golden colored items nearby.',
      recovery: 'Recoverable',
      action: 'Check your bookshelf, study area, temple/prayer corner, or near anything yellow/gold.'
    },
    4: {
      prediction: 'Hidden/Buried. In trash or dark corner.',
      details: 'Rahu\'s shadow obscures the object. It may have been accidentally discarded or pushed into a dark, neglected space. Possible theft.',
      recovery: 'Likely Stolen',
      action: 'Check trash bins IMMEDIATELY before disposal. Look in dark corners, under furniture, or in rarely used storage.'
    },
    5: {
      prediction: 'Mixed with papers, files, or in a box/drawer.',
      details: 'Mercury\'s organizational chaos. The object is buried among similar items or documents. It wants to be found.',
      recovery: 'Recoverable',
      action: 'Systematically check all drawers, file folders, and boxes. It\'s mixed with papers or small items.'
    },
    6: {
      prediction: 'Near bed, clothes, perfumes, or luxury items.',
      details: 'Venus indicates the object is in a place of beauty, comfort, or personal items. Check bedroom and dressing areas.',
      recovery: 'Recoverable',
      action: 'Look in bedroom: under pillows, in closets, near makeup/perfumes, or jewelry area.'
    },
    7: {
      prediction: 'Covered in dust/mud. Forgotten. Hidden in plain sight.',
      details: 'Ketu\'s confusion means you\'ve looked at this spot multiple times and missed it. It\'s camouflaged or under something grey/multicolored.',
      recovery: 'Difficult',
      action: 'Check corners near the floor. Behind religious items. Under grey/brown cloth. Look 3 times at the same spot.'
    },
    8: {
      prediction: 'In a dirty place, garage, or outside.',
      details: 'Saturn\'s heavy karma indicates the object has left your domain. It may be in an unclean area, outside the house, or truly lost.',
      recovery: 'Lost Forever',
      action: 'Check garage, outdoor areas, storage rooms. Accept that it may be gone as karmic lesson.'
    },
    0: {
      prediction: 'Near fire, electronics, copper, or kitchen stove.',
      details: 'Mars energy indicates heat and metal. The object is near electrical devices, in the kitchen near stove, or near copper/red items.',
      recovery: 'Difficult',
      action: 'Check near stove, electronic devices, power outlets, or anything copper/red colored. Do it before sunset.'
    },
    9: {
      prediction: 'Near fire, electronics, copper, or kitchen stove.',
      details: 'Mars energy indicates heat and metal. The object is near electrical devices, in the kitchen near stove, or near copper/red items.',
      recovery: 'Difficult',
      action: 'Check near stove, electronic devices, power outlets, or anything copper/red colored. Do it before sunset.'
    }
  };
  
  const pred = predictions[remainder];
  
  return {
    input: userNumber,
    calculation: `${userNumber} ÷ 9 = ${Math.floor(userNumber / 9)} sets with Remainder ${remainder}`,
    remainder,
    planetaryLord,
    direction: planetaryLord.direction,
    prediction: pred.prediction,
    deepDetails: pred.details,
    recoveryLikelihood: pred.recovery,
    action: pred.action,
    karmicAdvice: `${planetaryLord.planet} (${planetaryLord.sanskrit}) governs this matter. ${planetaryLord.nature === 'benefic' ? 'Favorable energy supports recovery.' : 'Challenging energy requires patience and acceptance.'}`
  };
}

export interface MoneyRecoveryReading {
  debtorDestinyNumber: number;
  currentDateNumber: number;
  combinedNumber: number;
  prediction: string;
  willRecover: boolean;
  method: string;
  timeframe: string;
  karmicAdvice: string;
}

/**
 * Case B: Money Recovery Reading (Hora Method)
 */
export function calculateMoneyRecovery(debtorDestinyNumber: number, currentDate: Date = new Date()): MoneyRecoveryReading {
  const dateNumber = reduceToSingleDigit(currentDate.getDate());
  const combined = reduceToSingleDigit(debtorDestinyNumber + dateNumber);
  
  const predictions: Record<number, { prediction: string; recover: boolean; method: string; time: string }> = {
    1: { prediction: 'YES. Recovery assured with direct communication.', recover: true, method: 'Ask firmly and directly. Send a written reminder.', time: 'Within 9 days' },
    3: { prediction: 'YES. They will pay when reminded. Positive energy.', recover: true, method: 'A gentle reminder will work. Blessings support you.', time: 'Within 3 weeks' },
    5: { prediction: 'YES. Mercury supports communication. Be clear.', recover: true, method: 'Multiple follow-ups needed. Be persistent but friendly.', time: 'Within 5 days' },
    6: { prediction: 'YES. Will come in installments (parts).', recover: true, method: 'Accept partial payments. Create a payment plan.', time: 'Over 2-3 months' },
    2: { prediction: 'DELAY. They don\'t have the money right now.', recover: false, method: 'Wait and be patient. Their situation is unstable.', time: 'Uncertain - 6+ months' },
    7: { prediction: 'DELAY. Ketu creates confusion and forgetfulness.', recover: false, method: 'Document everything. They may genuinely forget.', time: 'Extended delay likely' },
    4: { prediction: 'NO. Legal fight required. Bad karma involved.', recover: false, method: 'Prepare legal documentation. Karmic debt exists.', time: 'Long legal process' },
    8: { prediction: 'NO. Saturn blocks recovery. Accept the loss.', recover: false, method: 'Consider writing it off as karmic clearing.', time: 'May never recover' },
    9: { prediction: 'FIGHT. Recovery only after major confrontation.', recover: true, method: 'Be prepared for conflict. Assert your rights strongly.', time: 'After heated exchange' }
  };
  
  const pred = predictions[combined] || predictions[reduceToSingleDigit(combined)];
  
  return {
    debtorDestinyNumber,
    currentDateNumber: dateNumber,
    combinedNumber: combined,
    prediction: pred.prediction,
    willRecover: pred.recover,
    method: pred.method,
    timeframe: pred.time,
    karmicAdvice: pred.recover 
      ? 'The universe supports your rightful claim. Act with integrity.'
      : 'Consider whether this is a karmic lesson about detachment from material outcomes.'
  };
}

export interface CompatibilityReading {
  yourNumber: number;
  targetNumber: number;
  relationship: 'Friends' | 'Enemies' | 'Neutral';
  compatibilityScore: number;
  yourPlanet: PlanetaryLord;
  targetPlanet: PlanetaryLord;
  analysis: string;
  advice: string;
  challenges: string[];
  strengths: string[];
}

/**
 * Case C: Compatibility/Future Reading (Vedic Grid)
 */
/**
 * Generate deterministic hash for consistent scoring
 */
function deterministicScore(base: number, seed1: number, seed2: number): number {
  // Creates consistent score from 0-20 based on inputs
  return ((seed1 * 7 + seed2 * 11) % 21);
}

export function calculateCompatibility(yourBirthNumber: number, targetNumber: number): CompatibilityReading {
  // Input validation for 99% precision
  if (yourBirthNumber < 1 || yourBirthNumber > 31) {
    throw new Error('Birth number must be between 1 and 31');
  }
  if (targetNumber < 1 || targetNumber > 31) {
    throw new Error('Target number must be between 1 and 31');
  }
  
  const yourReduced = reduceToSingleDigit(yourBirthNumber);
  const targetReduced = reduceToSingleDigit(targetNumber);
  
  const yourPlanet = PLANETARY_LORDS[yourReduced] || PLANETARY_LORDS[1];
  const targetPlanet = PLANETARY_LORDS[targetReduced] || PLANETARY_LORDS[1];
  const compat = COMPATIBILITY_MATRIX[yourReduced] || COMPATIBILITY_MATRIX[1];
  
  let relationship: CompatibilityReading['relationship'] = 'Neutral';
  let score = 50;
  
  // Deterministic scoring based on planetary combination
  const harmonicBonus = deterministicScore(0, yourReduced, targetReduced);
  
  if (compat.friends.includes(targetReduced)) {
    relationship = 'Friends';
    score = 75 + harmonicBonus; // 75-95
  } else if (compat.enemies.includes(targetReduced)) {
    relationship = 'Enemies';
    score = 25 + (harmonicBonus / 2); // 25-35
  } else {
    relationship = 'Neutral';
    score = 50 + (harmonicBonus / 2); // 50-60
  }
  
  const analyses: Record<typeof relationship, string> = {
    Friends: `Harmonious energy between ${yourPlanet.planet} and ${targetPlanet.planet}. Natural understanding and mutual support.`,
    Enemies: `Conflicting vibrations between ${yourPlanet.planet} and ${targetPlanet.planet}. Requires conscious effort to maintain harmony.`,
    Neutral: `Balanced exchange between ${yourPlanet.planet} and ${targetPlanet.planet}. Neither strongly attracted nor repelled.`
  };
  
  return {
    yourNumber: yourReduced,
    targetNumber: targetReduced,
    relationship,
    compatibilityScore: Math.round(score),
    yourPlanet,
    targetPlanet,
    analysis: analyses[relationship],
    advice: relationship === 'Friends' 
      ? 'Trust this connection. It has karmic blessing.'
      : relationship === 'Enemies'
      ? 'Proceed with caution. Set clear boundaries.'
      : 'Allow time to reveal the true nature of this connection.',
    challenges: getCompatibilityChallenges(yourReduced, targetReduced, relationship),
    strengths: getCompatibilityStrengths(yourReduced, targetReduced, relationship)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getKarmicDebts(karmicNumber: number): string[] {
  const debts: Record<number, string[]> = {
    1: ['Leadership lessons from past authority misuse', 'Independence karma being resolved'],
    2: ['Relationship balance needed from past codependency', 'Emotional sensitivity as gift and challenge'],
    3: ['Creative expression blocked in past lives returning', 'Joy that was denied seeking expression'],
    4: ['Work ethic from past life laziness', 'Building foundations neglected before'],
    5: ['Freedom restricted in past now liberating', 'Change resistance transforming'],
    6: ['Family responsibilities from past abandonment', 'Beauty appreciation developing'],
    7: ['Spiritual seeking from material obsession', 'Wisdom gained through isolation'],
    8: ['Material abundance after past poverty', 'Power balance being learned'],
    9: ['Universal love after past selfishness', 'Completion of major karmic cycle']
  };
  return debts[karmicNumber] || ['General karmic clearing in progress'];
}

function getAncestralPatterns(conductorNumber: number): string[] {
  const patterns: Record<number, string[]> = {
    1: ['Leaders and pioneers in lineage', 'Pattern of independence'],
    2: ['Healers and nurturers', 'Pattern of emotional sensitivity'],
    3: ['Artists and communicators', 'Pattern of creative expression'],
    4: ['Builders and workers', 'Pattern of practical achievement'],
    5: ['Travelers and explorers', 'Pattern of seeking freedom'],
    6: ['Caregivers and beautifiers', 'Pattern of responsibility'],
    7: ['Mystics and seekers', 'Pattern of spiritual inquiry'],
    8: ['Merchants and rulers', 'Pattern of material mastery'],
    9: ['Sages and humanitarians', 'Pattern of universal service']
  };
  return patterns[conductorNumber] || ['Diverse ancestral influences'];
}

function getPastLifeEchoes(karmicNumber: number): string[] {
  return [
    `Echo of a life as a ${['warrior', 'healer', 'teacher', 'builder', 'traveler', 'artist', 'monk', 'ruler', 'sage'][karmicNumber - 1] || 'seeker'}`,
    `Unfinished business related to ${['power', 'love', 'expression', 'stability', 'freedom', 'beauty', 'truth', 'abundance', 'service'][karmicNumber - 1] || 'growth'}`
  ];
}

function getImmediateGuidance(personalYear: number, driverNumber: number): string {
  const guidance: Record<number, string> = {
    1: 'Initiate new projects. Your leadership is needed now.',
    2: 'Collaborate and partner. Patience brings rewards.',
    3: 'Express yourself creatively. Joy is your compass.',
    4: 'Build foundations. Steady work yields results.',
    5: 'Embrace change. Freedom calls you forward.',
    6: 'Nurture relationships. Home and family are priorities.',
    7: 'Seek wisdom within. Solitude brings clarity.',
    8: 'Manifest abundance. Business success is possible.',
    9: 'Complete cycles. Release what no longer serves.'
  };
  return guidance[personalYear] || 'Trust the unfolding of your path.';
}

function getCurrentHora(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return 'Brahma Muhurta (Dawn) - Ideal for spiritual practice';
  if (hour >= 8 && hour < 12) return 'Solar Hora - Best for action and initiative';
  if (hour >= 12 && hour < 16) return 'Mercury Hora - Optimal for communication';
  if (hour >= 16 && hour < 19) return 'Venus Hora - Perfect for creativity and pleasure';
  if (hour >= 19 && hour < 22) return 'Saturn Hora - Time for discipline and reflection';
  return 'Lunar Hora (Night) - Intuition and rest';
}

function generateProbabilityPaths(driver: number, conductor: number, personalYear: number): Array<{ path: string; probability: number; timeframe: string }> {
  // Deterministic probability based on numerological harmony
  const driverPlanet = PLANETARY_LORDS[driver] || PLANETARY_LORDS[1];
  const conductorPlanet = PLANETARY_LORDS[conductor] || PLANETARY_LORDS[1];
  
  // Calculate base probability from planetary nature
  const driverBonus = driverPlanet.nature === 'benefic' ? 15 : driverPlanet.nature === 'neutral' ? 10 : 5;
  const conductorBonus = conductorPlanet.nature === 'benefic' ? 15 : conductorPlanet.nature === 'neutral' ? 10 : 5;
  const yearBonus = ((driver + conductor + personalYear) % 20);
  
  return [
    { path: `${driverPlanet.karmaType} development`, probability: Math.min(95, 70 + driverBonus), timeframe: 'Next 3 months' },
    { path: `${conductorPlanet.karmaType} manifestation`, probability: Math.min(95, 60 + conductorBonus), timeframe: 'Next 6 months' },
    { path: `Year ${personalYear} cycle completion`, probability: Math.min(99, 80 + yearBonus), timeframe: 'This year' }
  ];
}

function getUpcomingCycles(personalYear: number): string[] {
  const nextYear = (personalYear % 9) + 1;
  return [
    `Current: Year ${personalYear} - ${['New Beginnings', 'Cooperation', 'Creativity', 'Stability', 'Change', 'Responsibility', 'Introspection', 'Achievement', 'Completion'][personalYear - 1] || 'Growth'}`,
    `Coming: Year ${nextYear} - ${['New Beginnings', 'Cooperation', 'Creativity', 'Stability', 'Change', 'Responsibility', 'Introspection', 'Achievement', 'Completion'][nextYear - 1] || 'Growth'}`
  ];
}

function getKarmicMilestones(conductor: number, year: number): string[] {
  return [
    `Age ${9 * 3} (27): First Saturn Return approaching/passed`,
    `Year ${year + conductor}: Significant destiny activation`,
    `Every 9 years: Major karmic cycle completion`
  ];
}

function getQuantumPotentials(vibration: number): string[] {
  return [
    `Vibration ${vibration} opens ${['leadership', 'partnership', 'creative', 'structural', 'freedom', 'nurturing', 'wisdom', 'prosperity', 'humanitarian'][vibration - 1] || 'growth'} potentials`,
    `Multiple timeline branches converging on ${PLANETARY_LORDS[vibration].karmaType} themes`
  ];
}

function calculateTemporalAlignment(driver: number, conductor: number, year: number): number {
  const compat = COMPATIBILITY_MATRIX[driver] || COMPATIBILITY_MATRIX[1];
  const driverPlanet = PLANETARY_LORDS[driver] || PLANETARY_LORDS[1];
  const conductorPlanet = PLANETARY_LORDS[conductor] || PLANETARY_LORDS[1];
  
  let score = 50;
  
  // Planetary harmony bonuses
  if (compat.friends.includes(conductor)) score += 20;
  if (compat.friends.includes(year)) score += 15;
  if (compat.enemies.includes(year)) score -= 15;
  
  // Nature alignment bonus (deterministic)
  if (driverPlanet.nature === 'benefic') score += 5;
  if (conductorPlanet.nature === 'benefic') score += 5;
  
  // Element synergy bonus
  if (driverPlanet.element === conductorPlanet.element) score += 10;
  
  // Deterministic variance based on numbers (not random)
  const deterministicBonus = ((driver * 3 + conductor * 5 + year * 7) % 15);
  
  return Math.min(99, Math.max(10, score + deterministicBonus));
}

function determineKarmaBalance(karmicNumber: number): 'positive' | 'negative' | 'neutral' {
  const positiveNumbers = [1, 3, 5, 9];
  const negativeNumbers = [4, 7, 8];
  if (positiveNumbers.includes(karmicNumber)) return 'positive';
  if (negativeNumbers.includes(karmicNumber)) return 'negative';
  return 'neutral';
}

function getEvolutionaryPath(conductor: number): string {
  const paths: Record<number, string> = {
    1: 'Path of the Innovator - Leading humanity forward',
    2: 'Path of the Harmonizer - Bringing balance to all',
    3: 'Path of the Creator - Manifesting beauty',
    4: 'Path of the Builder - Creating lasting foundations',
    5: 'Path of the Liberator - Expanding consciousness',
    6: 'Path of the Nurturer - Healing through love',
    7: 'Path of the Seeker - Unveiling hidden truths',
    8: 'Path of the Master - Commanding material and spiritual realms',
    9: 'Path of the Sage - Serving the collective evolution'
  };
  return paths[conductor] || 'Path of Awakening';
}

function getDivineTiming(year: number): string {
  const timings: Record<number, string> = {
    1: 'Spring energy - Time to plant seeds',
    2: 'Nurturing phase - Patience required',
    3: 'Blossoming period - Express freely',
    4: 'Foundation time - Build carefully',
    5: 'Transition portal - Embrace change',
    6: 'Harvest awareness - Tend relationships',
    7: 'Inner season - Seek within',
    8: 'Manifestation peak - Claim abundance',
    9: 'Completion cycle - Release and renew'
  };
  return timings[year] || 'Divine timing in motion';
}

function getCompatibilityChallenges(num1: number, num2: number, relationship: string): string[] {
  if (relationship === 'Enemies') {
    return [
      `${PLANETARY_LORDS[num1].planet} clashes with ${PLANETARY_LORDS[num2].planet}`,
      'Different core values and approaches',
      'Communication styles may conflict'
    ];
  }
  if (relationship === 'Neutral') {
    return ['May need effort to understand each other', 'Neither naturally drawn nor repelled'];
  }
  return ['Minor adjustments needed', 'Growth through healthy differences'];
}

function getCompatibilityStrengths(num1: number, num2: number, relationship: string): string[] {
  if (relationship === 'Friends') {
    return [
      `${PLANETARY_LORDS[num1].planet} harmonizes with ${PLANETARY_LORDS[num2].planet}`,
      'Natural understanding and flow',
      'Shared values and approaches'
    ];
  }
  if (relationship === 'Enemies') {
    return ['Potential for transformative growth', 'Balance through opposition'];
  }
  return ['Balanced exchange possible', 'Steady, uncomplicated interaction'];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT THE COMPLETE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export const AnkaShastraEngine = {
  // Core calculations
  reduceToSingleDigit,
  calculateDriverNumber,
  calculateConductorNumber,
  calculateVibrationNumber,
  calculatePrasnaRemainder,
  
  // Temporal quantum
  generateTemporalQuantumState,
  
  // Specific readings
  calculateLostObjectReading,
  calculateMoneyRecovery,
  calculateCompatibility,
  
  // Data
  PLANETARY_LORDS,
  KATAPAYADI_MAP,
  COMPATIBILITY_MATRIX,
  
  // Helpers
  getCurrentHora
};

export default AnkaShastraEngine;
