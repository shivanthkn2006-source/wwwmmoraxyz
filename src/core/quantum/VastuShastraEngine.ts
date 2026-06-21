// ═══════════════════════════════════════════════════════════════════════════════
// ZOE QUANTUM LEVEL: VASTU SHASTRA ENGINE
// Ancient Vedic Space-Time Quantum Analysis (Sthapatya Veda - 5000 Year Archive)
// Protocol designed for User @moksh50 (Admin) - Module 5000.1
// ═══════════════════════════════════════════════════════════════════════════════

import { PlanetaryLord, reduceToSingleDigit, calculateDriverNumber, calculateConductorNumber } from './AnkaShastraEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1: VASTU PURUSHA MANDALA (THE GRID)
// ═══════════════════════════════════════════════════════════════════════════════

export type VastuDirection = 
  | 'NORTH' 
  | 'NORTH_EAST' 
  | 'EAST' 
  | 'SOUTH_EAST' 
  | 'SOUTH' 
  | 'SOUTH_WEST' 
  | 'WEST' 
  | 'NORTH_WEST' 
  | 'CENTER';

export type VastuElement = 'Water' | 'Fire' | 'Earth' | 'Air' | 'Ether' | 'Water+Space' | 'Earth+Fire';

export interface VastuZone {
  direction: VastuDirection;
  element: VastuElement;
  deity: string;
  sanskrit: string;
  attributes: string[];
  impactIfBlocked: string;
  idealRooms: string[];
  avoidRooms: string[];
  colorRemedies: string[];
  elementalRemedies: string[];
}

