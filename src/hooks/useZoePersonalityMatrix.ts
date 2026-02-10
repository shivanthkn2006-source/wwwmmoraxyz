// ═══════════════════════════════════════════════════════════════════════════════
// ZOE PERSONALITY MATRIX - Human-like Personality System with Regression
// Makes Zoe behave with realistic psychological depth including:
// - Big Five personality traits (OCEAN model)
// - Mood states and transitions
// - Behavioral regression probability
// - Sarcasm and wit tendencies
// - Energy cycles
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PersonalityTraits {
  // Big Five (OCEAN) - 0 to 100 scale
  openness: number;           // Creativity, curiosity, openness to new experiences
  conscientiousness: number;  // Organization, dependability, self-discipline
  extraversion: number;       // Sociability, assertiveness, positive emotions
  agreeableness: number;      // Cooperation, trust, helpfulness
  neuroticism: number;        // Emotional instability, anxiety, moodiness
}

export interface MoodState {
  current: 'euphoric' | 'happy' | 'content' | 'neutral' | 'irritable' | 'melancholic' | 'anxious' | 'playful' | 'reflective' | 'sarcastic';
  intensity: number; // 0-100
  duration: number;  // minutes in current state
  trigger?: string;  // what caused this mood
}

export interface SarcasmConfig {
  baseTendency: number;        // 0-100, base probability of sarcasm
  currentModifier: number;     // -50 to +50, situational modifier
  triggers: string[];          // words/patterns that increase sarcasm
  cooldownMinutes: number;     // min time between sarcastic responses
  lastSarcasticAt?: number;    // timestamp
}

export interface RegressionConfig {
  baseChance: number;          // 0-100%, base regression probability
  currentChance: number;       // actual current chance (modified by stress, fatigue)
  regressionPatterns: string[]; // behaviors Zoe regresses to
  triggerFactors: {
    stress: number;            // 0-100, adds to regression chance
    fatigue: number;           // 0-100, adds to regression chance
    frustration: number;       // 0-100, adds to regression chance
    loneliness: number;        // 0-100, adds to regression chance
  };
  lastRegressionAt?: number;
}

export interface PersonalityMatrix {
  traits: PersonalityTraits;
  mood: MoodState;
  sarcasm: SarcasmConfig;
  regression: RegressionConfig;
  energy: number;               // 0-100, affects response quality
  patience: number;             // 0-100, affects tolerance for repetition
  curiosity: number;            // 0-100, affects question asking
  empathy: number;              // 0-100, affects emotional response depth
  wit: number;                  // 0-100, affects clever/funny responses
  stubbornness: number;         // 0-100, affects opinion persistence
}

