/**
 * PROJECT AGASTHYA - THE DIVINE CAREER ENGINE
 * Merges Vedic Astrology with Quantum AI for Career Prediction
 * 
 * Part of Zoe Infinity DHF Core - Standalone System
 * Temple Glass Aesthetics with Holographic Sanskrit/Golden Ratios
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════
// VEDIC CAREER ARCHETYPES (Based on Nakshatras & Planetary Lords)
// ═══════════════════════════════════════════════════════════════════
export interface VedicCareerArchetype {
  id: string;
  name: string;
  sanskritName: string;
  planetaryLord: string;
  element: 'fire' | 'earth' | 'air' | 'water' | 'ether';
  careers: string[];
  strengths: string[];
  challenges: string[];
  gemstone: string;
  color: string;
  mantra: string;
}

const VEDIC_ARCHETYPES: VedicCareerArchetype[] = [
  {
    id: 'surya-leader',
    name: 'The Sovereign Leader',
    sanskritName: 'सूर्य नेता',
    planetaryLord: 'Sun (Surya)',
    element: 'fire',
    careers: ['CEO', 'Government Leader', 'Entrepreneur', 'Director', 'Judge'],
    strengths: ['Authority', 'Vision', 'Integrity', 'Charisma'],
    challenges: ['Ego', 'Delegation', 'Patience'],
    gemstone: 'Ruby',
    color: '#FF6B35',
    mantra: 'ॐ सूर्याय नमः'
  },
  {
    id: 'chandra-healer',
    name: 'The Nurturing Healer',
    sanskritName: 'चंद्र चिकित्सक',
    planetaryLord: 'Moon (Chandra)',
    element: 'water',
    careers: ['Doctor', 'Nurse', 'Psychologist', 'Chef', 'Social Worker'],
    strengths: ['Empathy', 'Intuition', 'Patience', 'Creativity'],
    challenges: ['Mood swings', 'Over-attachment', 'Boundaries'],
    gemstone: 'Pearl',
    color: '#E8F4F8',
    mantra: 'ॐ चंद्राय नमः'
  },
  {
    id: 'mangal-warrior',
    name: 'The Strategic Warrior',
    sanskritName: 'मंगल योद्धा',
    planetaryLord: 'Mars (Mangal)',
    element: 'fire',
    careers: ['Military', 'Surgeon', 'Athlete', 'Engineer', 'Firefighter'],
    strengths: ['Courage', 'Action', 'Determination', 'Physical prowess'],
    challenges: ['Aggression', 'Impatience', 'Conflict'],
    gemstone: 'Red Coral',
    color: '#DC143C',
    mantra: 'ॐ मंगलाय नमः'
  },
  {
    id: 'budha-communicator',
    name: 'The Divine Communicator',
    sanskritName: 'बुध वक्ता',
    planetaryLord: 'Mercury (Budha)',
    element: 'air',
    careers: ['Writer', 'Journalist', 'Teacher', 'Trader', 'Programmer'],
    strengths: ['Intelligence', 'Communication', 'Adaptability', 'Analysis'],
    challenges: ['Overthinking', 'Anxiety', 'Inconsistency'],
    gemstone: 'Emerald',
    color: '#50C878',
    mantra: 'ॐ बुधाय नमः'
  },
  {
    id: 'guru-guide',
    name: 'The Wisdom Guide',
    sanskritName: 'गुरु मार्गदर्शक',
    planetaryLord: 'Jupiter (Guru)',
    element: 'ether',
    careers: ['Professor', 'Spiritual Teacher', 'Lawyer', 'Advisor', 'Philosopher'],
    strengths: ['Wisdom', 'Teaching', 'Ethics', 'Expansion'],
    challenges: ['Overconfidence', 'Excess', 'Preaching'],
    gemstone: 'Yellow Sapphire',
    color: '#FFD700',
    mantra: 'ॐ गुरवे नमः'
  },
  {
    id: 'shukra-artist',
    name: 'The Creative Artist',
    sanskritName: 'शुक्र कलाकार',
    planetaryLord: 'Venus (Shukra)',
    element: 'water',
    careers: ['Artist', 'Designer', 'Musician', 'Fashion', 'Beauty Expert'],
    strengths: ['Beauty', 'Harmony', 'Creativity', 'Diplomacy'],
    challenges: ['Indulgence', 'Vanity', 'Attachment'],
    gemstone: 'Diamond',
    color: '#FF69B4',
    mantra: 'ॐ शुक्राय नमः'
  },
  {
    id: 'shani-architect',
    name: 'The Patient Architect',
    sanskritName: 'शनि वास्तुकार',
    planetaryLord: 'Saturn (Shani)',
    element: 'earth',
    careers: ['Architect', 'Scientist', 'Manager', 'Agriculturist', 'Real Estate'],
    strengths: ['Discipline', 'Persistence', 'Structure', 'Long-term vision'],
    challenges: ['Pessimism', 'Rigidity', 'Delays'],
    gemstone: 'Blue Sapphire',
    color: '#191970',
    mantra: 'ॐ शनैश्चराय नमः'
  },
  {
    id: 'rahu-innovator',
    name: 'The Bold Innovator',
    sanskritName: 'राहु नवप्रवर्तक',
    planetaryLord: 'Rahu (North Node)',
    element: 'air',
    careers: ['Tech Entrepreneur', 'Researcher', 'Inventor', 'Occultist', 'Politician'],
    strengths: ['Innovation', 'Ambition', 'Unconventional thinking', 'Technology'],
    challenges: ['Obsession', 'Illusion', 'Shortcuts'],
    gemstone: 'Hessonite',
    color: '#8B4513',
    mantra: 'ॐ राहवे नमः'
  },
  {
    id: 'ketu-mystic',
    name: 'The Spiritual Mystic',
    sanskritName: 'केतु तपस्वी',
    planetaryLord: 'Ketu (South Node)',
    element: 'ether',
    careers: ['Healer', 'Monk', 'Researcher', 'Programmer', 'Detective'],
    strengths: ['Spirituality', 'Detachment', 'Insight', 'Past-life wisdom'],
    challenges: ['Confusion', 'Isolation', 'Letting go'],
    gemstone: "Cat's Eye",
    color: '#808080',
    mantra: 'ॐ केतवे नमः'
  }
];

// ═══════════════════════════════════════════════════════════════════
// CAREER PREDICTION RESULT
// ═══════════════════════════════════════════════════════════════════
export interface CareerPrediction {
  primaryArchetype: VedicCareerArchetype;
  secondaryArchetype: VedicCareerArchetype;
  compatibilityScore: number;
  recommendedCareers: string[];
  karmaProcessor: {
    pastLifeInfluence: string;
    currentLifeLesson: string;
    futureDestiny: string;
  };
  auspiciousTiming: {
    bestMonths: string[];
    avoidMonths: string[];
    luckyDays: string[];
  };
  remedies: string[];
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════
// HOOK: useAgasthyaCareerEngine
// ═══════════════════════════════════════════════════════════════════
export const useAgasthyaCareerEngine = () => {
  const { user } = useAuth();
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState<CareerPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // VEDIC CALCULATION: Analyze birth data for career destiny
  // ═══════════════════════════════════════════════════════════════════
  const calculateVedicCareer = useCallback(async (birthData: {
    name: string;
    birthDate: Date;
    birthTime?: string;
    birthPlace?: string;
  }): Promise<CareerPrediction> => {
    setIsPredicting(true);
    setError(null);

    try {
      const { name, birthDate, birthTime, birthPlace } = birthData;
      
      // Calculate Nakshatra from birth date (simplified Vedic calculation)
      const dayOfYear = Math.floor((birthDate.getTime() - new Date(birthDate.getFullYear(), 0, 0).getTime()) / 86400000);
      const nakshatraIndex = (dayOfYear + birthDate.getDate()) % 27;
      
      // Map Nakshatra to planetary lord
      const nakshatraPlanetMap = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8];
      const primaryPlanetIndex = nakshatraPlanetMap[nakshatraIndex];
      
      // Calculate secondary archetype from birth month
      const monthIndex = birthDate.getMonth();
      const secondaryPlanetIndex = (monthIndex + 1) % 9;
      
      const primaryArchetype = VEDIC_ARCHETYPES[primaryPlanetIndex];
      const secondaryArchetype = VEDIC_ARCHETYPES[secondaryPlanetIndex !== primaryPlanetIndex ? secondaryPlanetIndex : (secondaryPlanetIndex + 1) % 9];
      
      // Calculate compatibility between archetypes
      const elementCompatibility: Record<string, string[]> = {
        fire: ['fire', 'air'],
        earth: ['earth', 'water'],
        air: ['air', 'fire', 'ether'],
        water: ['water', 'earth'],
        ether: ['ether', 'air', 'fire']
      };
      
      const isCompatible = elementCompatibility[primaryArchetype.element].includes(secondaryArchetype.element);
      const compatibilityScore = isCompatible ? 85 + Math.random() * 10 : 60 + Math.random() * 20;
      
      // Merge career recommendations
      const recommendedCareers = [
        ...primaryArchetype.careers.slice(0, 3),
        ...secondaryArchetype.careers.slice(0, 2)
      ];
      
      // Calculate auspicious timing based on planetary periods
      const currentMonth = new Date().getMonth();
      const bestMonths = [
        ['January', 'May', 'September'],
        ['February', 'June', 'October'],
        ['March', 'July', 'November'],
        ['April', 'August', 'December']
      ][primaryPlanetIndex % 4];
      
      const avoidMonths = primaryArchetype.element === 'fire' ? ['November', 'December'] : ['July', 'August'];
      
      const luckyDays = primaryArchetype.element === 'fire' ? ['Sunday', 'Tuesday'] :
                        primaryArchetype.element === 'earth' ? ['Saturday', 'Wednesday'] :
                        primaryArchetype.element === 'air' ? ['Wednesday', 'Friday'] :
                        primaryArchetype.element === 'water' ? ['Monday', 'Friday'] : ['Thursday'];
      
      // Generate karma processor insights
      const karmaProcessor = {
        pastLifeInfluence: `${name}'s soul carries the energy of a ${primaryArchetype.name.toLowerCase()}. In past incarnations, mastery was developed in ${primaryArchetype.careers[0].toLowerCase()} and ${primaryArchetype.careers[1].toLowerCase()}.`,
        currentLifeLesson: `This lifetime focuses on balancing ${primaryArchetype.strengths[0]} with overcoming ${primaryArchetype.challenges[0]}. The path leads through ${secondaryArchetype.careers[0].toLowerCase()}.`,
        futureDestiny: `By age 35-40, ${name} will achieve recognition in ${recommendedCareers[0]}. The ${primaryArchetype.planetaryLord} period will bring major career transformation.`
      };
      
      // Generate remedies
      const remedies = [
        `Wear ${primaryArchetype.gemstone} on ${primaryArchetype.element === 'fire' ? 'right ring finger' : 'left ring finger'}`,
        `Chant ${primaryArchetype.mantra} 108 times daily for career growth`,
        `Donate to ${primaryArchetype.element === 'fire' ? 'education' : primaryArchetype.element === 'water' ? 'water bodies' : 'the needy'} on ${luckyDays[0]}s`,
        `Meditate during ${primaryArchetype.planetaryLord} hora for enhanced clarity`
      ];

      const result: CareerPrediction = {
        primaryArchetype,
        secondaryArchetype,
        compatibilityScore: Math.round(compatibilityScore),
        recommendedCareers,
        karmaProcessor,
        auspiciousTiming: {
          bestMonths,
          avoidMonths,
          luckyDays
        },
        remedies,
        timestamp: Date.now()
      };

      setPrediction(result);

      // Log to behavioral events for DHF integration
      if (user) {
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'agasthya_career_prediction',
          event_category: 'divine_engine',
          metadata: { 
            name: birthData.name,
            primaryArchetype: primaryArchetype.id,
            secondaryArchetype: secondaryArchetype.id,
            compatibilityScore: Math.round(compatibilityScore)
          }
        });
      }

      // Dispatch to Zoe Core DHF
      window.dispatchEvent(new CustomEvent('zoe-agasthya-prediction', {
        detail: { prediction: result, birthData }
      }));

      console.log('[Agasthya] Career prediction complete:', result);
      return result;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Prediction failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsPredicting(false);
    }
  }, [user]);

  // ═══════════════════════════════════════════════════════════════════
  // GET ALL ARCHETYPES
  // ═══════════════════════════════════════════════════════════════════
  const getArchetypes = useCallback(() => VEDIC_ARCHETYPES, []);

  return {
    isPredicting,
    prediction,
    error,
    calculateVedicCareer,
    getArchetypes,
    archetypes: VEDIC_ARCHETYPES
  };
};

export default useAgasthyaCareerEngine;
