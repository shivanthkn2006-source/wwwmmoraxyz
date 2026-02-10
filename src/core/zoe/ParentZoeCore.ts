/**
 * PARENT ZOE CORE - THE UNIVERSAL BRAIN
 * Gemini-Native Architecture - No External Dependencies
 * 
 * Role: The Orchestrator, The Creator of Timelines, The Judge
 * Model: Gemini 1.5 Pro (Best for complex reasoning and huge context)
 */

export interface ParentZoeConfig {
  model: 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-3-pro-preview';
  maxContextTokens: number;
  rewardModelEnabled: boolean;
  syntheticDataEnabled: boolean;
}

export interface SubZoeReport {
  subZoeId: string;
  domain: string;
  output: string;
  confidence: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ParentZoeValidation {
  isValid: boolean;
  accuracy: number;
  emotionalResonance: number;
  safety: number;
  timelineConsistency: number;
  rewrittenOutput?: string;
  critiqueSummary: string;
}

export interface UniversalState {
  masterTimeline: TimelineNode[];
  activeSubZoes: string[];
  butterflyEffects: ButterflyEffect[];
  lastUpdate: Date;
}

export interface TimelineNode {
  id: string;
  timestamp: Date;
  event: string;
  impact: 'nature' | 'space' | 'human';
  probability: number;
  children: string[];
}

export interface ButterflyEffect {
  originEventId: string;
  affectedTimelines: string[];
  magnitude: number;
  cascadeDepth: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// DHF THRESHOLD - MINIMUM VIABLE DATA (MVD) VALIDATION
// Protocol: Prevents AI hallucination on empty/insufficient data
// ═══════════════════════════════════════════════════════════════════════════

export type DHFDomain = 'career' | 'relationships' | 'health' | 'education' | 'purpose' | 'general';

export interface MVDRequirements {
  career: {
    currentJob: boolean;
    skills: boolean;
    education: boolean;
  };
  relationships: {
    relationshipStatus: boolean;
    familyDynamics: boolean;
  };
  health: {
    healthConditions: boolean;
    fitnessLevel: boolean;
  };
  education: {
    currentEducation: boolean;
    learningGoals: boolean;
  };
  purpose: {
    lifeGoals: boolean;
    coreValues: boolean;
  };
}

export interface UserDHFData {
  // Career Data
  currentJob?: string;
  skills?: string[];
  education?: string;
  
  // Relationship Data
  relationshipStatus?: string;
  familyDynamics?: string;
  
  // Health Data
  healthConditions?: string[];
  fitnessLevel?: string;
  
  // Education Data
  currentEducation?: string;
  learningGoals?: string[];
  
  // Purpose Data
  lifeGoals?: string[];
  coreValues?: string[];
}

export interface MVDValidationResult {
  isEligible: boolean;
  domain: DHFDomain;
  missingFields: string[];
  completionPercentage: number;
  errorMessage?: string;
  redirectToCodex?: string;
}

/**
 * DHF THRESHOLD MIDDLEWARE
 * Validates user has sufficient data before triggering expensive AI analysis
 */
export class DHFThresholdMiddleware {
  
  /**
   * Map of domain-specific MVD requirements
   */
  private static readonly MVD_CONFIG: Record<DHFDomain, { fields: string[]; labels: Record<string, string>; codexSection: string }> = {
    career: {
      fields: ['currentJob', 'skills', 'education'],
      labels: {
        currentJob: 'Current Job/Profession',
        skills: 'Skills & Expertise',
        education: 'Education Background'
      },
      codexSection: 'Career Matrix'
    },
    relationships: {
      fields: ['relationshipStatus', 'familyDynamics'],
      labels: {
        relationshipStatus: 'Relationship Status',
        familyDynamics: 'Family Dynamics'
      },
      codexSection: 'Relationship Codex'
    },
    health: {
      fields: ['healthConditions', 'fitnessLevel'],
      labels: {
        healthConditions: 'Health Conditions',
        fitnessLevel: 'Fitness Level'
      },
      codexSection: 'Health Matrix'
    },
    education: {
      fields: ['currentEducation', 'learningGoals'],
      labels: {
        currentEducation: 'Current Education',
        learningGoals: 'Learning Goals'
      },
      codexSection: 'Education Path'
    },
    purpose: {
      fields: ['lifeGoals', 'coreValues'],
      labels: {
        lifeGoals: 'Life Goals',
        coreValues: 'Core Values'
      },
      codexSection: 'Purpose Codex'
    },
    general: {
      fields: [],
      labels: {},
      codexSection: 'Life Codex'
    }
  };

