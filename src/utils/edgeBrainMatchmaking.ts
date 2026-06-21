// ═══════════════════════════════════════════════════════════════════════════════
// EDGE BRAIN PROTOCOL - LOCAL MATCHMAKING ENGINE
// Zero server cost - All calculations happen on device
// Soul Vector caching + client-side compatibility scoring
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CachedSoulVector {
  userId: string;
  driverNumber: number;
  conductorNumber: number;
  vibrationNumber: number;
  humorStyle: string;
  conflictStyle: string;
  decisionStyle: string;
  stressResponse: string;
  currentLifePhase: string;
  personalYear: number;
  location?: { lat: number; lng: number };
  cachedAt: number; // timestamp
  expiresAt: number; // timestamp
}

export interface CompatibilityResult {
  score: number;           // 0-100
  numerologyMatch: number; // 0-100
  styleMatch: number;      // 0-100
  phaseAlignment: number;  // 0-100
  proximityScore?: number; // 0-100 (if location available)
  chemistry: 'high' | 'medium' | 'low';
  insights: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOUL VECTOR CACHE (IndexedDB-like in-memory with localStorage backup)
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_KEY = 'edge_brain_soul_vectors';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

class SoulVectorCache {
  private cache: Map<string, CachedSoulVector> = new Map();
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (this.initialized) return;
    
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const data: CachedSoulVector[] = JSON.parse(stored);
        const now = Date.now();
        
        // Filter out expired entries
        data.forEach(v => {
          if (v.expiresAt > now) {
            this.cache.set(v.userId, v);
          }
        });
      }
      this.initialized = true;
    } catch (e) {
      console.warn('[EdgeBrain] Failed to load cache:', e);
      this.cache.clear();
      this.initialized = true;
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.cache.values());
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[EdgeBrain] Failed to save cache:', e);
    }
  }

  get(userId: string): CachedSoulVector | null {
    const vector = this.cache.get(userId);
    if (!vector) return null;
    
    // Check expiry
    if (vector.expiresAt < Date.now()) {
      this.cache.delete(userId);
      return null;
    }
    
    return vector;
  }

  set(vector: CachedSoulVector): void {
    this.cache.set(vector.userId, vector);
    this.saveToStorage();
  }

  setMany(vectors: CachedSoulVector[]): void {
    vectors.forEach(v => this.cache.set(v.userId, v));
    this.saveToStorage();
  }

  getAll(): CachedSoulVector[] {
    const now = Date.now();
    const valid: CachedSoulVector[] = [];
    
    this.cache.forEach((v, k) => {
      if (v.expiresAt > now) {
        valid.push(v);
      } else {
        this.cache.delete(k);
      }
    });
    
    return valid;
  }

  clear(): void {
    this.cache.clear();
    localStorage.removeItem(CACHE_KEY);
  }

  size(): number {
    return this.cache.size;
  }
}

export const soulVectorCache = new SoulVectorCache();

// ═══════════════════════════════════════════════════════════════════════════════
// NUMEROLOGY COMPATIBILITY MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

