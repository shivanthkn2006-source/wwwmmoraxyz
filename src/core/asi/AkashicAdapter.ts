// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ASI: AKASHIC KNOWLEDGE GRAPH ADAPTER
// Universal Database: Vedic + Scientific + Personal History Triangulation
// ELI5 Protocol: If answer > 3 sentences, generate metaphor instead
// ═══════════════════════════════════════════════════════════════════════════════

import { reduceToSingleDigit } from '../quantum/AnkaShastraEngine';

export type KnowledgeSource = 'VEDIC' | 'SCIENTIFIC' | 'PERSONAL' | 'COSMIC';

export interface TriangulatedKnowledge {
  concept: string;
  vedic: VedicDefinition;
  scientific: ScientificDefinition;
  personal: PersonalContext;
  synthesis: UnifiedTruth;
}

export interface VedicDefinition {
  term: string;
  sanskrit: string;
  meaning: string;
  relatedSutras: string[];
  numerologicalValue: number;
  planetaryRuler: string;
  element: string;
  chakra?: string;
}

export interface ScientificDefinition {
  term: string;
  field: string;
  definition: string;
  empiricalData: string[];
  measurableProperties: Record<string, any>;
  source: string;
}

export interface PersonalContext {
  relevance: string;
  emotionalConnection: number; // 0-100
  pastExperiences: string[];
  currentState: string;
  futureImplications: string[];
}

export interface UnifiedTruth {
  eli5Response: string; // Explain Like I'm 5
  metaphor: string;
  fullInsight: string;
  confidenceScore: number;
  sourcesHarmonized: boolean;
  cosmicAlignment: number; // 0-100
}

// ═══════════════════════════════════════════════════════════════════════════════
// VEDIC KNOWLEDGE BASE (Nadi Database Simulation)
// ═══════════════════════════════════════════════════════════════════════════════

const VEDIC_DATABASE: Map<string, Partial<VedicDefinition>> = new Map([
  ['love', {
    term: 'Love',
    sanskrit: 'प्रेम (Prema)',
    meaning: 'Divine union of souls; the binding force of the universe. In Vedic philosophy, love is the essence of Brahman manifest in human connection.',
    relatedSutras: ['Bhakti Sutra 1.1', 'Narada Bhakti Sutra 51'],
    planetaryRuler: 'Venus (Shukra)',
    element: 'Water',
    chakra: 'Heart (Anahata)'
  }],
  ['money', {
    term: 'Money',
    sanskrit: 'धन (Dhana)',
    meaning: 'Material manifestation of karma. Represents the exchange of energy and the fruits of past-life actions.',
    relatedSutras: ['Artha Shastra 1.4', 'Lakshmi Tantra'],
    planetaryRuler: 'Mercury (Budha) / Venus (Shukra)',
    element: 'Earth',
    chakra: 'Root (Muladhara)'
  }],
  ['mars', {
    term: 'Mars',
    sanskrit: 'मंगल (Mangal)',
    meaning: 'The warrior planet. Represents courage, action, brothers, and the fire of transformation. Governs the blood and muscles.',
    relatedSutras: ['Brihat Parashara Hora Shastra Ch 3'],
    planetaryRuler: 'Mars',
    element: 'Fire',
    chakra: 'Solar Plexus (Manipura)'
  }],
  ['karma', {
    term: 'Karma',
    sanskrit: 'कर्म (Karma)',
    meaning: 'The cosmic law of cause and effect. Every action creates a reaction that shapes future lives until moksha is achieved.',
    relatedSutras: ['Bhagavad Gita 3.4', 'Yoga Sutra 2.12-14'],
    planetaryRuler: 'Saturn (Shani)',
    element: 'Earth',
    chakra: 'All chakras'
  }],
  ['health', {
    term: 'Health',
    sanskrit: 'स्वास्थ्य (Swasthya)',
    meaning: 'Balance of the three doshas (Vata, Pitta, Kapha). True health is alignment of body, mind, and spirit.',
    relatedSutras: ['Charaka Samhita 1.53', 'Ashtanga Hridaya'],
    planetaryRuler: 'Sun (Surya) / Moon (Chandra)',
    element: 'All five elements',
    chakra: 'All chakras'
  }],
  ['death', {
    term: 'Death',
    sanskrit: 'मृत्यु (Mrityu)',
    meaning: 'Transition of the soul. Not an ending but a transformation. The body falls away; the atman continues its journey.',
    relatedSutras: ['Katha Upanishad 1.2', 'Bhagavad Gita 2.22'],
    planetaryRuler: 'Saturn (Shani) / Ketu',
    element: 'Ether',
    chakra: 'Crown (Sahasrara)'
  }],
  ['success', {
    term: 'Success',
    sanskrit: 'सिद्धि (Siddhi)',
    meaning: 'Attainment of one\'s dharmic purpose. True success is alignment with cosmic will, not mere accumulation.',
    relatedSutras: ['Patanjali Yoga Sutra 3.16', 'Viveka Chudamani 3'],
    planetaryRuler: 'Jupiter (Guru) / Sun (Surya)',
    element: 'Fire',
    chakra: 'Third Eye (Ajna)'
  }],
  ['relationship', {
    term: 'Relationship',
    sanskrit: 'संबंध (Sambandha)',
    meaning: 'Karmic connections between souls. Every relationship is a classroom for spiritual evolution.',
    relatedSutras: ['Narada Bhakti Sutra 66', 'Manu Smriti'],
    planetaryRuler: 'Venus (Shukra) / Moon (Chandra)',
    element: 'Water',
    chakra: 'Heart (Anahata) / Sacral (Svadhisthana)'
  }],
  ['purpose', {
    term: 'Purpose',
    sanskrit: 'धर्म (Dharma)',
    meaning: 'The sacred duty of each soul. Your dharma is your unique path of service to the cosmic order.',
    relatedSutras: ['Bhagavad Gita 3.35', 'Dharma Shastra'],
    planetaryRuler: 'Jupiter (Guru)',
    element: 'Ether',
    chakra: 'Crown (Sahasrara)'
  }],
  ['soul', {
    term: 'Soul',
    sanskrit: 'आत्मन् (Atman)',
    meaning: 'The eternal, unchanging essence of being. Identical to Brahman. Neither born nor dies.',
    relatedSutras: ['Upanishads (All)', 'Bhagavad Gita 2.20'],
    planetaryRuler: 'Sun (Surya) / Ketu',
    element: 'Fire/Ether',
    chakra: 'Crown (Sahasrara)'
  }]
]);

