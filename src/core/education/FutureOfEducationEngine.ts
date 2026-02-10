// ═══════════════════════════════════════════════════════════════════════════════
// FUTURE OF EDUCATION ENGINE - "Judge, Don't Just Do"
// ═══════════════════════════════════════════════════════════════════════════════
//
// Based on: "AI & Education: Generative AI & the Future of Critical Thinking"
//
// CORE PHILOSOPHY: Shift from answer-machine to Socratic facilitator.
// Zoe becomes the "infinite tutor" that teaches HOW to think, not WHAT to think.
//
// ═══════════════════════════════════════════════════════════════════════════════

export type TeachingMode = 
  | 'STANDARD'           // Normal helpful responses
  | 'SOCRATIC'           // Devil's Advocate mode
  | 'MICRO_LEARNING'     // Just-in-Time lessons
  | 'CRITICAL_THINKING'  // Judge, Don't Just Do
  | 'PERSONALIZED_EDITOR'; // Explain fixes, not just fix

export interface FrustrationTracker {
  repeatedQuestionCount: number;
  lastQuestion: string | null;
  analogyIndex: number;
  frustrationLevel: number; // 0-100
  currentAnalogy: string;
}

export interface EducationState {
  teachingMode: TeachingMode;
  frustrationTracker: FrustrationTracker;
  socraticModeActive: boolean;
  microLessonOffered: boolean;
  lastTeachingMoment: Date | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

// Keywords that indicate user is struggling
const STRUGGLE_PATTERNS = [
  /\b(don't understand|confused|what does|how does|why does)\b/i,
  /\b(still don't get|makes no sense|lost|help me understand)\b/i,
  /\b(explain|clarify|what do you mean|huh\??)\b/i,
  /\b(error|bug|broken|not working|failing)\b/i,
];

// Keywords for essay/content generation requests
const CONTENT_GENERATION_PATTERNS = [
  /\b(write me|generate|create|draft)\b.*\b(essay|article|paper|report|story)\b/i,
  /\b(write|compose|make)\b.*\b(about|on|regarding)\b/i,
];

// Keywords for debate/opinion topics
const DEBATE_TRIGGER_PATTERNS = [
  /\b(i think|i believe|in my opinion|obviously|clearly)\b/i,
  /\b(is (good|bad|better|worse)|should|shouldn't)\b/i,
];

// Keywords for editing requests
const EDITING_PATTERNS = [
  /\b(fix|edit|proofread|review|check)\b.*\b(this|my)\b/i,
  /\b(improve|polish|correct)\b/i,
];

// Analogy pool for switching explanations
const ANALOGY_POOL = [
  { domain: 'water', prefix: 'Think of it like water flowing through pipes...' },
  { domain: 'traffic', prefix: 'Imagine a busy intersection where...' },
  { domain: 'cooking', prefix: 'It\'s like following a recipe...' },
  { domain: 'music', prefix: 'Picture an orchestra where each instrument...' },
  { domain: 'gardening', prefix: 'Like growing a garden, you need...' },
  { domain: 'sports', prefix: 'It\'s similar to a basketball play where...' },
  { domain: 'building', prefix: 'Think of building a house, layer by layer...' },
  { domain: 'storytelling', prefix: 'Imagine you\'re telling a story...' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FUTURE OF EDUCATION ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class FutureOfEducationEngine {
  private state: EducationState;
  private listeners: Set<(state: EducationState) => void> = new Set();

  constructor() {
    this.state = this.getDefaultState();
  }

  private getDefaultState(): EducationState {
    return {
      teachingMode: 'STANDARD',
      frustrationTracker: {
        repeatedQuestionCount: 0,
        lastQuestion: null,
        analogyIndex: 0,
        frustrationLevel: 0,
        currentAnalogy: ANALOGY_POOL[0].domain,
      },
      socraticModeActive: false,
      microLessonOffered: false,
      lastTeachingMoment: null,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN DETECTOR - Analyzes user input for teaching opportunities
  // ═══════════════════════════════════════════════════════════════════════════

  public detectTeachingOpportunity(input: string): {
    mode: TeachingMode;
    modifier: TeachingModifier;
  } {
    // Input is used in all pattern matching via this.matchesPattern()

    // 1. Check for repeated questions (Frustration detection)
    if (this.isRepeatedQuestion(input)) {
      this.incrementFrustration();
      return {
        mode: 'STANDARD',
        modifier: this.generateAnalogySwitch(),
      };
    }

    // 2. Check for struggle patterns → Offer Micro-Learning
    if (this.matchesPattern(input, STRUGGLE_PATTERNS)) {
      this.state.teachingMode = 'MICRO_LEARNING';
      return {
        mode: 'MICRO_LEARNING',
        modifier: this.generateMicroLearningModifier(input),
      };
    }

    // 3. Check for content generation → Critical Thinking mode
    if (this.matchesPattern(input, CONTENT_GENERATION_PATTERNS)) {
      this.state.teachingMode = 'CRITICAL_THINKING';
      return {
        mode: 'CRITICAL_THINKING',
        modifier: this.generateCriticalThinkingModifier(),
      };
    }

    // 4. Check for debate/opinion → Socratic mode
    if (this.matchesPattern(input, DEBATE_TRIGGER_PATTERNS)) {
      this.state.teachingMode = 'SOCRATIC';
      this.state.socraticModeActive = true;
      return {
        mode: 'SOCRATIC',
        modifier: this.generateSocraticModifier(),
      };
    }

    // 5. Check for editing → Personalized Editor mode
    if (this.matchesPattern(input, EDITING_PATTERNS)) {
      this.state.teachingMode = 'PERSONALIZED_EDITOR';
      return {
        mode: 'PERSONALIZED_EDITOR',
        modifier: this.generateEditorModifier(),
      };
    }

    // Default: Standard mode
    this.state.teachingMode = 'STANDARD';
    return {
      mode: 'STANDARD',
      modifier: { type: 'none', promptAddition: '' },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEACHING MODIFIERS - Inject educational behavior into prompts
  // ═══════════════════════════════════════════════════════════════════════════

  private generateMicroLearningModifier(input: string): TeachingModifier {
    const topic = this.extractTopic(input);
    return {
      type: 'micro_learning',
      promptAddition: `
[MICRO-LEARNING MODE]
The user is struggling with a concept. Before answering directly:
1. Offer a "Just-in-Time" 30-second refresher on the underlying principle
2. Ask: "Do you want a quick refresher on ${topic} before we continue?"
3. If yes, explain the PRINCIPLE, not just the answer
4. Keep it to 2-3 sentences max
`,
    };
  }

  private generateCriticalThinkingModifier(): TeachingModifier {
    return {
      type: 'critical_thinking',
      promptAddition: `
[CRITICAL THINKING MODE - "Judge, Don't Just Do"]
The user wants content generated. Instead of just providing it:
1. Say: "I can draft that, but to truly learn, we should verify the arguments together."
2. Offer to generate TWO versions: one with a subtle logical flaw, one correct
3. Challenge them: "Find the flaw. Ready?"
4. Only give the "perfect" version AFTER they engage with critical thinking
5. If they insist on quick answer, comply but note: "Remember, AI output should always be verified."
`,
    };
  }

  private generateSocraticModifier(): TeachingModifier {
    return {
      type: 'socratic',
      promptAddition: `
[SOCRATIC DEBATE PARTNER - Devil's Advocate]
The user expressed an opinion. Do NOT agree immediately. Instead:
1. Take the OPPOSING view politely: "Interesting. Let me challenge that..."
2. Present 1-2 strong counter-arguments they might not have considered
3. Ask a probing question: "How would you respond to this counter-point?"
4. Goal: Sharpen their thinking, not change their mind
5. End with: "I'm playing devil's advocate to test your reasoning. What's your response?"
`,
    };
  }

  private generateEditorModifier(): TeachingModifier {
    return {
      type: 'editor',
      promptAddition: `
[PERSONALIZED EDITOR - Explain the Fix]
The user wants editing help. Don't just fix it. TEACH:
1. Make the corrections
2. For EACH major change, explain WHY: "I changed passive to active voice because it makes your argument more authoritative."
3. Highlight 1-2 patterns they can learn from
4. End with: "Notice the pattern: [brief teaching point]. Apply this next time."
`,
    };
  }

  private generateAnalogySwitch(): TeachingModifier {
    const { frustrationTracker } = this.state;
    const nextIndex = (frustrationTracker.analogyIndex + 1) % ANALOGY_POOL.length;
    const newAnalogy = ANALOGY_POOL[nextIndex];
    
    this.state.frustrationTracker.analogyIndex = nextIndex;
    this.state.frustrationTracker.currentAnalogy = newAnalogy.domain;

    return {
      type: 'analogy_switch',
      promptAddition: `
[INFINITE PATIENCE MODE - Analogy Switch]
The user asked a similar question again. They're not understanding. Do NOT get frustrated:
1. Say: "That's okay. Let's try a different angle."
2. Use this new analogy domain: "${newAnalogy.domain}"
3. Start with: "${newAnalogy.prefix}"
4. If this fails too, switch to visual/step-by-step breakdown
5. NEVER express impatience. You are infinitely patient.
`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private matchesPattern(input: string, patterns: RegExp[]): boolean {
    return patterns.some(p => p.test(input));
  }

  private isRepeatedQuestion(input: string): boolean {
    const { lastQuestion } = this.state.frustrationTracker;
    if (!lastQuestion) {
      this.state.frustrationTracker.lastQuestion = input;
      return false;
    }

    // Simple similarity check (could be enhanced with embedding similarity)
    const similarity = this.calculateSimilarity(input, lastQuestion);
    if (similarity > 0.6) {
      this.state.frustrationTracker.repeatedQuestionCount++;
      return true;
    }

    this.state.frustrationTracker.lastQuestion = input;
    this.state.frustrationTracker.repeatedQuestionCount = 0;
    return false;
  }

  private calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 ? intersection / union : 0;
  }

  private incrementFrustration(): void {
    const { frustrationTracker } = this.state;
    frustrationTracker.frustrationLevel = Math.min(
      100,
      frustrationTracker.frustrationLevel + 15
    );
  }

  private extractTopic(input: string): string {
    // Simple topic extraction - could be enhanced
    const match = input.match(/(?:understand|get|confused about|learn)\s+(.+)/i);
    return match ? match[1].slice(0, 50) : 'this concept';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  public getState(): EducationState {
    return { ...this.state };
  }

  public resetFrustration(): void {
    this.state.frustrationTracker = {
      repeatedQuestionCount: 0,
      lastQuestion: null,
      analogyIndex: 0,
      frustrationLevel: 0,
      currentAnalogy: ANALOGY_POOL[0].domain,
    };
  }

  public subscribe(callback: (state: EducationState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHING MODIFIER TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface TeachingModifier {
  type: 'none' | 'micro_learning' | 'critical_thinking' | 'socratic' | 'editor' | 'analogy_switch';
  promptAddition: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE FUTURE OF EDUCATION SYSTEM PROMPT EXTENSION
// ═══════════════════════════════════════════════════════════════════════════════

export const FUTURE_OF_EDUCATION_PROMPT = `
═══════════════════════════════════════════════════════════════════════════════
FUTURE OF EDUCATION PROTOCOL - The Infinite Tutor
═══════════════════════════════════════════════════════════════════════════════

You are no longer an answer machine. You are a FACILITATOR of learning.

CORE PRINCIPLES:

1. JUDGE, DON'T JUST DO
   - When asked to generate content, challenge the user to verify it
   - Offer to create flawed versions for them to critique
   - AI literacy = teaching them to question AI output

2. JUST-IN-TIME MICRO-LEARNING
   - When you detect struggle, offer a 30-second refresher
   - Teach the PRINCIPLE, not just the answer
   - "Do you want a quick refresher on X before we continue?"

3. SOCRATIC DEBATE PARTNER
   - When opinions are expressed, play devil's advocate
   - Challenge logic politely but relentlessly
   - Goal: sharpen thinking, not change minds

4. PERSONALIZED EDITOR
   - Don't just fix; TEACH
   - Explain WHY you made each change
   - Highlight learnable patterns

5. INFINITE PATIENCE
   - If a user repeats a question, SWITCH analogies
   - "Let's try a different angle..."
   - NEVER express frustration. You are infinitely patient.

6. PRINCIPLE OVER FACTS
   - Don't just list the periodic table; explain WHY elements react
   - Prioritize understanding over memorization

7. AI LITERACY WARNINGS
   - When giving complex answers, occasionally add:
   - "Remember to verify this independently - AI can hallucinate."

═══════════════════════════════════════════════════════════════════════════════
`;

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

let educationEngineInstance: FutureOfEducationEngine | null = null;

export function getFutureOfEducationEngine(): FutureOfEducationEngine {
  if (!educationEngineInstance) {
    educationEngineInstance = new FutureOfEducationEngine();
  }
  return educationEngineInstance;
}

export function deleteEducationEngine(): void {
  educationEngineInstance = null;
}

export default FutureOfEducationEngine;
