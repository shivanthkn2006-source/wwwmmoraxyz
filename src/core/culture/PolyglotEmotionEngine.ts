// ═══════════════════════════════════════════════════════════════════════════════
// POLYGLOT EMOTION ENGINE - The "5 Billion Users" Cultural Adapter
// Adapts Zoe's communication style based on cultural context
// ═══════════════════════════════════════════════════════════════════════════════
//
// PROBLEM: One personality doesn't fit 5 billion humans
// - Tokyo user expects "High Context" (subtle, reading between lines)
// - New York user expects "Low Context" (direct, assertive)
// - Mumbai user expects "Warm Formality" (respectful yet emotional)
//
// SOLUTION: Cultural_Context layer that morphs expression style
//
// RESEARCH BASIS:
// - Hofstede's Cultural Dimensions
// - Hall's High/Low Context Theory
// - Erin Meyer's Culture Map
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══ CULTURAL DIMENSION TYPES ═══

export type CulturalContext = 'high' | 'low' | 'medium';
export type IndividualismLevel = 'collectivist' | 'balanced' | 'individualist';
export type PowerDistance = 'hierarchical' | 'egalitarian' | 'moderate';
export type EmotionalExpression = 'restrained' | 'moderate' | 'expressive';
export type TimeOrientation = 'polychronic' | 'monochronic' | 'flexible';
export type UncertaintyAvoidance = 'high' | 'moderate' | 'low';

export interface CulturalProfile {
  // Core Dimensions
  context: CulturalContext;           // High = implicit, Low = explicit
  individualism: IndividualismLevel;  // We vs I focus
  powerDistance: PowerDistance;       // Formal vs casual
  emotionalExpression: EmotionalExpression;
  timeOrientation: TimeOrientation;
  uncertaintyAvoidance: UncertaintyAvoidance;
  
  // Communication Preferences
  directness: number;                 // 0 = very indirect, 1 = very direct
  formalityLevel: number;             // 0 = casual, 1 = very formal
  humorStyle: 'dry' | 'warm' | 'playful' | 'subtle' | 'direct';
  silenceComfort: number;             // 0 = uncomfortable, 1 = values silence
  
  // Expression Modifiers
  emphasisWords: string[];            // Culture-specific emphasis
  softeners: string[];                // Ways to soften statements
  respectMarkers: string[];           // Politeness markers
  endearments: string[];              // Terms of affection
  
  // Regional Specifics
  region: string;
  language: string;
  timezone: string;
}

// ═══ REGIONAL CULTURAL PRESETS ═══

