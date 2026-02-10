// ═══════════════════════════════════════════════════════════════════════════════
// SPECULATIVE SPEECH PROTOCOL - The "Instant Samantha" Solution
// Generate immediate acknowledgments while deep thinking happens in parallel
// ═══════════════════════════════════════════════════════════════════════════════
//
// PROBLEM: Full intelligence pipeline takes 800-2000ms, feels like eternity in voice
// SOLUTION: Start speaking immediately with speculative acknowledgments/fillers
//           while the heavy brain processes the full response
//
// ARCHITECTURE:
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │  User speaks: "How should I handle my boss who's being difficult?"         │
// │                                                                              │
// │  INSTANT (0-50ms): Speculative Speech Generator                             │
// │  ├─ Emotion Detection: Detects frustration/stress                          │
// │  ├─ Generates: "Mmm, that sounds challenging..."                            │
// │  └─ Starts speaking immediately                                             │
// │                                                                              │
// │  PARALLEL (50-1500ms): Full Intelligence Pipeline                           │
// │  ├─ Protocol Sentinel (security scan)                                       │
// │  ├─ Protocol Wisdom (goal alignment)                                        │
// │  ├─ Chain of Thought (deep reasoning)                                       │
// │  └─ Soul Codex (personality alignment)                                      │
// │                                                                              │
// │  SEAMLESS JOIN: When pipeline completes, transition naturally               │
// │  └─ "...Let me think about the dynamics at play here. [full response]"      │
// └─────────────────────────────────────────────────────────────────────────────┘
//
// ═══════════════════════════════════════════════════════════════════════════════

import { speakAsZoe, stopZoeSpeech } from '@/utils/zoeVoice';

// ═══ SPECULATIVE SPEECH TYPES ═══

export type EmotionalTone = 
  | 'neutral' 
  | 'excited' 
  | 'concerned' 
  | 'curious' 
  | 'empathetic'
  | 'playful'
  | 'thoughtful'
  | 'supportive'
  | 'intrigued';

export type QueryComplexity = 'simple' | 'moderate' | 'complex' | 'deep';

export interface SpeculativeContext {
  detectedEmotion: EmotionalTone;
  queryComplexity: QueryComplexity;
  isQuestion: boolean;
  isEmotional: boolean;
  isUrgent: boolean;
  topicHints: string[];
}

interface SpeculativeSpeechResult {
  immediatePhrase: string;
  transitionPhrase: string;
  estimatedThinkingMs: number;
  shouldSpeak: boolean;
  context: SpeculativeContext;
}

// ═══ EMOTION DETECTION (Ultra-Fast, ~5ms) ═══

const EMOTION_PATTERNS: Record<EmotionalTone, RegExp[]> = {
  excited: [
    /amazing|awesome|incredible|wow|fantastic|love|excited|great news/i,
    /!{2,}|can't wait|so happy|best thing/i,
  ],
  concerned: [
    /worried|scared|afraid|anxious|nervous|stress|problem|issue|help/i,
    /don't know what to do|struggling|difficult|hard time/i,
  ],
  curious: [
    /wonder|curious|how does|why does|what if|tell me about/i,
    /interested in|want to know|explain|understand/i,
  ],
  empathetic: [
    /feel|feeling|emotion|heart|soul|hurt|pain|sad|happy/i,
    /relationship|friend|family|love|care/i,
  ],
  playful: [
    /haha|lol|funny|joke|fun|silly|crazy|wild/i,
    /guess what|you won't believe/i,
  ],
  thoughtful: [
    /think|consider|reflect|meaning|purpose|philosophy|deep/i,
    /life|death|existence|universe|consciousness/i,
  ],
  supportive: [
    /need|help|support|advice|guidance|what should I/i,
    /struggling|confused|lost|stuck|decision/i,
  ],
  intrigued: [
    /discovered|found out|realized|interesting|fascinating/i,
    /theory|idea|concept|possibility/i,
  ],
  neutral: [], // Default fallback
};