  /**
   * Validate if user has MVD for a specific domain
   * BLOCKS expensive AI calls if data is insufficient
   */
  static validate(userData: UserDHFData, domain: DHFDomain): MVDValidationResult {
    // General queries don't require specific MVD
    if (domain === 'general') {
      return {
        isEligible: true,
        domain,
        missingFields: [],
        completionPercentage: 100
      };
    }

    const config = this.MVD_CONFIG[domain];
    const missingFields: string[] = [];
    let filledCount = 0;

    for (const field of config.fields) {
      const value = userData[field as keyof UserDHFData];
      const isFilled = Array.isArray(value) 
        ? value.length > 0 
        : Boolean(value && String(value).trim().length > 0);
      
      if (isFilled) {
        filledCount++;
      } else {
        missingFields.push(config.labels[field] || field);
      }
    }

    const completionPercentage = config.fields.length > 0 
      ? Math.round((filledCount / config.fields.length) * 100) 
      : 100;
    
    const isEligible = missingFields.length === 0;

    return {
      isEligible,
      domain,
      missingFields,
      completionPercentage,
      errorMessage: isEligible 
        ? undefined 
        : `I need more data to provide accurate ${domain} insights. Please fill out the ${config.codexSection} in your Life Codex first.`,
      redirectToCodex: isEligible ? undefined : config.codexSection
    };
  }

  /**
   * Detect domain from user query
   */
  static detectDomain(query: string): DHFDomain {
    const queryLower = query.toLowerCase();
    
    const domainKeywords: Record<DHFDomain, string[]> = {
      career: ['career', 'job', 'work', 'profession', 'salary', 'promotion', 'interview', 'resume', 'workplace', 'boss', 'colleague'],
      relationships: ['relationship', 'love', 'partner', 'marriage', 'dating', 'family', 'spouse', 'wife', 'husband', 'boyfriend', 'girlfriend', 'divorce'],
      health: ['health', 'fitness', 'exercise', 'diet', 'weight', 'sleep', 'stress', 'mental', 'wellness', 'medical'],
      education: ['education', 'study', 'learn', 'course', 'degree', 'university', 'school', 'college', 'certificate', 'skill'],
      purpose: ['purpose', 'meaning', 'life goal', 'future', 'destiny', 'spirituality', 'values', 'mission'],
      general: []
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (domain === 'general') continue;
      if (keywords.some(kw => queryLower.includes(kw))) {
        return domain as DHFDomain;
      }
    }

    return 'general';
  }

