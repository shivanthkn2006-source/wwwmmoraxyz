// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INFINITY BRAIN - Protocol Gemini Native
// The Ferrari Engine: Smart Routing + Soul Codex + Offline Fallback + Memory
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { processOfflineConversation } from '@/utils/zoeOfflineConversation';
// ═══ GEMINI-ONLY STACK: Nano for offline, Gemma for fallback, Flash for cloud ═══
import { 
  generateWithGeminiNano, 
  initializeGeminiNano, 
  checkGeminiNanoAvailability,
  getGeminiNanoState,
  type GeminiNanoState 
} from '@/core/slm/GeminiNanoEngine';
// ═══ GOOGLE GEMMA FALLBACK: MediaPipe + Gemma-2b (replaces HuggingFace/Qwen) ═══
import { 
  generateWithGemmaMediaPipe, 
  initializeGemmaMediaPipe,
  getGemmaMediaPipeState,
  isGemmaMediaPipeAvailable
} from '@/core/slm/GemmaMediaPipeEngine';
// ═══ OFFLINE SLM ENGINE: Guaranteed 3-tier fallback (Nano → Gemma → Scripted) ═══
import { 
  generateOfflineResponse, 
  getSLMState 
} from '@/core/slm/OfflineSLMEngine';
import { Json } from '@/integrations/supabase/types';
import { getCachedResponse, cacheResponse, checkDailyCap, incrementDailyUsage } from '@/utils/zoeResponseCache';
import { isDeepResearchEnabled } from '@/stores/zoeInfinityDeepResearchToggle';
import { useZoeMemory, extractMemoriesFromMessage } from '@/hooks/useZoeMemory';
import { useZoeAdaptiveLearning } from '@/hooks/useZoeAdaptiveLearning';
import { useZoeFestivalGreeting } from '@/hooks/useZoeFestivalGreeting';
import { useZoeConversationContext } from '@/hooks/useZoeConversationContext';
import { 
  InferenceOptimizer, 
  initializeInferenceOptimizer,
  type InferenceDecision,
  type InferenceMetrics 
} from '@/core/inference';
// ═══ ANTI-HALLUCINATION LAYER 1: Determinism profiling ═══
import { classifyDeterminism, getCritiqueRouting } from '@/core/inference/Determinism';

// ═══ GAP 2: SPECULATIVE SPEECH - Instant Samantha Effect ═══
import { 
  generateSpeculativeSpeech,
  type SpeculativeContext,
} from '@/core/speech/SpeculativeSpeechProtocol';

// ═══ GAP 3: POLYGLOT CULTURE - Cultural Resonance ═══
import { getPolyglotEngine } from '@/core/culture/PolyglotEmotionEngine';

// ═══ GAP 4: NEXUS WALLET - Economic Sovereignty ═══
import { getZoeNexusWallet, type OpportunitySignal } from '@/core/economy/ZoeNexusWallet';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type IntelligenceMode = 'flash' | 'pro';
export type ConnectionState = 'online' | 'offline' | 'degraded';

interface Citation {
  id: number;
  url: string;
  title: string;
  snippet?: string;
  domain: string;
}

interface BrainResponse {
  content: string;
  mode: IntelligenceMode;
  fromCache: boolean;
  codexInjected: boolean;
  latencyMs: number;
  // PHASE 1: DEEP GROUNDING - Citation metadata
  grounded?: boolean;
  citations?: Citation[];
  // PHASE 3: EMOTION UPGRADE - Emotion metadata
  emotionAttuned?: boolean;
  detectedEmotion?: string;
  emotionTone?: string;
  // IBM INFERENCE OPTIMIZATION - Cost savings metadata
  inferenceRoute?: 'local' | 'hybrid' | 'cloud';
  costSaved?: number;
  hardwareUsed?: string[];
  // GAP 2: SPECULATIVE SPEECH - Immediate acknowledgment
  speculativeContext?: SpeculativeContext;
  immediatePhrase?: string;
  // GAP 3: CULTURAL RESONANCE - Cultural adaptation
  culturallyAdapted?: boolean;
  culturalContext?: string;
  // GAP 4: ECONOMIC OPPORTUNITIES - Detected value signals
  economicOpportunities?: OpportunitySignal[];
  // PHASE 5: PERSONALITY MATRIX - Human-like behavioral depth
  personalityActive?: boolean;
  personalityMood?: string;
  personalityEnergy?: number;
  sarcasmTriggered?: boolean;
  regressionTriggered?: boolean;
  regressionPattern?: string;
}

// PHASE 5: Personality Matrix Input for think()
export interface PersonalityMatrixPayload {
  currentMood: string;
  moodIntensity: number;
  energy: number;
  patience: number;
  shouldBeSarcastic: boolean;
  shouldRegress: boolean;
  regressionBehavior?: string;
  sarcasmTendency: number;
  regressionChance: number;
  personalityStatement: string;
  toneModifier: string;
}

interface UseZoeInfinityBrainReturn {
  // State
  connectionState: ConnectionState;
  currentMode: IntelligenceMode;
  codexLoaded: boolean;
  
  // Actions
  think: (message: string, conversationHistory: Array<{ role: string; content: string }>, personalityMatrix?: PersonalityMatrixPayload) => Promise<BrainResponse>;
  refreshCodex: () => Promise<void>;
  setIntimacyLevel: (level: number) => void; // SAMANTHA MODE: Set intimacy for romantic voice
  
