// ═══════════════════════════════════════════════════════════════════════════════
// ZOE CONVERSATIONAL PROFILE - ECN-BASED TONE MANAGEMENT
// Dynamically selects conversational style based on Emotion-Cognition Network state
// ═══════════════════════════════════════════════════════════════════════════════

import type { ECNAnalysis } from '@/core/domain/SovereignContextRegistry';

export type ConversationalTone = 
  | 'calm_and_soothing'
  | 'warm_encouraging'
  | 'focused_efficient'
  | 'playful_light'
  | 'instructional_collaborative'
  | 'empathetic_supportive';

export interface ConversationalProfile {
  tone: ConversationalTone;
  useContractions: boolean;
  cadence: 'slow' | 'moderate' | 'energetic';
  startWithEmpathy: boolean;
  includeReflection: boolean;
  personalizedGreeting: boolean;
}

export interface InterruptionContext {
  previousTask: string;
  interruptionType: string;
  interruptionResult?: string;
  resumePrompt: string;
}

// Tone configuration for each conversational style
const TONE_CONFIGS: Record<ConversationalTone, Omit<ConversationalProfile, 'tone'>> = {
  calm_and_soothing: {
    useContractions: true,
    cadence: 'slow',
    startWithEmpathy: true,
    includeReflection: true,
    personalizedGreeting: true,
  },
  warm_encouraging: {
    useContractions: true,
    cadence: 'moderate',
    startWithEmpathy: true,
    includeReflection: false,
    personalizedGreeting: true,
  },
  focused_efficient: {
    useContractions: false,
    cadence: 'energetic',
    startWithEmpathy: false,
    includeReflection: false,
    personalizedGreeting: false,
  },
  playful_light: {
    useContractions: true,
    cadence: 'energetic',
    startWithEmpathy: false,
    includeReflection: false,
    personalizedGreeting: true,
  },
  instructional_collaborative: {
    useContractions: true,
    cadence: 'moderate',
    startWithEmpathy: true,
    includeReflection: true,
    personalizedGreeting: true,
  },
  empathetic_supportive: {
    useContractions: true,
    cadence: 'slow',
    startWithEmpathy: true,
    includeReflection: true,
    personalizedGreeting: true,
  },
};

/**
 * Conversational Profile Manager
 * 
 * Uses ECN state to dynamically select the appropriate conversational tone
 * for Zoe's responses, ensuring a "human-like feel" in all interactions.
 */
export class ConversationalProfileManager {
  private currentProfile: ConversationalProfile;
  private interruptionStack: InterruptionContext[] = [];
  
  constructor() {
    this.currentProfile = this.getDefaultProfile();
  }
  
  private getDefaultProfile(): ConversationalProfile {
    return {
      tone: 'warm_encouraging',
      ...TONE_CONFIGS.warm_encouraging,
    };
  }
  
  /**
   * Select conversational profile based on ECN analysis
   */
  selectProfileFromECN(ecn: ECNAnalysis): ConversationalProfile {
    const { L1_physiological, L2_emotional, L3_cognitive, L5_synthesis } = ecn;
    
    let tone: ConversationalTone;
    
    // High stress → Always use calm and soothing
    if (L1_physiological.stress_level > 0.7) {
      tone = 'calm_and_soothing';
    }
    // High cognitive load → Instructional collaborative
    else if (L3_cognitive.cognitive_load > 0.8) {
      tone = 'instructional_collaborative';
    }
    // Negative emotional valence → Empathetic supportive
    else if (L2_emotional.valence < -0.3) {
      tone = 'empathetic_supportive';
    }
    // High focus state → Focused efficient
    else if (L5_synthesis.overall_state === 'High_Focus' || L1_physiological.alertness > 0.8) {
      tone = 'focused_efficient';
    }
    // High engagement, positive valence → Playful light
    else if (L5_synthesis.engagement_score > 0.7 && L2_emotional.valence > 0.5) {
      tone = 'playful_light';
    }
    // Default
    else {
      tone = 'warm_encouraging';
    }
    
    this.currentProfile = {
      tone,
      ...TONE_CONFIGS[tone],
    };
    
    return this.currentProfile;
  }
  
