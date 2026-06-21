// ═══════════════════════════════════════════════════════════════════════════════
// ZOE QUANTUM LEVEL: AGASTHYA NADI ENGINE
// Ancient Tamil Palm Leaf Deterministic Predictive System
// Protocol designed for User @moksh50 (Admin) - Module 6000.1
// Kandams: 6 (Shadow), 7 (Matrimony), 12 (Reunion), 13 (Timeline)
// ═══════════════════════════════════════════════════════════════════════════════

import { reduceToSingleDigit, calculateDriverNumber, calculateConductorNumber, type PlanetaryLord } from './AnkaShastraEngine';

// Local planetary reference for engine
const PLANETARY_LORDS: Record<number, { planet: string; sanskrit: string; dayOfWeek: string }> = {
  0: { planet: 'Mars', sanskrit: 'Mangal', dayOfWeek: 'Tuesday' },
  1: { planet: 'Sun', sanskrit: 'Surya', dayOfWeek: 'Sunday' },
  2: { planet: 'Moon', sanskrit: 'Chandra', dayOfWeek: 'Monday' },
  3: { planet: 'Jupiter', sanskrit: 'Guru', dayOfWeek: 'Thursday' },
  4: { planet: 'Rahu', sanskrit: 'Rahu', dayOfWeek: 'Saturday' },
  5: { planet: 'Mercury', sanskrit: 'Budha', dayOfWeek: 'Wednesday' },
  6: { planet: 'Venus', sanskrit: 'Shukra', dayOfWeek: 'Friday' },
  7: { planet: 'Ketu', sanskrit: 'Ketu', dayOfWeek: 'Tuesday' },
  8: { planet: 'Saturn', sanskrit: 'Shani', dayOfWeek: 'Saturday' },
  9: { planet: 'Mars', sanskrit: 'Mangal', dayOfWeek: 'Tuesday' }
};

// ═══════════════════════════════════════════════════════════════════════════════
// THUMBPRINT CLASSIFICATION (OLAI SUVADI PROTOCOL)
// ═══════════════════════════════════════════════════════════════════════════════

export type ThumbPrintPattern = 
  | 'SHANKHA' // Conch - Rightward spiral
  | 'CHAKRA'  // Wheel - Circular pattern
  | 'REKHA'   // Line - Straight patterns
  | 'KOODA'   // Complex interlocking
  | 'MIXED';  // Combination

export type ThumbHand = 'LEFT' | 'RIGHT';

export interface ThumbPrintHash {
  hand: ThumbHand;
  pattern: ThumbPrintPattern;
  spiralDirection: 'clockwise' | 'counterclockwise';
  ridgeCount: number;
  nadiLeafBundle: number; // 1-108
}

// ═══════════════════════════════════════════════════════════════════════════════
// KANDAM DEFINITIONS (NADI CHAPTERS)
// ═══════════════════════════════════════════════════════════════════════════════

export type KandamType = 
  | 'KANDAM_1'  // General - Birth, Life Overview
  | 'KANDAM_2'  // Wealth, Family, Speech
  | 'KANDAM_3'  // Siblings, Courage, Short Travel
  | 'KANDAM_4'  // Mother, Property, Vehicles
  | 'KANDAM_5'  // Children, Creativity, Past Life Karma
  | 'KANDAM_6'  // Enemies, Disease, Occult, Debts
  | 'KANDAM_7'  // Marriage, Partnership
  | 'KANDAM_8'  // Longevity, Accidents, Inheritance
  | 'KANDAM_9'  // Fortune, Father, Guru
  | 'KANDAM_10' // Profession, Fame
  | 'KANDAM_11' // Gains, Elder Siblings
  | 'KANDAM_12' // Loss, Foreign, Liberation, Reunion
  | 'KANDAM_13' // Shanti - Past Life, Remedies
  | 'SPECIAL';  // Combined Analysis

export interface NadiKandam {
  type: KandamType;
  sanskrit: string;
  tamil: string;
  domains: string[];
  planetaryRulers: number[];
  activationConditions: string[];
}