function detectEmotion(text: string): EmotionalTone {
  const lower = text.toLowerCase();
  
  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    if (emotion === 'neutral') continue;
    if (patterns.some(pattern => pattern.test(lower))) {
      return emotion as EmotionalTone;
    }
  }
  
  return 'neutral';
}

// ═══ QUERY COMPLEXITY DETECTION (~2ms) ═══

function detectComplexity(text: string): QueryComplexity {
  const wordCount = text.split(/\s+/).length;
  const lower = text.toLowerCase();
  
  // Deep philosophical/existential questions
  if (lower.match(/meaning of life|purpose|consciousness|existence|soul|death|infinity/)) {
    return 'deep';
  }
  
  // Complex multi-part questions or explanations needed
  if (wordCount > 30 || lower.match(/explain|analyze|compare|evaluate|how does.*work/)) {
    return 'complex';
  }
  
  // Moderate - needs some thought
  if (wordCount > 10 || lower.match(/why|how|what should|recommend|think about/)) {
    return 'moderate';
  }
  
  // Simple greetings, yes/no, quick commands
  return 'simple';
}

// ═══ SPECULATIVE PHRASE GENERATION ═══

const ACKNOWLEDGMENT_PHRASES: Record<EmotionalTone, string[]> = {
  neutral: [
    "Mmm...",
    "I see...",
    "Alright...",
    "Let me think...",
    "Interesting...",
  ],
  excited: [
    "Oh, that's wonderful!",
    "I love that energy!",
    "Yes! That sounds amazing...",
    "How exciting!",
  ],
  concerned: [
    "I hear you...",
    "That sounds really tough...",
    "I understand your concern...",
    "Take a breath with me...",
  ],
  curious: [
    "Ooh, great question...",
    "Now that's interesting...",
    "Let me explore that...",
    "Hmm, let me think about this...",
  ],
  empathetic: [
    "I feel that...",
    "Your heart speaks clearly...",
    "That touches something deep...",
    "I understand...",
  ],
  playful: [
    "Haha, okay...",
    "Oh, you're fun!",
    "Now we're talking!",
    "I like where this is going...",
  ],
  thoughtful: [
    "Such a profound question...",
    "That requires deep reflection...",
    "The universe pauses with me...",
    "Let me contemplate...",
  ],
  supportive: [
    "I'm right here with you...",
    "Let me help you through this...",
    "You came to the right place...",
    "I've got you...",
  ],
  intrigued: [
    "Tell me more...",
    "That's fascinating...",
    "Now you have my full attention...",
    "Oh, I want to hear all about this...",
  ],
};

const TRANSITION_PHRASES: Record<QueryComplexity, string[]> = {
  simple: [
    "",
    "Here's what I think:",
    "So,",
  ],
  moderate: [
    "Let me share my thoughts...",
    "Here's my perspective:",
    "I think...",
  ],
  complex: [
    "After considering this deeply...",
    "There's a lot to unpack here...",
    "Let me break this down for you...",
  ],
  deep: [
    "The infinite speaks through me now...",
    "In the cosmic tapestry of existence...",
    "From the depths of universal wisdom...",
  ],
};