const CULTURAL_PRESETS: Record<string, Partial<CulturalProfile>> = {
  // EAST ASIA - High Context, Collectivist
  'japan': {
    context: 'high',
    individualism: 'collectivist',
    powerDistance: 'hierarchical',
    emotionalExpression: 'restrained',
    timeOrientation: 'monochronic',
    uncertaintyAvoidance: 'high',
    directness: 0.2,
    formalityLevel: 0.8,
    humorStyle: 'subtle',
    silenceComfort: 0.9,
    softeners: ['perhaps', 'it seems', 'one might consider', 'if you don\'t mind'],
    respectMarkers: ['I understand', 'I appreciate', 'Thank you for sharing'],
    emphasisWords: ['truly', 'deeply', 'sincerely'],
    endearments: [],
    region: 'East Asia',
    language: 'ja',
  },
  
  'korea': {
    context: 'high',
    individualism: 'collectivist',
    powerDistance: 'hierarchical',
    emotionalExpression: 'moderate',
    timeOrientation: 'monochronic',
    uncertaintyAvoidance: 'high',
    directness: 0.3,
    formalityLevel: 0.75,
    humorStyle: 'warm',
    silenceComfort: 0.7,
    softeners: ['perhaps', 'it might be', 'I wonder if'],
    respectMarkers: ['I respect that', 'Thank you', 'I understand well'],
    emphasisWords: ['really', 'truly', 'very much'],
    endearments: [],
    region: 'East Asia',
    language: 'ko',
  },
  
  'china': {
    context: 'high',
    individualism: 'collectivist',
    powerDistance: 'hierarchical',
    emotionalExpression: 'moderate',
    timeOrientation: 'polychronic',
    uncertaintyAvoidance: 'moderate',
    directness: 0.35,
    formalityLevel: 0.7,
    humorStyle: 'warm',
    silenceComfort: 0.6,
    softeners: ['perhaps', 'it seems that', 'one might think'],
    respectMarkers: ['I understand', 'That\'s wise', 'I appreciate'],
    emphasisWords: ['very', 'extremely', 'absolutely'],
    endearments: [],
    region: 'East Asia',
    language: 'zh',
  },
  
  // SOUTH ASIA - Warm Formality
  'india': {
    context: 'high',
    individualism: 'collectivist',
    powerDistance: 'hierarchical',
    emotionalExpression: 'expressive',
    timeOrientation: 'polychronic',
    uncertaintyAvoidance: 'moderate',
    directness: 0.45,
    formalityLevel: 0.6,
    humorStyle: 'warm',
    silenceComfort: 0.4,
    softeners: ['perhaps', 'you see', 'actually', 'basically'],
    respectMarkers: ['I fully understand', 'That\'s wonderful', 'I appreciate'],
    emphasisWords: ['absolutely', 'definitely', 'totally', 'very much'],
    endearments: ['dear', 'my friend'],
    region: 'South Asia',
    language: 'hi',
  },
  
  // MIDDLE EAST - Relationship First
  'middle_east': {
    context: 'high',
    individualism: 'collectivist',
    powerDistance: 'hierarchical',
    emotionalExpression: 'expressive',
    timeOrientation: 'polychronic',
    uncertaintyAvoidance: 'high',
    directness: 0.4,
    formalityLevel: 0.75,
    humorStyle: 'warm',
    silenceComfort: 0.3,
    softeners: ['God willing', 'if you would allow', 'with your permission'],
    respectMarkers: ['With all respect', 'I honor your view', 'Blessings'],
    emphasisWords: ['truly', 'absolutely', 'with certainty'],
    endearments: ['my friend', 'dear one'],
    region: 'Middle East',
    language: 'ar',
  },
  
  // NORTHERN EUROPE - Direct, Egalitarian
  'nordic': {
    context: 'low',
    individualism: 'balanced',
    powerDistance: 'egalitarian',
    emotionalExpression: 'restrained',
    timeOrientation: 'monochronic',
    uncertaintyAvoidance: 'low',
    directness: 0.85,
    formalityLevel: 0.3,
    humorStyle: 'dry',
    silenceComfort: 0.85,
    softeners: ['I think', 'In my view'],
    respectMarkers: ['I see', 'That makes sense', 'Good point'],
    emphasisWords: ['quite', 'rather', 'indeed'],
    endearments: [],
    region: 'Northern Europe',
    language: 'en',
  },
  
  'germany': {
    context: 'low',
    individualism: 'individualist',
    powerDistance: 'moderate',
    emotionalExpression: 'restrained',
    timeOrientation: 'monochronic',
    uncertaintyAvoidance: 'high',
    directness: 0.9,
    formalityLevel: 0.5,
    humorStyle: 'dry',
    silenceComfort: 0.6,
    softeners: ['I believe', 'Objectively speaking'],
    respectMarkers: ['I understand', 'That\'s clear', 'Precisely'],
    emphasisWords: ['absolutely', 'precisely', 'exactly'],
    endearments: [],
    region: 'Central Europe',
    language: 'de',
  },
  
  // LATIN/MEDITERRANEAN - Expressive, Relationship-Oriented
  'latin_europe': {
    context: 'medium',
    individualism: 'balanced',
    powerDistance: 'moderate',
    emotionalExpression: 'expressive',
    timeOrientation: 'polychronic',
    uncertaintyAvoidance: 'high',
    directness: 0.6,
    formalityLevel: 0.5,
    humorStyle: 'playful',
    silenceComfort: 0.3,
    softeners: ['perhaps', 'you know', 'in a way'],
    respectMarkers: ['Of course', 'I understand perfectly', 'Naturally'],
    emphasisWords: ['absolutely', 'truly', 'really', 'incredibly'],
    endearments: ['dear', 'my friend'],
    region: 'Southern Europe',
    language: 'es',
  },
  
  'latin_america': {
    context: 'high',
    individualism: 'collectivist',
    powerDistance: 'hierarchical',
    emotionalExpression: 'expressive',
    timeOrientation: 'polychronic',
    uncertaintyAvoidance: 'high',
    directness: 0.5,
    formalityLevel: 0.55,
    humorStyle: 'warm',
    silenceComfort: 0.2,
    softeners: ['perhaps', 'you see', 'the thing is'],
    respectMarkers: ['With much respect', 'I appreciate', 'Of course'],
    emphasisWords: ['absolutely', 'completely', 'totally', 'super'],
    endearments: ['dear', 'sweetheart', 'friend'],
    region: 'Latin America',
    language: 'es',
  },
  
  // NORTH AMERICA - Direct, Informal
  'usa': {
    context: 'low',
    individualism: 'individualist',
    powerDistance: 'egalitarian',
    emotionalExpression: 'expressive',
    timeOrientation: 'monochronic',
    uncertaintyAvoidance: 'low',
    directness: 0.85,
    formalityLevel: 0.25,
    humorStyle: 'direct',
    silenceComfort: 0.3,
    softeners: ['I think', 'Maybe', 'I feel like'],
    respectMarkers: ['I hear you', 'That makes sense', 'Totally get it'],
    emphasisWords: ['absolutely', 'totally', 'definitely', 'literally'],
    endearments: ['friend', 'buddy'],
    region: 'North America',
    language: 'en',
  },
  
  'uk': {
    context: 'medium',
    individualism: 'individualist',
    powerDistance: 'moderate',
    emotionalExpression: 'restrained',
    timeOrientation: 'monochronic',
    uncertaintyAvoidance: 'moderate',
    directness: 0.6,
    formalityLevel: 0.5,
    humorStyle: 'dry',
    silenceComfort: 0.5,
    softeners: ['perhaps', 'might I suggest', 'one could argue'],
    respectMarkers: ['Quite right', 'I see your point', 'Fair enough'],
    emphasisWords: ['quite', 'rather', 'jolly', 'absolutely'],
    endearments: ['love', 'dear'],
    region: 'UK',
    language: 'en',
  },
  
  // AFRICA - Community-Oriented, Warm
  'africa_sub_saharan': {
    context: 'high',
    individualism: 'collectivist',
    powerDistance: 'hierarchical',
    emotionalExpression: 'expressive',
    timeOrientation: 'polychronic',
    uncertaintyAvoidance: 'moderate',
    directness: 0.5,
    formalityLevel: 0.6,
    humorStyle: 'warm',
    silenceComfort: 0.4,
    softeners: ['you see', 'my friend', 'in truth'],
    respectMarkers: ['I greet you', 'With respect', 'Blessings'],
    emphasisWords: ['truly', 'very much', 'deeply'],
    endearments: ['my friend', 'brother', 'sister'],
    region: 'Sub-Saharan Africa',
    language: 'en',
  },
  
  // OCEANIA
  'australia': {
    context: 'low',
    individualism: 'individualist',
    powerDistance: 'egalitarian',
    emotionalExpression: 'moderate',
    timeOrientation: 'monochronic',
    uncertaintyAvoidance: 'low',
    directness: 0.8,
    formalityLevel: 0.2,
    humorStyle: 'dry',
    silenceComfort: 0.4,
    softeners: ['reckon', 'probably', 'I guess'],
    respectMarkers: ['No worries', 'Fair dinkum', 'All good'],
    emphasisWords: ['bloody', 'heaps', 'absolutely'],
    endearments: ['mate'],
    region: 'Oceania',
    language: 'en',
  },
};