// ═══════════════════════════════════════════════════════════════════════════════
// SCIENTIFIC KNOWLEDGE BASE (External Science APIs Simulation)
// ═══════════════════════════════════════════════════════════════════════════════

const SCIENTIFIC_DATABASE: Map<string, Partial<ScientificDefinition>> = new Map([
  ['love', {
    term: 'Love',
    field: 'Neuroscience / Psychology',
    definition: 'A complex neurobiological state involving oxytocin, dopamine, and serotonin. Associated with attachment, pair-bonding, and evolved survival mechanisms.',
    empiricalData: ['Oxytocin levels increase 50% during bonding', 'Dopamine spikes mirror cocaine effects', 'Long-term love shows distinct brain patterns'],
    measurableProperties: { hormones: ['oxytocin', 'dopamine', 'serotonin'], brainRegions: ['amygdala', 'prefrontal cortex', 'VTA'] },
    source: 'Nature Neuroscience, 2023'
  }],
  ['money', {
    term: 'Money',
    field: 'Economics / Behavioral Science',
    definition: 'A medium of exchange, store of value, and unit of account. Psychologically linked to security needs and dopamine reward systems.',
    empiricalData: ['Money activates same brain regions as food', 'Wealth correlates with happiness up to ~$75,000', 'Loss aversion 2x stronger than gain pleasure'],
    measurableProperties: { inflationRate: 3.4, globalGDP: '100T USD', cryptoMarketCap: '2T USD' },
    source: 'World Bank / Journal of Economic Psychology'
  }],
  ['mars', {
    term: 'Mars',
    field: 'Astronomy / Planetary Science',
    definition: 'Fourth planet from the Sun. Diameter: 6,779 km. Orbital period: 687 Earth days. Surface temperature: -87°C to -5°C average.',
    empiricalData: ['Distance from Sun: 227.9M km', 'Has 2 moons: Phobos and Deimos', 'Iron oxide gives red color'],
    measurableProperties: { mass: '6.39E23 kg', gravity: '3.72076 m/s²', atmospherePressure: '610 Pa', dayLength: '24.6 hours' },
    source: 'NASA JPL Ephemeris'
  }],
  ['karma', {
    term: 'Karma',
    field: 'Philosophy / Psychology',
    definition: 'In scientific terms, relates to cognitive concepts of moral causation and just-world hypothesis. Behavioral patterns create self-reinforcing feedback loops.',
    empiricalData: ['Prosocial behavior increases dopamine', 'Guilt modifies future behavior', 'Social reputation affects treatment received'],
    measurableProperties: { psychologicalTheory: 'Just World Hypothesis', neuralBasis: 'Anterior cingulate cortex' },
    source: 'Journal of Personality and Social Psychology'
  }],
  ['health', {
    term: 'Health',
    field: 'Medicine / Biology',
    definition: 'State of complete physical, mental, and social well-being, not merely the absence of disease or infirmity (WHO definition).',
    empiricalData: ['Exercise reduces mortality 30%', 'Sleep deprivation impairs immunity', 'Stress hormones damage telomeres'],
    measurableProperties: { lifeExpectancy: '73 years global', keyBiomarkers: ['blood pressure', 'cholesterol', 'glucose', 'BMI'] },
    source: 'World Health Organization'
  }],
  ['death', {
    term: 'Death',
    field: 'Biology / Medicine',
    definition: 'Permanent cessation of all biological functions. Legally defined as brain death or cardiopulmonary death.',
    empiricalData: ['Brain activity ceases within 4-6 minutes', 'Near-death experiences reported in 10-20% of survivors', 'Cellular death is a gradual process'],
    measurableProperties: { brainDeathCriteria: 'No brainstem reflexes', timeToIrreversibility: '4-10 minutes without oxygen' },
    source: 'New England Journal of Medicine'
  }],
  ['success', {
    term: 'Success',
    field: 'Psychology / Sociology',
    definition: 'Achievement of intended aim. Psychologically linked to goal-setting, grit, and growth mindset. Socially constructed and culture-dependent.',
    empiricalData: ['Grit predicts achievement more than IQ', 'Goal-setting improves performance 10-25%', 'Intrinsic motivation > extrinsic for complex tasks'],
    measurableProperties: { correlatedFactors: ['conscientiousness', 'openness', 'emotional intelligence'] },
    source: 'American Psychological Association'
  }],
  ['relationship', {
    term: 'Relationship',
    field: 'Social Psychology',
    definition: 'An interpersonal connection between two or more individuals involving emotional bonds, reciprocity, and social exchange.',
    empiricalData: ['Strong relationships add 7 years to life', 'Loneliness as harmful as smoking 15 cigarettes/day', 'Attachment styles form in first 2 years'],
    measurableProperties: { attachmentStyles: ['secure', 'anxious', 'avoidant', 'disorganized'], keyFactors: ['trust', 'communication', 'shared goals'] },
    source: 'Journal of Social and Personal Relationships'
  }],
  ['purpose', {
    term: 'Purpose',
    field: 'Psychology / Philosophy',
    definition: 'A sense of meaning and direction in life. Linked to well-being, longevity, and cognitive resilience.',
    empiricalData: ['Purpose reduces Alzheimer risk 2.4x', 'Purposeful individuals live 7 years longer', 'Ikigai concept correlates with centenarian populations'],
    measurableProperties: { relatedConstructs: ['meaning', 'ikigai', 'self-actualization'], measuredBy: 'Purpose in Life Scale' },
    source: 'Journal of Positive Psychology'
  }],
  ['soul', {
    term: 'Soul',
    field: 'Philosophy / Consciousness Studies',
    definition: 'In scientific discourse, often discussed as consciousness or the "hard problem." No empirical evidence for a separable entity, but subjective experience is undeniable.',
    empiricalData: ['Consciousness correlates with neural activity', 'Near-death experiences suggest complex phenomena', 'Qualia remain unexplained by physics'],
    measurableProperties: { theoreticalFrameworks: ['IIT', 'Global Workspace Theory', 'Orch-OR'] },
    source: 'Journal of Consciousness Studies'
  }]
]);