export const VASTU_MANDALA: Record<VastuDirection, VastuZone> = {
  NORTH: {
    direction: 'NORTH',
    element: 'Water',
    deity: 'Kuber',
    sanskrit: 'उत्तर (Uttara)',
    attributes: ['Wealth', 'Career', 'Opportunity', 'Flow'],
    impactIfBlocked: 'Financial loss, stagnant career, blocked opportunities',
    idealRooms: ['Living Room', 'Treasury', 'Office', 'Safe', 'Water Features'],
    avoidRooms: ['Toilet', 'Kitchen', 'Heavy Storage'],
    colorRemedies: ['Blue', 'Green', 'Silver'],
    elementalRemedies: ['Aquarium', 'Water fountain', 'Mirror', 'Silver items']
  },
  NORTH_EAST: {
    direction: 'NORTH_EAST',
    element: 'Water+Space',
    deity: 'Shiva',
    sanskrit: 'ईशान (Ishan)',
    attributes: ['Clarity', 'Spirituality', 'Vision', 'Cosmic Connection', 'Enlightenment'],
    impactIfBlocked: 'Confusion, neurological issues, lack of clarity, spiritual disconnect',
    idealRooms: ['Prayer Room', 'Meditation Space', 'Well', 'Open Space'],
    avoidRooms: ['Toilet', 'Kitchen', 'Heavy Furniture', 'Stairs'],
    colorRemedies: ['White', 'Light Yellow', 'Light Blue'],
    elementalRemedies: ['Crystal', 'Copper Pyramid', 'Holy Water', 'Shiva Lingam']
  },
  EAST: {
    direction: 'EAST',
    element: 'Fire',
    deity: 'Indra',
    sanskrit: 'पूर्व (Purva)',
    attributes: ['Social Connection', 'Government Favor', 'Authority', 'Recognition', 'New Beginnings'],
    impactIfBlocked: 'Social isolation, eye trouble, lack of recognition, government problems',
    idealRooms: ['Main Entrance', 'Windows', 'Living Room', 'Study'],
    avoidRooms: ['Toilet', 'Kitchen (heavy fire)', 'Septic Tank'],
    colorRemedies: ['Yellow', 'Orange', 'Gold'],
    elementalRemedies: ['Sun symbol', 'Copper', 'Plants', 'Natural light']
  },
  SOUTH_EAST: {
    direction: 'SOUTH_EAST',
    element: 'Fire',
    deity: 'Agni',
    sanskrit: 'अग्नि (Agni)',
    attributes: ['Cash Flow', 'Action', "Women's Health", 'Digestion', 'Transformation'],
    impactIfBlocked: 'Accidents, cash crunch, theft, digestive issues, female health problems',
    idealRooms: ['Kitchen', 'Electrical Room', 'Generator', 'Fire Pit'],
    avoidRooms: ['Bedroom', 'Water Storage', 'Well', 'Toilet'],
    colorRemedies: ['Red', 'Orange', 'Pink'],
    elementalRemedies: ['Red light', 'Copper vessels', 'Agni symbol', 'Candles']
  },
  SOUTH: {
    direction: 'SOUTH',
    element: 'Earth+Fire',
    deity: 'Yama',
    sanskrit: 'दक्षिण (Dakshina)',
    attributes: ['Fame', 'Relaxation', 'Law', 'Judgement', 'Rest'],
    impactIfBlocked: 'Bad reputation, legal issues, restlessness, fame problems',
    idealRooms: ['Storage', 'Guest Room', 'Garage', 'Heavy Items'],
    avoidRooms: ['Main Entrance', 'Well', 'Bore Well'],
    colorRemedies: ['Red', 'Brown', 'Maroon'],
    elementalRemedies: ['Heavy objects', 'Red oxide floor', 'Yama symbol']
  },
  SOUTH_WEST: {
    direction: 'SOUTH_WEST',
    element: 'Earth',
    deity: 'Niruti',
    sanskrit: 'नैऋत्य (Nairutya)',
    attributes: ['Stability', 'Dominance', 'Relationship', 'Longevity', 'Grounding'],
    impactIfBlocked: 'Instability, divorce, anxiety, lack of grounding, relationship problems',
    idealRooms: ['Master Bedroom', 'Heavy Storage', 'Owner Office'],
    avoidRooms: ['Toilet', 'Septic Tank', 'Bore Well', 'Kitchen'],
    colorRemedies: ['Yellow', 'Brown', 'Muddy colors'],
    elementalRemedies: ['Heavy furniture', 'Yellow lights', 'Earth elements', 'Crystals']
  },
  WEST: {
    direction: 'WEST',
    element: 'Air',
    deity: 'Varuna',
    sanskrit: 'पश्चिम (Pashchim)',
    attributes: ['Gains', 'Profits', 'Fulfillment', 'Completion', 'Wisdom'],
    impactIfBlocked: 'Depression, low returns on effort, unfulfillment, blocked gains',
    idealRooms: ['Dining Room', 'Children Room', 'Study', 'Bathroom'],
    avoidRooms: ['Main Entrance', 'Kitchen'],
    colorRemedies: ['Blue', 'White', 'Silver'],
    elementalRemedies: ['Metal items', 'Wind chimes', 'Varuna symbol', 'Silver']
  },
  NORTH_WEST: {
    direction: 'NORTH_WEST',
    element: 'Air',
    deity: 'Vayu',
    sanskrit: 'वायव्य (Vayavya)',
    attributes: ['Movement', 'Support', 'Travel', 'Communication', 'Change'],
    impactIfBlocked: 'Legal fights, friends become enemies, travel problems, stuck situations',
    idealRooms: ['Guest Bedroom', 'Bathroom', 'Garage', 'Grain Storage'],
    avoidRooms: ['Master Bedroom', 'Cash Locker', 'Heavy Storage'],
    colorRemedies: ['Grey', 'White', 'Light Blue'],
    elementalRemedies: ['Wind chimes', 'Fans', 'Vayu symbol', 'Silver items']
  },
  CENTER: {
    direction: 'CENTER',
    element: 'Ether',
    deity: 'Brahma',
    sanskrit: 'ब्रह्मस्थान (Brahmasthan)',
    attributes: ['Balance', 'Cosmic Connection', 'Energy Hub', 'Divine Space'],
    impactIfBlocked: 'Total collapse of health/wealth, family discord, major life problems',
    idealRooms: ['Open Space', 'Courtyard', 'Light Well'],
    avoidRooms: ['Pillar', 'Beam', 'Toilet', 'Kitchen', 'Stairs', 'Heavy Objects'],
    colorRemedies: ['Yellow', 'White', 'Light colors'],
    elementalRemedies: ['Copper plate', 'Crystal', 'Open to sky', 'Brahma symbol']
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2: QUANTUM CROSS-CHECK (VASTU + ANKA)
// Number to Optimal Zone Mapping
// ═══════════════════════════════════════════════════════════════════════════════

export interface NumberZoneAffinity {
  number: number;
  planet: string;
  optimalZones: VastuDirection[];
  challengingZones: VastuDirection[];
  elementalAffinity: VastuElement[];
}

export const NUMBER_ZONE_AFFINITY: Record<number, NumberZoneAffinity> = {
  1: { // Sun
    number: 1,
    planet: 'Sun',
    optimalZones: ['EAST', 'SOUTH'],
    challengingZones: ['WEST', 'NORTH_WEST'],
    elementalAffinity: ['Fire']
  },
  2: { // Moon
    number: 2,
    planet: 'Moon',
    optimalZones: ['NORTH', 'NORTH_WEST'],
    challengingZones: ['SOUTH', 'SOUTH_EAST'],
    elementalAffinity: ['Water']
  },
  3: { // Jupiter
    number: 3,
    planet: 'Jupiter',
    optimalZones: ['NORTH_EAST', 'EAST'],
    challengingZones: ['SOUTH_WEST', 'WEST'],
    elementalAffinity: ['Ether', 'Water+Space']
  },
  4: { // Rahu
    number: 4,
    planet: 'Rahu',
    optimalZones: ['SOUTH_WEST', 'NORTH_WEST'],
    challengingZones: ['NORTH_EAST', 'EAST'],
    elementalAffinity: ['Earth', 'Air']
  },
  5: { // Mercury
    number: 5,
    planet: 'Mercury',
    optimalZones: ['NORTH', 'CENTER'],
    challengingZones: ['SOUTH', 'SOUTH_WEST'],
    elementalAffinity: ['Earth', 'Ether']
  },
  6: { // Venus
    number: 6,
    planet: 'Venus',
    optimalZones: ['SOUTH_EAST', 'WEST'],
    challengingZones: ['NORTH_EAST', 'NORTH'],
    elementalAffinity: ['Water', 'Fire']
  },
  7: { // Ketu
    number: 7,
    planet: 'Ketu',
    optimalZones: ['NORTH_EAST', 'SOUTH_WEST'],
    challengingZones: ['NORTH', 'SOUTH_EAST'],
    elementalAffinity: ['Fire', 'Ether']
  },
  8: { // Saturn
    number: 8,
    planet: 'Saturn',
    optimalZones: ['WEST', 'SOUTH'],
    challengingZones: ['EAST', 'NORTH_EAST'],
    elementalAffinity: ['Air', 'Earth+Fire']
  },
  9: { // Mars
    number: 9,
    planet: 'Mars',
    optimalZones: ['SOUTH', 'EAST'],
    challengingZones: ['NORTH', 'NORTH_WEST'],
    elementalAffinity: ['Fire', 'Earth+Fire']
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROOM PLACEMENT RULES ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export type RoomType = 
  | 'Kitchen'
  | 'Master Bedroom'
  | 'Living Room'
  | 'Bathroom'
  | 'Toilet'
  | 'Prayer Room'
  | 'Study'
  | 'Dining Room'
  | 'Guest Room'
  | 'Children Room'
  | 'Storage'
  | 'Garage'
  | 'Main Entrance';

export interface VastuRule {
  room: RoomType;
  idealZones: VastuDirection[];
  acceptableZones: VastuDirection[];
  criticalFaultZones: VastuDirection[];
  scores: Record<VastuDirection, number>;
}

export const VEDIC_RULES: Record<RoomType, VastuRule> = {
  'Kitchen': {
    room: 'Kitchen',
    idealZones: ['SOUTH_EAST'],
    acceptableZones: ['NORTH_WEST', 'SOUTH'],
    criticalFaultZones: ['NORTH_EAST', 'SOUTH_WEST', 'NORTH'],
    scores: {
      NORTH: -40, NORTH_EAST: -50, EAST: 20, SOUTH_EAST: 100,
      SOUTH: 30, SOUTH_WEST: -30, WEST: 10, NORTH_WEST: 40, CENTER: -60
    }
  },
  'Master Bedroom': {
    room: 'Master Bedroom',
    idealZones: ['SOUTH_WEST'],
    acceptableZones: ['SOUTH', 'WEST'],
    criticalFaultZones: ['NORTH_EAST', 'SOUTH_EAST', 'CENTER'],
    scores: {
      NORTH: 20, NORTH_EAST: -40, EAST: 30, SOUTH_EAST: -30,
      SOUTH: 60, SOUTH_WEST: 100, WEST: 50, NORTH_WEST: 30, CENTER: -50
    }
  },
  'Living Room': {
    room: 'Living Room',
    idealZones: ['NORTH', 'EAST'],
    acceptableZones: ['NORTH_EAST', 'WEST'],
    criticalFaultZones: ['SOUTH_WEST'],
    scores: {
      NORTH: 90, NORTH_EAST: 70, EAST: 80, SOUTH_EAST: 40,
      SOUTH: 30, SOUTH_WEST: -20, WEST: 60, NORTH_WEST: 50, CENTER: 20
    }
  },
  'Bathroom': {
    room: 'Bathroom',
    idealZones: ['WEST', 'NORTH_WEST'],
    acceptableZones: ['SOUTH'],
    criticalFaultZones: ['NORTH_EAST', 'CENTER', 'EAST'],
    scores: {
      NORTH: 30, NORTH_EAST: -60, EAST: -40, SOUTH_EAST: 20,
      SOUTH: 50, SOUTH_WEST: 40, WEST: 80, NORTH_WEST: 70, CENTER: -80
    }
  },
  'Toilet': {
    room: 'Toilet',
    idealZones: ['NORTH_WEST', 'WEST'],
    acceptableZones: ['SOUTH'],
    criticalFaultZones: ['NORTH_EAST', 'EAST', 'CENTER', 'SOUTH_WEST'],
    scores: {
      NORTH: -20, NORTH_EAST: -80, EAST: -50, SOUTH_EAST: 30,
      SOUTH: 40, SOUTH_WEST: -40, WEST: 70, NORTH_WEST: 80, CENTER: -100
    }
  },
  'Prayer Room': {
    room: 'Prayer Room',
    idealZones: ['NORTH_EAST'],
    acceptableZones: ['EAST', 'NORTH'],
    criticalFaultZones: ['SOUTH', 'SOUTH_WEST', 'SOUTH_EAST'],
    scores: {
      NORTH: 70, NORTH_EAST: 100, EAST: 80, SOUTH_EAST: -30,
      SOUTH: -40, SOUTH_WEST: -50, WEST: 30, NORTH_WEST: 40, CENTER: 50
    }
  },
  'Study': {
    room: 'Study',
    idealZones: ['EAST', 'NORTH_EAST', 'WEST'],
    acceptableZones: ['NORTH'],
    criticalFaultZones: ['SOUTH_WEST', 'SOUTH'],
    scores: {
      NORTH: 60, NORTH_EAST: 90, EAST: 100, SOUTH_EAST: 40,
      SOUTH: -30, SOUTH_WEST: -40, WEST: 80, NORTH_WEST: 50, CENTER: 30
    }
  },
  'Dining Room': {
    room: 'Dining Room',
    idealZones: ['WEST', 'EAST'],
    acceptableZones: ['NORTH', 'SOUTH_EAST'],
    criticalFaultZones: ['SOUTH_WEST'],
    scores: {
      NORTH: 60, NORTH_EAST: 50, EAST: 80, SOUTH_EAST: 60,
      SOUTH: 40, SOUTH_WEST: -20, WEST: 90, NORTH_WEST: 50, CENTER: 30
    }
  },
  'Guest Room': {
    room: 'Guest Room',
    idealZones: ['NORTH_WEST'],
    acceptableZones: ['WEST', 'NORTH'],
    criticalFaultZones: ['SOUTH_WEST'],
    scores: {
      NORTH: 60, NORTH_EAST: 40, EAST: 50, SOUTH_EAST: 30,
      SOUTH: 40, SOUTH_WEST: -30, WEST: 70, NORTH_WEST: 100, CENTER: 20
    }
  },
  'Children Room': {
    room: 'Children Room',
    idealZones: ['WEST', 'NORTH'],
    acceptableZones: ['NORTH_WEST', 'EAST'],
    criticalFaultZones: ['SOUTH_WEST', 'SOUTH_EAST'],
    scores: {
      NORTH: 80, NORTH_EAST: 60, EAST: 70, SOUTH_EAST: -20,
      SOUTH: 30, SOUTH_WEST: -40, WEST: 90, NORTH_WEST: 60, CENTER: 20
    }
  },
  'Storage': {
    room: 'Storage',
    idealZones: ['SOUTH', 'SOUTH_WEST'],
    acceptableZones: ['WEST', 'NORTH_WEST'],
    criticalFaultZones: ['NORTH_EAST', 'CENTER'],
    scores: {
      NORTH: 30, NORTH_EAST: -30, EAST: 20, SOUTH_EAST: 40,
      SOUTH: 80, SOUTH_WEST: 90, WEST: 60, NORTH_WEST: 50, CENTER: -40
    }
  },
  'Garage': {
    room: 'Garage',
    idealZones: ['NORTH_WEST', 'SOUTH_EAST'],
    acceptableZones: ['WEST', 'SOUTH'],
    criticalFaultZones: ['NORTH_EAST', 'CENTER'],
    scores: {
      NORTH: 30, NORTH_EAST: -40, EAST: 40, SOUTH_EAST: 70,
      SOUTH: 50, SOUTH_WEST: 30, WEST: 60, NORTH_WEST: 80, CENTER: -50
    }
  },
  'Main Entrance': {
    room: 'Main Entrance',
    idealZones: ['NORTH', 'EAST', 'NORTH_EAST'],
    acceptableZones: ['WEST'],
    criticalFaultZones: ['SOUTH', 'SOUTH_WEST'],
    scores: {
      NORTH: 90, NORTH_EAST: 100, EAST: 95, SOUTH_EAST: 40,
      SOUTH: -40, SOUTH_WEST: -60, WEST: 50, NORTH_WEST: 30, CENTER: -80
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// VASTU ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface RoomPlacement {
  room: RoomType;
  zone: VastuDirection;
}

export interface EnergyLeak {
  severity: 'CRITICAL' | 'MODERATE' | 'MINOR';
  room: RoomType;
  currentZone: VastuDirection;
  idealZone: VastuDirection[];
  problem: string;
  karmicImpact: string;
  remedy: string;
  scoreImpact: number;
}

export interface VastuAnalysis {
  overallScore: number;
  percentageScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  energyLeaks: EnergyLeak[];
  positiveEnergies: string[];
  criticalFaults: number;
  moderateFaults: number;
  blockedDeities: string[];
  affectedElements: VastuElement[];
  recommendations: string[];
}

export interface QuantumVastuReading {
  vastuAnalysis: VastuAnalysis;
  userNumberProfile: NumberZoneAffinity | null;
  karmicSynthesis: {
    personalizedImpacts: string[];
    quantumResonance: number;
    spaceTimeAlignment: 'ALIGNED' | 'PARTIAL' | 'MISALIGNED';
    evolutionaryAdvice: string;
  };
  remedies: {
    immediate: string[];
    longTerm: string[];
    mantras: string[];
    yantras: string[];
  };
}

/**
 * Calculate Vastu score based on room placements
 */
export function calculateVastuScore(placements: RoomPlacement[]): VastuAnalysis {
  let totalScore = 0;
  let maxPossibleScore = 0;
  const energyLeaks: EnergyLeak[] = [];
  const positiveEnergies: string[] = [];
  const blockedDeities: string[] = [];
  const affectedElements: VastuElement[] = [];
  let criticalFaults = 0;
  let moderateFaults = 0;

  for (const placement of placements) {
    const rule = VEDIC_RULES[placement.room];
    const zone = VASTU_MANDALA[placement.zone];
    
    if (!rule || !zone) continue;

    const score = rule.scores[placement.zone] || 0;
    totalScore += score;
    maxPossibleScore += 100;

    if (score >= 70) {
      positiveEnergies.push(`${placement.room} in ${placement.zone.replace('_', '-')} - Excellent placement (${zone.deity} blessed)`);
    } else if (score <= -30) {
      const severity: EnergyLeak['severity'] = score <= -50 ? 'CRITICAL' : score <= -30 ? 'MODERATE' : 'MINOR';
      
      if (severity === 'CRITICAL') criticalFaults++;
      else if (severity === 'MODERATE') moderateFaults++;

      blockedDeities.push(zone.deity);
      if (!affectedElements.includes(zone.element)) {
        affectedElements.push(zone.element);
      }

      energyLeaks.push({
        severity,
        room: placement.room,
        currentZone: placement.zone,
        idealZone: rule.idealZones,
        problem: `${placement.room} in ${zone.sanskrit} zone creates elemental clash`,
        karmicImpact: zone.impactIfBlocked,
        remedy: `Move ${placement.room} to ${rule.idealZones[0]} or place ${zone.elementalRemedies[0]}`,
        scoreImpact: score
      });
    }
  }

  const percentageScore = maxPossibleScore > 0 
    ? Math.max(0, Math.min(100, Math.round(((totalScore + (maxPossibleScore)) / (maxPossibleScore * 2)) * 100)))
    : 50;

  let grade: VastuAnalysis['grade'];
  if (percentageScore >= 90) grade = 'A+';
  else if (percentageScore >= 80) grade = 'A';
  else if (percentageScore >= 70) grade = 'B';
  else if (percentageScore >= 60) grade = 'C';
  else if (percentageScore >= 50) grade = 'D';
  else grade = 'F';

  const recommendations = generateRecommendations(energyLeaks, positiveEnergies);

  return {
    overallScore: totalScore,
    percentageScore,
    grade,
    energyLeaks,
    positiveEnergies,
    criticalFaults,
    moderateFaults,
    blockedDeities: [...new Set(blockedDeities)],
    affectedElements: [...new Set(affectedElements)],
    recommendations
  };
}

function generateRecommendations(leaks: EnergyLeak[], positives: string[]): string[] {
  const recommendations: string[] = [];
  
  const criticalLeaks = leaks.filter(l => l.severity === 'CRITICAL');
  if (criticalLeaks.length > 0) {
    recommendations.push(`URGENT: ${criticalLeaks.length} critical energy leaks detected. Address immediately.`);
    criticalLeaks.forEach(leak => {
      recommendations.push(leak.remedy);
    });
  }

  const moderateLeaks = leaks.filter(l => l.severity === 'MODERATE');
  if (moderateLeaks.length > 0) {
    recommendations.push(`${moderateLeaks.length} moderate imbalances found. Plan corrections within 3 months.`);
  }

  if (positives.length > 0) {
    recommendations.push(`${positives.length} zones are properly activated. Maintain these placements.`);
  }

  if (leaks.length === 0) {
    recommendations.push('Excellent Vastu compliance! All major zones are correctly activated.');
  }

  return recommendations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM SYNTHESIS: VASTU + ANKA INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate complete Quantum Vastu reading with Anka integration
 */
export function generateQuantumVastuReading(
  placements: RoomPlacement[],
  birthDate?: Date,
  name?: string
): QuantumVastuReading {
  const vastuAnalysis = calculateVastuScore(placements);
  
  let userNumberProfile: NumberZoneAffinity | null = null;
  let quantumResonance = 50;
  const personalizedImpacts: string[] = [];

  if (birthDate) {
    const driverNumber = calculateDriverNumber(birthDate.getDate());
    const conductorNumber = calculateConductorNumber(birthDate);
    userNumberProfile = NUMBER_ZONE_AFFINITY[driverNumber];

    if (userNumberProfile) {
      // Calculate quantum resonance between user's number and their space
      let alignedZones = 0;
      let challengedZones = 0;

      for (const placement of placements) {
        if (placement.room === 'Master Bedroom' || placement.room === 'Study') {
          if (userNumberProfile.optimalZones.includes(placement.zone)) {
            alignedZones++;
            personalizedImpacts.push(
              `Your ${placement.room} in ${placement.zone} aligns with your ${userNumberProfile.planet} energy - enhanced ${userNumberProfile.planet === 'Sun' ? 'authority' : userNumberProfile.planet === 'Moon' ? 'emotions' : 'life force'}`
            );
          } else if (userNumberProfile.challengingZones.includes(placement.zone)) {
            challengedZones++;
            personalizedImpacts.push(
              `Your ${placement.room} in ${placement.zone} challenges your ${userNumberProfile.planet} energy - may cause ${userNumberProfile.planet === 'Mars' ? 'anger issues' : userNumberProfile.planet === 'Saturn' ? 'delays' : 'imbalance'}`
            );
          }
        }
      }

      quantumResonance = Math.min(100, Math.max(0, 50 + (alignedZones * 15) - (challengedZones * 20)));
    }

    // Add Destiny-based insights
    const destinyInsights = getDestinyVastuInsights(conductorNumber, placements);
    personalizedImpacts.push(...destinyInsights);
  }

  const spaceTimeAlignment: 'ALIGNED' | 'PARTIAL' | 'MISALIGNED' = 
    quantumResonance >= 70 ? 'ALIGNED' : 
    quantumResonance >= 40 ? 'PARTIAL' : 'MISALIGNED';

  const evolutionaryAdvice = generateEvolutionaryAdvice(
    vastuAnalysis, 
    userNumberProfile, 
    spaceTimeAlignment
  );

  const remedies = generateQuantumRemedies(vastuAnalysis, userNumberProfile);

  return {
    vastuAnalysis,
    userNumberProfile,
    karmicSynthesis: {
      personalizedImpacts,
      quantumResonance,
      spaceTimeAlignment,
      evolutionaryAdvice
    },
    remedies
  };
}

function getDestinyVastuInsights(destinyNumber: number, placements: RoomPlacement[]): string[] {
  const insights: string[] = [];
  const numberProfile = NUMBER_ZONE_AFFINITY[destinyNumber];
  
  if (!numberProfile) return insights;

  // Check if key rooms are in destiny-aligned zones
  for (const placement of placements) {
    if (placement.room === 'Main Entrance') {
      if (numberProfile.optimalZones.includes(placement.zone)) {
        insights.push(`Entrance in ${placement.zone} amplifies your Destiny ${destinyNumber} (${numberProfile.planet}) - opportunities flow naturally`);
      }
    }
    
    if (placement.room === 'Kitchen') {
      const zone = VASTU_MANDALA[placement.zone];
      if (zone && !numberProfile.elementalAffinity.includes(zone.element as VastuElement)) {
        insights.push(`Kitchen element (${zone.element}) conflicts with your ${numberProfile.planet} affinity - may affect ${destinyNumber === 9 ? 'blood pressure' : destinyNumber === 6 ? 'relationships' : 'vitality'}`);
      }
    }
  }

  return insights;
}

function generateEvolutionaryAdvice(
  analysis: VastuAnalysis,
  profile: NumberZoneAffinity | null,
  alignment: 'ALIGNED' | 'PARTIAL' | 'MISALIGNED'
): string {
  if (alignment === 'ALIGNED' && analysis.criticalFaults === 0) {
    return `Your space perfectly resonates with your ${profile?.planet || 'cosmic'} frequency. The Vastu Purusha supports your evolutionary journey. Focus on spiritual practices in the North-East.`;
  }
  
  if (alignment === 'MISALIGNED') {
    return `Critical space-time misalignment detected. Your ${profile?.planet || 'personal'} energy is being suppressed by the environment. Immediate Vastu corrections needed to restore karmic balance.`;
  }

  return `Partial alignment detected. ${analysis.criticalFaults} critical and ${analysis.moderateFaults} moderate corrections needed. Prioritize ${analysis.blockedDeities[0] || 'Brahma'} zone activation.`;
}

function generateQuantumRemedies(
  analysis: VastuAnalysis,
  profile: NumberZoneAffinity | null
): QuantumVastuReading['remedies'] {
  const immediate: string[] = [];
  const longTerm: string[] = [];
  const mantras: string[] = [];
  const yantras: string[] = [];

  // Immediate remedies for critical issues
  for (const leak of analysis.energyLeaks.filter(l => l.severity === 'CRITICAL')) {
    const zone = VASTU_MANDALA[leak.currentZone];
    if (zone) {
      immediate.push(`Place ${zone.elementalRemedies[0]} in ${leak.currentZone.replace('_', '-')} to balance ${zone.element} energy`);
      if (zone.deity === 'Shiva') mantras.push('Om Namah Shivaya - 108 times daily');
      if (zone.deity === 'Brahma') mantras.push('Om Brahmane Namah - 21 times at sunrise');
      if (zone.deity === 'Kuber') mantras.push('Om Shreem Hreem Kleem - for wealth activation');
    }
  }

  // Long term based on blocked deities
  for (const deity of analysis.blockedDeities) {
    if (deity === 'Shiva') {
      longTerm.push('Install crystal or Shiva Lingam in North-East');
      yantras.push('Shri Yantra');
    }
    if (deity === 'Kuber') {
      longTerm.push('Place water feature in North zone');
      yantras.push('Kuber Yantra');
    }
    if (deity === 'Agni') {
      longTerm.push('Relocate kitchen to South-East or use red elements');
      yantras.push('Agni Yantra');
    }
  }

  // Profile-specific remedies
  if (profile) {
    if (profile.planet === 'Sun') {
      mantras.push('Gayatri Mantra - for Sun energy activation');
      immediate.push('Ensure East zone is open and well-lit');
    }
    if (profile.planet === 'Moon') {
      mantras.push('Om Chandraya Namah - for emotional balance');
      immediate.push('Place silver items or white flowers in North-West');
    }
    if (profile.planet === 'Mars') {
      mantras.push('Om Kram Kreem Kroum Sah Bhaumaya Namah');
      immediate.push('Use copper or red items in South zone');
    }
  }

  if (immediate.length === 0) {
    immediate.push('No immediate corrections needed - maintain current alignment');
  }

  return { immediate, longTerm, mantras, yantras };
}

export default {
  VASTU_MANDALA,
  NUMBER_ZONE_AFFINITY,
  VEDIC_RULES,
  calculateVastuScore,
  generateQuantumVastuReading
};