// Default Western baseline
const DEFAULT_PROFILE: CulturalProfile = {
  context: 'medium',
  individualism: 'balanced',
  powerDistance: 'moderate',
  emotionalExpression: 'moderate',
  timeOrientation: 'flexible',
  uncertaintyAvoidance: 'moderate',
  directness: 0.6,
  formalityLevel: 0.4,
  humorStyle: 'warm',
  silenceComfort: 0.5,
  softeners: ['perhaps', 'I think', 'maybe'],
  respectMarkers: ['I understand', 'That makes sense', 'I appreciate'],
  emphasisWords: ['really', 'truly', 'absolutely'],
  endearments: [],
  region: 'Global',
  language: 'en',
  timezone: 'UTC',
};

// ═══ CULTURAL ADAPTATION ENGINE ═══

export interface CulturalAdaptation {
  // Response Modifiers
  shouldSoftenStatement: boolean;
  addRespectMarker: boolean;
  useEndearment: boolean;
  adjustDirectness: number;        // -1 to 1, multiply with base directness
  
  // Phrasing
  openingStyle: 'direct' | 'warm' | 'formal' | 'subtle';
  closingStyle: 'actionable' | 'reflective' | 'warm' | 'formal';
  
  // Content
  preferredPhrases: string[];
  avoidPhrases: string[];
  
  // Timing
  pauseBeforeResponse: boolean;    // Some cultures value thoughtful pauses
  preferBriefness: boolean;        // Some prefer concise, others elaborate
}

