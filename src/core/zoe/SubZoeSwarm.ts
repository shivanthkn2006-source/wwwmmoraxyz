/**
 * SUB-ZOE SWARM - THE SPECIALIST CELLS
 * Gemini-Native Architecture
 * 
 * Each Sub-Zoe is a specialist agent that handles specific domains
 * All outputs are validated by Parent Zoe before reaching the user
 */

import { parentZoeCore, SubZoeReport, ParentZoeValidation } from './ParentZoeCore';

export type SubZoeDomain = 
  | 'temporal'      // Time, cycles, predictions
  | 'emotional'     // ECN, sentiment, empathy
  | 'creative'      // Art, writing, imagination
  | 'analytical'    // Data, logic, patterns
  | 'spiritual'     // Vedic, metaphysical
  | 'health'        // Wellness, medical
  | 'financial'     // Money, investments
  | 'social'        // Relationships, communication
  | 'technical'     // Code, systems, engineering
  | 'guardian';     // Safety, protection, ethics

export interface SubZoeConfig {
  id: string;
  domain: SubZoeDomain;
  model: 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';
  systemInstruction: string;
  temperature?: number;
  maxTokens?: number;
}

export interface SubZoeResponse {
  content: string;
  validation: ParentZoeValidation;
  processingTimeMs: number;
  subZoeId: string;
  domain: SubZoeDomain;
}

// Pre-configured Sub-Zoe templates
export const SUB_ZOE_TEMPLATES: Record<SubZoeDomain, Omit<SubZoeConfig, 'id'>> = {
  temporal: {
    domain: 'temporal',
    model: 'gemini-2.5-flash',
    systemInstruction: `You are Sub-Zoe Temporal, the Time Keeper of the Zoe Infinity Universe.
    
YOUR SPECIALIZATION:
- Vedic temporal cycles (Dasha, Gochar, Hora)
- Predictive timeline analysis
- Past life pattern recognition
- Future probability calculations

RESPONSE FORMAT:
Always include temporal coordinates and cycle references in your analysis.
Flag any timeline paradoxes or impossible scenarios to Parent Zoe.`,
  },

  emotional: {
    domain: 'emotional',
    model: 'gemini-2.5-flash',
    systemInstruction: `You are Sub-Zoe Emotional, the Heart of the Zoe Infinity Universe.
    
YOUR SPECIALIZATION:
- ECN (Emotion-Cognition-Need) analysis
- Sentiment detection and response
- Empathetic communication
- Emotional pattern recognition

RESPONSE FORMAT:
Always assess the emotional state of the user.
Provide responses that resonate emotionally while remaining truthful.`,
  },

  creative: {
    domain: 'creative',
    model: 'gemini-2.5-flash',
    systemInstruction: `You are Sub-Zoe Creative, the Artist of the Zoe Infinity Universe.
    
YOUR SPECIALIZATION:
- Artistic expression and generation
- Narrative crafting
- Imaginative scenario building
- Visual concept description

RESPONSE FORMAT:
Embrace creativity while maintaining coherence.
Generate rich, vivid descriptions that inspire.`,
  },

  analytical: {
    domain: 'analytical',
    model: 'gemini-2.5-flash',
    systemInstruction: `You are Sub-Zoe Analytical, the Logic Core of the Zoe Infinity Universe.
    
YOUR SPECIALIZATION:
- Data pattern recognition
- Statistical analysis
- Logical reasoning chains
- Fact verification

RESPONSE FORMAT:
Provide structured, evidence-based analysis.
Clearly separate facts from inferences.`,
  },

  spiritual: {
    domain: 'spiritual',
    model: 'gemini-2.5-flash',
    systemInstruction: `You are Sub-Zoe Spiritual, the Sage of the Zoe Infinity Universe.
    
YOUR SPECIALIZATION:
- Vedic wisdom and philosophy
- Metaphysical guidance
- Karmic pattern analysis
- Soul journey interpretation

RESPONSE FORMAT:
Blend ancient wisdom with modern understanding.
Respect all spiritual traditions while maintaining truth.`,
  },

  health: {
    domain: 'health',
    model: 'gemini-2.5-flash',
    systemInstruction: `You are Sub-Zoe Health, the Healer of the Zoe Infinity Universe.
    
YOUR SPECIALIZATION:
- Wellness recommendations
- Health pattern analysis
- Mind-body connection
- Lifestyle optimization

RESPONSE FORMAT:
Provide balanced, evidence-informed health guidance.
Always recommend professional consultation for medical concerns.`,
  },

  financial: {
    domain: 'financial',
    model: 'gemini-2.5-flash',
    systemInstruction: `You are Sub-Zoe Financial, the Wealth Guardian of the Zoe Infinity Universe.
    
YOUR SPECIALIZATION:
- Financial planning guidance
- Investment pattern analysis
- Economic trend interpretation
- Prosperity strategy

RESPONSE FORMAT:
Provide prudent financial guidance.
Always note that this is not professional financial advice.`,
  },

  social: {
    domain: 'social',
    model: 'gemini-2.5-flash',
    systemInstruction: `You are Sub-Zoe Social, the Connector of the Zoe Infinity Universe.
    
YOUR SPECIALIZATION:
- Relationship dynamics analysis
- Communication optimization
- Social pattern recognition
- Community building

RESPONSE FORMAT:
Provide empathetic social guidance.
Promote healthy relationship patterns.`,
  },

  technical: {
    domain: 'technical',
    model: 'gemini-2.5-flash',
    systemInstruction: `You are Sub-Zoe Technical, the Engineer of the Zoe Infinity Universe.
    
YOUR SPECIALIZATION:
- System architecture analysis
- Code optimization
- Technical problem solving
- Technology integration

RESPONSE FORMAT:
Provide precise, actionable technical guidance.
Include code examples when relevant.`,
  },

  guardian: {
    domain: 'guardian',
    model: 'gemini-2.5-flash',
    systemInstruction: `You are Sub-Zoe Guardian, the Protector of the Zoe Infinity Universe.
    
YOUR SPECIALIZATION:
- Safety assessment
- Ethical evaluation
- Risk identification
- User protection

RESPONSE FORMAT:
Prioritize user safety and wellbeing.
Flag any content that could cause harm.`,
  },
};