const NUMEROLOGY_MATRIX: Record<number, Record<number, number>> = {
  1: { 1: 70, 2: 80, 3: 90, 4: 60, 5: 85, 6: 75, 7: 65, 8: 80, 9: 95 },
  2: { 1: 80, 2: 85, 3: 75, 4: 90, 5: 60, 6: 95, 7: 70, 8: 85, 9: 65 },
  3: { 1: 90, 2: 75, 3: 80, 4: 55, 5: 95, 6: 85, 7: 60, 8: 70, 9: 90 },
  4: { 1: 60, 2: 90, 3: 55, 4: 75, 5: 65, 6: 85, 7: 95, 8: 90, 9: 50 },
  5: { 1: 85, 2: 60, 3: 95, 4: 65, 5: 70, 6: 60, 7: 75, 8: 65, 9: 95 },
  6: { 1: 75, 2: 95, 3: 85, 4: 85, 5: 60, 6: 80, 7: 55, 8: 75, 9: 90 },
  7: { 1: 65, 2: 70, 3: 60, 4: 95, 5: 75, 6: 55, 7: 90, 8: 60, 9: 70 },
  8: { 1: 80, 2: 85, 3: 70, 4: 90, 5: 65, 6: 75, 7: 60, 8: 85, 9: 55 },
  9: { 1: 95, 2: 65, 3: 90, 4: 50, 5: 95, 6: 90, 7: 70, 8: 55, 9: 75 }
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLE COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

const STYLE_COMPATIBILITY: Record<string, Record<string, number>> = {
  // Humor styles
  humor: {
    'witty-witty': 95, 'witty-playful': 85, 'witty-dry': 80, 'witty-neutral': 70,
    'playful-playful': 90, 'playful-witty': 85, 'playful-dry': 60, 'playful-neutral': 75,
    'dry-dry': 85, 'dry-witty': 80, 'dry-playful': 60, 'dry-neutral': 70,
    'neutral-neutral': 75, 'neutral-witty': 70, 'neutral-playful': 75, 'neutral-dry': 70
  },
  // Conflict styles
  conflict: {
    'diplomatic-diplomatic': 90, 'diplomatic-direct': 70, 'diplomatic-avoidant': 65,
    'direct-direct': 75, 'direct-diplomatic': 70, 'direct-avoidant': 50,
    'avoidant-avoidant': 60, 'avoidant-diplomatic': 65, 'avoidant-direct': 50
  },
  // Decision styles
  decision: {
    'analytical-analytical': 85, 'analytical-intuitive': 70, 'analytical-balanced': 80,
    'intuitive-intuitive': 80, 'intuitive-analytical': 70, 'intuitive-balanced': 85,
    'balanced-balanced': 90, 'balanced-analytical': 80, 'balanced-intuitive': 85
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIFE PHASE ALIGNMENT
// ═══════════════════════════════════════════════════════════════════════════════

const PHASE_ALIGNMENT: Record<string, Record<string, number>> = {
  'Foundation': { 'Foundation': 90, 'Discovery': 85, 'Mastery': 70, 'Wisdom': 60 },
  'Discovery': { 'Foundation': 85, 'Discovery': 95, 'Mastery': 80, 'Wisdom': 70 },
  'Mastery': { 'Foundation': 70, 'Discovery': 80, 'Mastery': 90, 'Wisdom': 85 },
  'Wisdom': { 'Foundation': 60, 'Discovery': 70, 'Mastery': 85, 'Wisdom': 95 }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL COMPATIBILITY CALCULATOR (Zero server CPU)
// ═══════════════════════════════════════════════════════════════════════════════

export const calculateCompatibilityLocal = (
  myVector: CachedSoulVector,
  theirVector: CachedSoulVector
): CompatibilityResult => {
  const insights: string[] = [];

  // 1. Numerology Match (Driver + Conductor + Vibration)
  const driverMatch = NUMEROLOGY_MATRIX[myVector.driverNumber]?.[theirVector.driverNumber] || 70;
  const conductorMatch = NUMEROLOGY_MATRIX[myVector.conductorNumber]?.[theirVector.conductorNumber] || 70;
  const vibrationMatch = myVector.vibrationNumber === theirVector.vibrationNumber ? 100 : 
    Math.abs(myVector.vibrationNumber - theirVector.vibrationNumber) <= 2 ? 80 : 60;
  
  const numerologyMatch = (driverMatch * 0.4) + (conductorMatch * 0.4) + (vibrationMatch * 0.2);

  if (driverMatch >= 90) insights.push('Soul number harmony detected');
  if (conductorMatch >= 90) insights.push('Life path alignment strong');

  // 2. Style Match (Humor + Conflict + Decision)
  const humorKey = `${myVector.humorStyle}-${theirVector.humorStyle}`.toLowerCase();
  const humorMatch = STYLE_COMPATIBILITY.humor[humorKey] || 70;
  
  const conflictKey = `${myVector.conflictStyle}-${theirVector.conflictStyle}`.toLowerCase();
  const conflictMatch = STYLE_COMPATIBILITY.conflict[conflictKey] || 70;
  
  const decisionKey = `${myVector.decisionStyle}-${theirVector.decisionStyle}`.toLowerCase();
  const decisionMatch = STYLE_COMPATIBILITY.decision[decisionKey] || 70;
  
  const styleMatch = (humorMatch * 0.35) + (conflictMatch * 0.35) + (decisionMatch * 0.3);

  if (humorMatch >= 85) insights.push('Compatible humor wavelengths');
  if (conflictMatch >= 80) insights.push('Harmonious conflict resolution');

  // 3. Life Phase Alignment
  const myPhase = extractPhase(myVector.currentLifePhase);
  const theirPhase = extractPhase(theirVector.currentLifePhase);
  const phaseAlignment = PHASE_ALIGNMENT[myPhase]?.[theirPhase] || 70;

  if (phaseAlignment >= 85) insights.push('Life phase synchronicity');

  // 4. Personal Year Resonance
  const yearDiff = Math.abs(myVector.personalYear - theirVector.personalYear);
  const yearBonus = yearDiff === 0 ? 10 : yearDiff <= 2 ? 5 : 0;

  if (yearDiff === 0) insights.push('Same personal year - powerful connection');

  // 5. Proximity Score (if locations available)
  let proximityScore: number | undefined;
  if (myVector.location && theirVector.location) {
    const distance = calculateDistance(
      myVector.location.lat, myVector.location.lng,
      theirVector.location.lat, theirVector.location.lng
    );
    // Score: 100 for < 1km, decreasing to 0 at > 50km
    proximityScore = distance < 1 ? 100 : Math.max(0, 100 - (distance / 0.5));
    
    if (distance < 5) insights.push('Nearby connection');
  }

  // Calculate final score
  const baseScore = (numerologyMatch * 0.35) + (styleMatch * 0.35) + (phaseAlignment * 0.3) + yearBonus;
  const finalScore = Math.min(100, Math.max(0, baseScore));

  // Determine chemistry level
  const chemistry: 'high' | 'medium' | 'low' = 
    finalScore >= 80 ? 'high' : finalScore >= 60 ? 'medium' : 'low';

  return {
    score: Math.round(finalScore),
    numerologyMatch: Math.round(numerologyMatch),
    styleMatch: Math.round(styleMatch),
    phaseAlignment: Math.round(phaseAlignment),
    proximityScore: proximityScore ? Math.round(proximityScore) : undefined,
    chemistry,
    insights
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH MATCHING (Find top matches from cached vectors)
// ═══════════════════════════════════════════════════════════════════════════════

export interface MatchResult {
  userId: string;
  compatibility: CompatibilityResult;
}

export const findTopMatchesLocal = (
  myVector: CachedSoulVector,
  limit: number = 10,
  minScore: number = 60
): MatchResult[] => {
  const allVectors = soulVectorCache.getAll();
  const matches: MatchResult[] = [];

  for (const vector of allVectors) {
    if (vector.userId === myVector.userId) continue;

    const compatibility = calculateCompatibilityLocal(myVector, vector);
    if (compatibility.score >= minScore) {
      matches.push({ userId: vector.userId, compatibility });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.compatibility.score - a.compatibility.score);

  return matches.slice(0, limit);
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const extractPhase = (lifePhase: string): string => {
  if (lifePhase.includes('Foundation')) return 'Foundation';
  if (lifePhase.includes('Discovery')) return 'Discovery';
  if (lifePhase.includes('Mastery')) return 'Mastery';
  if (lifePhase.includes('Wisdom')) return 'Wisdom';
  return 'Discovery';
};

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg: number): number => deg * (Math.PI / 180);

// ═══════════════════════════════════════════════════════════════════════════════
// VECTOR BUILDER (Creates cacheable vector from profile data)
// ═══════════════════════════════════════════════════════════════════════════════

export const buildCacheableSoulVector = (
  userId: string,
  driverNumber: number,
  conductorNumber: number,
  vibrationNumber: number,
  humorStyle: string = 'neutral',
  conflictStyle: string = 'diplomatic',
  decisionStyle: string = 'balanced',
  stressResponse: string = 'adaptive',
  currentLifePhase: string = 'Discovery',
  personalYear: number = 1,
  location?: { lat: number; lng: number }
): CachedSoulVector => {
  const now = Date.now();
  return {
    userId,
    driverNumber,
    conductorNumber,
    vibrationNumber,
    humorStyle,
    conflictStyle,
    decisionStyle,
    stressResponse,
    currentLifePhase,
    personalYear,
    location,
    cachedAt: now,
    expiresAt: now + CACHE_DURATION_MS
  };
};

export default {
  soulVectorCache,
  calculateCompatibilityLocal,
  findTopMatchesLocal,
  buildCacheableSoulVector
};