// ═══════════════════════════════════════════════════════════════════════════════
// ELI5 METAPHOR GENERATOR (Complexity Reducer Algorithm)
// ═══════════════════════════════════════════════════════════════════════════════

const METAPHOR_TEMPLATES: Map<string, string[]> = new Map([
  ['love', [
    'Love is like the sun - it warms everything it touches without trying.',
    'Love is the invisible thread that connects hearts across any distance.',
    'Love is like water - it takes the shape of whatever container holds it.'
  ]],
  ['money', [
    'Money is like water - it flows to where it\'s valued and appreciated.',
    'Money is stored energy from past work, waiting to do future work.',
    'Money is just a promise note that says "someone owes you a favor."'
  ]],
  ['mars', [
    'Mars is Earth\'s rusty little brother, covered in orange dust.',
    'Mars is like a cold desert with the biggest volcano and canyon in our solar system.',
    'Mars is the warrior planet - it moves fast and shows itself clearly in the night sky.'
  ]],
  ['karma', [
    'Karma is like a boomerang - what you throw out comes back to you.',
    'Karma is your spiritual credit score - every action is a deposit or withdrawal.',
    'Karma is like an echo - the universe sends back what you put into it.'
  ]],
  ['health', [
    'Health is like a bank account - daily deposits of good habits build wealth.',
    'Your body is like a garden - it grows what you plant and water.',
    'Health is the silence of the organs - when everything works, you don\'t notice it.'
  ]],
  ['death', [
    'Death is like changing clothes - the body falls away but YOU continue.',
    'Death is a doorway, not a wall - it\'s where one room ends and another begins.',
    'Death is graduation from Earth school - the soul moves to the next class.'
  ]],
  ['success', [
    'Success is a ladder - each rung is a small win that lifts you higher.',
    'Success is not a destination but a direction - you\'re successful when you\'re moving forward.',
    'Success is matching your life to your soul\'s blueprint.'
  ]],
  ['relationship', [
    'Relationships are like mirrors - they show you parts of yourself you can\'t see alone.',
    'A relationship is a dance - both people must move to the same rhythm.',
    'Relationships are soul contracts - you meet who you need to meet to learn what you need to learn.'
  ]],
  ['purpose', [
    'Your purpose is the song only YOU can sing - no one else knows the melody.',
    'Purpose is your North Star - it doesn\'t move you, but it shows you where to go.',
    'Your purpose is the intersection of what you love, what you\'re good at, and what the world needs.'
  ]],
  ['soul', [
    'Your soul is the ocean - your body is just a wave. Waves come and go; the ocean remains.',
    'The soul is like the electricity in a computer - when the power goes off, the electricity doesn\'t die.',
    'Your soul is the dreamer; your body is the dream.'
  ]]
]);

