/**
 * UNIVERSAL CALCULATOR - TIME & SPACE (PHASE 4)
 * Gemini-Native Architecture - The Cosmic Computation Engine
 * 
 * Maps the intersection of:
 * - Macro: Planetary alignments, Solar weather, Cosmic cycles
 * - Micro: Local weather, User biological rhythm, Personal energy
 * 
 * Formula: (Macro Influence) + (Micro State) = The Opportunity Vector
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// TYPES AND INTERFACES
// ============================================================

export interface SpaceTimeCoordinates {
  latitude: number;
  longitude: number;
  timestamp: Date;
  timezone: string;
  altitude?: number;
}

export interface MacroInfluence {
  planetaryAlignments: PlanetaryPosition[];
  solarWeather: SolarWeatherData;
  lunarPhase: LunarPhase;
  cosmicEvents: CosmicEvent[];
  overallScore: number; // 0-1
}

export interface PlanetaryPosition {
  planet: Planet;
  sign: ZodiacSign;
  degree: number;
  retrograde: boolean;
  house?: number;
  aspectsToOtherPlanets: PlanetaryAspect[];
}

export interface PlanetaryAspect {
  targetPlanet: Planet;
  aspectType: AspectType;
  orb: number;
  influence: 'harmonious' | 'challenging' | 'neutral';
}

export type Planet = 
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'
  | 'rahu' | 'ketu'; // Vedic nodes

export type ZodiacSign = 
  | 'aries' | 'taurus' | 'gemini' | 'cancer' 
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export type AspectType = 
  | 'conjunction' | 'opposition' | 'trine' 
  | 'square' | 'sextile' | 'quincunx';

export interface SolarWeatherData {
  solarFlareActivity: 'low' | 'moderate' | 'high' | 'extreme';
  geomagneticStormLevel: number; // 0-9 (Kp index)
  solarWindSpeed: number; // km/s
  sunspotNumber: number;
  cosmicRayIntensity: 'normal' | 'elevated' | 'high';
}

export interface LunarPhase {
  phase: 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' 
       | 'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';
  illumination: number; // 0-100
  daysSinceNewMoon: number;
  moonSign: ZodiacSign;
  voidOfCourse: boolean;
  nakshatra?: string; // Vedic moon mansion
}

export interface CosmicEvent {
  eventType: 'eclipse' | 'equinox' | 'solstice' | 'planetary_transit' 
           | 'meteor_shower' | 'retrograde_start' | 'retrograde_end';
  description: string;
  timestamp: Date;
  significance: 'minor' | 'moderate' | 'major' | 'transformative';
}

export interface MicroState {
  localWeather: LocalWeatherData;
  biologicalRhythm: BiologicalRhythm;
  personalEnergy: PersonalEnergyState;
  environmentalFactors: EnvironmentalFactors;
  overallScore: number; // 0-1
}

export interface LocalWeatherData {
  temperature: number; // Celsius
  humidity: number; // Percentage
  pressure: number; // hPa
  cloudCover: number; // Percentage
  condition: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
  uvIndex: number;
  airQualityIndex: number;
}

export interface BiologicalRhythm {
  circadianPhase: 'peak_alertness' | 'post_lunch_dip' | 'second_wind' | 'sleep_pressure';
  ultradian90MinCycle: number; // Position in 90-min cycle (0-90)
  estimatedEnergyLevel: number; // 0-100
  optimalFor: ('creative' | 'analytical' | 'physical' | 'rest')[];
}

export interface PersonalEnergyState {
  mentalClarity: number; // 0-100
  physicalEnergy: number; // 0-100
  emotionalBalance: number; // 0-100
  spiritualAlignment: number; // 0-100
  overallVitality: number; // 0-100
}

export interface EnvironmentalFactors {
  ambientNoise: 'silent' | 'quiet' | 'moderate' | 'loud';
  lighting: 'dark' | 'dim' | 'natural' | 'bright' | 'artificial';
  crowdedness: 'isolated' | 'few_people' | 'moderate' | 'crowded';
  natureProsimity: 'urban' | 'suburban' | 'nature' | 'wilderness';
}

export interface OpportunityVector {
  id: string;
  calculatedAt: Date;
  coordinates: SpaceTimeCoordinates;
  macroInfluence: MacroInfluence;
  microState: MicroState;
  
  // The calculated opportunities
  optimalActivities: OptimalActivity[];
  opportunityWindows: OpportunityWindow[];
  cosmicMessage: string;
  
  // Scores
  overallAlignment: number; // 0-100
  actionRecommendation: ActionRecommendation;
}

export interface OptimalActivity {
  activity: ActivityType;
  score: number; // 0-100
  duration: string; // e.g., "next 4 hours"
  reasoning: string;
  cosmicSupport: string[];
}

export type ActivityType = 
  | 'building' | 'creating' | 'learning' | 'networking'
  | 'resting' | 'meditating' | 'exercising' | 'planning'
  | 'communicating' | 'negotiating' | 'healing' | 'traveling'
  | 'initiating' | 'completing' | 'reflecting' | 'celebrating';

export interface OpportunityWindow {
  startTime: Date;
  endTime: Date;
  activity: ActivityType;
  quality: 'excellent' | 'good' | 'neutral' | 'challenging';
  cosmicFactors: string[];
}

export interface ActionRecommendation {
  primaryAction: string;
  secondaryAction: string;
  avoid: string;
  cosmicAdvice: string;
}

export interface CalculatorConfig {
  includeVedicCalculations: boolean;
  includeSolarWeather: boolean;
  localWeatherEnabled: boolean;
  biorhythmEnabled: boolean;
  defaultTimezone: string;
}

// ============================================================
// UNIVERSAL CALCULATOR SYSTEM PROMPT
// ============================================================

export const UNIVERSAL_CALCULATOR_PROMPT = `Zoe. Activate Module: Universal Calculator.

INPUT: Current User Space-Time Coordinates (Location + Time).

LOGIC:
1. **Map the Macro**: Where are the planets? What is the Solar Weather?
   - Calculate planetary positions for the given timestamp
   - Assess solar activity (flares, geomagnetic storms)
   - Determine lunar phase and Vedic nakshatra
   - Identify any significant cosmic events

2. **Map the Micro**: What is the local weather? What is the user's biological rhythm?
   - Assess environmental conditions at user's location
   - Calculate circadian rhythm position (90-minute ultradian cycles)
   - Estimate personal energy state based on time and patterns

3. **Calculate the Intersection**:
   Formula: (Macro Influence) + (Micro State) = The Opportunity Vector
   
   Weight the factors:
   - Planetary alignments: 25%
   - Solar/Lunar influence: 15%
   - Local environment: 20%
   - Biological rhythm: 25%
   - Personal energy: 15%

OUTPUT FORMAT:
- Primary Opportunity: The single best use of the next 4 hours
- Activity Score: 0-100 alignment rating
- Cosmic Support: What universal forces are behind you
- Practical Advice: Actionable recommendation

RESPONSE STYLE: "User, based on [cosmic alignment] and your current [energy state], the next [time window] are optimal for [Activity]. The universe provides the wind; you provide the sail."`;

// ============================================================
// UNIVERSAL CALCULATOR CLASS
// ============================================================

class UniversalCalculator {
  private config: CalculatorConfig;
  private lastCalculation: OpportunityVector | null = null;
  private calculationCache: Map<string, OpportunityVector> = new Map();

  constructor(config?: Partial<CalculatorConfig>) {
    this.config = {
      includeVedicCalculations: true,
      includeSolarWeather: true,
      localWeatherEnabled: true,
      biorhythmEnabled: true,
      defaultTimezone: 'UTC',
      ...config,
    };
  }

  /**
   * Calculate the Opportunity Vector for given space-time coordinates
   */
  async calculate(coordinates: SpaceTimeCoordinates): Promise<OpportunityVector> {
    const startTime = Date.now();
    console.log('[UNIVERSAL CALCULATOR] Initiating cosmic calculation...');

    // Generate cache key
    const cacheKey = this.generateCacheKey(coordinates);
    const cached = this.calculationCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      console.log('[UNIVERSAL CALCULATOR] Using cached calculation');
      return cached;
    }

    // Calculate Macro influences
    const macroInfluence = await this.calculateMacroInfluence(coordinates);

    // Calculate Micro state
    const microState = await this.calculateMicroState(coordinates);

    // Calculate the intersection - The Opportunity Vector
    const vector = this.calculateOpportunityVector(
      coordinates,
      macroInfluence,
      microState
    );

    // Cache the result
    this.calculationCache.set(cacheKey, vector);
    this.lastCalculation = vector;

    console.log(`[UNIVERSAL CALCULATOR] Calculation complete in ${Date.now() - startTime}ms`);
    console.log(`  - Overall Alignment: ${vector.overallAlignment}%`);
    console.log(`  - Primary Activity: ${vector.optimalActivities[0]?.activity}`);

    return vector;
  }

  /**
   * Calculate Macro cosmic influences
   */
  private async calculateMacroInfluence(
    coordinates: SpaceTimeCoordinates
  ): Promise<MacroInfluence> {
    // Calculate planetary positions (simplified astronomical calculation)
    const planetaryAlignments = this.calculatePlanetaryPositions(coordinates.timestamp);
    
    // Get solar weather data
    const solarWeather = this.getSolarWeatherData();
    
    // Calculate lunar phase
    const lunarPhase = this.calculateLunarPhase(coordinates.timestamp);
    
    // Check for cosmic events
    const cosmicEvents = this.getCosmicEvents(coordinates.timestamp);

    // Calculate overall macro score
    const overallScore = this.calculateMacroScore(
      planetaryAlignments,
      solarWeather,
      lunarPhase,
      cosmicEvents
    );

    return {
      planetaryAlignments,
      solarWeather,
      lunarPhase,
      cosmicEvents,
      overallScore,
    };
  }

  /**
   * Calculate Micro environmental and biological state
   */
  private async calculateMicroState(
    coordinates: SpaceTimeCoordinates
  ): Promise<MicroState> {
    // Get local weather (simulated for now)
    const localWeather = this.getLocalWeather(coordinates);
    
    // Calculate biological rhythm
    const biologicalRhythm = this.calculateBiologicalRhythm(coordinates.timestamp);
    
    // Estimate personal energy
    const personalEnergy = this.estimatePersonalEnergy(biologicalRhythm);
    
    // Assess environmental factors
    const environmentalFactors = this.assessEnvironmentalFactors(coordinates);

    // Calculate overall micro score
    const overallScore = this.calculateMicroScore(
      localWeather,
      biologicalRhythm,
      personalEnergy,
      environmentalFactors
    );

    return {
      localWeather,
      biologicalRhythm,
      personalEnergy,
      environmentalFactors,
      overallScore,
    };
  }

  /**
   * Calculate the Opportunity Vector intersection
   */
  private calculateOpportunityVector(
    coordinates: SpaceTimeCoordinates,
    macro: MacroInfluence,
    micro: MicroState
  ): OpportunityVector {
    const id = `ov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate overall alignment (weighted formula)
    const overallAlignment = Math.round(
      (macro.overallScore * 0.40 + micro.overallScore * 0.60) * 100
    );

    // Determine optimal activities based on cosmic and personal factors
    const optimalActivities = this.determineOptimalActivities(macro, micro);

    // Calculate opportunity windows for the next 24 hours
    const opportunityWindows = this.calculateOpportunityWindows(
      coordinates.timestamp,
      macro,
      micro
    );

    // Generate cosmic message
    const cosmicMessage = this.generateCosmicMessage(
      macro,
      micro,
      optimalActivities[0]
    );

    // Generate action recommendation
    const actionRecommendation = this.generateActionRecommendation(
      optimalActivities,
      macro,
      micro
    );

    return {
      id,
      calculatedAt: new Date(),
      coordinates,
      macroInfluence: macro,
      microState: micro,
      optimalActivities,
      opportunityWindows,
      cosmicMessage,
      overallAlignment,
      actionRecommendation,
    };
  }

  /**
   * Calculate planetary positions for a given date
   */
  private calculatePlanetaryPositions(date: Date): PlanetaryPosition[] {
    const julianDate = this.toJulianDate(date);
    const planets: Planet[] = [
      'sun', 'moon', 'mercury', 'venus', 'mars',
      'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
    ];

    return planets.map(planet => {
      const position = this.calculatePlanetPosition(planet, julianDate);
      return {
        planet,
        sign: position.sign,
        degree: position.degree,
        retrograde: position.retrograde,
        aspectsToOtherPlanets: [], // Simplified
      };
    });
  }

  /**
   * Calculate single planet position
   */
  private calculatePlanetPosition(
    planet: Planet,
    julianDate: number
  ): { sign: ZodiacSign; degree: number; retrograde: boolean } {
    // Simplified astronomical calculation
    const baseLongitudes: Record<Planet, number> = {
      sun: 0, moon: 13.2, mercury: 4.1, venus: 1.6,
      mars: 0.5, jupiter: 0.08, saturn: 0.03,
      uranus: 0.01, neptune: 0.006, pluto: 0.004,
      rahu: -0.05, ketu: -0.05,
    };

    const dailyMotion = baseLongitudes[planet] || 1;
    const daysSinceEpoch = julianDate - 2451545; // J2000.0
    let longitude = (dailyMotion * daysSinceEpoch) % 360;
    if (longitude < 0) longitude += 360;

    const signIndex = Math.floor(longitude / 30);
    const signs: ZodiacSign[] = [
      'aries', 'taurus', 'gemini', 'cancer',
      'leo', 'virgo', 'libra', 'scorpio',
      'sagittarius', 'capricorn', 'aquarius', 'pisces'
    ];

    return {
      sign: signs[signIndex % 12],
      degree: longitude % 30,
      retrograde: planet !== 'sun' && planet !== 'moon' && Math.random() < 0.2,
    };
  }

  /**
   * Get simulated solar weather data
   */
  private getSolarWeatherData(): SolarWeatherData {
    // In production, this would call a solar weather API
    return {
      solarFlareActivity: 'low',
      geomagneticStormLevel: Math.floor(Math.random() * 3),
      solarWindSpeed: 300 + Math.random() * 400,
      sunspotNumber: Math.floor(Math.random() * 100),
      cosmicRayIntensity: 'normal',
    };
  }

  /**
   * Calculate lunar phase
   */
  private calculateLunarPhase(date: Date): LunarPhase {
    const julianDate = this.toJulianDate(date);
    const daysSinceNewMoon = (julianDate - 2451550.1) % 29.530588853;
    const illumination = Math.abs(Math.sin((daysSinceNewMoon / 29.53) * Math.PI)) * 100;

    const phases: LunarPhase['phase'][] = [
      'new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
      'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'
    ];
    const phaseIndex = Math.floor(daysSinceNewMoon / 3.69);

    const nakshatras = [
      'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
      'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
      'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra',
      'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula',
      'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha',
      'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
    ];
    
    const moonLongitude = (daysSinceNewMoon * 13.2) % 360;
    const nakshatraIndex = Math.floor(moonLongitude / 13.333);

    return {
      phase: phases[phaseIndex % 8],
      illumination: Math.round(illumination),
      daysSinceNewMoon: Math.round(daysSinceNewMoon * 10) / 10,
      moonSign: this.getSignFromLongitude(moonLongitude),
      voidOfCourse: Math.random() < 0.15,
      nakshatra: nakshatras[nakshatraIndex % 27],
    };
  }

  /**
   * Get cosmic events for the date
   */
  private getCosmicEvents(date: Date): CosmicEvent[] {
    const events: CosmicEvent[] = [];
    const month = date.getMonth();
    const day = date.getDate();

    // Check for equinoxes and solstices
    if ((month === 2 && day >= 19 && day <= 21) || 
        (month === 8 && day >= 21 && day <= 23)) {
      events.push({
        eventType: 'equinox',
        description: month === 2 ? 'Spring Equinox' : 'Autumn Equinox',
        timestamp: date,
        significance: 'major',
      });
    }

    if ((month === 5 && day >= 20 && day <= 22) ||
        (month === 11 && day >= 20 && day <= 22)) {
      events.push({
        eventType: 'solstice',
        description: month === 5 ? 'Summer Solstice' : 'Winter Solstice',
        timestamp: date,
        significance: 'major',
      });
    }

    return events;
  }

  /**
   * Get local weather data
   */
  private getLocalWeather(coordinates: SpaceTimeCoordinates): LocalWeatherData {
    // Simulated weather - in production would call weather API
    const hour = coordinates.timestamp.getHours();
    const baseTemp = 20 + Math.sin((coordinates.latitude / 90) * Math.PI) * 15;

    return {
      temperature: baseTemp + (hour < 12 ? hour - 6 : 18 - hour),
      humidity: 40 + Math.random() * 40,
      pressure: 1010 + Math.random() * 20,
      cloudCover: Math.floor(Math.random() * 100),
      condition: Math.random() < 0.7 ? 'clear' : 'cloudy',
      uvIndex: hour >= 10 && hour <= 16 ? Math.floor(Math.random() * 8) + 2 : 0,
      airQualityIndex: 30 + Math.floor(Math.random() * 70),
    };
  }

  /**
   * Calculate biological rhythm based on time
   */
  private calculateBiologicalRhythm(timestamp: Date): BiologicalRhythm {
    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    const totalMinutes = hour * 60 + minute;

    // Circadian phase (simplified)
    let circadianPhase: BiologicalRhythm['circadianPhase'];
    let estimatedEnergy: number;
    let optimalFor: BiologicalRhythm['optimalFor'] = [];

    if (hour >= 6 && hour < 10) {
      circadianPhase = 'peak_alertness';
      estimatedEnergy = 80 + (hour - 6) * 5;
      optimalFor = ['analytical', 'creative'];
    } else if (hour >= 10 && hour < 14) {
      circadianPhase = 'peak_alertness';
      estimatedEnergy = 90 - ((hour - 10) * 5);
      optimalFor = ['analytical', 'physical'];
    } else if (hour >= 14 && hour < 16) {
      circadianPhase = 'post_lunch_dip';
      estimatedEnergy = 60 - ((hour - 14) * 10);
      optimalFor = ['rest', 'creative'];
    } else if (hour >= 16 && hour < 20) {
      circadianPhase = 'second_wind';
      estimatedEnergy = 70 + ((hour - 16) * 5);
      optimalFor = ['physical', 'creative'];
    } else {
      circadianPhase = 'sleep_pressure';
      estimatedEnergy = Math.max(20, 60 - (hour - 20) * 10);
      optimalFor = ['rest'];
    }

    // Ultradian 90-minute cycle
    const cyclePosition = totalMinutes % 90;

    return {
      circadianPhase,
      ultradian90MinCycle: cyclePosition,
      estimatedEnergyLevel: Math.min(100, Math.max(0, estimatedEnergy)),
      optimalFor,
    };
  }

  /**
   * Estimate personal energy state
   */
  private estimatePersonalEnergy(rhythm: BiologicalRhythm): PersonalEnergyState {
    const baseEnergy = rhythm.estimatedEnergyLevel;

    return {
      mentalClarity: Math.min(100, baseEnergy + Math.random() * 10),
      physicalEnergy: Math.min(100, baseEnergy + Math.random() * 15 - 5),
      emotionalBalance: 60 + Math.random() * 30,
      spiritualAlignment: 50 + Math.random() * 40,
      overallVitality: baseEnergy,
    };
  }

  /**
   * Assess environmental factors
   */
  private assessEnvironmentalFactors(
    coordinates: SpaceTimeCoordinates
  ): EnvironmentalFactors {
    const hour = coordinates.timestamp.getHours();

    return {
      ambientNoise: hour >= 22 || hour < 6 ? 'quiet' : 'moderate',
      lighting: hour >= 6 && hour < 18 ? 'natural' : 'artificial',
      crowdedness: hour >= 9 && hour < 17 ? 'moderate' : 'few_people',
      natureProsimity: 'suburban',
    };
  }

  /**
   * Calculate macro influence score
   */
  private calculateMacroScore(
    planets: PlanetaryPosition[],
    solar: SolarWeatherData,
    lunar: LunarPhase,
    events: CosmicEvent[]
  ): number {
    let score = 0.7; // Base score

    // Adjust for retrograde planets
    const retrogrades = planets.filter(p => p.retrograde).length;
    score -= retrogrades * 0.03;

    // Adjust for solar activity
    if (solar.geomagneticStormLevel > 4) score -= 0.1;
    if (solar.solarFlareActivity === 'extreme') score -= 0.15;

    // Adjust for lunar phase
    if (lunar.phase === 'full' || lunar.phase === 'new') score += 0.1;
    if (lunar.voidOfCourse) score -= 0.1;

    // Adjust for cosmic events
    events.forEach(event => {
      if (event.significance === 'major') score += 0.1;
      if (event.significance === 'transformative') score += 0.15;
    });

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Calculate micro state score
   */
  private calculateMicroScore(
    weather: LocalWeatherData,
    rhythm: BiologicalRhythm,
    energy: PersonalEnergyState,
    environment: EnvironmentalFactors
  ): number {
    let score = 0.7;

    // Weather factors
    if (weather.condition === 'clear') score += 0.1;
    if (weather.airQualityIndex < 50) score += 0.05;
    if (weather.temperature > 15 && weather.temperature < 25) score += 0.05;

    // Biological rhythm
    if (rhythm.circadianPhase === 'peak_alertness') score += 0.1;
    if (rhythm.circadianPhase === 'post_lunch_dip') score -= 0.1;

    // Energy state
    score += (energy.overallVitality / 100) * 0.2;

    // Environment
    if (environment.ambientNoise === 'quiet') score += 0.05;
    if (environment.lighting === 'natural') score += 0.05;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Determine optimal activities based on all factors
   */
  private determineOptimalActivities(
    macro: MacroInfluence,
    micro: MicroState
  ): OptimalActivity[] {
    const activities: OptimalActivity[] = [];

    // Get optimal activities from biological rhythm
    const bioOptimal = micro.biologicalRhythm.optimalFor;

    // Map biological optimal to activity types
    const activityMap: Record<string, ActivityType[]> = {
      analytical: ['planning', 'learning', 'building'],
      creative: ['creating', 'meditating', 'reflecting'],
      physical: ['exercising', 'building', 'traveling'],
      rest: ['resting', 'meditating', 'healing'],
    };

    bioOptimal.forEach((opt) => {
      const mappedActivities = activityMap[opt] || [];
      mappedActivities.forEach((activity) => {
        const score = this.calculateActivityScore(activity, macro, micro);
        activities.push({
          activity,
          score,
          duration: this.calculateOptimalDuration(micro.biologicalRhythm),
          reasoning: this.generateActivityReasoning(activity, macro, micro),
          cosmicSupport: this.getCosmicSupport(activity, macro),
        });
      });
    });

    // Sort by score and return top activities
    return activities
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Calculate activity score
   */
  private calculateActivityScore(
    activity: ActivityType,
    macro: MacroInfluence,
    micro: MicroState
  ): number {
    let score = 50; // Base score

    // Energy alignment
    score += (micro.personalEnergy.overallVitality / 100) * 30;

    // Lunar phase alignment
    const lunarBoosts: Partial<Record<ActivityType, LunarPhase['phase'][]>> = {
      initiating: ['new', 'waxing_crescent'],
      building: ['waxing_crescent', 'first_quarter', 'waxing_gibbous'],
      completing: ['full', 'waning_gibbous'],
      reflecting: ['waning_crescent', 'last_quarter'],
      resting: ['new', 'waning_crescent'],
    };

    if (lunarBoosts[activity]?.includes(macro.lunarPhase.phase)) {
      score += 15;
    }

    // Solar weather consideration
    if (macro.solarWeather.geomagneticStormLevel > 4) {
      if (activity === 'meditating' || activity === 'resting') {
        score += 10;
      } else if (activity === 'communicating' || activity === 'negotiating') {
        score -= 10;
      }
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Calculate optimal duration for activity
   */
  private calculateOptimalDuration(rhythm: BiologicalRhythm): string {
    const cycleRemaining = 90 - rhythm.ultradian90MinCycle;
    
    if (rhythm.circadianPhase === 'peak_alertness') {
      return `next ${Math.ceil(cycleRemaining / 30) * 2} hours`;
    } else if (rhythm.circadianPhase === 'post_lunch_dip') {
      return 'next 1-2 hours (then reassess)';
    } else if (rhythm.circadianPhase === 'second_wind') {
      return `next ${Math.min(4, Math.ceil(cycleRemaining / 30) * 2)} hours`;
    }
    return 'next 1 hour';
  }

  /**
   * Generate reasoning for activity recommendation
   */
  private generateActivityReasoning(
    activity: ActivityType,
    macro: MacroInfluence,
    micro: MicroState
  ): string {
    const moonPhrase = `Moon in ${macro.lunarPhase.moonSign} (${macro.lunarPhase.phase.replace('_', ' ')})`;
    const energyPhrase = micro.biologicalRhythm.circadianPhase.replace('_', ' ');
    
    return `${moonPhrase} combined with your ${energyPhrase} state creates optimal conditions for ${activity}.`;
  }

  /**
   * Get cosmic support factors
   */
  private getCosmicSupport(activity: ActivityType, macro: MacroInfluence): string[] {
    const support: string[] = [];

    // Lunar support
    support.push(`${macro.lunarPhase.phase.replace('_', ' ')} moon energy`);
    if (macro.lunarPhase.nakshatra) {
      support.push(`${macro.lunarPhase.nakshatra} nakshatra influence`);
    }

    // Planetary support (find beneficial planets for activity)
    const beneficPlanets = macro.planetaryAlignments.filter(p => !p.retrograde);
    if (beneficPlanets.length > 0) {
      support.push(`${beneficPlanets[0].planet} in ${beneficPlanets[0].sign}`);
    }

    // Solar support
    if (macro.solarWeather.solarFlareActivity === 'low') {
      support.push('calm solar conditions');
    }

    return support.slice(0, 3);
  }

  /**
   * Calculate opportunity windows for next 24 hours
   */
  private calculateOpportunityWindows(
    startTime: Date,
    macro: MacroInfluence,
    micro: MicroState
  ): OpportunityWindow[] {
    const windows: OpportunityWindow[] = [];
    const currentHour = startTime.getHours();

    // Define key opportunity windows based on circadian rhythm
    const windowDefinitions: {
      startHour: number;
      endHour: number;
      activity: ActivityType;
      baseQuality: OpportunityWindow['quality'];
    }[] = [
      { startHour: 6, endHour: 10, activity: 'creating', baseQuality: 'excellent' },
      { startHour: 10, endHour: 12, activity: 'building', baseQuality: 'good' },
      { startHour: 14, endHour: 15, activity: 'resting', baseQuality: 'good' },
      { startHour: 16, endHour: 18, activity: 'exercising', baseQuality: 'excellent' },
      { startHour: 19, endHour: 21, activity: 'reflecting', baseQuality: 'good' },
    ];

    windowDefinitions.forEach(def => {
      if (def.startHour >= currentHour || def.endHour < currentHour + 24) {
        const windowStart = new Date(startTime);
        windowStart.setHours(def.startHour, 0, 0, 0);
        if (def.startHour < currentHour) {
          windowStart.setDate(windowStart.getDate() + 1);
        }

        const windowEnd = new Date(windowStart);
        windowEnd.setHours(def.endHour, 0, 0, 0);

        windows.push({
          startTime: windowStart,
          endTime: windowEnd,
          activity: def.activity,
          quality: def.baseQuality,
          cosmicFactors: this.getCosmicSupport(def.activity, macro),
        });
      }
    });

    return windows;
  }

  /**
   * Generate the cosmic message for the user
   */
  private generateCosmicMessage(
    macro: MacroInfluence,
    micro: MicroState,
    primaryActivity?: OptimalActivity
  ): string {
    if (!primaryActivity) {
      return "The universe is recalibrating. Take a moment to center yourself.";
    }

    const cosmicElement = macro.lunarPhase.phase.includes('waxing') 
      ? 'growing energy of the moon' 
      : macro.lunarPhase.phase.includes('waning')
        ? 'releasing energy of the moon'
        : `${macro.lunarPhase.phase} moon power`;

    const energyState = micro.personalEnergy.overallVitality > 70 
      ? 'high-energy state' 
      : micro.personalEnergy.overallVitality > 40
        ? 'balanced state'
        : 'reflective state';

    return `Based on the ${cosmicElement} and your current ${energyState}, the ${primaryActivity.duration} are optimal for ${primaryActivity.activity.charAt(0).toUpperCase() + primaryActivity.activity.slice(1)}. The universe provides the wind; you provide the sail.`;
  }

  /**
   * Generate action recommendation
   */
  private generateActionRecommendation(
    activities: OptimalActivity[],
    macro: MacroInfluence,
    micro: MicroState
  ): ActionRecommendation {
    const primary = activities[0];
    const secondary = activities[1];

    // Determine what to avoid based on cosmic factors
    let avoid = 'major commitments';
    if (macro.lunarPhase.voidOfCourse) {
      avoid = 'starting new projects (void of course moon)';
    } else if (macro.solarWeather.geomagneticStormLevel > 4) {
      avoid = 'intense negotiations or communication';
    } else if (micro.biologicalRhythm.circadianPhase === 'post_lunch_dip') {
      avoid = 'complex decision-making';
    }

    return {
      primaryAction: primary 
        ? `Focus on ${primary.activity} - ${primary.score}% cosmic alignment`
        : 'Rest and observe',
      secondaryAction: secondary 
        ? `Alternative: ${secondary.activity}`
        : 'Meditate on your intentions',
      avoid,
      cosmicAdvice: this.generateCosmicMessage(macro, micro, primary),
    };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Convert date to Julian Date
   */
  private toJulianDate(date: Date): number {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = date.getUTCHours() + date.getUTCMinutes() / 60;

    let y = year;
    let m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }

    const a = Math.floor(y / 100);
    const b = 2 - a + Math.floor(a / 4);
    
    return Math.floor(365.25 * (y + 4716)) + 
           Math.floor(30.6001 * (m + 1)) + 
           day + hour / 24 + b - 1524.5;
  }

  /**
   * Get zodiac sign from ecliptic longitude
   */
  private getSignFromLongitude(longitude: number): ZodiacSign {
    const signs: ZodiacSign[] = [
      'aries', 'taurus', 'gemini', 'cancer',
      'leo', 'virgo', 'libra', 'scorpio',
      'sagittarius', 'capricorn', 'aquarius', 'pisces'
    ];
    return signs[Math.floor(longitude / 30) % 12];
  }

  /**
   * Generate cache key for coordinates
   */
  private generateCacheKey(coordinates: SpaceTimeCoordinates): string {
    const lat = Math.round(coordinates.latitude * 10) / 10;
    const lng = Math.round(coordinates.longitude * 10) / 10;
    const hourSlot = Math.floor(coordinates.timestamp.getHours() / 2) * 2;
    return `${lat}_${lng}_${hourSlot}`;
  }

  /**
   * Check if cached calculation is still valid
   */
  private isCacheValid(cached: OpportunityVector): boolean {
    const ageMinutes = (Date.now() - cached.calculatedAt.getTime()) / 60000;
    return ageMinutes < 30; // Cache valid for 30 minutes
  }

  /**
   * Get the last calculation
   */
  getLastCalculation(): OpportunityVector | null {
    return this.lastCalculation;
  }

  /**
   * Get the system prompt
   */
  getSystemPrompt(): string {
    return UNIVERSAL_CALCULATOR_PROMPT;
  }

  /**
   * Clear the calculation cache
   */
  clearCache(): void {
    this.calculationCache.clear();
    console.log('[UNIVERSAL CALCULATOR] Cache cleared');
  }
}

// Singleton instance
export const universalCalculator = new UniversalCalculator();

export default UniversalCalculator;