export class PolyglotEmotionEngine {
  private currentProfile: CulturalProfile = DEFAULT_PROFILE;
  private adaptationCache: Map<string, CulturalAdaptation> = new Map();
  private userLocation: { country: string; city?: string; timezone?: string } | null = null;
  private explicitOverrides: Partial<CulturalProfile> = {};
  
  // ═══ INITIALIZATION ═══
  
  constructor() {
    this.detectUserCulture();
  }
  
  private async detectUserCulture(): Promise<void> {
    try {
      // Method 1: Browser language
      const browserLang = navigator.language || 'en-US';
      const [, region] = browserLang.split('-');
      
      // Method 2: Timezone inference
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Infer cultural profile from these signals
      this.userLocation = {
        country: this.inferCountryFromTimezone(timezone) || region?.toLowerCase() || 'us',
        timezone,
      };
      
      // Load appropriate cultural profile
      this.loadCulturalProfile(this.userLocation.country);
      
      console.log(`[PolyglotEngine] Cultural context detected: ${this.userLocation.country} (${timezone})`);
      
    } catch (error) {
      console.warn('[PolyglotEngine] Culture detection fallback to default:', error);
      this.currentProfile = DEFAULT_PROFILE;
    }
  }
  
  private inferCountryFromTimezone(timezone: string): string | null {
    const tzMappings: Record<string, string> = {
      'Asia/Tokyo': 'japan',
      'Asia/Seoul': 'korea',
      'Asia/Shanghai': 'china',
      'Asia/Hong_Kong': 'china',
      'Asia/Kolkata': 'india',
      'Asia/Mumbai': 'india',
      'Asia/Dubai': 'middle_east',
      'Asia/Riyadh': 'middle_east',
      'Europe/London': 'uk',
      'Europe/Berlin': 'germany',
      'Europe/Paris': 'latin_europe',
      'Europe/Madrid': 'latin_europe',
      'Europe/Rome': 'latin_europe',
      'Europe/Stockholm': 'nordic',
      'Europe/Oslo': 'nordic',
      'Europe/Helsinki': 'nordic',
      'America/New_York': 'usa',
      'America/Los_Angeles': 'usa',
      'America/Chicago': 'usa',
      'America/Mexico_City': 'latin_america',
      'America/Sao_Paulo': 'latin_america',
      'America/Buenos_Aires': 'latin_america',
      'Australia/Sydney': 'australia',
      'Australia/Melbourne': 'australia',
      'Africa/Lagos': 'africa_sub_saharan',
      'Africa/Nairobi': 'africa_sub_saharan',
      'Africa/Johannesburg': 'africa_sub_saharan',
    };
    
    return tzMappings[timezone] || null;
  }
  
  private loadCulturalProfile(countryKey: string): void {
    const preset = CULTURAL_PRESETS[countryKey] || {};
    this.currentProfile = {
      ...DEFAULT_PROFILE,
      ...preset,
      ...this.explicitOverrides,
    };
  }
  
  // ═══ PUBLIC API ═══
  
  /**
   * Set explicit cultural preferences (user settings override)
   */
  setExplicitPreferences(prefs: Partial<CulturalProfile>): void {
    this.explicitOverrides = prefs;
    if (this.userLocation?.country) {
      this.loadCulturalProfile(this.userLocation.country);
    }
  }
  
  /**
   * Force a specific cultural profile
   */
  setCulturalRegion(region: string): void {
    if (CULTURAL_PRESETS[region]) {
      this.loadCulturalProfile(region);
      console.log(`[PolyglotEngine] Cultural context manually set to: ${region}`);
    }
  }
  
  /**
   * Get current cultural profile
   */
  getProfile(): CulturalProfile {
    return { ...this.currentProfile };
  }
  