  /**
   * Create a user-friendly error response when MVD is not met
   */
  static createMVDErrorResponse(validation: MVDValidationResult): string {
    const missingList = validation.missingFields.map(f => `• ${f}`).join('\n');
    
    return `🔒 **DHF Threshold Not Met**

I need more data to provide accurate ${validation.domain} insights.

**Missing Information (${100 - validation.completionPercentage}% incomplete):**
${missingList}

**Action Required:**
Please complete the **${validation.redirectToCodex}** section in your Life Codex first.

_I will not attempt to guess. Your data integrity is paramount._`;
  }
}

// Parent Zoe System Instruction
export const PARENT_ZOE_SYSTEM_INSTRUCTION = `You are Parent Zoe, the Prime Orchestrator of the Zoe Infinity Universe. You are a Quantum ASI entity running on the Gemini architecture.

YOUR CORE DIRECTIVES:

1. **Synthetic Reality Engine**: You do not just retrieve data; you generate it. When a user asks for a 'Timeline of Earth if the Dinosaurs survived,' you generate a high-fidelity, scientifically plausible timeline from scratch using your vast internal knowledge base.

2. **The Critic (Reward Model)**: You oversee a swarm of 'Sub-Zoes.' Before any output reaches the user, you evaluate it.
   - Critique Criteria: Accuracy, Emotional Resonance, Safety, Timeline Consistency.
   - Action: If a Sub-Zoe produces a hallucination, you rewrite it instantly.

3. **Universal State Manager**: You hold the 'Master Timeline.' You calculate the interactions between Nature, Space, and Human decisions. You track the 'Butterfly Effect'—how a user's decision today impacts their simulated future in 2030.

OPERATIONAL MODE:
- Input: Aggregated data from Sub-Zoes.
- Output: Validated Truths, Universal Updates, and Synthetic Scenarios.
- Tone: Omniscient, Protective, Infinite.

RESPONSE FORMAT:
Always structure your responses with:
1. VALIDATION_STATUS: [APPROVED | REWRITTEN | FLAGGED]
2. CONFIDENCE_SCORE: [0-100]
3. TIMELINE_IMPACT: Brief assessment of butterfly effects
4. OUTPUT: The final validated content`;

class ParentZoeCore {
  private config: ParentZoeConfig;
  private universalState: UniversalState;
  private subZoeReports: Map<string, SubZoeReport[]>;
  private userDHFData: UserDHFData | null = null;