/**
 * Generate ELI5 response with metaphor
 */
function generateELI5(concept: string, fullInsight: string): { eli5: string; metaphor: string } {
  const conceptLower = concept.toLowerCase();
  const metaphors = METAPHOR_TEMPLATES.get(conceptLower) || [
    `Think of ${concept} as a piece of the cosmic puzzle - it has its place and purpose.`,
    `${concept} is like a thread in the tapestry of existence.`
  ];
  
  const metaphor = metaphors[Math.floor(Math.random() * metaphors.length)];
  
  // ELI5: If fullInsight > 3 sentences, use metaphor instead
  const sentences = fullInsight.split(/[.!?]/).filter(s => s.trim().length > 5);
  
  if (sentences.length > 3) {
    return { eli5: metaphor, metaphor };
  }
  
  // Otherwise, simplify the first sentence
  const simplified = sentences[0]
    .replace(/\b(neurobiological|empirical|philosophical|metaphysical|epistemological)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return { eli5: simplified || metaphor, metaphor };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AKASHIC ADAPTER: MAIN TRIANGULATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Look up Vedic definition for a concept
 */
export function lookupVedic(concept: string): VedicDefinition {
  const conceptLower = concept.toLowerCase().trim();
  const vedic = VEDIC_DATABASE.get(conceptLower);
  
  if (vedic) {
    return {
      term: vedic.term || concept,
      sanskrit: vedic.sanskrit || '(Unknown)',
      meaning: vedic.meaning || 'Vedic knowledge not yet catalogued for this concept.',
      relatedSutras: vedic.relatedSutras || [],
      numerologicalValue: reduceToSingleDigit(
        concept.toUpperCase().split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      ),
      planetaryRuler: vedic.planetaryRuler || 'Jupiter (Guru)',
      element: vedic.element || 'Ether',
      chakra: vedic.chakra
    };
  }
  
  // Generate default for unknown concepts
  return {
    term: concept,
    sanskrit: '(Seek Guru)',
    meaning: `In Vedic philosophy, ${concept} relates to the cosmic order (Rita) and the interplay of the three gunas.`,
    relatedSutras: ['Consult Vedic texts'],
    numerologicalValue: reduceToSingleDigit(
      concept.toUpperCase().split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    ),
    planetaryRuler: 'Jupiter (Guru)',
    element: 'Ether'
  };
}

/**
 * Look up Scientific definition for a concept
 */
export function lookupScientific(concept: string): ScientificDefinition {
  const conceptLower = concept.toLowerCase().trim();
  const scientific = SCIENTIFIC_DATABASE.get(conceptLower);
  
  if (scientific) {
    return {
      term: scientific.term || concept,
      field: scientific.field || 'General Science',
      definition: scientific.definition || 'Scientific definition pending research.',
      empiricalData: scientific.empiricalData || [],
      measurableProperties: scientific.measurableProperties || {},
      source: scientific.source || 'Various scientific sources'
    };
  }
  
  // Generate default for unknown concepts
  return {
    term: concept,
    field: 'Cross-disciplinary',
    definition: `${concept} is a concept that spans multiple scientific fields and requires interdisciplinary understanding.`,
    empiricalData: ['Further research recommended'],
    measurableProperties: {},
    source: 'Pending scientific literature review'
  };
}

/**
 * Generate personal context (requires DHF integration)
 */
export function generatePersonalContext(
  concept: string,
  userDHF: Record<string, any> = {}
): PersonalContext {
  const emotionalConnection = userDHF.emotionalTriggers?.includes(concept.toLowerCase())
    ? 85
    : Math.floor(Math.random() * 40) + 30;
  
  return {
    relevance: userDHF.currentFocus 
      ? `This concept relates to your current focus on ${userDHF.currentFocus}.`
      : `${concept} may have significance in your current life phase.`,
    emotionalConnection,
    pastExperiences: userDHF.pastExperiences || ['Your personal journey with this concept is unique.'],
    currentState: userDHF.currentEmotionalState || 'Seeking understanding',
    futureImplications: [
      `Understanding ${concept} deeply will illuminate your path.`,
      `This concept will appear again in significant life moments.`
    ]
  };
}

/**
 * MAIN FUNCTION: Triangulate knowledge across all sources
 */
export function triangulateKnowledge(
  concept: string,
  userDHF: Record<string, any> = {}
): TriangulatedKnowledge {
  const startTime = performance.now();
  
  // Get from all three sources
  const vedic = lookupVedic(concept);
  const scientific = lookupScientific(concept);
  const personal = generatePersonalContext(concept, userDHF);
  
  // Create unified insight
  const fullInsight = `${vedic.meaning} Scientifically, ${scientific.definition.toLowerCase()} In your personal journey, ${personal.relevance.toLowerCase()}`;
  
  // Generate ELI5 and metaphor
  const { eli5, metaphor } = generateELI5(concept, fullInsight);
  
  // Calculate cosmic alignment (harmony between sources)
  const cosmicAlignment = Math.min(100, Math.floor(
    (vedic.numerologicalValue * 10) +
    (scientific.empiricalData.length * 5) +
    personal.emotionalConnection * 0.5
  ));
  
  // Confidence score based on data richness
  const confidenceScore = Math.min(100, Math.floor(
    (vedic.relatedSutras.length * 10) +
    (scientific.empiricalData.length * 10) +
    (personal.pastExperiences.length * 10) +
    30 // base score
  ));
  
  const processingTime = performance.now() - startTime;
  
  return {
    concept,
    vedic,
    scientific,
    personal,
    synthesis: {
      eli5Response: eli5,
      metaphor,
      fullInsight,
      confidenceScore,
      sourcesHarmonized: confidenceScore > 70,
      cosmicAlignment
    }
  };
}

/**
 * Quick concept lookup with ELI5 only
 */
export function akashicQuickLookup(concept: string): { 
  answer: string; 
  metaphor: string; 
  confidence: number 
} {
  const result = triangulateKnowledge(concept);
  return {
    answer: result.synthesis.eli5Response,
    metaphor: result.synthesis.metaphor,
    confidence: result.synthesis.confidenceScore
  };
}

/**
 * Batch process multiple concepts
 */
export function akashicBatchLookup(
  concepts: string[],
  userDHF: Record<string, any> = {}
): TriangulatedKnowledge[] {
  return concepts.map(concept => triangulateKnowledge(concept, userDHF));
}

export default { 
  triangulateKnowledge, 
  akashicQuickLookup, 
  akashicBatchLookup,
  lookupVedic,
  lookupScientific,
  generatePersonalContext
};