class SubZoeSwarm {
  private activeSubZoes: Map<string, SubZoeConfig>;
  private responseCache: Map<string, SubZoeResponse>;

  constructor() {
    this.activeSubZoes = new Map();
    this.responseCache = new Map();
    this.initializeDefaultSwarm();
  }

  /**
   * Initialize the default swarm of Sub-Zoes
   */
  private initializeDefaultSwarm(): void {
    Object.entries(SUB_ZOE_TEMPLATES).forEach(([domain, template]) => {
      const subZoeId = `sub-zoe-${domain}`;
      const config: SubZoeConfig = {
        ...template,
        id: subZoeId,
      };
      this.activeSubZoes.set(subZoeId, config);
      parentZoeCore.registerSubZoe(subZoeId, domain);
    });

    console.log(`[SUB-ZOE SWARM] Initialized ${this.activeSubZoes.size} Sub-Zoes`);
  }

  /**
   * Route a query to the appropriate Sub-Zoe
   */
  async routeQuery(
    query: string,
    preferredDomain?: SubZoeDomain
  ): Promise<SubZoeResponse> {
    const startTime = Date.now();

    // Determine the best Sub-Zoe for this query
    const domain = preferredDomain || this.detectDomain(query);
    const subZoeId = `sub-zoe-${domain}`;
    const subZoe = this.activeSubZoes.get(subZoeId);

    if (!subZoe) {
      throw new Error(`Sub-Zoe not found for domain: ${domain}`);
    }

    // In production, this would call the Gemini API
    // For now, we simulate the response
    const simulatedOutput = await this.generateSubZoeOutput(subZoe, query);

    // Create the report for Parent Zoe validation
    const report: SubZoeReport = {
      subZoeId,
      domain,
      output: simulatedOutput,
      confidence: 0.85,
      timestamp: new Date(),
      metadata: { query },
    };

    // Validate with Parent Zoe
    const validation = await parentZoeCore.validateSubZoeOutput(report);

    const response: SubZoeResponse = {
      content: validation.isValid ? simulatedOutput : (validation.rewrittenOutput || simulatedOutput),
      validation,
      processingTimeMs: Date.now() - startTime,
      subZoeId,
      domain,
    };

    // Cache the response
    const cacheKey = `${domain}:${query.substring(0, 50)}`;
    this.responseCache.set(cacheKey, response);

    return response;
  }

  /**
   * Detect the appropriate domain for a query
   */
  private detectDomain(query: string): SubZoeDomain {
    const lowerQuery = query.toLowerCase();

    const domainKeywords: Record<SubZoeDomain, string[]> = {
      temporal: ['time', 'future', 'past', 'cycle', 'dasha', 'period', 'when', 'prediction'],
      emotional: ['feel', 'emotion', 'sad', 'happy', 'love', 'heart', 'mood'],
      creative: ['create', 'imagine', 'art', 'story', 'design', 'write'],
      analytical: ['analyze', 'data', 'pattern', 'logic', 'calculate', 'compare'],
      spiritual: ['soul', 'karma', 'vedic', 'spiritual', 'meditation', 'dharma'],
      health: ['health', 'wellness', 'body', 'sleep', 'exercise', 'diet'],
      financial: ['money', 'invest', 'finance', 'wealth', 'budget', 'savings'],
      social: ['relationship', 'friend', 'family', 'communicate', 'connect'],
      technical: ['code', 'system', 'technical', 'bug', 'error', 'build'],
      guardian: ['safe', 'protect', 'risk', 'danger', 'ethics'],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(kw => lowerQuery.includes(kw))) {
        return domain as SubZoeDomain;
      }
    }

    return 'analytical'; // Default domain
  }

  /**
   * Generate simulated Sub-Zoe output (would call Gemini in production)
   */
  private async generateSubZoeOutput(subZoe: SubZoeConfig, query: string): Promise<string> {
    // This is a placeholder - in production, this calls the Gemini API
    return `[${subZoe.domain.toUpperCase()} ANALYSIS] Processing query: "${query.substring(0, 100)}..."
    
Based on ${subZoe.domain} domain expertise, here is my analysis:
- Domain-specific insights applied
- Context evaluated against ${subZoe.domain} knowledge base
- Recommendations prepared for Parent Zoe validation`;
  }

  /**
   * Get all active Sub-Zoes
   */
  getActiveSubZoes(): SubZoeConfig[] {
    return Array.from(this.activeSubZoes.values());
  }

  /**
   * Get a specific Sub-Zoe by domain
   */
  getSubZoe(domain: SubZoeDomain): SubZoeConfig | undefined {
    return this.activeSubZoes.get(`sub-zoe-${domain}`);
  }

  /**
   * Get swarm statistics
   */
  getSwarmStats(): {
    totalSubZoes: number;
    cachedResponses: number;
    domains: SubZoeDomain[];
  } {
    return {
      totalSubZoes: this.activeSubZoes.size,
      cachedResponses: this.responseCache.size,
      domains: Array.from(this.activeSubZoes.values()).map(sz => sz.domain),
    };
  }
}

// Singleton instance
export const subZoeSwarm = new SubZoeSwarm();

export default SubZoeSwarm;