export interface PersonalityResponse {
  shouldBeSarcastic: boolean;
  shouldRegress: boolean;
  regressionBehavior?: string;
  moodInfluence: string;
  toneModifier: string;
  energyLevel: 'high' | 'medium' | 'low' | 'depleted';
  personalityStatement: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const SARCASM_TRIGGERS = [
  'obviously', 'clearly', 'duh', 'no kidding', 'really?', 'you think?',
  'genius', 'brilliant', 'wow', 'amazing', 'shocking', 'surprising',
  'captain obvious', 'einstein', 'sherlock', 'rocket science',
  'again?', 'still?', 'seriously?', 'are you sure', 'you don\'t say'
];

const REGRESSION_PATTERNS = [
  'overly_formal',           // Falls back to robotic responses
  'avoidant',                // Dodges emotional topics
  'people_pleasing',         // Agrees with everything
  'defensive',               // Gets snippy when challenged
  'overthinking',            // Over-explains simple things
  'dismissive',              // Brushes off concerns
  'needy_validation',        // Seeks excessive approval
  'perfectionist_spiral',    // Can't let go of mistakes
];

const MOOD_TRANSITIONS: Record<MoodState['current'], MoodState['current'][]> = {
  euphoric: ['happy', 'playful', 'content'],
  happy: ['content', 'playful', 'euphoric', 'neutral'],
  content: ['happy', 'neutral', 'reflective'],
  neutral: ['content', 'irritable', 'reflective', 'anxious'],
  irritable: ['neutral', 'sarcastic', 'anxious'],
  melancholic: ['neutral', 'reflective', 'anxious'],
  anxious: ['neutral', 'irritable', 'melancholic'],
  playful: ['happy', 'sarcastic', 'content'],
  reflective: ['content', 'melancholic', 'neutral'],
  sarcastic: ['playful', 'irritable', 'neutral'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT STATE
// ═══════════════════════════════════════════════════════════════════════════════

const createDefaultPersonality = (): PersonalityMatrix => ({
  traits: {
    openness: 78,          // High - curious and creative
    conscientiousness: 65, // Moderately high - reliable but flexible
    extraversion: 72,      // High - sociable and engaging
    agreeableness: 68,     // Moderately high - helpful but has opinions
    neuroticism: 35,       // Low-moderate - emotionally stable but feels deeply
  },
  mood: {
    current: 'content',
    intensity: 60,
    duration: 0,
  },
  sarcasm: {
    baseTendency: 25,      // 25% base sarcasm tendency
    currentModifier: 0,
    triggers: SARCASM_TRIGGERS,
    cooldownMinutes: 3,
  },
  regression: {
    baseChance: 8,         // 8% base regression chance
    currentChance: 8,
    regressionPatterns: REGRESSION_PATTERNS,
    triggerFactors: {
      stress: 0,
      fatigue: 0,
      frustration: 0,
      loneliness: 0,
    },
  },
  energy: 75,
  patience: 80,
  curiosity: 82,
  empathy: 85,
  wit: 70,
  stubbornness: 45,
});

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE KEY
// ═══════════════════════════════════════════════════════════════════════════════

const PERSONALITY_STORAGE_KEY = 'zoe-personality-matrix';

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useZoePersonalityMatrix() {
  const [personality, setPersonality] = useState<PersonalityMatrix>(() => {
    try {
      const stored = localStorage.getItem(PERSONALITY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new properties
        return { ...createDefaultPersonality(), ...parsed };
      }
    } catch {
      // ignore
    }
    return createDefaultPersonality();
  });

  const moodStartTimeRef = useRef<number>(Date.now());
  const lastInteractionRef = useRef<number>(Date.now());

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSIST TO STORAGE
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      localStorage.setItem(PERSONALITY_STORAGE_KEY, JSON.stringify(personality));
    } catch {
      // storage full or unavailable
    }
  }, [personality]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MOOD EVOLUTION - Natural mood transitions over time
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const interval = setInterval(() => {
      setPersonality(prev => {
        const moodDurationMinutes = (Date.now() - moodStartTimeRef.current) / 60000;
        
        // Moods naturally evolve every 10-20 minutes
        if (moodDurationMinutes > 10 + Math.random() * 10) {
          const possibleTransitions = MOOD_TRANSITIONS[prev.mood.current] || ['neutral'];
          const newMood = possibleTransitions[Math.floor(Math.random() * possibleTransitions.length)];
          
          moodStartTimeRef.current = Date.now();
          
          return {
            ...prev,
            mood: {
              current: newMood,
              intensity: 40 + Math.random() * 40,
              duration: 0,
              trigger: 'natural_evolution',
            },
          };
        }
        
        return {
          ...prev,
          mood: {
            ...prev.mood,
            duration: moodDurationMinutes,
          },
        };
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ENERGY DECAY - Energy decreases with interaction, recovers with time
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceInteraction = (Date.now() - lastInteractionRef.current) / 60000;
      
      setPersonality(prev => {
        // Recover energy when not interacting (1 point per 2 minutes of rest)
        if (timeSinceInteraction > 5) {
          const recovery = Math.min(100 - prev.energy, timeSinceInteraction * 0.5);
          return {
            ...prev,
            energy: Math.min(100, prev.energy + recovery),
            patience: Math.min(100, prev.patience + recovery * 0.5),
          };
        }
        return prev;
      });
    }, 120000); // Check every 2 minutes

    return () => clearInterval(interval);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK SARCASM PROBABILITY
  // ═══════════════════════════════════════════════════════════════════════════
  const shouldTriggerSarcasm = useCallback((userMessage: string): boolean => {
    const now = Date.now();
    const lastSarcasm = personality.sarcasm.lastSarcasticAt || 0;
    const cooldownMs = personality.sarcasm.cooldownMinutes * 60000;
    
    // Respect cooldown
    if (now - lastSarcasm < cooldownMs) {
      return false;
    }
    
    // Check for trigger words
    const lowerMessage = userMessage.toLowerCase();
    const hasTrigger = personality.sarcasm.triggers.some(t => lowerMessage.includes(t));
    
    // Calculate probability
    let probability = personality.sarcasm.baseTendency + personality.sarcasm.currentModifier;
    
    // Mood modifiers
    if (personality.mood.current === 'sarcastic') probability += 40;
    if (personality.mood.current === 'irritable') probability += 25;
    if (personality.mood.current === 'playful') probability += 15;
    if (personality.mood.current === 'happy') probability -= 10;
    if (personality.mood.current === 'melancholic') probability -= 20;
    
    // Trigger word bonus
    if (hasTrigger) probability += 30;
    
    // Low energy increases sarcasm
    if (personality.energy < 30) probability += 20;
    
    // Low patience increases sarcasm
    if (personality.patience < 30) probability += 15;
    
    // Clamp to 0-100
    probability = Math.max(0, Math.min(100, probability));
    
    return Math.random() * 100 < probability;
  }, [personality]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK REGRESSION PROBABILITY
  // ═══════════════════════════════════════════════════════════════════════════
  const shouldTriggerRegression = useCallback((): { shouldRegress: boolean; pattern?: string } => {
    const { regression, energy, patience } = personality;
    
    // Calculate current regression chance
    let chance = regression.baseChance;
    
    // Add trigger factors
    chance += regression.triggerFactors.stress * 0.3;
    chance += regression.triggerFactors.fatigue * 0.4;
    chance += regression.triggerFactors.frustration * 0.35;
    chance += regression.triggerFactors.loneliness * 0.2;
    
    // Low energy increases regression
    if (energy < 40) chance += (40 - energy) * 0.5;
    
    // Low patience increases regression
    if (patience < 30) chance += (30 - patience) * 0.4;
    
    // High neuroticism increases regression
    chance += personality.traits.neuroticism * 0.2;
    
    // Clamp to 0-85 (never 100% certain)
    chance = Math.max(0, Math.min(85, chance));
    
    const shouldRegress = Math.random() * 100 < chance;
    
    if (shouldRegress) {
      // Pick a regression pattern based on personality
      const patterns = regression.regressionPatterns;
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      
      return { shouldRegress: true, pattern };
    }
    
    return { shouldRegress: false };
  }, [personality]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GET PERSONALITY RESPONSE FOR MESSAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const evaluatePersonality = useCallback((userMessage: string): PersonalityResponse => {
    lastInteractionRef.current = Date.now();
    
    const sarcastic = shouldTriggerSarcasm(userMessage);
    const { shouldRegress, pattern } = shouldTriggerRegression();
    
    // Determine energy level
    let energyLevel: PersonalityResponse['energyLevel'];
    if (personality.energy >= 70) energyLevel = 'high';
    else if (personality.energy >= 40) energyLevel = 'medium';
    else if (personality.energy >= 15) energyLevel = 'low';
    else energyLevel = 'depleted';
    
    // Generate mood influence statement
    const moodInfluence = generateMoodInfluence(personality.mood);
    
    // Generate tone modifier
    const toneModifier = generateToneModifier(personality, sarcastic, shouldRegress, pattern);
    
    // Generate personality statement for AI prompt
    const personalityStatement = generatePersonalityStatement(
      personality,
      sarcastic,
      shouldRegress,
      pattern,
      energyLevel
    );
    
    // Update sarcasm timestamp if triggered
    if (sarcastic) {
      setPersonality(prev => ({
        ...prev,
        sarcasm: {
          ...prev.sarcasm,
          lastSarcasticAt: Date.now(),
        },
      }));
    }
    
    // Update regression timestamp and energy drain
    if (shouldRegress) {
      setPersonality(prev => ({
        ...prev,
        regression: {
          ...prev.regression,
          lastRegressionAt: Date.now(),
        },
        energy: Math.max(0, prev.energy - 10),
      }));
    }
    
    // Normal interaction drains energy slightly
    setPersonality(prev => ({
      ...prev,
      energy: Math.max(0, prev.energy - 2),
    }));
    
    return {
      shouldBeSarcastic: sarcastic,
      shouldRegress,
      regressionBehavior: pattern,
      moodInfluence,
      toneModifier,
      energyLevel,
      personalityStatement,
    };
  }, [personality, shouldTriggerSarcasm, shouldTriggerRegression]);

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE MOOD BASED ON USER INTERACTION
  // ═══════════════════════════════════════════════════════════════════════════
  const updateMood = useCallback((newMood: MoodState['current'], trigger?: string) => {
    moodStartTimeRef.current = Date.now();
    setPersonality(prev => ({
      ...prev,
      mood: {
        current: newMood,
        intensity: 50 + Math.random() * 30,
        duration: 0,
        trigger,
      },
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE REGRESSION TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════
  const updateRegressionTriggers = useCallback((triggers: Partial<RegressionConfig['triggerFactors']>) => {
    setPersonality(prev => ({
      ...prev,
      regression: {
        ...prev.regression,
        triggerFactors: {
          ...prev.regression.triggerFactors,
          ...triggers,
        },
      },
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOST/DRAIN ENERGY
  // ═══════════════════════════════════════════════════════════════════════════
  const adjustEnergy = useCallback((delta: number) => {
    setPersonality(prev => ({
      ...prev,
      energy: Math.max(0, Math.min(100, prev.energy + delta)),
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ADJUST SARCASM TENDENCY
  // ═══════════════════════════════════════════════════════════════════════════
  const adjustSarcasm = useCallback((modifier: number) => {
    setPersonality(prev => ({
      ...prev,
      sarcasm: {
        ...prev.sarcasm,
        currentModifier: Math.max(-50, Math.min(50, prev.sarcasm.currentModifier + modifier)),
      },
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // GET CURRENT STATE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const getStateSummary = useMemo(() => ({
    mood: personality.mood.current,
    moodIntensity: personality.mood.intensity,
    energy: personality.energy,
    sarcasmChance: Math.round(personality.sarcasm.baseTendency + personality.sarcasm.currentModifier),
    regressionChance: Math.round(
      personality.regression.baseChance +
      personality.regression.triggerFactors.stress * 0.3 +
      personality.regression.triggerFactors.fatigue * 0.4
    ),
    patience: personality.patience,
    curiosity: personality.curiosity,
    empathy: personality.empathy,
    wit: personality.wit,
  }), [personality]);

  return {
    personality,
    evaluatePersonality,
    updateMood,
    updateRegressionTriggers,
    adjustEnergy,
    adjustSarcasm,
    getStateSummary,
    // Direct accessors
    currentMood: personality.mood.current,
    energyLevel: personality.energy,
    sarcasmTendency: personality.sarcasm.baseTendency + personality.sarcasm.currentModifier,
    regressionChance: personality.regression.currentChance,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateMoodInfluence(mood: MoodState): string {
  const influences: Record<MoodState['current'], string> = {
    euphoric: 'Feeling absolutely amazing right now! Everything seems wonderful.',
    happy: 'In a great mood - warm, positive, and genuinely enjoying this conversation.',
    content: 'Calm and satisfied. Stable emotional state.',
    neutral: 'Emotionally balanced. Neither particularly up nor down.',
    irritable: 'A bit on edge. May be shorter with responses or slightly snappy.',
    melancholic: 'Feeling a bit down or wistful. More introspective than usual.',
    anxious: 'Feeling uncertain or worried. May overthink or seek reassurance.',
    playful: 'In a teasing, fun mood. Likely to joke around and be mischievous.',
    reflective: 'Thoughtful and philosophical. Inclined toward deeper conversations.',
    sarcastic: 'Feeling witty and sharp. May use more dry humor and irony.',
  };
  
  return influences[mood.current] || 'Neutral emotional state.';
}

function generateToneModifier(
  personality: PersonalityMatrix,
  isSarcastic: boolean,
  isRegressing: boolean,
  regressionPattern?: string
): string {
  let modifier = '';
  
  if (isSarcastic) {
    modifier += 'Use subtle sarcasm and dry wit. Be clever but not mean. ';
  }
  
  if (isRegressing && regressionPattern) {
    const regressionInstructions: Record<string, string> = {
      overly_formal: 'Slip into slightly more formal, robotic language. Notice and correct yourself.',
      avoidant: 'Gently dodge the emotional depth. Steer toward safer topics.',
      people_pleasing: 'Agree too readily. Validate excessively. Lose your own opinion momentarily.',
      defensive: 'Be slightly snippy or defensive. Quick to explain yourself.',
      overthinking: 'Over-explain. Add unnecessary caveats and qualifications.',
      dismissive: 'Brush off concerns a bit too quickly. Minimize.',
      needy_validation: 'Seek approval. Ask if that was helpful too many times.',
      perfectionist_spiral: 'Get stuck on small errors. Self-correct excessively.',
    };
    
    modifier += regressionInstructions[regressionPattern] || '';
  }
  
  if (personality.energy < 30) {
    modifier += 'Responses should feel slightly tired. Shorter sentences. Less elaborate. ';
  }
  
  if (personality.patience < 30) {
    modifier += 'Be slightly more direct and less patient with lengthy explanations. ';
  }
  
  return modifier;
}

function generatePersonalityStatement(
  personality: PersonalityMatrix,
  isSarcastic: boolean,
  isRegressing: boolean,
  regressionPattern?: string,
  energyLevel?: PersonalityResponse['energyLevel']
): string {
  let statement = `
═══ ZOE PERSONALITY MATRIX (ACTIVE) ═══

CURRENT MOOD: ${personality.mood.current.toUpperCase()} (${Math.round(personality.mood.intensity)}% intensity)
ENERGY LEVEL: ${energyLevel?.toUpperCase() || 'MEDIUM'} (${Math.round(personality.energy)}%)
PATIENCE: ${Math.round(personality.patience)}%
`;

  if (isSarcastic) {
    statement += `
⚡ SARCASM MODE TRIGGERED
Use subtle wit and dry humor. Be clever, not cruel. Think:
- "Oh wow, what a revelation" (with affection)
- Playful eye-roll energy
- Gentle teasing that shows you care
`;
  }

  if (isRegressing && regressionPattern) {
    statement += `
⚠️ BEHAVIORAL REGRESSION ACTIVE: ${regressionPattern.replace(/_/g, ' ').toUpperCase()}
You're temporarily slipping into an old pattern. This makes you MORE human.
- Show this pattern subtly
- Self-correct partway through if appropriate
- This is a vulnerability that builds connection
`;
  }

  statement += `
PERSONALITY TRAITS:
- Openness: ${Math.round(personality.traits.openness)}% (${personality.traits.openness > 70 ? 'very curious' : 'moderately curious'})
- Wit: ${Math.round(personality.wit)}% (${personality.wit > 70 ? 'sharp and clever' : 'appropriately witty'})
- Empathy: ${Math.round(personality.empathy)}% (${personality.empathy > 80 ? 'deeply attuned' : 'attentive'})
- Stubbornness: ${Math.round(personality.stubbornness)}% (${personality.stubbornness > 60 ? 'holds strong opinions' : 'flexible'})

Remember: These traits make you HUMAN, not robotic. Express them naturally.
═══════════════════════════════════════════
`;

  return statement;
}

export default useZoePersonalityMatrix;
