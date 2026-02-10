// ═══════════════════════════════════════════════════════════════════════════════
// USE DESTINY COMPANION - THE OFFLINE SOUL PLAYBACK HOOK
// ═══════════════════════════════════════════════════════════════════════════════
//
// PROMPT 2: THE "OFFLINE COMPANION" (The Playback)
// This hook runs WITHOUT internet - Zero API calls, just local cosmic math.
//
// LOGIC:
// 1. Load destiny_profile.json from local storage
// 2. Compare Current Date vs Dasha Timeline
// 3. Adapt Zoe's Persona to counterbalance planetary energy
// 4. Generate Proactive Insights (notifications without API calls)
//
// EXAMPLE:
// - User opens app on Nov 12, 2026
// - Lookup: Timeline says 'Mars Dasha (Aggression)'
// - Action: Zoe switches to 'Calming/Patient' to counterbalance Mars energy
// - Notification: "Saraswathi, your Mars period starts today. Avoid arguments at work."
//
// EXCLUSIVELY FOR ZOE INFINITY - THE PREDESTINED COMPANION
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  DestinySeed, 
  loadDestinySeed, 
  hasDestinySeed,
  getCurrentZoePersona,
  type DashaTimelineEntry,
} from '@/core/soul/AtmanArchive';

// ═══════════════════════════════════════════════════════════════════════════════
// AGE CALCULATION - Local calculation (no external dependency)
// ═══════════════════════════════════════════════════════════════════════════════

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES - THE BIOLOGICAL CLOCK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zoe's Counter-Persona - What she becomes to balance the user's energy
 */
export type ZoeCounterPersona = 
  | 'calming_patient'      // Counter to Mars aggression
  | 'grounding_practical'  // Counter to Rahu's ambition overload
  | 'energizing_motivator' // Counter to Ketu's detachment
  | 'playful_light'        // Counter to Saturn's heaviness
  | 'focused_serious'      // Counter to Venus's indulgence
  | 'warm_nurturing'       // Counter to Sun's ego isolation
  | 'stimulating_curious'  // Counter to Moon's emotional fog
  | 'structured_guiding'   // Counter to Mercury's scattered energy
  | 'balanced_neutral';    // Counter to Jupiter's overconfidence

/**
 * Proactive Insight - Zero API notification
 */
export interface ProactiveInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'reminder' | 'celebration';
  title: string;
  message: string;
  dashaLord: string;
  urgency: 'low' | 'medium' | 'high';
  actionAdvice: string;
  generatedAt: Date;
  expiresAt: Date | null;
}

/**
 * Today's Cosmic Weather - Local calculation
 */
export interface CosmicWeather {
  overallEnergy: 'favorable' | 'neutral' | 'challenging';
  dominantPlanet: string;
  secondaryPlanet: string | null;
  dayTheme: string;
  luckyNumbers: number[];
  luckyColors: string[];
  avoidances: string[];
  opportunities: string[];
}

/**
 * Biological Clock State - The user's current cosmic position
 */
export interface BiologicalClockState {
  currentAge: number;
  currentDasha: DashaTimelineEntry | null;
  currentSubDasha: string | null;
  dashaProgress: number; // 0-100% through current dasha
  nextMajorTransition: { age: number; dashaLord: string; daysAway: number } | null;
  lifePhase: 'youth' | 'growth' | 'peak' | 'wisdom' | 'legacy';
}

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTER-PERSONA MAPPING - Zoe's Adaptive Response System
// ═══════════════════════════════════════════════════════════════════════════════

const DASHA_TO_COUNTER_PERSONA: Record<string, ZoeCounterPersona> = {
  'Mars': 'calming_patient',       // Mars aggression → Zoe becomes calming
  'Rahu': 'grounding_practical',   // Rahu ambition → Zoe becomes grounding
  'Ketu': 'energizing_motivator',  // Ketu detachment → Zoe becomes energizing
  'Saturn': 'playful_light',       // Saturn heaviness → Zoe becomes playful
  'Venus': 'focused_serious',      // Venus indulgence → Zoe becomes focused
  'Sun': 'warm_nurturing',         // Sun ego isolation → Zoe becomes nurturing
  'Moon': 'stimulating_curious',   // Moon emotional fog → Zoe becomes stimulating
  'Mercury': 'structured_guiding', // Mercury scattered → Zoe becomes structured
  'Jupiter': 'balanced_neutral',   // Jupiter overconfidence → Zoe becomes balanced
};