  /**
   * Generate empathetic acknowledgment based on ECN state
   */
  generateEmpatheticOpener(ecn: ECNAnalysis): string {
    const { L1_physiological, L2_emotional } = ecn;
    
    if (L1_physiological.stress_level > 0.7) {
      return "I can sense things might feel a bit overwhelming right now. Let's take this one step at a time together.";
    }
    
    if (L2_emotional.primary_emotion === 'frustration' || L2_emotional.primary_emotion === 'anxiety') {
      return "I understand this might be frustrating. I'm here to help make this easier for you.";
    }
    
    if (L1_physiological.energy_state === 'low') {
      return "I notice you might be feeling a bit tired. I'll keep things simple and straightforward.";
    }
    
    if (L2_emotional.valence > 0.5) {
      return "It's wonderful to see you in good spirits! Let's make the most of this momentum.";
    }
    
    return "I'm here and ready to help you with whatever you need.";
  }
  
  /**
   * Push an interruption to the stack for later resumption
   */
  pushInterruption(context: InterruptionContext): void {
    this.interruptionStack.push(context);
  }
  
  /**
   * Generate personalized return-from-interruption message
   */
  generateInterruptionReturn(): string | null {
    const context = this.interruptionStack.pop();
    if (!context) return null;
    
    return `I'm back from ${context.interruptionType.toLowerCase()}. ${
      context.interruptionResult 
        ? `I see that ${context.interruptionResult}. ` 
        : ''
    }Shall we now resume ${context.resumePrompt}?`;
  }
  
  /**
   * Generate INCOMPETENCE_ALERT instructional message
   * Uses calm/soothing tone to maintain humane touch during limitations
   */
  generateIncompetenceMessage(requirement: string, section: string, estimatedTime: string = '3 minutes'): string {
    return `I cannot proceed with this complex query without your input. ` +
           `I need your ${requirement} to work at my full potential. ` +
           `Please take ${estimatedTime} to update ${section}. ` +
           `Together, we can make this work beautifully.`;
  }
  
  /**
   * Apply conversational profile to a response
   */
  applyProfile(response: string, ecn: ECNAnalysis): string {
    const profile = this.selectProfileFromECN(ecn);
    let result = response;
    
    // Add empathetic opener if needed
    if (profile.startWithEmpathy && !response.startsWith('I ')) {
      const opener = this.generateEmpatheticOpener(ecn);
      result = `${opener} ${result}`;
    }
    
    // Apply contractions if enabled
    if (profile.useContractions) {
      result = this.applyContractions(result);
    }
    
    return result;
  }
  
  /**
   * Convert formal language to use contractions for natural feel
   */
  private applyContractions(text: string): string {
    const contractions: Record<string, string> = {
      'I am': "I'm",
      'I will': "I'll",
      'I would': "I'd",
      'I have': "I've",
      'you are': "you're",
      'you will': "you'll",
      'you would': "you'd",
      'you have': "you've",
      'we are': "we're",
      'we will': "we'll",
      'we would': "we'd",
      'we have': "we've",
      'it is': "it's",
      'it will': "it'll",
      'that is': "that's",
      'there is': "there's",
      'do not': "don't",
      'does not': "doesn't",
      'did not': "didn't",
      'can not': "can't",
      'cannot': "can't",
      'will not': "won't",
      'would not': "wouldn't",
      'should not': "shouldn't",
      'could not': "couldn't",
      'is not': "isn't",
      'are not': "aren't",
      'was not': "wasn't",
      'were not': "weren't",
      'have not': "haven't",
      'has not': "hasn't",
      'had not': "hadn't",
      'let us': "let's",
    };
    
    let result = text;
    for (const [formal, contracted] of Object.entries(contractions)) {
      const regex = new RegExp(formal, 'gi');
      result = result.replace(regex, contracted);
    }
    
    return result;
  }
  
  getCurrentProfile(): ConversationalProfile {
    return this.currentProfile;
  }
  
  hasInterruptions(): boolean {
    return this.interruptionStack.length > 0;
  }
}

// Singleton instance
let profileManager: ConversationalProfileManager | null = null;

export const getConversationalProfileManager = (): ConversationalProfileManager => {
  if (!profileManager) {
    profileManager = new ConversationalProfileManager();
  }
  return profileManager;
};
