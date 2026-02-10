// ═══════════════════════════════════════════════════════════════════════════════
// ANIMA INTEREST ENGINE - Interest, Hobby, Profession, Location Based Matching
// Integrated with Zoe DHF Core for Real-World Ultra-Fast Soul Matching
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Categories of interests with weighted importance for matching
 */
export const INTEREST_CATEGORIES = {
  'Creative & Artistic': {
    interests: ['Art', 'Painting', 'Design', 'Writing', 'Photography', 'Filmmaking', 'Music', 'Dance', 'Fashion', 'Calligraphy'],
    weight: 1.2 // Creative souls often bond deeply
  },
  'Intellectual & Academic': {
    interests: ['Reading', 'Philosophy', 'Psychology', 'History', 'Languages', 'Literature', 'Science', 'Astronomy', 'Education', 'Research'],
    weight: 1.3 // Intellectual compatibility is highly valued
  },
  'Tech & Digital': {
    interests: ['Technology', 'Coding', 'Gaming', 'AI', 'Robotics', 'Blogging', 'Podcasts', 'Editing', 'Crypto', 'Design (UI/UX)'],
    weight: 1.1
  },
  'Active & Physical': {
    interests: ['Sports', 'Fitness', 'Yoga', 'Hiking', 'Cycling', 'Running', 'Skateboarding', 'Swimming', 'Dancing', 'Martial Arts'],
    weight: 1.0
  },
  'Lifestyle & Social': {
    interests: ['Travel', 'Cooking', 'Baking', 'Gardening', 'Volunteering', 'Fashion', 'Minimalism', 'Collecting', 'Cars', 'Architecture'],
    weight: 1.1
  },
  'Spiritual & Mindful': {
    interests: ['Meditation', 'Yoga', 'Astrology', 'Tarot', 'Energy Healing', 'Buddhism', 'Hinduism', 'Mindfulness', 'Crystal Healing', 'Chakras'],
    weight: 1.4 // Spiritual alignment is critical for deep connections
  },
  'Entertainment & Media': {
    interests: ['Movies', 'TV Shows', 'Anime', 'Comics', 'Music Festivals', 'Theater', 'Stand-up', 'Podcasts', 'Documentaries', 'True Crime'],
    weight: 0.9
  }
} as const;

/**
 * Profession compatibility matrix - some professions naturally complement
 */
export const PROFESSION_SYNERGY: Record<string, string[]> = {
  'Engineer': ['Designer', 'Scientist', 'Entrepreneur', 'Artist', 'Writer'],
  'Designer': ['Engineer', 'Artist', 'Marketer', 'Photographer', 'Entrepreneur'],
  'Doctor': ['Nurse', 'Scientist', 'Psychologist', 'Researcher', 'Social Worker'],
  'Teacher': ['Student', 'Writer', 'Counselor', 'Researcher', 'Librarian'],
  'Artist': ['Designer', 'Writer', 'Musician', 'Photographer', 'Filmmaker'],
  'Writer': ['Editor', 'Journalist', 'Teacher', 'Artist', 'Marketer'],
  'Entrepreneur': ['Engineer', 'Designer', 'Marketer', 'Investor', 'Developer'],
  'Developer': ['Designer', 'Engineer', 'Entrepreneur', 'Data Scientist', 'Product Manager'],
  'Musician': ['Artist', 'Producer', 'Dancer', 'DJ', 'Sound Engineer'],
  'Psychologist': ['Counselor', 'Social Worker', 'Doctor', 'Teacher', 'Writer'],
  'Scientist': ['Researcher', 'Engineer', 'Doctor', 'Professor', 'Data Scientist'],
  'Marketer': ['Designer', 'Writer', 'Entrepreneur', 'Content Creator', 'Sales'],
  'Lawyer': ['Writer', 'Politician', 'Entrepreneur', 'Consultant', 'Professor'],
  'Photographer': ['Designer', 'Artist', 'Filmmaker', 'Journalist', 'Marketer'],
  'Chef': ['Food Blogger', 'Nutritionist', 'Entrepreneur', 'Travel Writer', 'Farmer']
};

/**
 * Extended Soul Vector with interest data
 */
export interface ExtendedSoulVector {
  userId: string;
  hobbies: string[];
  profession?: string;
  fieldOfStudy?: string;
  city?: string;
  country?: string;
  discoveredInterests?: string[];
  // Zoe DHF integration
  zoeLearned?: {
    frequentTopics: string[];
    emotionalPatterns: string[];
    communicationStyle: string;
    preferredActivities: string[];
  };
}

/**
 * Interest Match Score breakdown
 */