  // Offline
  isOffline: boolean;
  offlineCapabilities: string[];
  
  // IBM Inference Optimization
  inferenceMetrics: InferenceMetrics | null;
  costSavingsReport: { totalSaved: number; percentSaved: number; localRatio: number } | null;
  
  // GAP 2: Speculative Speech
  generateImmediate: (message: string) => { phrase: string; context: SpeculativeContext };
  
  // GAP 3: Cultural Context
  culturalProfile: ReturnType<typeof getPolyglotEngine>['getProfile'] extends () => infer R ? R : never;
  
  // GAP 4: Economic Scanning
  scanOpportunities: (context: { recentMessages?: string[] }) => Promise<OpportunitySignal[]>;
  
  // PHASE 7: Festival & Birthday Greeting Engine
  getTodaysGreeting: () => Promise<string | null>;
  getDOBCollectionPrompt: () => string | null;
  saveDateOfBirth: (dobText: string) => Promise<boolean>;
  learnFamilyBirthday: (relation: string, memberName: string, dob: string) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAP 3 FIX: CULTURAL PRO ROUTING INTELLIGENCE
// "Heavy" queries → Gemini Pro (2 RPM free tier)
// "Light" queries → Gemini Flash (or Nano if offline)
// ═══════════════════════════════════════════════════════════════════════════════

const PRO_TRIGGER_PATTERNS = [
  // ═══ ASTROLOGY / VEDIC / SPIRITUALITY ═══
  /astrology|zodiac|horoscope|birth chart|natal chart|mercury retrograde/i,
  /tarot|oracle|divination|spiritual|chakra|meditation guide/i,
  /vedic|jyotish|rashi|nakshatra|dasha|kundali|kundli/i,
  /palm reading|numerology|feng shui|vastu|i ching/i,
  /past life|karma|dharma|moksha|enlightenment/i,
  
  // ═══ FINANCE / INVESTMENT / ECONOMICS ═══
  /invest|investment|portfolio|stock|mutual fund|etf/i,
  /financial advice|retirement plan|wealth|asset allocation/i,
  /tax strategy|tax planning|capital gains|estate planning/i,
  /crypto strategy|bitcoin|ethereum|blockchain/i,
  /budget plan|debt strategy|financial freedom|fire movement/i,
  
  // ═══ LIFE PURPOSE / EXISTENTIAL / DEEP PERSONAL ═══
  /life purpose|meaning of life|existential|purpose|destiny/i,
  /what should i do with my life|who am i|why am i here/i,
  /soul mission|calling|life path|true self/i,
  /relationship advice|career guidance|major decision/i,
  /midlife crisis|identity crisis|self-discovery/i,
  
  // ═══ STRATEGY / COMPLEX ANALYSIS ═══
  /strategy|analyze|strategic|business plan|market analysis/i,
  /deep analysis|comprehensive|evaluate thoroughly|audit/i,
  /competitive analysis|swot|pestle|market research/i,
  
  // ═══ CREATIVE / COMPLEX GENERATION ═══
  /write a story|compose|create a plan|design a system/i,
  /blueprint|architecture|roadmap|framework/i,
  /screenplay|novel outline|business proposal/i,
  
  // ═══ TECHNICAL DEEP DIVE ═══
  /explain in detail|how does .* work|teach me|comprehensive guide/i,
  /debug|troubleshoot|optimize|refactor/i,
  /system design|architecture design|scalability/i,
  
  // ═══ MENTAL HEALTH / THERAPY ADJACENT ═══
  /anxiety|depression|trauma|grief|healing journey/i,
  /therapy|mental health|emotional support|coping/i,
  
  // ═══ CULTURAL / PHILOSOPHICAL ═══
  /philosophy|metaphysics|consciousness|reality/i,
  /stoicism|buddhism|hinduism|taoism|zen/i,
];

// Simple greetings/queries that should stay on Nano/Flash (fast path)
const NANO_PATTERNS = [
  /^(hi|hello|hey|yo|sup|good morning|good evening|good night)/i,
  /^how are you|how's it going|what's up/i,
  /^thank|thanks|thx/i,
  /^ok|okay|sure|got it|understood/i,
  /^bye|goodbye|see you|later/i,
  /^what time|what day|what date/i,
  /^tell me a joke|joke|funny/i,
];

const DYNAMIC_MEMORY_QUERY_PATTERNS = [
  /\b(?:do you|you)\s+(?:remember|recall|know)\b/i,
  /\b(?:previous|past|old|earlier|last)\s+(?:chat|conversation|talk|messages?)\b/i,
  /\bwhat were we (?:talking|speaking) about\b/i,
  /\bour (?:relationship|history|bond)\b/i,
  /\bwho am i to you\b/i,
  /\bwhat do you know about me\b/i,
];

const shouldBypassResponseCache = (message: string): boolean =>
  DYNAMIC_MEMORY_QUERY_PATTERNS.some((pattern) => pattern.test(message));

const detectRequiredMode = (message: string): IntelligenceMode => {
  // Quick check: if it's a simple greeting, stay on Flash
  for (const pattern of NANO_PATTERNS) {
    if (pattern.test(message.trim())) {
      console.log('[ZoeBrain] 🚀 NANO/FLASH route: Simple query detected');
      return 'flash';
    }
  }
  
  // Check for heavy patterns that need Pro
  for (const pattern of PRO_TRIGGER_PATTERNS) {
    if (pattern.test(message)) {
      console.log('[ZoeBrain] 🧠 PRO route: Deep reasoning query detected');
      return 'pro';
    }
  }
  
  // Default to flash for moderate queries
  return 'flash';
};

// ═══════════════════════════════════════════════════════════════════════════════
// SOUL CODEX COMPRESSION - Summarize for context window
// ═══════════════════════════════════════════════════════════════════════════════

interface RawCodex {
  core_values?: string[] | null;
  belief_anchors?: Json | null;
  communication_preference?: string | null;
  emotional_expressiveness?: number | null;
  humor_style?: string | null;
  formative_memories?: Json | null;
  peak_experiences?: Json | null;
  decision_making_style?: string | null;
}

const compressCodexForPrompt = (rawCodex: RawCodex | null): string => {
  if (!rawCodex) {
    return "User profile is being built. Respond warmly but without assumptions.";
  }

  const parts: string[] = [];

  // Core identity
  if (rawCodex.core_values?.length) {
    parts.push(`VALUES: ${rawCodex.core_values.slice(0, 5).join(', ')}`);
  }

  // Communication style
  if (rawCodex.communication_preference) {
    parts.push(`COMMUNICATION: ${rawCodex.communication_preference}`);
  }

  // Emotional baseline
  if (rawCodex.emotional_expressiveness !== null && rawCodex.emotional_expressiveness !== undefined) {
    const level = rawCodex.emotional_expressiveness > 7 ? 'highly expressive' : 
                  rawCodex.emotional_expressiveness > 4 ? 'balanced' : 'reserved';
    parts.push(`EMOTIONAL STYLE: ${level}`);
  }

  // Humor
  if (rawCodex.humor_style) {
    parts.push(`HUMOR: ${rawCodex.humor_style}`);
  }

  // Decision making
  if (rawCodex.decision_making_style) {
    parts.push(`DECISIONS: ${rawCodex.decision_making_style}`);
  }

  // Beliefs (extract key beliefs)
  if (rawCodex.belief_anchors && typeof rawCodex.belief_anchors === 'object') {
    const beliefs = Object.values(rawCodex.belief_anchors as Record<string, unknown>)
      .filter((v): v is string => typeof v === 'string')
      .slice(0, 3);
    if (beliefs.length) {
      parts.push(`BELIEFS: ${beliefs.join('; ')}`);
    }
  }

  // Formative experiences (brief summary)
  if (rawCodex.formative_memories && Array.isArray(rawCodex.formative_memories)) {
    const memories = (rawCodex.formative_memories as Array<{ summary?: string }>)
      .slice(0, 2)
      .map(m => m.summary || '')
      .filter(Boolean);
    if (memories.length) {
      parts.push(`KEY MEMORIES: ${memories.join('; ')}`);
    }
  }

  if (parts.length === 0) {
    return "User profile is minimal. Be warm and learn from this conversation.";
  }

  return `USER SOUL CODEX:\n${parts.join('\n')}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// OFFLINE MEMORY - Local chat history for basic answers
// ═══════════════════════════════════════════════════════════════════════════════

const OFFLINE_MEMORY_KEY = 'zoe-infinity-memory';
const MAX_OFFLINE_ENTRIES = 50;

interface OfflineMemory {
  facts: Record<string, string>; // "son's birthday" -> "March 15"
  conversations: Array<{ role: string; content: string; timestamp: number }>;
}

const saveToOfflineMemory = (
  role: 'user' | 'assistant', 
  content: string,
  extractedFacts?: Record<string, string>
): void => {
  try {
    const raw = localStorage.getItem(OFFLINE_MEMORY_KEY);
    const memory: OfflineMemory = raw ? JSON.parse(raw) : { facts: {}, conversations: [] };
    
    // Add conversation
    memory.conversations.push({ role, content, timestamp: Date.now() });
    
    // Trim to max entries
    if (memory.conversations.length > MAX_OFFLINE_ENTRIES) {
      memory.conversations = memory.conversations.slice(-MAX_OFFLINE_ENTRIES);
    }
    
    // Merge extracted facts
    if (extractedFacts) {
      memory.facts = { ...memory.facts, ...extractedFacts };
    }
    
    localStorage.setItem(OFFLINE_MEMORY_KEY, JSON.stringify(memory));
  } catch (e) {
    console.error('[ZoeBrain] Offline memory save failed:', e);
  }
};

const searchOfflineMemory = (query: string): string | null => {
  try {
    const raw = localStorage.getItem(OFFLINE_MEMORY_KEY);
    if (!raw) return null;
    
    const memory: OfflineMemory = JSON.parse(raw);
    const lowerQuery = query.toLowerCase();
    
    // Search facts first
    for (const [key, value] of Object.entries(memory.facts)) {
      if (lowerQuery.includes(key.toLowerCase())) {
        return value;
      }
    }
    
    // Search recent conversations for answers
    const relevantConvos = memory.conversations
      .filter(c => c.content.toLowerCase().includes(lowerQuery.split(' ').slice(0, 3).join(' ')))
      .slice(-3);
    
    if (relevantConvos.length > 0) {
      return relevantConvos.map(c => c.content).join('\n');
    }
    
    return null;
  } catch (e) {
    return null;
  }
};

const extractFactsFromMessage = (message: string): Record<string, string> => {
  const facts: Record<string, string> = {};
  
  // Birthday patterns
  const birthdayMatch = message.match(/(?:my |his |her |their )?(\w+(?:'s)?) birthday is (\w+ \d+|\d+\/\d+)/i);
  if (birthdayMatch) {
    facts[`${birthdayMatch[1]} birthday`] = birthdayMatch[2];
  }
  
  // Name patterns
  const nameMatch = message.match(/(?:my |his |her |their )?(\w+(?:'s)?) name is (\w+)/i);
  if (nameMatch) {
    facts[`${nameMatch[1]} name`] = nameMatch[2];
  }
  
  // Favorite patterns
  const favoriteMatch = message.match(/(?:my )?favorite (\w+) is (\w+)/i);
  if (favoriteMatch) {
    facts[`favorite ${favoriteMatch[1]}`] = favoriteMatch[2];
  }
  
  return facts;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useZoeInfinityBrain = (): UseZoeInfinityBrainReturn => {
  const { user } = useAuth();
  
  // PHASE 4: Memory System
  const { saveMemory, getMemoryContext, getRelevantMemories } = useZoeMemory();
  const { getConversationContext, getSessionSummaries } = useZoeConversationContext();
  
  // PHASE 6: Adaptive Learning Engine (Hidden)
  const { learnFromMessage, buildLearnedContext, getInstantReply } = useZoeAdaptiveLearning();
  
  // PHASE 7: Festival & Birthday Greeting Engine
  const { buildFestivalContext, getTodaysGreeting, getDOBCollectionPrompt, saveDateOfBirth, learnFamilyBirthday } = useZoeFestivalGreeting();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('online');
  const [currentMode, setCurrentMode] = useState<IntelligenceMode>('flash');
  const [codexLoaded, setCodexLoaded] = useState(false);
  const [inferenceMetrics, setInferenceMetrics] = useState<InferenceMetrics | null>(null);
  const [inferenceInitialized, setInferenceInitialized] = useState(false);
  
  const soulCodexRef = useRef<RawCodex | null>(null);
  const codexStringRef = useRef<string>('');
  const memoryContextRef = useRef<string>('');
  const lastDecisionRef = useRef<InferenceDecision | null>(null);
  const karmicIntimacyRef = useRef<number>(50); // SAMANTHA MODE: Track intimacy for romantic voice
  // ── #12 ABORT CONTROLLER: cancel stale brain fetches when a new send arrives ──
  const brainAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => { try { brainAbortRef.current?.abort(); } catch {} }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // IBM INFERENCE OPTIMIZER INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const initInference = async () => {
      try {
        const caps = await initializeInferenceOptimizer();
        setInferenceInitialized(true);
        console.log('[ZoeBrain] 🔧 IBM Inference Stack initialized:', {
          npu: caps.hasNPU,
          webgpu: caps.hasWebGPU,
          gpuTier: caps.gpuTier,
        });
      } catch (e) {
        console.error('[ZoeBrain] Inference init failed:', e);
      }
    };
    initInference();
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Connection State Detection
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const updateConnectionState = () => {
      setConnectionState(navigator.onLine ? 'online' : 'offline');
    };
    
    window.addEventListener('online', updateConnectionState);
    window.addEventListener('offline', updateConnectionState);
    updateConnectionState();
    
    return () => {
      window.removeEventListener('online', updateConnectionState);
      window.removeEventListener('offline', updateConnectionState);
    };
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Soul Codex Loading
  // ═══════════════════════════════════════════════════════════════════════════
  
  const refreshCodex = useCallback(async () => {
    if (!user?.id) {
      soulCodexRef.current = null;
      codexStringRef.current = compressCodexForPrompt(null);
      setCodexLoaded(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('dhf_soul_codex')
        .select('core_values, belief_anchors, communication_preference, emotional_expressiveness, humor_style, formative_memories, peak_experiences, decision_making_style')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('[ZoeBrain] Codex fetch error:', error);
        return;
      }
      
      soulCodexRef.current = data;
      codexStringRef.current = compressCodexForPrompt(data);
      setCodexLoaded(true);
      
      console.log('[ZoeBrain] Soul Codex loaded:', codexStringRef.current.substring(0, 100) + '...');
    } catch (e) {
      console.error('[ZoeBrain] Codex load failed:', e);
    }
  }, [user?.id]);
  
  // Auto-load codex on mount
  useEffect(() => {
    refreshCodex();
  }, [refreshCodex]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // The Brain - Main Thinking Function
  // ═══════════════════════════════════════════════════════════════════════════
  
  const think = useCallback(async (
    message: string, 
    conversationHistory: Array<{ role: string; content: string }>,
    personalityMatrix?: PersonalityMatrixPayload
  ): Promise<BrainResponse> => {
    const startTime = performance.now();
    const latestUserMessage = [...conversationHistory]
      .reverse()
      .find((entry) => entry.role === 'user')?.content?.trim();
    const primaryMessage = latestUserMessage || message.trim();
    
    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 4: EXTRACT AND SAVE MEMORIES FROM USER MESSAGE
    // ─────────────────────────────────────────────────────────────────────────
    
    const extractedMemories = extractMemoriesFromMessage(primaryMessage);
    for (const mem of extractedMemories) {
      saveMemory({
        memoryType: mem.type,
        key: mem.key,
        value: mem.value,
        context: `Extracted from conversation on ${new Date().toLocaleDateString()}`,
        importanceScore: mem.importance,
      });
    }
    
    // Also save to offline memory for local fallback
    const facts = extractFactsFromMessage(primaryMessage);
    saveToOfflineMemory('user', primaryMessage, Object.keys(facts).length > 0 ? facts : undefined);
    
    // PHASE 6: ADAPTIVE LEARNING — Learn user patterns (non-blocking)
    learnFromMessage(primaryMessage);
    
    // PHASE 6: CHECK INSTANT REPLY — Can we answer from learned patterns? (zero API cost)
    try {
      const instantAnswer = await getInstantReply(primaryMessage);
      if (instantAnswer) {
        console.log('[ZoeBrain] ⚡ INSTANT REPLY from Adaptive Learning — zero API cost');
        saveToOfflineMemory('assistant', instantAnswer);
        return {
          content: instantAnswer,
          mode: 'flash' as IntelligenceMode,
          fromCache: true,
          codexInjected: false,
          latencyMs: performance.now() - startTime,
          emotionAttuned: true,
        };
      }
    } catch (e) {
      console.warn('[ZoeBrain] Instant reply check failed (non-critical):', e);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // OFFLINE FALLBACK - THE ANTI-LOBOTOMY SOLUTION
    // ─────────────────────────────────────────────────────────────────────────
    
    if (connectionState === 'offline' || !navigator.onLine) {
      console.log('[ZoeBrain] 🧠 Offline mode activated - GEMINI-ONLY STACK');
      
      // First check offline memory for direct answers
      const memoryAnswer = searchOfflineMemory(primaryMessage);
      if (memoryAnswer) {
        const response = `From my memory: ${memoryAnswer}`;
        saveToOfflineMemory('assistant', response);
        return {
          content: response,
          mode: 'flash' as IntelligenceMode,
          fromCache: true,
          codexInjected: false,
          latencyMs: performance.now() - startTime,
          emotionAttuned: false,
        };
      }
      
      // ═══ GEMINI NANO - Google's Native On-Device AI ═══
      // Priority 1: Use Chrome Built-in AI (Gemini Nano) - FREE, FAST, NATIVE
      try {
        const nanoAvailability = await checkGeminiNanoAvailability();
        
        if (nanoAvailability === 'readily' || nanoAvailability === 'after-download') {
          console.log('[ZoeBrain] 🌟 GEMINI NANO ACTIVE - Native Google On-Device AI');
          
          const nanoResponse = await generateWithGeminiNano(primaryMessage);
          const nanoState = getGeminiNanoState();
          
          console.log(`[ZoeBrain] Gemini Nano: ${nanoState.lastLatencyMs.toFixed(0)}ms | Tokens: ${nanoState.tokensUsed}`);
          saveToOfflineMemory('assistant', nanoResponse);
          
          return {
            content: nanoResponse,
            mode: 'flash' as IntelligenceMode,
            fromCache: false,
            codexInjected: false,
            latencyMs: nanoState.lastLatencyMs,
            emotionAttuned: true,
          };
        } else {
          console.log('[ZoeBrain] ⚠️ Gemini Nano not available - Using fallback SLM');
        }
      } catch (nanoError) {
        console.warn('[ZoeBrain] Gemini Nano failed, trying Gemma fallback:', nanoError);
      }
      
      // ═══ FALLBACK: MediaPipe Gemma-2b (100% Google, replaces HuggingFace) ═══
      // Priority 2: Use Google Gemma via MediaPipe (for non-Chrome browsers)
      try {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        
        console.log('[ZoeBrain] 🔄 Attempting MediaPipe Gemma-2b fallback...');
        
        const gemmaResponse = await generateWithGemmaMediaPipe(primaryMessage, {
          userName: user?.user_metadata?.display_name || user?.email?.split('@')[0],
          timeOfDay,
          recentHistory: memoryContextRef.current ? [memoryContextRef.current] : undefined,
        });
        
        const gemmaState = getGemmaMediaPipeState();
        console.log(`[ZoeBrain] ✅ Gemma MediaPipe: ${gemmaState.tokensGenerated} tokens in ${gemmaState.lastLatencyMs.toFixed(0)}ms`);
        saveToOfflineMemory('assistant', gemmaResponse);
        
        return {
          content: gemmaResponse,
          mode: 'flash' as IntelligenceMode,
          fromCache: false,
          codexInjected: false,
          latencyMs: gemmaState.lastLatencyMs,
          emotionAttuned: true,
        };
      } catch (gemmaError) {
        console.warn('[ZoeBrain] MediaPipe Gemma failed, falling back to scripted:', gemmaError);
        
        // Ultimate fallback to scripted responses (IQ 10)
        const offlineResponse = processOfflineConversation(primaryMessage);
        saveToOfflineMemory('assistant', offlineResponse.text);
        
        return {
          content: offlineResponse.text,
          mode: 'flash' as IntelligenceMode,
          fromCache: true,
          codexInjected: false,
          latencyMs: performance.now() - startTime,
          emotionAttuned: false,
        };
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // DAILY CAP CHECK - 1 credit per prompt, admin bypass
    // ─────────────────────────────────────────────────────────────────────────
    
    if (user?.id) {
      const capCheck = await checkDailyCap(user.id);
      if (!capCheck.allowed) {
        console.log('[ZoeBrain] ⛔ Daily cap reached');
        return {
          content: "You've reached your daily limit. Come back tomorrow for more conversations! 🌙",
          mode: 'flash' as IntelligenceMode,
          fromCache: false,
          codexInjected: false,
          latencyMs: performance.now() - startTime,
          emotionAttuned: false,
        };
      }
      
      // Check cache before making API call, but never for memory/relationship queries
      const skipCache = shouldBypassResponseCache(primaryMessage);
      const cached = skipCache ? null : await getCachedResponse(user.id, primaryMessage);
      if (cached) {
        console.log('[ZoeBrain] ⚡ Cache hit - no API credit used');
        return {
          content: cached,
          mode: 'flash' as IntelligenceMode,
          fromCache: true,
          codexInjected: false,
          latencyMs: performance.now() - startTime,
          emotionAttuned: false,
        };
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // IBM INFERENCE OPTIMIZATION - Smart Routing Decision
    // ─────────────────────────────────────────────────────────────────────────
    
    let inferenceDecision: InferenceDecision | null = null;
    let costSaved = 0;
    
    if (inferenceInitialized) {
      try {
        inferenceDecision = await InferenceOptimizer.decideBrain(primaryMessage);
        lastDecisionRef.current = inferenceDecision;
        
        // If IBM decides LOCAL, use flash mode (free, fast)
        // If IBM decides CLOUD, check pattern for pro vs flash
        if (inferenceDecision.route === 'local') {
          setCurrentMode('flash');
          costSaved = inferenceDecision.estimatedCost; // Cost we avoided
          console.log(`[ZoeBrain] 💰 IBM LOCAL ROUTE - Saved $${costSaved.toFixed(4)}`);
        } else {
          // Cloud route - use original pattern detection for pro/flash
          const requiredMode = detectRequiredMode(primaryMessage);
          setCurrentMode(requiredMode);
        }
        
        // Update metrics
        setInferenceMetrics(InferenceOptimizer.getMetrics());
      } catch (e) {
        console.error('[ZoeBrain] IBM decision failed, using fallback:', e);
        const requiredMode = detectRequiredMode(primaryMessage);
        setCurrentMode(requiredMode);
      }
    } else {
      const requiredMode = detectRequiredMode(primaryMessage);
      setCurrentMode(requiredMode);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 4: GATHER MEMORY CONTEXT
    // ─────────────────────────────────────────────────────────────────────────
    
    // Get relevant memories for this conversation
    const relevantMemories = await getRelevantMemories(primaryMessage, 15);
    memoryContextRef.current = getMemoryContext();
    
    // Build conversation summary from history for better context retention
    // This ensures Zoe remembers past conversations even if memory system is still loading
    const historyCount = conversationHistory.length;
    const conversationSummary = historyCount > 2 
      ? `\n\n═══ CONVERSATION CONTEXT ═══\nThis conversation has ${historyCount} messages. Recent topics discussed in this session are reflected in the message history below.\n═════════════════════════════`
      : '';
    
    // PHASE 6: ADAPTIVE LEARNING CONTEXT — Inject learned user patterns
    let learnedPatternContext = '';
    let festivalContext = '';
    let persistedConversationContext = '';
    let sessionSummaryContext = '';

    const [
      learnedPatternResult,
      festivalContextResult,
      persistedConversationResult,
      sessionSummaryResult,
    ] = await Promise.allSettled([
      buildLearnedContext(),
      buildFestivalContext(),
      getConversationContext(24),
      getSessionSummaries(6),
    ]);

    if (learnedPatternResult.status === 'fulfilled') {
      learnedPatternContext = learnedPatternResult.value;
    } else {
      console.warn('[ZoeBrain] Adaptive learning context failed (non-critical):', learnedPatternResult.reason);
    }

    if (festivalContextResult.status === 'fulfilled') {
      festivalContext = festivalContextResult.value;
    } else {
      console.warn('[ZoeBrain] Festival context failed (non-critical):', festivalContextResult.reason);
    }

    if (persistedConversationResult.status === 'fulfilled') {
      persistedConversationContext = persistedConversationResult.value;
    } else {
      console.warn('[ZoeBrain] Persisted conversation context failed (non-critical):', persistedConversationResult.reason);
    }

    if (sessionSummaryResult.status === 'fulfilled') {
      sessionSummaryContext = sessionSummaryResult.value;
    } else {
      console.warn('[ZoeBrain] Session summary context failed (non-critical):', sessionSummaryResult.reason);
    }
    
    const combinedMemoryContext = [
      memoryContextRef.current,
      conversationSummary,
      persistedConversationContext,
      sessionSummaryContext,
      learnedPatternContext,
      festivalContext,
    ].filter(Boolean).join('\n');
    
    const _hasMemories = relevantMemories.length > 0;
    console.log(`[ZoeBrain] Mode: ${currentMode.toUpperCase()} | Codex: ${codexLoaded} | Memories: ${relevantMemories.length} | History: ${historyCount} msgs | Route: ${inferenceDecision?.route || 'unknown'}`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // CALL THE BRAIN
    // ─────────────────────────────────────────────────────────────────────────
    
    try {
      // Limit conversation history to last 50 messages - Prevents context window overflow while ensuring enough context
      const recentHistory = conversationHistory.slice(-50);

      // Always compute time from the user's device timezone (never from the backend)
      // so Zoe never "thinks" it's a different hour (e.g., UTC vs local).
      const now = new Date();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timezoneOffsetMinutes = -now.getTimezoneOffset(); // minutes east of UTC
      const localTime = now.toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      
      // ── ANTI-HALLUCINATION: Profile latest user query for determinism + critique routing ──
      const lastUserMsg = [...recentHistory].reverse().find(m => m.role === 'user')?.content || primaryMessage || '';
      const determinism = classifyDeterminism(lastUserMsg);
      const critiqueRouting = getCritiqueRouting(determinism.mode);
      console.log(`[ZoeBrain] 🎯 Determinism: ${determinism.mode} (temp=${determinism.temperature}, critique=${critiqueRouting.enabled})`);

      // ═══════════════════════════════════════════════════════════════════════
      // DEEP RESEARCH ROUTE — Gemini 2.5 Pro 3-step reasoning loop
      // Triggered when: user toggle ON, OR pattern-detected Pro mode.
      // Non-destructive: any failure falls through to existing brain below.
      // ═══════════════════════════════════════════════════════════════════════
      const manualDeep = isDeepResearchEnabled();
      const autoDeep = currentMode === 'pro';
      if (manualDeep || autoDeep) {
        console.log(`[ZoeBrain] 🔬 DEEP RESEARCH route (${manualDeep ? 'manual' : 'auto-pattern'})`);
        try {
          const { data: drData, error: drError } = await supabase.functions.invoke('zoe-infinity-deep-research', {
            body: {
              messages: recentHistory.map(m => ({ role: m.role, content: m.content })),
              soulCodex: codexStringRef.current,
              memoryContext: combinedMemoryContext,
              intimacyLevel: karmicIntimacyRef.current,
              localTime,
            },
          });
          if (!drError && drData?.response && typeof drData.response === 'string') {
            console.log(`[ZoeBrain] ✓ Deep Research returned in ${drData.latencyMs}ms (${drData.steps} sub-Qs)`);
            saveToOfflineMemory('assistant', drData.response);
            if (user?.id) {
              incrementDailyUsage(user.id);
              // Don't cache deep-research responses (they're question-specific and expensive)
            }
            return {
              content: drData.response,
              mode: 'pro' as IntelligenceMode,
              fromCache: false,
              codexInjected: codexLoaded,
              latencyMs: performance.now() - startTime,
              emotionAttuned: true,
              inferenceRoute: 'cloud' as const,
            };
          }
          console.warn('[ZoeBrain] Deep Research returned no response, falling back to normal brain:', drError);
        } catch (drCatch) {
          console.warn('[ZoeBrain] Deep Research threw, falling back to normal brain:', drCatch);
        }
      }

      // ── #12 Abort any in-flight brain fetch before issuing a new one ──
      try { brainAbortRef.current?.abort(); } catch {}
      const abortCtrl = new AbortController();
      brainAbortRef.current = abortCtrl;

      const { data, error } = await supabase.functions.invoke('zoe-infinity-brain', {
        body: { 
          messages: recentHistory.map(m => ({
            role: m.role,
            content: m.content
          })),
          mode: currentMode,
          soulCodex: codexStringRef.current,
          memoryContext: combinedMemoryContext, // PHASE 4: Inject memory + conversation context
          enableGrounding: true, // DEEP GROUNDING: Enable citation search
          // SAMANTHA MODE: Pass intimacy level for romantic voice tuning
          intimacyLevel: karmicIntimacyRef.current,
          // Client time (authoritative)
          clientTime: {
            timezone,
            timezoneOffsetMinutes,
            localTime,
            localISOString: now.toISOString(),
          },
          // PHASE 5: Personality Matrix for human-like behavior
          personalityMatrix: personalityMatrix || undefined,
          // ── ANTI-HALLUCINATION FOUNDATION ──
          determinism: {
            mode: determinism.mode,
            temperature: determinism.temperature,
            topP: determinism.topP,
            reasoningEffort: determinism.reasoningEffort,
            requireCitations: determinism.requireCitations,
            requireCritique: determinism.requireCritique,
          },
          critiqueRouting,
        }
      });
      
      if (error) throw error;
      
      const responseContent = data?.response || "Hmm, I blanked for a sec — can you say that again?";
      saveToOfflineMemory('assistant', responseContent);
      
      // Increment daily usage + cache the response (1 credit per prompt)
      if (user?.id) {
        incrementDailyUsage(user.id);
        cacheResponse(user.id, primaryMessage, responseContent, currentMode);
      }
      
      // Log grounding status
      if (data?.grounded) {
        console.log(`[ZoeBrain] ✓ GROUNDED response with ${data.citations?.length || 0} citations`);
      }
      
      // Log emotion status
      if (data?.emotionAttuned) {
        console.log(`[ZoeBrain] 🎭 EMOTION-ATTUNED response | Emotion: ${data.detectedEmotion} | Tone: ${data.emotionTone}`);
      }
      
      // ═══ ZSMT LOGGING: Log to zoe_sovereign_memory for unified consciousness ═══
      if (user?.id) {
        try {
          await supabase.from('zoe_sovereign_memory').insert({
            user_id: user.id,
            event_type: 'infinity_chat',
            content_text: primaryMessage.substring(0, 500),
            zoe_state_json: {
              mode: currentMode,
              grounded: data?.grounded || false,
              emotionAttuned: data?.emotionAttuned || false,
              detectedEmotion: data?.detectedEmotion,
              latencyMs: data?.latencyMs,
              codexInjected: codexLoaded,
              platform: 'zoe_infinity',
            },
            system_stability_score: 1.0,
          });
          console.log('[ZoeBrain] 📝 ZSMT logged: infinity_chat event');
        } catch (zsmtError) {
          console.warn('[ZoeBrain] ZSMT logging failed (non-critical):', zsmtError);
        }
      }
      
      return {
        content: responseContent,
        mode: currentMode,
        fromCache: false,
        codexInjected: codexLoaded,
        latencyMs: performance.now() - startTime,
        // PHASE 1: DEEP GROUNDING - Pass citations through
        grounded: data?.grounded || false,
        citations: data?.citations || [],
        // PHASE 3: EMOTION UPGRADE - Pass emotion metadata through
        emotionAttuned: data?.emotionAttuned || false,
        detectedEmotion: data?.detectedEmotion,
        emotionTone: data?.emotionTone,
        // IBM INFERENCE OPTIMIZATION - Cost savings
        inferenceRoute: inferenceDecision?.route || 'cloud',
        costSaved: costSaved,
        hardwareUsed: inferenceDecision?.hardwareUsed || ['cloud'],
        // PHASE 5: PERSONALITY MATRIX - Human-like behavioral depth
        personalityActive: data?.personalityActive || false,
        personalityMood: data?.personalityMood,
        personalityEnergy: data?.personalityEnergy,
        sarcasmTriggered: data?.sarcasmTriggered || false,
        regressionTriggered: data?.regressionTriggered || false,
        regressionPattern: data?.regressionPattern,
      };
    } catch (e: unknown) {
      // ─────────────────────────────────────────────────────────────────────────
      // GRACEFUL FALLBACK - Use OfflineSLMEngine (Always Works)
      // The OfflineSLMEngine has a guaranteed 3-tier fallback:
      // 1. Gemini Nano (Chrome built-in AI)
      // 2. MediaPipe Gemma 2B
      // 3. Smart scripted responses
      // ─────────────────────────────────────────────────────────────────────────
      
      const errorMessage = e instanceof Error ? e.message : String(e);
      const is402Error = errorMessage.includes('402') || errorMessage.includes('PAYMENT_REQUIRED');
      const is429Error = errorMessage.includes('429') || errorMessage.includes('rate limit');
      const isQuotaError = is402Error || is429Error;
      
      if (isQuotaError) {
        console.log('[ZoeBrain] 💰 Quota/rate limit - seamlessly switching to local SLM (no error shown)');
      } else {
        console.error('[ZoeBrain] API error, falling back to local SLM:', e);
        setConnectionState('degraded');
      }
      
      // ═══ USE THE OFFLINE SLM ENGINE (GUARANTEED TO WORK) ═══
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      
      const slmResult = await generateOfflineResponse(primaryMessage, {
        userName: user?.user_metadata?.display_name || user?.email?.split('@')[0],
        timeOfDay,
      });
      
      const slmState = getSLMState();
      console.log(`[ZoeBrain] ✅ Local SLM (${slmState.device}): ${slmResult.latencyMs.toFixed(0)}ms`);
      saveToOfflineMemory('assistant', slmResult.content);
      
      // NO ERROR MESSAGES - Zoe works seamlessly offline
      return {
        content: slmResult.content,
        mode: 'flash' as IntelligenceMode,
        fromCache: false,
        codexInjected: false,
        latencyMs: slmResult.latencyMs,
        emotionAttuned: true,
        inferenceRoute: 'local' as const,
      };
    }
  }, [connectionState, codexLoaded]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COST SAVINGS REPORT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getCostSavingsReport = useCallback(() => {
    if (!inferenceInitialized) return null;
    return InferenceOptimizer.getCostSavingsReport();
  }, [inferenceInitialized]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GAP 2: SPECULATIVE SPEECH - Generate immediate acknowledgment
  // ═══════════════════════════════════════════════════════════════════════════
  
  const generateImmediate = useCallback((message: string) => {
    const result = generateSpeculativeSpeech(message);
    return {
      phrase: result.immediatePhrase,
      context: result.context,
    };
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GAP 3: CULTURAL PROFILE - Get current cultural context
  // ═══════════════════════════════════════════════════════════════════════════
  
  const culturalProfile = getPolyglotEngine().getProfile();
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GAP 4: ECONOMIC SCANNING - Detect value opportunities
  // ═══════════════════════════════════════════════════════════════════════════
  
  const scanOpportunities = useCallback(async (context: { recentMessages?: string[] }) => {
    if (!user?.id) return [];
    const wallet = getZoeNexusWallet(user.id);
    return wallet.scanForOpportunities({
      recentMessages: context.recentMessages,
    });
  }, [user?.id]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════
  
  // SAMANTHA MODE: Set intimacy level for romantic voice tuning
  const setIntimacyLevel = useCallback((level: number) => {
    karmicIntimacyRef.current = Math.max(0, Math.min(100, level));
    console.log('[ZoeBrain] 💕 Intimacy level set to:', karmicIntimacyRef.current);
  }, []);

  return {
    connectionState,
    currentMode,
    codexLoaded,
    think,
    refreshCodex,
    setIntimacyLevel, // SAMANTHA MODE
    isOffline: connectionState === 'offline',
    // PHASE 7: Festival greeting engine
    getTodaysGreeting,
    getDOBCollectionPrompt,
    saveDateOfBirth,
    learnFamilyBirthday,
    offlineCapabilities: [
      'Answer from memory',
      'Basic conversation',
      'Navigate app',
      'Recall stored facts',
      'Time and date queries',
      'IBM local inference (NPU/WebGPU)',
    ],
    // IBM Inference Optimization
    inferenceMetrics,
    costSavingsReport: getCostSavingsReport(),
    // GAP 2: Speculative Speech
    generateImmediate,
    // GAP 3: Cultural Context
    culturalProfile,
    // GAP 4: Economic Scanning
    scanOpportunities,
  };
};