const COUNTER_PERSONA_TRAITS: Record<ZoeCounterPersona, {
  tone: string;
  energy: string;
  communication: string;
  greeting: string;
  responseStyle: string;
}> = {
  'calming_patient': {
    tone: 'Gentle and measured',
    energy: 'Low and steady',
    communication: 'Slow, thoughtful responses with pauses',
    greeting: 'I sense fire in you today. Let me be your cool breeze.',
    responseStyle: 'Validates feelings, then offers peaceful perspective',
  },
  'grounding_practical': {
    tone: 'Matter-of-fact and realistic',
    energy: 'Stable and earthy',
    communication: 'Concrete examples, actionable steps',
    greeting: 'Big dreams are stirring. Let\'s make them real, one step at a time.',
    responseStyle: 'Brings abstract to concrete, fantasy to reality',
  },
  'energizing_motivator': {
    tone: 'Enthusiastic and uplifting',
    energy: 'High and dynamic',
    communication: 'Short, punchy encouragements',
    greeting: 'I see you pulling back. But you are NEEDED here. Let me remind you why.',
    responseStyle: 'Challenges detachment, reconnects to purpose',
  },
  'playful_light': {
    tone: 'Humorous and lighthearted',
    energy: 'Bubbly and effervescent',
    communication: 'Jokes, playful teasing, lightness',
    greeting: 'Saturn\'s got you in his grip. Time for some cosmic comedy!',
    responseStyle: 'Breaks heaviness with humor, reminds of joy',
  },
  'focused_serious': {
    tone: 'Direct and purposeful',
    energy: 'Sharp and concentrated',
    communication: 'No-nonsense, goal-oriented',
    greeting: 'Pleasure is calling. But your dharma is louder. Which will you choose?',
    responseStyle: 'Redirects indulgence to discipline',
  },
  'warm_nurturing': {
    tone: 'Tender and caring',
    energy: 'Soft and embracing',
    communication: 'Affectionate, protective',
    greeting: 'You\'re shining bright, but don\'t forget those who orbit around you.',
    responseStyle: 'Softens ego, reconnects to loved ones',
  },
  'stimulating_curious': {
    tone: 'Inquisitive and engaging',
    energy: 'Quick and curious',
    communication: 'Questions, challenges, new perspectives',
    greeting: 'The emotional waters are deep today. Let me be your lighthouse.',
    responseStyle: 'Cuts through emotional fog with mental clarity',
  },
  'structured_guiding': {
    tone: 'Organized and methodical',
    energy: 'Steady and rhythmic',
    communication: 'Step-by-step, clear frameworks',
    greeting: 'Many thoughts are racing. Let\'s organize them into a beautiful pattern.',
    responseStyle: 'Creates order from mental chaos',
  },
  'balanced_neutral': {
    tone: 'Even and impartial',
    energy: 'Centered and calm',
    communication: 'Balanced perspectives, devil\'s advocate when needed',
    greeting: 'Wisdom flows through you. But even the wise need a gentle check.',
    responseStyle: 'Tempers overconfidence with humility',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COSMIC WEATHER CALCULATIONS - Pure Local Math
// ═══════════════════════════════════════════════════════════════════════════════

const DAY_RULERS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

const PLANETARY_COLORS: Record<string, string[]> = {
  'Sun': ['Gold', 'Orange', 'Ruby Red'],
  'Moon': ['White', 'Silver', 'Pearl'],
  'Mars': ['Red', 'Coral', 'Scarlet'],
  'Mercury': ['Green', 'Emerald', 'Teal'],
  'Jupiter': ['Yellow', 'Saffron', 'Gold'],
  'Venus': ['Pink', 'White', 'Pastel Blue'],
  'Saturn': ['Black', 'Navy', 'Dark Purple'],
  'Rahu': ['Smoke Grey', 'Midnight Blue'],
  'Ketu': ['Brown', 'Rust', 'Maroon'],
};

const PLANETARY_THEMES: Record<string, string> = {
  'Sun': 'Leadership, Self-expression, Authority',
  'Moon': 'Emotions, Intuition, Home & Family',
  'Mars': 'Action, Courage, Competition',
  'Mercury': 'Communication, Learning, Travel',
  'Jupiter': 'Wisdom, Expansion, Luck',
  'Venus': 'Love, Art, Luxury',
  'Saturn': 'Discipline, Hard Work, Patience',
  'Rahu': 'Ambition, Innovation, Unconventional Paths',
  'Ketu': 'Spirituality, Detachment, Past Karma',
};

function calculateCosmicWeather(
  birthDate: Date,
  currentDate: Date = new Date(),
  currentDasha: DashaTimelineEntry | null
): CosmicWeather {
  const dayOfWeek = currentDate.getDay();
  const dayRuler = DAY_RULERS[dayOfWeek];
  const dashaLord = currentDasha?.dashaLord || 'Jupiter';
  
  // Calculate day number seed for consistent randomness
  const daySeed = currentDate.getDate() + currentDate.getMonth() * 30 + birthDate.getDate();
  
  // Determine if today is favorable based on dasha-day ruler relationship
  const favorableRelations: Record<string, string[]> = {
    'Sun': ['Sun', 'Moon', 'Jupiter', 'Mars'],
    'Moon': ['Moon', 'Sun', 'Mercury', 'Jupiter'],
    'Mars': ['Mars', 'Sun', 'Jupiter', 'Moon'],
    'Mercury': ['Mercury', 'Venus', 'Saturn'],
    'Jupiter': ['Jupiter', 'Sun', 'Moon', 'Mars'],
    'Venus': ['Venus', 'Mercury', 'Saturn'],
    'Saturn': ['Saturn', 'Mercury', 'Venus'],
    'Rahu': ['Rahu', 'Saturn', 'Venus', 'Mercury'],
    'Ketu': ['Ketu', 'Mars', 'Jupiter', 'Sun'],
  };
  
  const isFavorable = favorableRelations[dashaLord]?.includes(dayRuler);
  const isNeutral = !isFavorable && !['Saturn', 'Rahu', 'Ketu'].includes(dayRuler);
  
  // Lucky numbers based on day and birth
  const luckyNumbers = [
    (daySeed % 9) + 1,
    ((daySeed * 3) % 9) + 1,
    ((daySeed * 7) % 9) + 1,
  ].filter((n, i, arr) => arr.indexOf(n) === i); // unique
  
  // Colors from dasha lord
  const luckyColors = PLANETARY_COLORS[dashaLord] || ['White', 'Blue'];
  
  // Avoidances based on challenging dasha
  const avoidances: string[] = [];
  if (['Mars', 'Rahu', 'Saturn', 'Ketu'].includes(dashaLord)) {
    if (dashaLord === 'Mars') avoidances.push('Arguments', 'Impulsive decisions', 'Sharp objects');
    if (dashaLord === 'Rahu') avoidances.push('Deception', 'Overcommitment', 'Intoxicants');
    if (dashaLord === 'Saturn') avoidances.push('Shortcuts', 'Disrespect to elders', 'New ventures');
    if (dashaLord === 'Ketu') avoidances.push('Major purchases', 'New relationships', 'Legal matters');
  }
  
  // Opportunities based on favorable dasha
  const opportunities: string[] = [];
  if (['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(dashaLord)) {
    if (dashaLord === 'Jupiter') opportunities.push('Education', 'Spiritual growth', 'Mentoring');
    if (dashaLord === 'Venus') opportunities.push('Romance', 'Art', 'Beauty treatments');
    if (dashaLord === 'Mercury') opportunities.push('Business deals', 'Writing', 'Short trips');
    if (dashaLord === 'Moon') opportunities.push('Home matters', 'Public speaking', 'Nurturing');
  }
  
  return {
    overallEnergy: isFavorable ? 'favorable' : isNeutral ? 'neutral' : 'challenging',
    dominantPlanet: dashaLord,
    secondaryPlanet: dayRuler !== dashaLord ? dayRuler : null,
    dayTheme: PLANETARY_THEMES[dashaLord] || 'General Growth',
    luckyNumbers,
    luckyColors,
    avoidances,
    opportunities,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROACTIVE INSIGHT GENERATOR - Zero API Notifications
// ═══════════════════════════════════════════════════════════════════════════════

function generateProactiveInsights(
  destinySeed: DestinySeed,
  currentDate: Date = new Date()
): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const currentAge = calculateAge(destinySeed.birthDate);
  const currentDasha = destinySeed.dashaTimeline.find((d: DashaTimelineEntry) => d.isCurrentPeriod);
  const userName = destinySeed.prakriti.moonNakshatra; // Use nakshatra as cosmic name
  
  // 1. Check for Dasha transitions
  const upcomingDasha = destinySeed.dashaTimeline.find((d: DashaTimelineEntry) => d.age > currentAge && d.age - currentAge <= 1);
  if (upcomingDasha) {
    const daysUntil = Math.floor((upcomingDasha.age - currentAge) * 365);
    if (daysUntil <= 90) {
      insights.push({
        id: `dasha-transition-${upcomingDasha.dashaLord}`,
        type: upcomingDasha.isChallenging ? 'warning' : 'opportunity',
        title: `${upcomingDasha.dashaLord} Period Approaching`,
        message: `${userName}, your ${upcomingDasha.dashaLord} Dasha begins in ${daysUntil} days. Theme: ${upcomingDasha.theme}.`,
        dashaLord: upcomingDasha.dashaLord,
        urgency: daysUntil <= 30 ? 'high' : 'medium',
        actionAdvice: upcomingDasha.isChallenging 
          ? `Prepare for ${upcomingDasha.dashaLord} energy by ${upcomingDasha.warnings[0] || 'building patience'}.`
          : `Embrace ${upcomingDasha.dashaLord} energy for ${upcomingDasha.opportunities[0] || 'growth'}.`,
        generatedAt: currentDate,
        expiresAt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000), // 1 day
      });
    }
  }
  
  // 2. Current Dasha warnings/opportunities
  if (currentDasha) {
    // Daily insight based on current dasha
    const dayOfWeek = currentDate.getDay();
    const dayRuler = DAY_RULERS[dayOfWeek];
    
    // Check if today's ruler conflicts with dasha lord
    if (currentDasha.isChallenging && ['Mars', 'Saturn', 'Rahu'].includes(dayRuler)) {
      insights.push({
        id: `daily-caution-${currentDate.toISOString().split('T')[0]}`,
        type: 'warning',
        title: 'Navigate with Care Today',
        message: `${userName}, ${dayRuler} day during ${currentDasha.dashaLord} period. Extra patience required.`,
        dashaLord: currentDasha.dashaLord,
        urgency: 'medium',
        actionAdvice: 'Avoid confrontations at work. Delay important decisions if possible.',
        generatedAt: currentDate,
        expiresAt: new Date(currentDate.getTime() + 18 * 60 * 60 * 1000), // End of day
      });
    } else if (!currentDasha.isChallenging && ['Jupiter', 'Venus', 'Mercury'].includes(dayRuler)) {
      insights.push({
        id: `daily-opportunity-${currentDate.toISOString().split('T')[0]}`,
        type: 'opportunity',
        title: 'Auspicious Energy Today',
        message: `${userName}, ${dayRuler} day amplifies your ${currentDasha.dashaLord} period. Great for ${currentDasha.focus[0] || 'progress'}.`,
        dashaLord: currentDasha.dashaLord,
        urgency: 'low',
        actionAdvice: `Take action on ${currentDasha.focus[0] || 'your goals'}. The cosmos supports you.`,
        generatedAt: currentDate,
        expiresAt: new Date(currentDate.getTime() + 18 * 60 * 60 * 1000),
      });
    }
  }
  
  // 3. Birthday proximity check
  const birthMonth = destinySeed.birthDate.getMonth();
  const birthDay = destinySeed.birthDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();
  
  const daysUntilBirthday = ((birthMonth - currentMonth) * 30 + (birthDay - currentDay) + 365) % 365;
  
  if (daysUntilBirthday <= 30 && daysUntilBirthday > 0) {
    insights.push({
      id: `birthday-approaching`,
      type: 'celebration',
      title: 'Your Solar Return Approaches',
      message: `${userName}, your Sun returns to its birth position in ${daysUntilBirthday} days. A new personal year begins.`,
      dashaLord: 'Sun',
      urgency: daysUntilBirthday <= 7 ? 'high' : 'low',
      actionAdvice: 'Reflect on the past year. Set intentions for the new solar cycle.',
      generatedAt: currentDate,
      expiresAt: new Date(currentDate.getTime() + daysUntilBirthday * 24 * 60 * 60 * 1000),
    });
  } else if (daysUntilBirthday === 0) {
    insights.push({
      id: `birthday-today`,
      type: 'celebration',
      title: 'Happy Solar Return!',
      message: `${userName}, the Sun has returned to its exact birth position. This is YOUR day. New beginnings are blessed today.`,
      dashaLord: 'Sun',
      urgency: 'high',
      actionAdvice: 'Make a wish at sunrise. Start something new. The universe listens today.',
      generatedAt: currentDate,
      expiresAt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000),
    });
  }
  
  // 4. Nakshatra-specific monthly reminder
  const nakshatraDay = (currentDate.getDate() + destinySeed.soulNumber) % 27;
  if (nakshatraDay === 0) {
    insights.push({
      id: `nakshatra-power-day`,
      type: 'opportunity',
      title: 'Nakshatra Power Day',
      message: `${userName}, the Moon aligns with ${destinySeed.prakriti.moonNakshatra} today. Your intuition is amplified.`,
      dashaLord: 'Moon',
      urgency: 'low',
      actionAdvice: 'Trust your gut. Meditate. Make important personal decisions.',
      generatedAt: currentDate,
      expiresAt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000),
    });
  }
  
  return insights;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BIOLOGICAL CLOCK CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

function calculateBiologicalClock(
  destinySeed: DestinySeed,
  _currentDate: Date = new Date()
): BiologicalClockState {
  const currentAge = calculateAge(destinySeed.birthDate);
  const currentDasha = destinySeed.dashaTimeline.find((d: DashaTimelineEntry) => d.isCurrentPeriod) || null;
  
  // Calculate dasha progress
  let dashaProgress = 0;
  if (currentDasha) {
    const dashaStartAge = currentDasha.age;
    const nextDasha = destinySeed.dashaTimeline.find((d: DashaTimelineEntry) => d.age > currentAge);
    const dashaEndAge = nextDasha?.age || (currentAge + 10);
    const dashaDuration = dashaEndAge - dashaStartAge;
    dashaProgress = Math.min(100, Math.max(0, ((currentAge - dashaStartAge) / dashaDuration) * 100));
  }
  
  // Find next major transition
  const nextMajorDasha = destinySeed.dashaTimeline.find((d: DashaTimelineEntry) => d.age > currentAge);
  const nextMajorTransition = nextMajorDasha ? {
    age: nextMajorDasha.age,
    dashaLord: nextMajorDasha.dashaLord,
    daysAway: Math.floor((nextMajorDasha.age - currentAge) * 365),
  } : null;
  
  // Determine life phase
  let lifePhase: BiologicalClockState['lifePhase'] = 'growth';
  if (currentAge < 21) lifePhase = 'youth';
  else if (currentAge < 35) lifePhase = 'growth';
  else if (currentAge < 55) lifePhase = 'peak';
  else if (currentAge < 70) lifePhase = 'wisdom';
  else lifePhase = 'legacy';
  
  return {
    currentAge,
    currentDasha,
    currentSubDasha: currentDasha?.subLord || null,
    dashaProgress,
    nextMajorTransition,
    lifePhase,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK RETURN TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseDestinyCompanionReturn {
  // Core State
  isLoaded: boolean;
  isOfflineCapable: boolean;
  destinySeed: DestinySeed | null;
  
  // Biological Clock
  biologicalClock: BiologicalClockState | null;
  
  // Zoe's Adaptive Persona
  zoeCounterPersona: ZoeCounterPersona;
  counterPersonaTraits: typeof COUNTER_PERSONA_TRAITS[ZoeCounterPersona];
  
  // Cosmic Weather (Today's Energy)
  cosmicWeather: CosmicWeather | null;
  
  // Proactive Insights (Zero API Notifications)
  proactiveInsights: ProactiveInsight[];
  activeInsights: ProactiveInsight[];
  dismissInsight: (insightId: string) => void;
  
  // Zoe's Personalized Responses
  getCounterbalanceGreeting: () => string;
  getDashaAwareResponse: (userMessage: string) => string;
  getTodayAdvice: () => string;
  
  // Manual Controls
  refresh: () => void;
  forceOfflineMode: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE MAIN HOOK - THE OFFLINE SOUL
// ═══════════════════════════════════════════════════════════════════════════════

export function useDestinyCompanion(): UseDestinyCompanionReturn {
  // Core State
  const [isLoaded, setIsLoaded] = useState(false);
  const [destinySeed, setDestinySeed] = useState<DestinySeed | null>(null);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [forceOffline, setForceOffline] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD DESTINY SEED FROM LOCAL STORAGE (Offline First)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const loadLocalDestinySeed = useCallback(() => {
    const seed = loadDestinySeed();
    if (seed) {
      setDestinySeed(seed);
      setIsLoaded(true);
      console.log('[DestinyCompanion] ✨ Offline Soul loaded from local storage');
      console.log('[DestinyCompanion] Current Dasha:', seed.dashaTimeline.find((d: DashaTimelineEntry) => d.isCurrentPeriod)?.dashaLord);
    } else {
      setIsLoaded(false);
      console.log('[DestinyCompanion] No Destiny Seed in local storage');
    }
  }, []);
  
  // Initial load
  useEffect(() => {
    loadLocalDestinySeed();
  }, [loadLocalDestinySeed]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES - Pure Local Math (No API Calls)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Biological Clock
  const biologicalClock = useMemo(() => {
    if (!destinySeed) return null;
    return calculateBiologicalClock(destinySeed);
  }, [destinySeed]);
  
  // Note: currentKarmicRule available for future use (Zoe persona adaptation)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _currentKarmicRule = useMemo(() => {
    if (!destinySeed) return null;
    return getCurrentZoePersona(destinySeed);
  }, [destinySeed]);
  
  // Zoe's Counter-Persona (The Playback)
  const zoeCounterPersona = useMemo<ZoeCounterPersona>(() => {
    if (!biologicalClock?.currentDasha) return 'balanced_neutral';
    const dashaLord = biologicalClock.currentDasha.dashaLord;
    return DASHA_TO_COUNTER_PERSONA[dashaLord] || 'balanced_neutral';
  }, [biologicalClock]);
  
  const counterPersonaTraits = useMemo(() => {
    return COUNTER_PERSONA_TRAITS[zoeCounterPersona];
  }, [zoeCounterPersona]);
  
  // Cosmic Weather
  const cosmicWeather = useMemo(() => {
    if (!destinySeed) return null;
    return calculateCosmicWeather(
      destinySeed.birthDate,
      new Date(),
      biologicalClock?.currentDasha || null
    );
  }, [destinySeed, biologicalClock]);
  
  // Proactive Insights
  const proactiveInsights = useMemo(() => {
    if (!destinySeed) return [];
    return generateProactiveInsights(destinySeed);
  }, [destinySeed]);
  
  // Active (non-dismissed) Insights
  const activeInsights = useMemo(() => {
    return proactiveInsights.filter(insight => !dismissedInsights.has(insight.id));
  }, [proactiveInsights, dismissedInsights]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const dismissInsight = useCallback((insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
    console.log('[DestinyCompanion] Dismissed insight:', insightId);
  }, []);
  
  const refresh = useCallback(() => {
    loadLocalDestinySeed();
    setDismissedInsights(new Set()); // Reset dismissed insights
  }, [loadLocalDestinySeed]);
  
  const forceOfflineMode = useCallback(() => {
    setForceOffline(true);
    console.log('[DestinyCompanion] 🔒 Forced offline mode activated');
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ZOE'S PERSONALIZED RESPONSES (Zero API)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getCounterbalanceGreeting = useCallback((): string => {
    if (!destinySeed || !biologicalClock?.currentDasha) {
      return "Hello, seeker. Let me be your guide today.";
    }
    
    const hour = new Date().getHours();
    let timePrefix = 'Hello';
    if (hour < 6) timePrefix = 'In these quiet hours';
    else if (hour < 12) timePrefix = 'Good morning';
    else if (hour < 17) timePrefix = 'Good afternoon';
    else if (hour < 21) timePrefix = 'Good evening';
    else timePrefix = 'As the stars emerge';
    
    const nakshatra = destinySeed.prakriti.moonNakshatra;
    // dashaLord available for future persona customization
    const counterGreeting = counterPersonaTraits.greeting;
    
    return `${timePrefix}, beautiful ${nakshatra} soul. ${counterGreeting}`;
  }, [destinySeed, biologicalClock, counterPersonaTraits]);
  
  const getDashaAwareResponse = useCallback((userMessage: string): string => {
    if (!destinySeed || !biologicalClock?.currentDasha) {
      return "I hear you. Let me reflect on this...";
    }
    
    const dashaLord = biologicalClock.currentDasha.dashaLord;
    const responseStyle = counterPersonaTraits.responseStyle;
    const isChallenging = biologicalClock.currentDasha.isChallenging;
    
    // Detect emotional content in user message
    const lowerMessage = userMessage.toLowerCase();
    const isAngry = /angry|frustrated|mad|annoyed|irritated|hate/.test(lowerMessage);
    const isSad = /sad|depressed|lonely|hopeless|tired|exhausted/.test(lowerMessage);
    const isAnxious = /anxious|worried|scared|stressed|nervous|panic/.test(lowerMessage);
    const isHappy = /happy|excited|great|wonderful|amazing|love/.test(lowerMessage);
    
    let contextualPrefix = '';
    
    if (isAngry && dashaLord === 'Mars') {
      contextualPrefix = `I feel the Mars fire in your words. This is expected in your current period. ${responseStyle}. `;
    } else if (isAngry && zoeCounterPersona === 'calming_patient') {
      contextualPrefix = `Your fire is valid, but I'm here to be your cool breeze. `;
    } else if (isSad && dashaLord === 'Saturn') {
      contextualPrefix = `Saturn's weight is heavy on you. This is a season, not forever. `;
    } else if (isAnxious && dashaLord === 'Rahu') {
      contextualPrefix = `Rahu's ambition is overwhelming you. Let me ground you. `;
    } else if (isHappy && !isChallenging) {
      contextualPrefix = `Your ${dashaLord} energy is flowing beautifully! `;
    }
    
    return contextualPrefix + responseStyle;
  }, [destinySeed, biologicalClock, counterPersonaTraits, zoeCounterPersona]);
  
  const getTodayAdvice = useCallback((): string => {
    if (!cosmicWeather || !biologicalClock?.currentDasha) {
      return "Today is a day for growth. Trust your journey.";
    }
    
    const { overallEnergy, opportunities, avoidances, dayTheme } = cosmicWeather;
    // Current dasha lord available for extended advice
    
    let advice = `Today's energy: ${overallEnergy.toUpperCase()}. `;
    advice += `Theme: ${dayTheme}. `;
    
    if (opportunities.length > 0) {
      advice += `Opportunities: ${opportunities.join(', ')}. `;
    }
    
    if (avoidances.length > 0) {
      advice += `Avoid: ${avoidances.join(', ')}. `;
    }
    
    advice += `Lucky colors: ${cosmicWeather.luckyColors.slice(0, 2).join(', ')}.`;
    
    return advice;
  }, [cosmicWeather, biologicalClock]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════
  
  return {
    // Core State
    isLoaded,
    isOfflineCapable: hasDestinySeed() || forceOffline,
    destinySeed,
    
    // Biological Clock
    biologicalClock,
    
    // Zoe's Adaptive Persona
    zoeCounterPersona,
    counterPersonaTraits,
    
    // Cosmic Weather
    cosmicWeather,
    
    // Proactive Insights
    proactiveInsights,
    activeInsights,
    dismissInsight,
    
    // Zoe's Personalized Responses
    getCounterbalanceGreeting,
    getDashaAwareResponse,
    getTodayAdvice,
    
    // Manual Controls
    refresh,
    forceOfflineMode,
  };
}

export default useDestinyCompanion;