export interface InterestSynergyScore {
  overall: number;
  sharedInterests: number;
  categoryAlignment: number;
  professionSynergy: number;
  locationProximity: number;
  zoeDHFCompatibility: number;
  sharedInterestsList: string[];
  alignedCategories: string[];
  matchInsights: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ULTRA-FAST INTEREST MATCHING - Optimized with Memoization
// ═══════════════════════════════════════════════════════════════════════════════

// LRU Cache for computed results
const interestMatchCache = new Map<string, { result: InterestSynergyScore; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key for two users
 */
function getCacheKey(userAId: string, userBId: string): string {
  return [userAId, userBId].sort().join('_');
}

/**
 * Get categorized interests for faster matching
 */
function categorizeInterests(hobbies: string[]): Map<string, string[]> {
  const categorized = new Map<string, string[]>();
  
  for (const hobby of hobbies) {
    const normalizedHobby = hobby.toLowerCase().trim();
    for (const [category, data] of Object.entries(INTEREST_CATEGORIES)) {
      if (data.interests.some(i => i.toLowerCase() === normalizedHobby)) {
        const existing = categorized.get(category) || [];
        existing.push(hobby);
        categorized.set(category, existing);
        break;
      }
    }
  }
  
  return categorized;
}

/**
 * Calculate shared interests score with category weighting
 */
export function calculateSharedInterestScore(
  hobbiesA: string[],
  hobbiesB: string[]
): { score: number; shared: string[]; categories: string[] } {
  if (!hobbiesA?.length || !hobbiesB?.length) {
    return { score: 0, shared: [], categories: [] };
  }

  const normalizedA = new Set(hobbiesA.map(h => h.toLowerCase().trim()));
  const normalizedB = new Set(hobbiesB.map(h => h.toLowerCase().trim()));
  
  const shared: string[] = [];
  let weightedScore = 0;
  const matchedCategories = new Set<string>();
  
  for (const hobby of normalizedA) {
    if (normalizedB.has(hobby)) {
      shared.push(hobby);
      
      // Find category and apply weight
      for (const [category, data] of Object.entries(INTEREST_CATEGORIES)) {
        if (data.interests.some(i => i.toLowerCase() === hobby)) {
          weightedScore += data.weight * 10;
          matchedCategories.add(category);
          break;
        }
      }
      // Fallback weight for uncategorized interests
      if (!matchedCategories.size) {
        weightedScore += 8;
      }
    }
  }
  
  // Normalize to 0-100 (max 8 shared interests = 100)
  const maxPossibleScore = 8 * 14; // 8 interests * max weight 1.4 * 10
  const normalizedScore = Math.min(100, (weightedScore / maxPossibleScore) * 100);
  
  return {
    score: Math.round(normalizedScore),
    shared,
    categories: Array.from(matchedCategories)
  };
}

/**
 * Calculate category alignment (do they have interests in similar domains?)
 */
export function calculateCategoryAlignment(
  hobbiesA: string[],
  hobbiesB: string[]
): number {
  const categoriesA = categorizeInterests(hobbiesA);
  const categoriesB = categorizeInterests(hobbiesB);
  
  let alignmentScore = 0;
  let matchedCategories = 0;
  
  for (const [category, interests] of categoriesA) {
    if (categoriesB.has(category)) {
      matchedCategories++;
      const weight = INTEREST_CATEGORIES[category as keyof typeof INTEREST_CATEGORIES]?.weight || 1;
      alignmentScore += weight * 15;
    }
  }
  
  // Normalize to 0-100
  const maxScore = Object.keys(INTEREST_CATEGORIES).length * 1.4 * 15;
  return Math.min(100, Math.round((alignmentScore / maxScore) * 100));
}

/**
 * Calculate profession synergy
 */
export function calculateProfessionSynergy(
  professionA?: string,
  professionB?: string
): number {
  if (!professionA || !professionB) return 50; // Neutral if unknown
  
  const normalizedA = professionA.toLowerCase().trim();
  const normalizedB = professionB.toLowerCase().trim();
  
  // Same profession = high compatibility
  if (normalizedA === normalizedB) return 85;
  
  // Check synergy matrix
  for (const [profession, synergies] of Object.entries(PROFESSION_SYNERGY)) {
    if (profession.toLowerCase() === normalizedA) {
      if (synergies.some(s => s.toLowerCase() === normalizedB)) {
        return 80;
      }
    }
    if (profession.toLowerCase() === normalizedB) {
      if (synergies.some(s => s.toLowerCase() === normalizedA)) {
        return 80;
      }
    }
  }
  
  return 50; // Neutral for unrelated professions
}

/**
 * Calculate location proximity score
 */
export function calculateLocationScore(
  cityA?: string,
  countryA?: string,
  cityB?: string,
  countryB?: string
): number {
  if (!cityA && !countryA && !cityB && !countryB) return 50;
  
  // Same city = highest
  if (cityA && cityB && cityA.toLowerCase() === cityB.toLowerCase()) return 100;
  
  // Same country = good
  if (countryA && countryB && countryA.toLowerCase() === countryB.toLowerCase()) return 75;
  
  // Different location
  return 30;
}

/**
 * Calculate Zoe DHF compatibility (learned patterns)
 */
export function calculateZoeDHFCompatibility(
  zoeLearned_A?: ExtendedSoulVector['zoeLearned'],
  zoeLearned_B?: ExtendedSoulVector['zoeLearned']
): number {
  if (!zoeLearned_A || !zoeLearned_B) return 50;
  
  let score = 50;
  
  // Frequent topics overlap
  if (zoeLearned_A.frequentTopics && zoeLearned_B.frequentTopics) {
    const topicsA = new Set(zoeLearned_A.frequentTopics.map(t => t.toLowerCase()));
    const topicsB = new Set(zoeLearned_B.frequentTopics.map(t => t.toLowerCase()));
    const sharedTopics = [...topicsA].filter(t => topicsB.has(t));
    score += sharedTopics.length * 5;
  }
  
  // Communication style match
  if (zoeLearned_A.communicationStyle === zoeLearned_B.communicationStyle) {
    score += 15;
  }
  
  // Preferred activities overlap
  if (zoeLearned_A.preferredActivities && zoeLearned_B.preferredActivities) {
    const activitiesA = new Set(zoeLearned_A.preferredActivities.map(a => a.toLowerCase()));
    const activitiesB = new Set(zoeLearned_B.preferredActivities.map(a => a.toLowerCase()));
    const sharedActivities = [...activitiesA].filter(a => activitiesB.has(a));
    score += sharedActivities.length * 8;
  }
  
  return Math.min(100, score);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN INTEREST SYNERGY ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze full interest-based compatibility (with caching)
 */
export function analyzeInterestSynergy(
  vectorA: ExtendedSoulVector,
  vectorB: ExtendedSoulVector
): InterestSynergyScore {
  // Check cache first
  const cacheKey = getCacheKey(vectorA.userId, vectorB.userId);
  const cached = interestMatchCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  
  // Calculate all dimensions
  const interestResult = calculateSharedInterestScore(vectorA.hobbies || [], vectorB.hobbies || []);
  const categoryAlignment = calculateCategoryAlignment(vectorA.hobbies || [], vectorB.hobbies || []);
  const professionSynergy = calculateProfessionSynergy(vectorA.profession, vectorB.profession);
  const locationProximity = calculateLocationScore(vectorA.city, vectorA.country, vectorB.city, vectorB.country);
  const zoeDHFCompatibility = calculateZoeDHFCompatibility(vectorA.zoeLearned, vectorB.zoeLearned);
  
  // Weighted overall score
  const overall = Math.round(
    interestResult.score * 0.30 +
    categoryAlignment * 0.20 +
    professionSynergy * 0.15 +
    locationProximity * 0.15 +
    zoeDHFCompatibility * 0.20
  );
  
  // Generate insights
  const matchInsights: string[] = [];
  
  if (interestResult.shared.length >= 3) {
    matchInsights.push(`Strong interest overlap: You both love ${interestResult.shared.slice(0, 3).join(', ')}`);
  }
  if (interestResult.categories.length >= 2) {
    matchInsights.push(`Similar life domains: ${interestResult.categories.slice(0, 2).join(' & ')}`);
  }
  if (professionSynergy >= 75) {
    matchInsights.push('Professional synergy detected - your careers complement each other');
  }
  if (locationProximity >= 75) {
    matchInsights.push('Geographic proximity enables easy meetups');
  }
  if (zoeDHFCompatibility >= 70) {
    matchInsights.push('Zoe detects behavioral pattern alignment');
  }
  
  const result: InterestSynergyScore = {
    overall,
    sharedInterests: interestResult.score,
    categoryAlignment,
    professionSynergy,
    locationProximity,
    zoeDHFCompatibility,
    sharedInterestsList: interestResult.shared,
    alignedCategories: interestResult.categories,
    matchInsights
  };
  
  // Cache the result
  interestMatchCache.set(cacheKey, { result, timestamp: Date.now() });
  
  // Limit cache size (LRU eviction)
  if (interestMatchCache.size > 500) {
    const oldestKey = interestMatchCache.keys().next().value;
    if (oldestKey) interestMatchCache.delete(oldestKey);
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH PROCESSING FOR ULTRA-FAST MATCHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find top interest-based matches from a pool (optimized)
 */
export function findTopInterestMatches(
  userVector: ExtendedSoulVector,
  pool: ExtendedSoulVector[],
  limit: number = 10,
  minScore: number = 40
): Array<{ userId: string; synergy: InterestSynergyScore }> {
  return pool
    .filter(v => v.userId !== userVector.userId)
    .map(v => ({
      userId: v.userId,
      synergy: analyzeInterestSynergy(userVector, v)
    }))
    .filter(m => m.synergy.overall >= minScore)
    .sort((a, b) => b.synergy.overall - a.synergy.overall)
    .slice(0, limit);
}

/**
 * Clear cache for fresh calculations
 */
export function clearInterestMatchCache(): void {
  interestMatchCache.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const AnimaInterestEngine = {
  INTEREST_CATEGORIES,
  PROFESSION_SYNERGY,
  calculateSharedInterestScore,
  calculateCategoryAlignment,
  calculateProfessionSynergy,
  calculateLocationScore,
  calculateZoeDHFCompatibility,
  analyzeInterestSynergy,
  findTopInterestMatches,
  clearInterestMatchCache
};

export default AnimaInterestEngine;