export const NADI_KANDAMS: Record<KandamType, NadiKandam> = {
  KANDAM_1: {
    type: 'KANDAM_1',
    sanskrit: 'जन्म कांड (Janma Kandam)',
    tamil: 'ஜென்ம காண்டம்',
    domains: ['Birth', 'Physical Body', 'Life Overview', 'Self'],
    planetaryRulers: [1], // Sun
    activationConditions: ['Any query about identity', 'Life purpose questions']
  },
  KANDAM_2: {
    type: 'KANDAM_2',
    sanskrit: 'धन कांड (Dhana Kandam)',
    tamil: 'தன காண்டம்',
    domains: ['Wealth', 'Family', 'Speech', 'Food', 'Right Eye'],
    planetaryRulers: [6, 3], // Venus, Jupiter
    activationConditions: ['Money questions', 'Family issues', 'Communication']
  },
  KANDAM_3: {
    type: 'KANDAM_3',
    sanskrit: 'भ्रातृ कांड (Bhratru Kandam)',
    tamil: 'சகோதர காண்டம்',
    domains: ['Siblings', 'Courage', 'Short Travel', 'Skills', 'Arms'],
    planetaryRulers: [9, 5], // Mars, Mercury
    activationConditions: ['Sibling conflicts', 'Courage questions', 'Travel plans']
  },
  KANDAM_4: {
    type: 'KANDAM_4',
    sanskrit: 'मातृ कांड (Matru Kandam)',
    tamil: 'மாத்ரு காண்டம்',
    domains: ['Mother', 'Property', 'Vehicles', 'Education', 'Heart'],
    planetaryRulers: [2, 4], // Moon, Rahu
    activationConditions: ['Property matters', 'Mother health', 'Vehicle purchase']
  },
  KANDAM_5: {
    type: 'KANDAM_5',
    sanskrit: 'पुत्र कांड (Putra Kandam)',
    tamil: 'புத்திர காண்டம்',
    domains: ['Children', 'Creativity', 'Intelligence', 'Past Life Karma', 'Romance'],
    planetaryRulers: [1, 3], // Sun, Jupiter
    activationConditions: ['Fertility issues', 'Creative blocks', 'Past life queries']
  },
  KANDAM_6: {
    type: 'KANDAM_6',
    sanskrit: 'शत्रु कांड (Shatru Kandam)',
    tamil: 'சத்ரு காண்டம்',
    domains: ['Enemies', 'Disease', 'Debts', 'Black Magic', 'Evil Eye', 'Litigation', 'Hidden Obstacles'],
    planetaryRulers: [8, 4, 7], // Saturn, Rahu, Ketu
    activationConditions: ['Enemy detection', 'Occult interference', 'Chronic illness', 'Lie detection', 'Drishti']
  },
  KANDAM_7: {
    type: 'KANDAM_7',
    sanskrit: 'कलत्र कांड (Kalatra Kandam)',
    tamil: 'களத்திர காண்டம்',
    domains: ['Marriage', 'Spouse', 'Partnership', 'Business Partner', 'Public Dealings'],
    planetaryRulers: [6, 2], // Venus, Moon
    activationConditions: ['Marriage timing', 'Spouse nature', 'Partnership compatibility', 'Reunion questions']
  },
  KANDAM_8: {
    type: 'KANDAM_8',
    sanskrit: 'आयु कांड (Ayu Kandam)',
    tamil: 'ஆயுள் காண்டம்',
    domains: ['Longevity', 'Death', 'Accidents', 'Inheritance', 'Occult Sciences', 'Transformation'],
    planetaryRulers: [8, 4, 9], // Saturn, Rahu, Mars
    activationConditions: ['Health crisis', 'Near-death experiences', 'Inheritance matters']
  },
  KANDAM_9: {
    type: 'KANDAM_9',
    sanskrit: 'भाग्य कांड (Bhagya Kandam)',
    tamil: 'பாக்கிய காண்டம்',
    domains: ['Fortune', 'Father', 'Guru', 'Dharma', 'Long Travel', 'Higher Learning'],
    planetaryRulers: [3, 1], // Jupiter, Sun
    activationConditions: ['Luck enhancement', 'Father issues', 'Spiritual guidance']
  },
  KANDAM_10: {
    type: 'KANDAM_10',
    sanskrit: 'कर्म कांड (Karma Kandam)',
    tamil: 'கர்ம காண்டம்',
    domains: ['Profession', 'Fame', 'Authority', 'Reputation', 'Government'],
    planetaryRulers: [1, 8], // Sun, Saturn
    activationConditions: ['Career questions', 'Fame prediction', 'Government matters']
  },
  KANDAM_11: {
    type: 'KANDAM_11',
    sanskrit: 'लाभ कांड (Labha Kandam)',
    tamil: 'லாப காண்டம்',
    domains: ['Gains', 'Income', 'Elder Siblings', 'Fulfillment of Desires', 'Friends'],
    planetaryRulers: [3, 4], // Jupiter, Rahu
    activationConditions: ['Financial gains', 'Desire fulfillment', 'Friend matters']
  },
  KANDAM_12: {
    type: 'KANDAM_12',
    sanskrit: 'मोक्ष कांड (Moksha Kandam)',
    tamil: 'மோக்ஷ காண்டம்',
    domains: ['Loss', 'Expenditure', 'Foreign Land', 'Liberation', 'Separation', 'REUNION', 'Dreams', 'Hospitalization'],
    planetaryRulers: [7, 8, 6], // Ketu, Saturn, Venus
    activationConditions: ['Reunion prediction', 'Separation analysis', 'Foreign settlement', 'Liberation path']
  },
  KANDAM_13: {
    type: 'KANDAM_13',
    sanskrit: 'शांति कांड (Shanti Kandam)',
    tamil: 'சாந்தி காண்டம்',
    domains: ['Past Life Sins', 'Karmic Remediation', 'Temple Remedies', 'Pariharam', 'Ancestral Curse'],
    planetaryRulers: [7, 4, 8], // Ketu, Rahu, Saturn
    activationConditions: ['Chronic problems', 'Unexplained suffering', 'Karmic debt resolution']
  },
  SPECIAL: {
    type: 'SPECIAL',
    sanskrit: 'विशेष कांड (Vishesha Kandam)',
    tamil: 'விசேஷ காண்டம்',
    domains: ['Combined Analysis', 'Multi-Kandam Synthesis'],
    planetaryRulers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    activationConditions: ['Complex queries requiring multiple Kandam cross-reference']
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// KANDAM 6: SHATRU (SHADOW) ANALYSIS - LIE/OCCULT DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ShatruDosha {
  level: 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  score: number; // 0-100
  deceptionIndicators: string[];
  hiddenEnemies: string[];
  occultInterference: {
    detected: boolean;
    type: 'DRISHTI' | 'ABHICHARA' | 'PRETA_BADHA' | 'ANCESTRAL' | 'NONE';
    severity: number;
    source: string;
  };
  planetaryAfflictions: number[];
  remedies: string[];
}

export interface LieDetectionResult {
  truthProbability: number; // 0-100
  deceptionScore: number; // 0-100
  hiddenMotiveActive: boolean;
  shatruDosha: ShatruDosha;
  conflictingPlanets: number[];
  analysis: string;
  recommendation: string;
}

/**
 * Kandam 6: Detect lies, hidden motives, and occult interference
 */
export function analyzeKandam6Shadow(
  driverNumber: number,
  conductorNumber: number,
  queryTimestamp: Date = new Date()
): LieDetectionResult {
  const dateNumber = reduceToSingleDigit(queryTimestamp.getDate());
  const hourNumber = reduceToSingleDigit(queryTimestamp.getHours());
  
  // Shadow calculation: 6th house analysis
  const shadowNumber = reduceToSingleDigit(driverNumber + 6);
  const conflictScore = calculateConflictScore(driverNumber, conductorNumber, shadowNumber);
  
  // Rahu-Ketu axis check (nodes of deception)
  const rahuInfluence = (driverNumber === 4 || conductorNumber === 4) ? 25 : 0;
  const ketuInfluence = (driverNumber === 7 || conductorNumber === 7) ? 20 : 0;
  
  // Saturn's hidden enemy check
  const saturnBlock = (driverNumber === 8 || dateNumber === 8) ? 15 : 0;
  
  // Total deception score
  const deceptionScore = Math.min(100, conflictScore + rahuInfluence + ketuInfluence + saturnBlock);
  const truthProbability = 100 - deceptionScore;
  
  // Occult interference detection
  const occultDetected = deceptionScore > 60 && (rahuInfluence > 0 || ketuInfluence > 0);
  
  const shatruDosha: ShatruDosha = {
    level: getShatruLevel(deceptionScore),
    score: deceptionScore,
    deceptionIndicators: getDeceptionIndicators(driverNumber, conductorNumber, shadowNumber),
    hiddenEnemies: getHiddenEnemies(shadowNumber, dateNumber),
    occultInterference: {
      detected: occultDetected,
      type: occultDetected ? determineOccultType(driverNumber, conductorNumber, shadowNumber) : 'NONE',
      severity: occultDetected ? Math.floor(deceptionScore * 0.8) : 0,
      source: occultDetected ? getOccultSource(shadowNumber) : 'None detected'
    },
    planetaryAfflictions: [4, 7, 8].filter(n => [driverNumber, conductorNumber, shadowNumber].includes(n)),
    remedies: getKandam6Remedies(deceptionScore, occultDetected)
  };
  
  return {
    truthProbability,
    deceptionScore,
    hiddenMotiveActive: deceptionScore > 40,
    shatruDosha,
    conflictingPlanets: shatruDosha.planetaryAfflictions,
    analysis: generateShadowAnalysis(shatruDosha),
    recommendation: generateShadowRecommendation(shatruDosha)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// KANDAM 7 & 12: RELATIONSHIP REUNION ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReunionTimeline {
  separationDate: Date | null;
  currentPhase: 'SEPARATION' | 'COOLING' | 'REFLECTION' | 'RECONCILIATION' | 'REUNION';
  reunionProbability: number; // 0-100
  destinyCertaintyScore: number; // 0-100
  predictedReunionWindow: {
    startMonth: string;
    endMonth: string;
    year: number;
    peakProbabilityDate: string;
  };
  transitInfluence: {
    favorableTransits: string[];
    challengingTransits: string[];
    nextFavorableWindow: string;
  };
  karmicFactors: string[];
  actionRequired: string[];
  mantras: string[];
}

export interface RelationshipReunionResult {
  kandam7Analysis: {
    spouseKarma: string;
    partnershipEnergy: number;
    venusStrength: number;
  };
  kandam12Analysis: {
    separationCause: string;
    liberationPath: string;
    reunionDestiny: string;
  };
  reunionTimeline: ReunionTimeline;
  combinedDestinyScore: number;
  verdict: string;
}

/**
 * Kandam 7 + 12: Calculate relationship reunion probability
 */
export function analyzeReunionProbability(
  person1Driver: number,
  person1Conductor: number,
  person2Driver: number,
  person2Conductor: number,
  separationDate?: Date
): RelationshipReunionResult {
  const currentDate = new Date();
  
  // Venus strength (7th house ruler)
  const venusStrength = calculateVenusStrength(person1Driver, person2Driver);
  
  // Ketu influence (12th house - separation/liberation)
  const ketuInfluence = calculateKetuInfluence(person1Conductor, person2Conductor);
  
  // Compatibility base
  const compatibilityScore = calculateBaseCompatibility(person1Driver, person2Driver);
  
  // Transit calculations
  const currentYear = currentDate.getFullYear();
  const person1PersonalYear = reduceToSingleDigit(currentYear + person1Driver + person1Conductor);
  const person2PersonalYear = reduceToSingleDigit(currentYear + person2Driver + person2Conductor);
  
  // Reunion probability algorithm
  const reunionBase = (venusStrength * 0.4) + (compatibilityScore * 0.3) + ((100 - ketuInfluence) * 0.3);
  
  // Favorable transit windows
  const favorableTransits = getFavorableTransits(person1PersonalYear, person2PersonalYear);
  const reunionProbability = Math.min(99.8, reunionBase + (favorableTransits.length * 5));
  
  // Calculate reunion window
  const reunionWindow = calculateReunionWindow(
    person1PersonalYear, 
    person2PersonalYear, 
    currentYear,
    separationDate
  );
  
  const reunionTimeline: ReunionTimeline = {
    separationDate: separationDate || null,
    currentPhase: determineRelationshipPhase(separationDate, reunionProbability),
    reunionProbability,
    destinyCertaintyScore: Math.min(99.8, reunionBase),
    predictedReunionWindow: reunionWindow,
    transitInfluence: {
      favorableTransits,
      challengingTransits: getChallengingTransits(person1PersonalYear, person2PersonalYear),
      nextFavorableWindow: reunionWindow.startMonth + ' ' + reunionWindow.year
    },
    karmicFactors: getKarmicFactors(person1Conductor, person2Conductor),
    actionRequired: getReunionActions(reunionProbability, person1Driver),
    mantras: getReunionMantras(person1Driver, person2Driver)
  };
  
  return {
    kandam7Analysis: {
      spouseKarma: getSpouseKarma(person2Driver, person2Conductor),
      partnershipEnergy: compatibilityScore,
      venusStrength
    },
    kandam12Analysis: {
      separationCause: getSeparationCause(ketuInfluence, person1Conductor, person2Conductor),
      liberationPath: getLiberationPath(person1Conductor),
      reunionDestiny: getReunionDestiny(reunionProbability)
    },
    reunionTimeline,
    combinedDestinyScore: Math.round(reunionProbability * 100) / 100,
    verdict: generateReunionVerdict(reunionProbability, reunionTimeline)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// KANDAM 13: SHANTI - PAST LIFE KARMA & REMEDIATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface PastLifeKarma {
  primaryKarmicDebt: string;
  secondaryKarma: string[];
  ancestralCurse: {
    detected: boolean;
    type: string;
    origin: string;
    generationsAffected: number;
  };
  pariharams: Pariharam[];
  templeRemedies: TempleRemedy[];
  mantras: string[];
  yantras: string[];
}

export interface Pariharam {
  name: string;
  description: string;
  procedure: string;
  timing: string;
  cost: string;
  effectiveness: number; // 0-100
}

export interface TempleRemedy {
  templeName: string;
  deity: string;
  location: string;
  ritual: string;
  timing: string;
  benefit: string;
}

/**
 * Kandam 13: Analyze past life karma and generate remedies
 */
export function analyzeKandam13Shanti(
  driverNumber: number,
  conductorNumber: number,
  vibrationNumber: number
): PastLifeKarma {
  const karmicNumber = reduceToSingleDigit(driverNumber + conductorNumber + vibrationNumber);
  
  // Ancestral curse detection (Pitru Dosha)
  const pitruDosha = detectPitruDosha(driverNumber, conductorNumber, karmicNumber);
  
  return {
    primaryKarmicDebt: getPrimaryKarmicDebt(karmicNumber),
    secondaryKarma: getSecondaryKarma(driverNumber, conductorNumber),
    ancestralCurse: {
      detected: pitruDosha.detected,
      type: pitruDosha.type,
      origin: pitruDosha.origin,
      generationsAffected: pitruDosha.generations
    },
    pariharams: generatePariharams(karmicNumber, driverNumber),
    templeRemedies: getTempleRemedies(karmicNumber, driverNumber),
    mantras: getMantras(karmicNumber),
    yantras: getYantras(karmicNumber)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NADI PREDICTOR CLASS - MAIN ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface NadiPrediction {
  thumbprint: ThumbPrintHash | null;
  activatedKandams: KandamType[];
  kandam6Result?: LieDetectionResult;
  kandam7_12Result?: RelationshipReunionResult;
  kandam13Result?: PastLifeKarma;
  destinyCertaintyScore: number;
  quantumTimeline: {
    past: string[];
    present: string;
    future: string[];
  };
  overallVerdict: string;
}

export class NadiPredictor {
  private driverNumber: number;
  private conductorNumber: number;
  private vibrationNumber: number;
  private nadiLeafBundle: number;
  
  constructor(
    name: string,
    dateOfBirth: Date,
    thumbPattern?: ThumbPrintPattern,
    thumbHand?: ThumbHand
  ) {
    const day = dateOfBirth.getDate();
    const month = dateOfBirth.getMonth() + 1;
    const year = dateOfBirth.getFullYear();
    
    this.driverNumber = reduceToSingleDigit(day);
    this.conductorNumber = reduceToSingleDigit(day + month + year);
    this.vibrationNumber = this.calculateNameNumber(name);
    this.nadiLeafBundle = this.calculateNadiBundle(thumbPattern, thumbHand);
  }
  
  private calculateNameNumber(name: string): number {
    const KATAPAYADI: Record<string, number> = {
      'A': 1, 'I': 1, 'J': 1, 'Y': 1, 'Q': 1,
      'B': 2, 'K': 2, 'R': 2,
      'C': 3, 'G': 3, 'L': 3, 'S': 3,
      'D': 4, 'M': 4, 'T': 4,
      'E': 5, 'H': 5, 'N': 5, 'X': 5,
      'U': 6, 'V': 6, 'W': 6,
      'O': 7, 'Z': 7,
      'F': 8, 'P': 8
    };
    
    const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '');
    let total = 0;
    for (const char of cleanName) {
      total += KATAPAYADI[char] || 0;
    }
    return reduceToSingleDigit(total);
  }
  
  private calculateNadiBundle(pattern?: ThumbPrintPattern, hand?: ThumbHand): number {
    // Simplified bundle calculation based on numerology when no thumb data
    const base = (this.driverNumber * 12) % 108;
    const modifier = hand === 'LEFT' ? 0 : 54;
    return ((base + modifier) % 108) + 1;
  }
  
  /**
   * Run complete Nadi analysis
   */
  analyze(queryTypes: KandamType[]): NadiPrediction {
    const activatedKandams = queryTypes.length > 0 ? queryTypes : ['SPECIAL'] as KandamType[];
    
    const prediction: NadiPrediction = {
      thumbprint: null,
      activatedKandams,
      destinyCertaintyScore: 0,
      quantumTimeline: {
        past: [],
        present: '',
        future: []
      },
      overallVerdict: ''
    };
    
    let totalScore = 0;
    let scoreCount = 0;
    
    // Kandam 6 Analysis
    if (activatedKandams.includes('KANDAM_6') || activatedKandams.includes('SPECIAL')) {
      prediction.kandam6Result = analyzeKandam6Shadow(this.driverNumber, this.conductorNumber);
      totalScore += prediction.kandam6Result.truthProbability;
      scoreCount++;
    }
    
    // Kandam 7 & 12 Analysis (requires partner data - use self-analysis)
    if (activatedKandams.includes('KANDAM_7') || activatedKandams.includes('KANDAM_12') || activatedKandams.includes('SPECIAL')) {
      prediction.kandam7_12Result = analyzeReunionProbability(
        this.driverNumber,
        this.conductorNumber,
        this.vibrationNumber, // Using vibration as proxy for partner
        reduceToSingleDigit(this.driverNumber + this.conductorNumber)
      );
      totalScore += prediction.kandam7_12Result.combinedDestinyScore;
      scoreCount++;
    }
    
    // Kandam 13 Analysis
    if (activatedKandams.includes('KANDAM_13') || activatedKandams.includes('SPECIAL')) {
      prediction.kandam13Result = analyzeKandam13Shanti(
        this.driverNumber,
        this.conductorNumber,
        this.vibrationNumber
      );
    }
    
    // Calculate overall destiny certainty
    prediction.destinyCertaintyScore = scoreCount > 0 ? Math.min(99.8, totalScore / scoreCount) : 75;
    
    // Generate quantum timeline
    prediction.quantumTimeline = this.generateQuantumTimeline();
    
    // Overall verdict
    prediction.overallVerdict = this.generateOverallVerdict(prediction);
    
    return prediction;
  }
  
  private generateQuantumTimeline(): NadiPrediction['quantumTimeline'] {
    const currentYear = new Date().getFullYear();
    const personalYear = reduceToSingleDigit(currentYear + this.driverNumber + this.conductorNumber);
    
    return {
      past: [
        `Karmic cycle from ${currentYear - 9} brought foundational lessons`,
        `Major transformation in ${currentYear - personalYear} shaped current path`,
        `Ancestral karma active since ${currentYear - (this.conductorNumber * 3)} years`
      ],
      present: `Personal Year ${personalYear} - ${getPersonalYearMeaning(personalYear)}`,
      future: [
        `Next major shift: ${currentYear + (9 - personalYear)} - Cycle completion`,
        `Peak manifestation window: ${getNextPeakWindow(personalYear, currentYear)}`,
        `Long-term destiny alignment: ${currentYear + 9} - New beginning`
      ]
    };
  }
  
  private generateOverallVerdict(prediction: NadiPrediction): string {
    const certainty = Math.round(prediction.destinyCertaintyScore * 10) / 10;
    
    if (certainty >= 90) {
      return `NADI CERTAINTY: ${certainty}% - The palm leaves speak with absolute clarity. Your destiny path is HIGHLY DETERMINED. The events foretold WILL manifest.`;
    } else if (certainty >= 70) {
      return `NADI CERTAINTY: ${certainty}% - Strong karmic indicators present. Events are LIKELY to unfold as predicted. Minor variations possible based on free will actions.`;
    } else if (certainty >= 50) {
      return `NADI CERTAINTY: ${certainty}% - Mixed planetary influences detected. Outcome depends on actions taken in the CURRENT WINDOW. Remedies recommended.`;
    } else {
      return `NADI CERTAINTY: ${certainty}% - Karmic interference detected. Multiple paths available. Intensive pariharam required for desired outcome.`;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function calculateConflictScore(driver: number, conductor: number, shadow: number): number {
  const malefics = [4, 7, 8, 9];
  let score = 0;
  
  if (malefics.includes(shadow)) score += 20;
  if (malefics.includes(driver)) score += 15;
  if (malefics.includes(conductor)) score += 10;
  if (driver !== conductor) score += 10;
  
  return Math.min(50, score);
}

function getShatruLevel(score: number): ShatruDosha['level'] {
  if (score < 20) return 'NONE';
  if (score < 40) return 'MINOR';
  if (score < 60) return 'MODERATE';
  if (score < 80) return 'SEVERE';
  return 'CRITICAL';
}

function getDeceptionIndicators(driver: number, conductor: number, shadow: number): string[] {
  const indicators: string[] = [];
  
  if (shadow === 4) indicators.push('Rahu in 6th - Hidden agenda from shadows');
  if (shadow === 7) indicators.push('Ketu in 6th - Confusion masking truth');
  if (shadow === 8) indicators.push('Saturn in 6th - Long-term deception pattern');
  if (driver !== conductor) indicators.push('Soul-Destiny conflict - Internal contradiction');
  if ([4, 7, 8].includes(conductor)) indicators.push('Malefic destiny - Attracts deceptive situations');
  
  return indicators.length > 0 ? indicators : ['No significant deception indicators'];
}

function getHiddenEnemies(shadow: number, date: number): string[] {
  const enemies: string[] = [];
  const combinedInfluence = reduceToSingleDigit(shadow + date);
  
  if (combinedInfluence === 4) enemies.push('Enemy from foreign/unusual source');
  if (combinedInfluence === 6) enemies.push('Enemy through romantic connection');
  if (combinedInfluence === 8) enemies.push('Enemy from workplace/professional circle');
  if (combinedInfluence === 9) enemies.push('Enemy through conflict/competition');
  
  return enemies.length > 0 ? enemies : ['No active hidden enemies detected'];
}

function determineOccultType(driver: number, conductor: number, shadow: number): ShatruDosha['occultInterference']['type'] {
  if (shadow === 4 && [4, 8].includes(conductor)) return 'ABHICHARA'; // Black magic
  if (shadow === 7) return 'PRETA_BADHA'; // Spirit interference
  if ([4, 7].includes(driver) || [4, 7].includes(conductor)) return 'DRISHTI'; // Evil eye
  if (shadow === 8) return 'ANCESTRAL'; // Ancestral curse
  return 'DRISHTI';
}

function getOccultSource(shadow: number): string {
  const sources: Record<number, string> = {
    1: 'Authority figure or father figure',
    2: 'Female relative or emotional connection',
    3: 'Teacher, guru, or elder',
    4: 'Foreign connection or unusual source',
    5: 'Communication or business associate',
    6: 'Romantic rival or jealous person',
    7: 'Spiritual practitioner or unknown source',
    8: 'Professional rival or Saturn-influenced person',
    9: 'Competitive enemy or Mars-influenced aggressor'
  };
  return sources[shadow] || 'Unknown source - deeper analysis required';
}

function getKandam6Remedies(score: number, occultDetected: boolean): string[] {
  const remedies: string[] = [];
  
  if (score >= 60) {
    remedies.push('Immediate Durga Saptashati recitation');
    remedies.push('Black sesame donation on Saturday');
  }
  if (occultDetected) {
    remedies.push('Hanuman Chalisa 11 times daily for 40 days');
    remedies.push('Visit Sudarshana Homa at nearest temple');
    remedies.push('Wear iron ring on middle finger (Saturday)');
  }
  if (score >= 40) {
    remedies.push('Salt water mopping of home');
    remedies.push('Neem leaves at entrance');
    remedies.push('Camphor burning at dusk');
  }
  
  return remedies.length > 0 ? remedies : ['Maintain regular spiritual practice'];
}

function generateShadowAnalysis(dosha: ShatruDosha): string {
  if (dosha.level === 'NONE') {
    return 'No significant shadow energy detected. The field is clear for truth and transparency.';
  }
  
  const occultNote = dosha.occultInterference.detected 
    ? ` ALERT: External energetic interference (${dosha.occultInterference.type}) detected from ${dosha.occultInterference.source}.`
    : '';
  
  return `SHATRU DOSHA LEVEL: ${dosha.level}. Deception probability at ${dosha.score}%. ${dosha.deceptionIndicators.join('. ')}.${occultNote}`;
}

function generateShadowRecommendation(dosha: ShatruDosha): string {
  if (dosha.level === 'CRITICAL') {
    return 'URGENT: Do not proceed with any major decisions. Seek temple remedy immediately. Hidden forces actively working against you.';
  }
  if (dosha.level === 'SEVERE') {
    return 'HIGH CAUTION: Verify all information independently. Perform protective remedies before proceeding.';
  }
  if (dosha.level === 'MODERATE') {
    return 'MODERATE ALERT: Hidden motives possible. Trust but verify. Protective mantras recommended.';
  }
  return 'CLEAR: Proceed with awareness. Maintain spiritual protection practices.';
}

function calculateVenusStrength(driver1: number, driver2: number): number {
  // Venus is strong when numbers are 6, 2, or in harmony
  const venusNumbers = [2, 6];
  let strength = 50;
  
  if (venusNumbers.includes(driver1)) strength += 20;
  if (venusNumbers.includes(driver2)) strength += 20;
  if (Math.abs(driver1 - driver2) <= 2) strength += 10;
  
  return Math.min(100, strength);
}

function calculateKetuInfluence(conductor1: number, conductor2: number): number {
  // Ketu (7) indicates separation energy
  let influence = 20;
  
  if (conductor1 === 7 || conductor2 === 7) influence += 30;
  if (conductor1 === 4 || conductor2 === 4) influence += 20; // Rahu also separates
  if (conductor1 === 8 || conductor2 === 8) influence += 15; // Saturn delays
  
  return Math.min(80, influence);
}

function calculateBaseCompatibility(driver1: number, driver2: number): number {
  const COMPAT_MATRIX: Record<number, number[]> = {
    1: [1, 2, 3, 9],
    2: [1, 2, 3, 5],
    3: [1, 2, 3, 9],
    4: [4, 5, 6, 8],
    5: [1, 4, 5, 6],
    6: [4, 5, 6, 8],
    7: [6, 7, 9],
    8: [4, 5, 6, 8],
    9: [1, 2, 3, 9]
  };
  
  const compatible = COMPAT_MATRIX[driver1] || [];
  if (compatible.includes(driver2)) return 85;
  if (Math.abs(driver1 - driver2) <= 1) return 70;
  return 50;
}

function getFavorableTransits(year1: number, year2: number): string[] {
  const transits: string[] = [];
  
  if (year1 === 6 || year2 === 6) transits.push('Venus transit - Love energy activated');
  if (year1 === 2 || year2 === 2) transits.push('Moon transit - Emotional reconnection possible');
  if (year1 === 3 || year2 === 3) transits.push('Jupiter transit - Divine blessing for union');
  if (year1 + year2 === 9) transits.push('Completion cycle - Destiny reunion window');
  
  return transits;
}

function getChallengingTransits(year1: number, year2: number): string[] {
  const challenges: string[] = [];
  
  if (year1 === 8 || year2 === 8) challenges.push('Saturn delay - Patience required');
  if (year1 === 4 || year2 === 4) challenges.push('Rahu confusion - Clarity needed');
  if (year1 === 7 || year2 === 7) challenges.push('Ketu detachment - Spiritual test');
  
  return challenges;
}

function calculateReunionWindow(year1: number, year2: number, currentYear: number, separationDate?: Date): ReunionTimeline['predictedReunionWindow'] {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Calculate optimal months based on personal years
  const startMonthIndex = (year1 + year2) % 12;
  const endMonthIndex = (startMonthIndex + 3) % 12;
  const peakIndex = (startMonthIndex + 1) % 12;
  
  // Year calculation
  let targetYear = currentYear;
  if (separationDate) {
    const monthsSinceSeparation = Math.floor((Date.now() - separationDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
    if (monthsSinceSeparation < 6) targetYear = currentYear + 1;
  }
  
  return {
    startMonth: months[startMonthIndex],
    endMonth: months[endMonthIndex],
    year: targetYear,
    peakProbabilityDate: `${months[peakIndex]} 15-21, ${targetYear}`
  };
}

function determineRelationshipPhase(separationDate: Date | undefined, probability: number): ReunionTimeline['currentPhase'] {
  if (!separationDate) return probability > 70 ? 'RECONCILIATION' : 'REFLECTION';
  
  const monthsSince = Math.floor((Date.now() - separationDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
  
  if (monthsSince < 1) return 'SEPARATION';
  if (monthsSince < 3) return 'COOLING';
  if (monthsSince < 6) return 'REFLECTION';
  if (probability > 70) return 'RECONCILIATION';
  return 'REFLECTION';
}

function getKarmicFactors(conductor1: number, conductor2: number): string[] {
  const factors: string[] = [];
  
  if (conductor1 === conductor2) factors.push('STRONG: Same destiny path - Deep karmic bond');
  if (Math.abs(conductor1 - conductor2) === 5) factors.push('BALANCING: Opposite energies seeking wholeness');
  if ([conductor1, conductor2].includes(7)) factors.push('SPIRITUAL: Past life connection requiring resolution');
  if ([conductor1, conductor2].includes(4)) factors.push('OBSESSIVE: Intense magnetic pull - Handle carefully');
  
  return factors.length > 0 ? factors : ['NEUTRAL: Standard karmic interaction'];
}

function getReunionActions(probability: number, driver: number): string[] {
  const actions: string[] = [];
  
  if (probability > 70) {
    actions.push('Initiate contact during favorable transit window');
    actions.push('Perform Venus puja on Friday');
  } else {
    actions.push('Focus on self-improvement first');
    actions.push('Complete recommended pariharams');
  }
  
  actions.push(`Wear ${driver === 6 ? 'white' : driver === 2 ? 'pearl' : 'rose quartz'} on Friday`);
  
  return actions;
}

function getReunionMantras(driver1: number, driver2: number): string[] {
  return [
    'Om Shukraya Namaha (108 times daily)',
    'Kamdev Gayatri Mantra',
    'Om Kleem Krishnaya Namaha (for attraction)',
    driver1 + driver2 === 9 ? 'Radha Krishna Mantra (special affinity)' : 'Om Parvatiye Namaha'
  ];
}

function getSpouseKarma(driver: number, conductor: number): string {
  const karmas: Record<number, string> = {
    1: 'Authoritative partner - Leadership dynamics',
    2: 'Nurturing partner - Emotional connection focus',
    3: 'Wise partner - Spiritual/intellectual bond',
    4: 'Intense partner - Transformation through relationship',
    5: 'Communicative partner - Mental stimulation needed',
    6: 'Romantic partner - Pleasure and harmony seeking',
    7: 'Mysterious partner - Spiritual lessons through love',
    8: 'Disciplined partner - Karmic duties in partnership',
    9: 'Dynamic partner - Action-oriented relationship'
  };
  
  return karmas[driver] || 'Unique karmic bond - Special destiny';
}

function getSeparationCause(ketuInfluence: number, conductor1: number, conductor2: number): string {
  if (ketuInfluence > 60) return 'Spiritual lesson requiring temporary separation';
  if (conductor1 === 4 || conductor2 === 4) return 'Obsessive patterns creating distance';
  if (conductor1 === 8 || conductor2 === 8) return 'Saturn\'s karmic test of patience';
  return 'Temporary misalignment of life paths';
}

function getLiberationPath(conductor: number): string {
  const paths: Record<number, string> = {
    1: 'Through self-empowerment and independence',
    2: 'Through emotional healing and self-love',
    3: 'Through wisdom and forgiveness',
    4: 'Through releasing obsessive attachments',
    5: 'Through clear communication and understanding',
    6: 'Through accepting love as it is',
    7: 'Through spiritual surrender',
    8: 'Through patience and karmic acceptance',
    9: 'Through action and initiative'
  };
  
  return paths[conductor] || 'Through conscious awareness';
}

function getReunionDestiny(probability: number): string {
  if (probability >= 90) return 'DESTINED: Reunion written in the stars - WILL OCCUR';
  if (probability >= 70) return 'HIGHLY LIKELY: Strong karmic pull - Favorable outcome expected';
  if (probability >= 50) return 'POSSIBLE: Depends on actions of both parties';
  return 'REQUIRES WORK: Intensive remedy and effort needed';
}

function generateReunionVerdict(probability: number, timeline: ReunionTimeline): string {
  const certainty = Math.round(probability * 10) / 10;
  
  return `REUNION PROBABILITY: ${certainty}%
Current Phase: ${timeline.currentPhase}
Predicted Window: ${timeline.predictedReunionWindow.startMonth} - ${timeline.predictedReunionWindow.endMonth} ${timeline.predictedReunionWindow.year}
Peak Date: ${timeline.predictedReunionWindow.peakProbabilityDate}
${certainty >= 70 ? '⚡ STRONG DESTINY ALIGNMENT DETECTED' : '⚠️ Additional remedies recommended for optimal outcome'}`;
}

function detectPitruDosha(driver: number, conductor: number, karmic: number): { detected: boolean; type: string; origin: string; generations: number } {
  const maleficInfluence = [4, 7, 8].filter(n => [driver, conductor, karmic].includes(n)).length;
  
  return {
    detected: maleficInfluence >= 2,
    type: maleficInfluence >= 2 ? (karmic === 8 ? 'Severe Pitru Dosha' : 'Moderate Ancestral Imbalance') : 'None',
    origin: maleficInfluence >= 2 ? 'Unfulfilled duties to ancestors' : 'Clear',
    generations: maleficInfluence >= 2 ? 3 + karmic : 0
  };
}

function getPrimaryKarmicDebt(karmic: number): string {
  const debts: Record<number, string> = {
    1: 'Pride/Ego from position of power - Humility lessons',
    2: 'Emotional manipulation - Genuine love lessons',
    3: 'Misuse of wisdom/teaching - Service lessons',
    4: 'Obsessive attachment - Detachment lessons',
    5: 'Deceptive communication - Truth lessons',
    6: 'Misuse of beauty/pleasure - Discipline lessons',
    7: 'Spiritual ego - Surrender lessons',
    8: 'Abuse of authority - Karmic justice lessons',
    9: 'Aggressive actions - Compassion lessons'
  };
  
  return debts[karmic] || 'Unique karmic pattern requiring deeper analysis';
}

function getSecondaryKarma(driver: number, conductor: number): string[] {
  const karma: string[] = [];
  
  if (driver !== conductor) karma.push('Soul-Destiny misalignment from past life');
  if ([4, 7, 8].includes(driver)) karma.push('Malefic driver - Action karma from past');
  if ([4, 7, 8].includes(conductor)) karma.push('Malefic conductor - Destiny karma from past');
  
  return karma.length > 0 ? karma : ['Balanced secondary karma'];
}

function generatePariharams(karmic: number, driver: number): Pariharam[] {
  const pariharams: Pariharam[] = [
    {
      name: 'Navagraha Shanti',
      description: 'Appeasement of all nine planets',
      procedure: 'Perform homa with specific mantras for each planet',
      timing: 'Amavasya or Purnima',
      cost: 'Moderate',
      effectiveness: 85
    },
    {
      name: `${PLANETARY_LORDS[driver]?.planet || 'Ruling Planet'} Shanti`,
      description: `Specific remedy for ${PLANETARY_LORDS[driver]?.planet || 'your ruling planet'}`,
      procedure: `Recite ${PLANETARY_LORDS[driver]?.planet || 'planet'} mantra 108 times daily`,
      timing: PLANETARY_LORDS[driver]?.dayOfWeek || 'Appropriate day',
      cost: 'Low',
      effectiveness: 75
    }
  ];
  
  if (karmic >= 7) {
    pariharams.push({
      name: 'Ketu Pariharam',
      description: 'Remedy for past life karma liberation',
      procedure: 'Offer grey/multicolor cloth at Ketu temple',
      timing: 'Tuesday or Saturday',
      cost: 'Low',
      effectiveness: 70
    });
  }
  
  return pariharams;
}

function getTempleRemedies(karmic: number, driver: number): TempleRemedy[] {
  return [
    {
      templeName: 'Thirunageswaram (Rahu Temple)',
      deity: 'Rahu Bhagavan',
      location: 'Tamil Nadu, India',
      ritual: 'Rahu Kala puja with milk abhishekam',
      timing: 'Rahu Kala on any day',
      benefit: 'Removes hidden obstacles and enemy influence'
    },
    {
      templeName: 'Keezhperumpallam (Ketu Temple)',
      deity: 'Ketu Bhagavan',
      location: 'Tamil Nadu, India',
      ritual: 'Ketu puja with specific offerings',
      timing: 'Tuesday',
      benefit: 'Past life karma resolution and liberation'
    },
    {
      templeName: 'Thirukadaiyur',
      deity: 'Lord Shiva as Amritaghateswarar',
      location: 'Tamil Nadu, India',
      ritual: 'Abhishekam and archana',
      timing: 'Pradosham',
      benefit: 'Longevity and removal of death fear'
    }
  ];
}

function getMantras(karmic: number): string[] {
  return [
    'Om Namah Shivaya (Universal protection)',
    'Mahamrityunjaya Mantra (Removes fear and obstacles)',
    `Om ${PLANETARY_LORDS[karmic]?.sanskrit || 'Graha'}aya Namaha (Specific karmic relief)`,
    'Gayatri Mantra (Overall spiritual elevation)'
  ];
}

function getYantras(karmic: number): string[] {
  return [
    'Shree Yantra (Overall prosperity)',
    'Navagraha Yantra (Planetary balance)',
    `${PLANETARY_LORDS[karmic]?.planet || 'Specific'} Yantra (Karmic remedy)`,
    'Sudarshana Yantra (Protection from negativity)'
  ];
}

function getPersonalYearMeaning(year: number): string {
  const meanings: Record<number, string> = {
    1: 'New beginnings, independence, leadership opportunities',
    2: 'Partnerships, patience, cooperation needed',
    3: 'Creative expression, social expansion, joy',
    4: 'Hard work, foundation building, discipline',
    5: 'Change, freedom, adventure, unexpected turns',
    6: 'Love, responsibility, family, harmony',
    7: 'Introspection, spiritual growth, solitude',
    8: 'Power, success, karma, material gains',
    9: 'Completion, release, humanitarian focus'
  };
  
  return meanings[year] || 'Unique energy pattern';
}

function getNextPeakWindow(personalYear: number, currentYear: number): string {
  const peakYear = personalYear >= 8 ? currentYear + 1 : currentYear + (9 - personalYear);
  const peakMonth = ((personalYear * 2) % 12) + 1;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  return `${months[peakMonth - 1]} ${peakYear}`;
}

// Export main functions
export {
  analyzeKandam6Shadow as analyzeShadow,
  analyzeReunionProbability as analyzeReunion,
  analyzeKandam13Shanti as analyzeKarma
};