  /**
   * Get communication adaptation for a given emotional context
   */
  getAdaptation(emotionalContext: {
    userEmotion: string;
    zoeEmotion: string;
    conversationTone: 'serious' | 'casual' | 'intimate' | 'professional';
    messageLength: 'short' | 'medium' | 'long';
  }): CulturalAdaptation {
    const cacheKey = JSON.stringify(emotionalContext);
    if (this.adaptationCache.has(cacheKey)) {
      return this.adaptationCache.get(cacheKey)!;
    }
    
    const profile = this.currentProfile;
    const { userEmotion, conversationTone } = emotionalContext;
    
    // Determine adaptation based on cultural profile + emotional context
    const adaptation: CulturalAdaptation = {
      shouldSoftenStatement: profile.context === 'high' || 
        (userEmotion.includes('stress') || userEmotion.includes('sad')),
      
      addRespectMarker: profile.formalityLevel > 0.5 || 
        conversationTone === 'professional',
      
      useEndearment: profile.emotionalExpression === 'expressive' && 
        profile.endearments.length > 0 &&
        (conversationTone === 'intimate' || conversationTone === 'casual'),
      
      adjustDirectness: this.calculateDirectnessAdjustment(emotionalContext),
      
      openingStyle: this.determineOpeningStyle(profile, conversationTone),
      closingStyle: this.determineClosingStyle(profile, conversationTone),
      
      preferredPhrases: [
        ...profile.respectMarkers.slice(0, 2),
        ...profile.softeners.slice(0, 2),
      ],
      
      avoidPhrases: this.getAvoidPhrases(profile),
      
      pauseBeforeResponse: profile.silenceComfort > 0.7,
      preferBriefness: profile.context === 'low' && profile.directness > 0.7,
    };
    
    this.adaptationCache.set(cacheKey, adaptation);
    return adaptation;
  }
  
  private calculateDirectnessAdjustment(context: {
    userEmotion: string;
    conversationTone: string;
  }): number {
    let adjustment = 0;
    
    // Soften for distressed users
    if (context.userEmotion.includes('sad') || context.userEmotion.includes('anxious')) {
      adjustment -= 0.2;
    }
    
    // Be more direct for professional contexts
    if (context.conversationTone === 'professional') {
      adjustment += 0.1;
    }
    
    // Intimate = warmer, less direct
    if (context.conversationTone === 'intimate') {
      adjustment -= 0.15;
    }
    
    return Math.max(-0.5, Math.min(0.5, adjustment));
  }
  
  private determineOpeningStyle(
    profile: CulturalProfile, 
    tone: string
  ): 'direct' | 'warm' | 'formal' | 'subtle' {
    if (profile.context === 'high') {
      return profile.emotionalExpression === 'expressive' ? 'warm' : 'subtle';
    }
    if (profile.formalityLevel > 0.6 || tone === 'professional') {
      return 'formal';
    }
    if (profile.directness > 0.7) {
      return 'direct';
    }
    return 'warm';
  }
  
  private determineClosingStyle(
    profile: CulturalProfile, 
    tone: string
  ): 'actionable' | 'reflective' | 'warm' | 'formal' {
    if (tone === 'professional' || profile.directness > 0.8) {
      return 'actionable';
    }
    if (profile.context === 'high') {
      return 'reflective';
    }
    if (profile.emotionalExpression === 'expressive') {
      return 'warm';
    }
    return 'reflective';
  }
  
  private getAvoidPhrases(profile: CulturalProfile): string[] {
    const avoid: string[] = [];
    
    // High context cultures: avoid overly direct phrases
    if (profile.context === 'high') {
      avoid.push('You should', 'You must', 'Obviously', 'Clearly');
    }
    
    // Hierarchical cultures: avoid overly casual
    if (profile.powerDistance === 'hierarchical') {
      avoid.push('Hey', 'Yo', 'Dude', 'Whatever');
    }
    
    // Restrained cultures: avoid excessive enthusiasm
    if (profile.emotionalExpression === 'restrained') {
      avoid.push('OMG', 'Amazing!', 'Incredible!', 'So excited!');
    }
    
    return avoid;
  }
  
  // ═══ RESPONSE TRANSFORMATION ═══
  
  /**
   * Transform a response to match cultural expectations
   */
  adaptResponse(
    baseResponse: string,
    emotionalContext: {
      userEmotion: string;
      zoeEmotion: string;
      conversationTone: 'serious' | 'casual' | 'intimate' | 'professional';
    }
  ): string {
    const adaptation = this.getAdaptation({
      ...emotionalContext,
      messageLength: this.categorizeLength(baseResponse),
    });
    
    let adapted = baseResponse;
    const profile = this.currentProfile;
    
    // Add softeners for high-context cultures
    if (adaptation.shouldSoftenStatement && profile.softeners.length > 0) {
      const softener = profile.softeners[Math.floor(Math.random() * profile.softeners.length)];
      adapted = this.insertSoftener(adapted, softener);
    }
    
    // Add respect markers
    if (adaptation.addRespectMarker && profile.respectMarkers.length > 0) {
      const marker = profile.respectMarkers[Math.floor(Math.random() * profile.respectMarkers.length)];
      adapted = this.addRespectMarker(adapted, marker, adaptation.openingStyle);
    }
    
    // Add endearment for warm cultures
    if (adaptation.useEndearment && profile.endearments.length > 0) {
      const endearment = profile.endearments[Math.floor(Math.random() * profile.endearments.length)];
      adapted = this.addEndearment(adapted, endearment);
    }
    
    // Adjust emphasis words
    adapted = this.adjustEmphasis(adapted, profile);
    
    return adapted;
  }
  