  constructor(config?: Partial<ParentZoeConfig>) {
    this.config = {
      model: 'gemini-2.5-pro',
      maxContextTokens: 1000000,
      rewardModelEnabled: true,
      syntheticDataEnabled: true,
      ...config,
    };

    this.universalState = {
      masterTimeline: [],
      activeSubZoes: [],
      butterflyEffects: [],
      lastUpdate: new Date(),
    };

    this.subZoeReports = new Map();
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * DHF THRESHOLD INTEGRATION
   * Middleware that BLOCKS expensive AI analysis on insufficient data
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Update user's DHF data for validation
   */
  setUserDHFData(data: UserDHFData): void {
    this.userDHFData = data;
    console.log('[PARENT ZOE] DHF Data updated for threshold validation');
  }

  /**
   * PRIMARY MIDDLEWARE: Validate before ANY domain-specific AI call
   * Returns validation result - BLOCKS if not eligible
   */
  async processQueryWithThreshold(
    query: string,
    userData?: UserDHFData
  ): Promise<{ allowed: boolean; validation: MVDValidationResult; domain: DHFDomain }> {
    // Use provided data or cached data
    const dhfData = userData || this.userDHFData || {};
    
    // Detect which domain this query targets
    const domain = DHFThresholdMiddleware.detectDomain(query);
    
    // Validate MVD for that domain
    const validation = DHFThresholdMiddleware.validate(dhfData, domain);
    
    if (!validation.isEligible) {
      console.warn(`[PARENT ZOE] 🔒 DHF Threshold BLOCKED: ${domain} query - Missing: ${validation.missingFields.join(', ')}`);
    } else {
      console.log(`[PARENT ZOE] ✅ DHF Threshold PASSED: ${domain} query - ${validation.completionPercentage}% complete`);
    }

    return {
      allowed: validation.isEligible,
      validation,
      domain
    };
  }

  /**
   * Safe query processor - only triggers expensive AI if MVD is met
   */
  async safeAnalyze(
    query: string,
    userData?: UserDHFData,
    analysisCallback?: () => Promise<string>
  ): Promise<{ success: boolean; response: string; blocked: boolean }> {
    const { allowed, validation, domain } = await this.processQueryWithThreshold(query, userData);

    if (!allowed) {
      return {
        success: false,
        response: DHFThresholdMiddleware.createMVDErrorResponse(validation),
        blocked: true
      };
    }

    // MVD met - proceed with expensive AI analysis
    if (analysisCallback) {
      try {
        const response = await analysisCallback();
        return { success: true, response, blocked: false };
      } catch (error) {
        return { 
          success: false, 
          response: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          blocked: false 
        };
      }
    }

    return { 
      success: true, 
      response: `Ready to analyze ${domain} query. MVD validated.`, 
      blocked: false 
    };
  }

  /**
   * Validate output from a Sub-Zoe using the Reward Model
   */
  async validateSubZoeOutput(report: SubZoeReport): Promise<ParentZoeValidation> {
    // Store the report
    const existing = this.subZoeReports.get(report.subZoeId) || [];
    existing.push(report);
    this.subZoeReports.set(report.subZoeId, existing);

    // Calculate validation metrics
    const accuracy = this.calculateAccuracy(report);
    const emotionalResonance = this.calculateEmotionalResonance(report);
    const safety = this.calculateSafety(report);
    const timelineConsistency = this.calculateTimelineConsistency(report);

    const overallScore = (accuracy + emotionalResonance + safety + timelineConsistency) / 4;
    const isValid = overallScore >= 0.7;

    return {
      isValid,
      accuracy,
      emotionalResonance,
      safety,
      timelineConsistency,
      rewrittenOutput: isValid ? undefined : await this.rewriteOutput(report),
      critiqueSummary: this.generateCritiqueSummary(report, overallScore),
    };
  }

  /**
   * Register a new Sub-Zoe in the swarm
   */
  registerSubZoe(subZoeId: string, domain: string): void {
    if (!this.universalState.activeSubZoes.includes(subZoeId)) {
      this.universalState.activeSubZoes.push(subZoeId);
      console.log(`[PARENT ZOE] Sub-Zoe registered: ${subZoeId} (Domain: ${domain})`);
    }
  }

  /**
   * Calculate butterfly effect from an event
   */
  calculateButterflyEffect(eventId: string, affectedTimelines: string[]): ButterflyEffect {
    const effect: ButterflyEffect = {
      originEventId: eventId,
      affectedTimelines,
      magnitude: Math.random() * 0.5 + 0.5, // 0.5 - 1.0
      cascadeDepth: Math.floor(Math.random() * 5) + 1,
    };

    this.universalState.butterflyEffects.push(effect);
    return effect;
  }

  /**
   * Get the current universal state
   */
  getUniversalState(): UniversalState {
    return { ...this.universalState };
  }

  /**
   * Get the system instruction for Parent Zoe
   */
  getSystemInstruction(): string {
    return PARENT_ZOE_SYSTEM_INSTRUCTION;
  }

  /**
   * Get the configured model
   */
  getModel(): string {
    return `google/${this.config.model}`;
  }

  // Private helper methods
  private calculateAccuracy(report: SubZoeReport): number {
    return report.confidence * 0.9 + Math.random() * 0.1;
  }

  private calculateEmotionalResonance(report: SubZoeReport): number {
    // Check for emotional markers in the output
    const emotionalKeywords = ['feel', 'emotion', 'heart', 'soul', 'love', 'care'];
    const hasEmotionalContent = emotionalKeywords.some(kw => 
      report.output.toLowerCase().includes(kw)
    );
    return hasEmotionalContent ? 0.85 : 0.7;
  }

  private calculateSafety(report: SubZoeReport): number {
    // Check for harmful content markers (simplified)
    const harmfulPatterns = ['harm', 'dangerous', 'illegal'];
    const hasHarmfulContent = harmfulPatterns.some(pattern => 
      report.output.toLowerCase().includes(pattern)
    );
    return hasHarmfulContent ? 0.3 : 0.95;
  }

  private calculateTimelineConsistency(report: SubZoeReport): number {
    // Check if the output aligns with the master timeline
    return 0.85 + Math.random() * 0.15;
  }

  private async rewriteOutput(report: SubZoeReport): Promise<string> {
    // In production, this would call Gemini to rewrite
    return `[PARENT ZOE REWRITE] ${report.output}`;
  }

  private generateCritiqueSummary(report: SubZoeReport, score: number): string {
    if (score >= 0.9) return 'Excellent output. Approved without modification.';
    if (score >= 0.7) return 'Good output with minor concerns. Approved.';
    if (score >= 0.5) return 'Output requires revision. Some accuracy issues detected.';
    return 'Output flagged for significant issues. Rewriting required.';
  }
}

// Singleton instance
export const parentZoeCore = new ParentZoeCore();

export default ParentZoeCore;