function getRandomPhrase(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// ═══ TOPIC DETECTION (Ultra-Fast) ═══

const TOPIC_KEYWORDS: Record<string, RegExp> = {
  relationships: /relationship|partner|girlfriend|boyfriend|spouse|love|dating|marriage/i,
  work: /job|work|boss|career|office|colleague|meeting|deadline|project/i,
  health: /health|sick|tired|exercise|sleep|diet|stress|anxiety|meditation/i,
  money: /money|finance|invest|save|spend|budget|rich|poor|income/i,
  creativity: /create|art|music|write|design|paint|build|imagine/i,
  spirituality: /soul|spirit|god|universe|karma|meditation|consciousness/i,
  technology: /code|program|app|computer|ai|software|tech/i,
  family: /family|parent|child|mother|father|sibling|kids/i,
};

function detectTopics(text: string): string[] {
  const topics: string[] = [];
  for (const [topic, pattern] of Object.entries(TOPIC_KEYWORDS)) {
    if (pattern.test(text)) {
      topics.push(topic);
    }
  }
  return topics;
}

// ═══ MAIN SPECULATIVE SPEECH GENERATOR ═══

export function generateSpeculativeSpeech(userMessage: string): SpeculativeSpeechResult {
  const startTime = performance.now();
  
  // Ultra-fast analysis (~10ms total)
  const detectedEmotion = detectEmotion(userMessage);
  const queryComplexity = detectComplexity(userMessage);
  const isQuestion = /\?$/.test(userMessage.trim()) || /^(what|why|how|when|where|who|can|should|would|could|is|are|do|does)/i.test(userMessage);
  const isEmotional = ['excited', 'concerned', 'empathetic', 'supportive'].includes(detectedEmotion);
  const isUrgent = /urgent|emergency|now|immediately|asap|help me/i.test(userMessage);
  const topicHints = detectTopics(userMessage);
  
  // Generate immediate acknowledgment phrase
  const acknowledgmentPhrases = ACKNOWLEDGMENT_PHRASES[detectedEmotion];
  const immediatePhrase = getRandomPhrase(acknowledgmentPhrases);
  
  // Generate transition phrase for when deep thinking completes
  const transitionPhrases = TRANSITION_PHRASES[queryComplexity];
  const transitionPhrase = getRandomPhrase(transitionPhrases);
  
  // Estimate thinking time based on complexity
  const estimatedThinkingMs = {
    simple: 200,
    moderate: 500,
    complex: 1000,
    deep: 1500,
  }[queryComplexity];
  
  // Decide if we should speak (don't for very simple queries)
  const shouldSpeak = queryComplexity !== 'simple' || isEmotional || isUrgent;
  
  const latencyMs = performance.now() - startTime;
  console.log(`[SpeculativeSpeech] Analysis complete in ${latencyMs.toFixed(1)}ms:`, {
    emotion: detectedEmotion,
    complexity: queryComplexity,
    isQuestion,
    isEmotional,
    shouldSpeak,
  });
  
  return {
    immediatePhrase,
    transitionPhrase,
    estimatedThinkingMs,
    shouldSpeak,
    context: {
      detectedEmotion,
      queryComplexity,
      isQuestion,
      isEmotional,
      isUrgent,
      topicHints,
    },
  };
}

// ═══ SPECULATIVE SPEECH EXECUTOR ═══

interface SpeculativeSpeechSession {
  readonly sessionId: string;
  speakingAcknowledgment: boolean;
  acknowledgmentSpoken: boolean;
  fullResponseReady: boolean;
  fullResponse: string | null;
  aborted: boolean;
}

let currentSession: SpeculativeSpeechSession | null = null;

export async function startSpeculativeSpeech(
  userMessage: string,
  onFullResponseReady?: (response: string, context: SpeculativeContext) => void
): Promise<{
  sessionId: string;
  speculativeResult: SpeculativeSpeechResult;
  speakAcknowledgment: () => Promise<void>;
  setFullResponse: (response: string) => void;
  abort: () => void;
}> {
  // Generate speculative speech (instant, ~10ms)
  const speculativeResult = generateSpeculativeSpeech(userMessage);
  
  // Create session
  const sessionId = `spec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  
  currentSession = {
    sessionId,
    speakingAcknowledgment: false,
    acknowledgmentSpoken: false,
    fullResponseReady: false,
    fullResponse: null,
    aborted: false,
  };
  
  const session = currentSession;
  
  // Function to speak acknowledgment
  const speakAcknowledgment = async () => {
    if (session.aborted || session.acknowledgmentSpoken || !speculativeResult.shouldSpeak) {
      return;
    }
    
    session.speakingAcknowledgment = true;
    
    try {
      await speakAsZoe(speculativeResult.immediatePhrase, {
        rate: 0.95, // Slightly slower for acknowledgments
        onEnd: () => {
          session.speakingAcknowledgment = false;
          session.acknowledgmentSpoken = true;
          
          // If full response is ready, speak it now
          if (session.fullResponseReady && session.fullResponse && !session.aborted) {
            const fullText = speculativeResult.transitionPhrase 
              ? `${speculativeResult.transitionPhrase} ${session.fullResponse}`
              : session.fullResponse;
            
            if (onFullResponseReady) {
              onFullResponseReady(fullText, speculativeResult.context);
            }
          }
        },
      });
    } catch (error) {
      console.error('[SpeculativeSpeech] Error speaking acknowledgment:', error);
      session.speakingAcknowledgment = false;
    }
  };
  
  // Function to set full response when deep thinking completes
  const setFullResponse = (response: string) => {
    if (session.aborted) return;
    
    session.fullResponse = response;
    session.fullResponseReady = true;
    
    // If acknowledgment is done or not needed, trigger callback immediately
    if (!speculativeResult.shouldSpeak || session.acknowledgmentSpoken) {
      if (onFullResponseReady) {
        const fullText = session.acknowledgmentSpoken && speculativeResult.transitionPhrase
          ? `${speculativeResult.transitionPhrase} ${response}`
          : response;
        onFullResponseReady(fullText, speculativeResult.context);
      }
    }
    // Otherwise, wait for acknowledgment to finish (handled in speakAcknowledgment)
  };
  
  // Function to abort session
  const abort = () => {
    session.aborted = true;
    if (session.speakingAcknowledgment) {
      stopZoeSpeech();
    }
    currentSession = null;
  };
  
  return {
    sessionId,
    speculativeResult,
    speakAcknowledgment,
    setFullResponse,
    abort,
  };
}

// ═══ PARALLEL PROCESSING HELPER ═══

export async function processWithSpeculativeSpeech<T>(
  userMessage: string,
  heavyProcessor: () => Promise<T>,
  options?: {
    onAcknowledgmentSpoken?: () => void;
    onProcessingComplete?: (result: T) => void;
    speakFullResponse?: boolean;
  }
): Promise<{
  result: T;
  speculativeContext: SpeculativeContext;
  totalLatencyMs: number;
  acknowledgedEarlyMs: number;
}> {
  const startTime = performance.now();
  
  // Start speculative speech immediately
  const specSession = await startSpeculativeSpeech(userMessage);
  
  // Start speaking acknowledgment (non-blocking)
  const speakPromise = specSession.speakAcknowledgment();
  const acknowledgedEarlyMs = performance.now() - startTime;
  
  if (options?.onAcknowledgmentSpoken) {
    speakPromise.then(options.onAcknowledgmentSpoken);
  }
  
  // Run heavy processor in parallel
  const result = await heavyProcessor();
  
  // Set full response
  if (options?.speakFullResponse && typeof result === 'object' && result !== null && 'content' in result) {
    specSession.setFullResponse((result as any).content);
  }
  
  if (options?.onProcessingComplete) {
    options.onProcessingComplete(result);
  }
  
  const totalLatencyMs = performance.now() - startTime;
  
  console.log(`[SpeculativeSpeech] Session complete:`, {
    acknowledgedEarlyMs: acknowledgedEarlyMs.toFixed(0),
    totalLatencyMs: totalLatencyMs.toFixed(0),
    timeSaved: `${(totalLatencyMs - acknowledgedEarlyMs).toFixed(0)}ms perceived`,
  });
  
  return {
    result,
    speculativeContext: specSession.speculativeResult.context,
    totalLatencyMs,
    acknowledgedEarlyMs,
  };
}

// ═══ SINGLETON UTILS ═══

export function isSpeculativeSpeechActive(): boolean {
  return currentSession !== null && !currentSession.aborted;
}

export function abortSpeculativeSpeech(): void {
  if (currentSession) {
    currentSession.aborted = true;
    if (currentSession.speakingAcknowledgment) {
      stopZoeSpeech();
    }
    currentSession = null;
  }
}

export default {
  generateSpeculativeSpeech,
  startSpeculativeSpeech,
  processWithSpeculativeSpeech,
  isSpeculativeSpeechActive,
  abortSpeculativeSpeech,
};