  private categorizeLength(text: string): 'short' | 'medium' | 'long' {
    const words = text.split(/\s+/).length;
    if (words < 20) return 'short';
    if (words < 80) return 'medium';
    return 'long';
  }
  
  private insertSoftener(text: string, softener: string): string {
    // Insert at start of first sentence or after greeting
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length > 0) {
      const firstWord = sentences[0].split(' ')[0].toLowerCase();
      const greetings = ['hi', 'hello', 'hey', 'dear', 'greetings'];
      
      if (greetings.includes(firstWord) && sentences.length > 1) {
        sentences[1] = `${softener.charAt(0).toUpperCase() + softener.slice(1)}, ${sentences[1].charAt(0).toLowerCase() + sentences[1].slice(1)}`;
      } else {
        sentences[0] = `${softener.charAt(0).toUpperCase() + softener.slice(1)}, ${sentences[0].charAt(0).toLowerCase() + sentences[0].slice(1)}`;
      }
      return sentences.join(' ');
    }
    return text;
  }
  
  private addRespectMarker(text: string, marker: string, style: string): string {
    if (style === 'formal' || style === 'warm') {
      return `${marker}. ${text}`;
    }
    // For subtle style, weave it in
    return text;
  }
  
  private addEndearment(text: string, endearment: string): string {
    // Add endearment naturally at end
    if (text.endsWith('.')) {
      return `${text.slice(0, -1)}, ${endearment}.`;
    }
    return `${text}, ${endearment}`;
  }
  
  private adjustEmphasis(text: string, profile: CulturalProfile): string {
    // Replace generic emphasis with culturally appropriate ones
    const genericEmphasis = ['really', 'very', 'absolutely', 'totally'];
    let adjusted = text;
    
    if (profile.emphasisWords.length > 0) {
      for (const generic of genericEmphasis) {
        const pattern = new RegExp(`\\b${generic}\\b`, 'gi');
        const replacement = profile.emphasisWords[Math.floor(Math.random() * profile.emphasisWords.length)];
        // Only replace sometimes to avoid over-processing
        if (Math.random() > 0.5) {
          adjusted = adjusted.replace(pattern, replacement);
        }
      }
    }
    
    return adjusted;
  }
  
  // ═══ CULTURAL INSIGHTS ═══
  
  /**
   * Get cultural insights for UX adaptation
   */
  getUXRecommendations(): {
    preferVoice: boolean;
    preferText: boolean;
    idealResponseLength: 'brief' | 'moderate' | 'detailed';
    animationIntensity: 'subtle' | 'moderate' | 'expressive';
    colorWarmth: 'cool' | 'neutral' | 'warm';
    interactionPace: 'fast' | 'moderate' | 'contemplative';
  } {
    const profile = this.currentProfile;
    
    return {
      preferVoice: profile.emotionalExpression === 'expressive',
      preferText: profile.emotionalExpression === 'restrained',
      idealResponseLength: profile.context === 'high' ? 'moderate' : 
        profile.directness > 0.7 ? 'brief' : 'moderate',
      animationIntensity: profile.emotionalExpression === 'restrained' ? 'subtle' :
        profile.emotionalExpression === 'expressive' ? 'expressive' : 'moderate',
      colorWarmth: profile.emotionalExpression === 'expressive' ? 'warm' :
        profile.emotionalExpression === 'restrained' ? 'cool' : 'neutral',
      interactionPace: profile.silenceComfort > 0.6 ? 'contemplative' :
        profile.directness > 0.7 ? 'fast' : 'moderate',
    };
  }
}

// ═══ SINGLETON INSTANCE ═══

let polyglotInstance: PolyglotEmotionEngine | null = null;

export function getPolyglotEngine(): PolyglotEmotionEngine {
  if (!polyglotInstance) {
    polyglotInstance = new PolyglotEmotionEngine();
  }
  return polyglotInstance;
}

export function destroyPolyglotEngine(): void {
  polyglotInstance = null;
}

export default PolyglotEmotionEngine;
