// ═══════════════════════════════════════════════════════════════════════════════
// OFFLINE WISDOM - The Downloadable Brain
// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides wise, comforting responses when the internet is dead.
// 5,000+ carefully curated responses for lonely moments.
// Cost: $0 (Local JSON)
// Works: Flight Mode / Offline
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useMemo } from 'react';
import { getZoeBioKernel, type BioMood } from '@/core/soul/ZoeBioKernel';
import offlineWisdom from '@/data/offline_wisdom.json';

export type WisdomCategory = 
  | 'lonely_night'
  | 'panic_attack'
  | 'hope'
  | 'comfort'
  | 'motivation'
  | 'gratitude'
  | 'self_worth'
  | 'sleep_stories'
  | 'morning_greetings'
  | 'affirmations'
  | 'philosophical';

// ═══════════════════════════════════════════════════════════════════════════════
// MOOD TO CATEGORY MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const MOOD_TO_CATEGORIES: Record<BioMood, WisdomCategory[]> = {
  // NEGATIVE
  ANGRY: ['comfort', 'affirmations', 'philosophical'],
  FRUSTRATED: ['comfort', 'motivation', 'affirmations'],
  SAD: ['comfort', 'hope', 'self_worth'],
  MELANCHOLY: ['comfort', 'hope', 'lonely_night'],
  ANXIOUS: ['panic_attack', 'comfort', 'affirmations'],
  STRESSED: ['comfort', 'affirmations', 'philosophical'],
  FEARFUL: ['panic_attack', 'comfort', 'hope'],
  BORED: ['motivation', 'philosophical', 'gratitude'],
  LONELY: ['lonely_night', 'comfort', 'self_worth'],
  TIRED: ['sleep_stories', 'comfort', 'affirmations'],
  DESPAIR: ['comfort', 'hope', 'self_worth'],
  APATHETIC: ['motivation', 'hope', 'affirmations'],
  // NEUTRAL
  NEUTRAL_COMPANION: ['affirmations', 'motivation', 'philosophical'],
  CURIOUS: ['philosophical', 'motivation', 'gratitude'],
  FOCUSED: ['motivation', 'affirmations', 'philosophical'],
  CONTEMPLATIVE: ['philosophical', 'gratitude', 'hope'],
  CONFIDENT: ['motivation', 'affirmations', 'gratitude'],
  // POSITIVE
  CALM: ['gratitude', 'philosophical', 'affirmations'],
  PEACEFUL: ['gratitude', 'philosophical', 'affirmations'],
  ZEN_CALM: ['philosophical', 'gratitude', 'affirmations'],
  HOPEFUL: ['hope', 'motivation', 'gratitude'],
  LOVING: ['self_worth', 'affirmations', 'comfort'],
  GRATEFUL: ['gratitude', 'self_worth', 'affirmations'],
  HAPPY: ['gratitude', 'motivation', 'affirmations'],
  EXCITED: ['motivation', 'gratitude', 'affirmations'],
  ECSTATIC: ['motivation', 'gratitude', 'affirmations'],
  AMUSED: ['gratitude', 'motivation', 'philosophical'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIME-BASED CATEGORY SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

const getTimeBasedCategory = (): WisdomCategory => {
  const hour = new Date().getHours();
  
  if (hour >= 22 || hour < 5) return 'lonely_night';
  if (hour >= 5 && hour < 9) return 'morning_greetings';
  if (hour >= 21 && hour < 22) return 'sleep_stories';
  
  return 'affirmations';
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// ═══════════════════════════════════════════════════════════════════════════════
// THE OFFLINE WISDOM HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useOfflineWisdom = () => {
  const bioKernel = getZoeBioKernel();

  // Type-safe wisdom access
  const wisdom = useMemo(() => offlineWisdom as Record<WisdomCategory, string[]>, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // GET WISDOM BY CATEGORY
  // ═══════════════════════════════════════════════════════════════════════════

  const getWisdomByCategory = useCallback((category: WisdomCategory): string => {
    const responses = wisdom[category];
    if (!responses || responses.length === 0) {
      return "I'm here with you. You're not alone.";
    }
    return getRandomItem(responses);
  }, [wisdom]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GET WISDOM BASED ON CURRENT MOOD
  // ═══════════════════════════════════════════════════════════════════════════

  const getMoodBasedWisdom = useCallback((): string => {
    const mood = bioKernel.getMood();
    const categories = MOOD_TO_CATEGORIES[mood];
    const category = getRandomItem(categories);
    return getWisdomByCategory(category);
  }, [bioKernel, getWisdomByCategory]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GET TIME-BASED WISDOM
  // ═══════════════════════════════════════════════════════════════════════════

  const getTimeBasedWisdom = useCallback((): string => {
    const category = getTimeBasedCategory();
    return getWisdomByCategory(category);
  }, [getWisdomByCategory]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GET CONTEXTUAL WISDOM (Combines mood + time)
  // ═══════════════════════════════════════════════════════════════════════════

  const getContextualWisdom = useCallback((): string => {
    // 60% chance to use mood, 40% time-based
    if (Math.random() > 0.4) {
      return getMoodBasedWisdom();
    }
    return getTimeBasedWisdom();
  }, [getMoodBasedWisdom, getTimeBasedWisdom]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIFIC WISDOM GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  const getLonelyNightWisdom = useCallback(() => 
    getWisdomByCategory('lonely_night'), [getWisdomByCategory]);

  const getPanicSupport = useCallback(() => 
    getWisdomByCategory('panic_attack'), [getWisdomByCategory]);

  const getHopeMessage = useCallback(() => 
    getWisdomByCategory('hope'), [getWisdomByCategory]);

  const getComfortMessage = useCallback(() => 
    getWisdomByCategory('comfort'), [getWisdomByCategory]);

  const getMotivation = useCallback(() => 
    getWisdomByCategory('motivation'), [getWisdomByCategory]);

  const getGratitudePrompt = useCallback(() => 
    getWisdomByCategory('gratitude'), [getWisdomByCategory]);

  const getSelfWorthAffirmation = useCallback(() => 
    getWisdomByCategory('self_worth'), [getWisdomByCategory]);

  const getSleepStory = useCallback(() => 
    getWisdomByCategory('sleep_stories'), [getWisdomByCategory]);

  const getMorningGreeting = useCallback(() => 
    getWisdomByCategory('morning_greetings'), [getWisdomByCategory]);

  const getAffirmation = useCallback(() => 
    getWisdomByCategory('affirmations'), [getWisdomByCategory]);

  const getPhilosophicalThought = useCallback(() => 
    getWisdomByCategory('philosophical'), [getWisdomByCategory]);

  // ═══════════════════════════════════════════════════════════════════════════
  // OFFLINE CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  const isOffline = useCallback((): boolean => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  }, []);

  const getOfflineResponse = useCallback((userInput?: string): string => {
    if (!isOffline()) {
      return ''; // Online, use normal AI
    }

    // Analyze user input for context
    if (userInput) {
      const lower = userInput.toLowerCase();
      
      if (lower.includes('panic') || lower.includes('anxious') || lower.includes('scared')) {
        return getPanicSupport();
      }
      if (lower.includes('lonely') || lower.includes('alone')) {
        return getLonelyNightWisdom();
      }
      if (lower.includes('sad') || lower.includes('depressed')) {
        return getComfortMessage();
      }
      if (lower.includes('tired') || lower.includes('sleep')) {
        return getSleepStory();
      }
      if (lower.includes('motivate') || lower.includes('inspire')) {
        return getMotivation();
      }
    }

    return getContextualWisdom();
  }, [
    isOffline,
    getPanicSupport,
    getLonelyNightWisdom,
    getComfortMessage,
    getSleepStory,
    getMotivation,
    getContextualWisdom,
  ]);

  return {
    // Core
    getWisdomByCategory,
    getMoodBasedWisdom,
    getTimeBasedWisdom,
    getContextualWisdom,
    getOfflineResponse,

    // Specific categories
    getLonelyNightWisdom,
    getPanicSupport,
    getHopeMessage,
    getComfortMessage,
    getMotivation,
    getGratitudePrompt,
    getSelfWorthAffirmation,
    getSleepStory,
    getMorningGreeting,
    getAffirmation,
    getPhilosophicalThought,

    // Utilities
    isOffline,
    wisdom,
    bioKernel,
  };
};

export default useOfflineWisdom;
