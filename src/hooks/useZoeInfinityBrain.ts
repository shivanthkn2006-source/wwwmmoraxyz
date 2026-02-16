// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INFINITY BRAIN - Protocol Gemini Native
// The Ferrari Engine: Smart Routing + Soul Codex + Offline Fallback + Memory
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
// ═══ SOVEREIGN CONNECTION: M1 Pro via Ollama ═══
import { generateResponse as generateOllamaResponse } from '@/core/llm/LocalLLMEngine';
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
import { useZoeMemory, extractMemoriesFromMessage } from '@/hooks/useZoeMemory';
import { 
  InferenceOptimizer, 
  initializeInferenceOptimizer,
  type InferenceDecision,
  type InferenceMetrics 
} from '@/core/inference';

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
    
    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 4: EXTRACT AND SAVE MEMORIES FROM USER MESSAGE
    // ─────────────────────────────────────────────────────────────────────────
    
    const extractedMemories = extractMemoriesFromMessage(message);
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
    const facts = extractFactsFromMessage(message);
    saveToOfflineMemory('user', message, Object.keys(facts).length > 0 ? facts : undefined);
    
    // ─────────────────────────────────────────────────────────────────────────
    // OFFLINE FALLBACK - THE ANTI-LOBOTOMY SOLUTION
    // ─────────────────────────────────────────────────────────────────────────
    
    if (connectionState === 'offline' || !navigator.onLine) {
      console.log('[ZoeBrain] 🧠 Offline mode activated - GEMINI-ONLY STACK');
      
      // First check offline memory for direct answers
      const memoryAnswer = searchOfflineMemory(message);
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
          
          const nanoResponse = await generateWithGeminiNano(message);
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
        
        const gemmaResponse = await generateWithGemmaMediaPipe(message, {
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
        const offlineResponse = processOfflineConversation(message);
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
    // IBM INFERENCE OPTIMIZATION - Smart Routing Decision
    // ─────────────────────────────────────────────────────────────────────────
    
    let inferenceDecision: InferenceDecision | null = null;
    let costSaved = 0;
    
    if (inferenceInitialized) {
      try {
        inferenceDecision = await InferenceOptimizer.decideBrain(message);
        lastDecisionRef.current = inferenceDecision;
        
        // If IBM decides LOCAL, use flash mode (free, fast)
        // If IBM decides CLOUD, check pattern for pro vs flash
        if (inferenceDecision.route === 'local') {
          setCurrentMode('flash');
          costSaved = inferenceDecision.estimatedCost; // Cost we avoided
          console.log(`[ZoeBrain] 💰 IBM LOCAL ROUTE - Saved $${costSaved.toFixed(4)}`);
        } else {
          // Cloud route - use original pattern detection for pro/flash
          const requiredMode = detectRequiredMode(message);
          setCurrentMode(requiredMode);
        }
        
        // Update metrics
        setInferenceMetrics(InferenceOptimizer.getMetrics());
      } catch (e) {
        console.error('[ZoeBrain] IBM decision failed, using fallback:', e);
        const requiredMode = detectRequiredMode(message);
        setCurrentMode(requiredMode);
      }
    } else {
      const requiredMode = detectRequiredMode(message);
      setCurrentMode(requiredMode);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 4: GATHER MEMORY CONTEXT
    // ─────────────────────────────────────────────────────────────────────────
    
    // Get relevant memories for this conversation
    const relevantMemories = await getRelevantMemories(message, 15);
    memoryContextRef.current = getMemoryContext();
    
    // Build conversation summary from history for better context retention
    // This ensures Zoe remembers past conversations even if memory system is still loading
    const historyCount = conversationHistory.length;
    const conversationSummary = historyCount > 2 
      ? `\n\n═══ CONVERSATION CONTEXT ═══\nThis conversation has ${historyCount} messages. Recent topics discussed in this session are reflected in the message history below.\n═════════════════════════════`
      : '';
    
    const combinedMemoryContext = memoryContextRef.current + conversationSummary;
    
    const _hasMemories = relevantMemories.length > 0;
    console.log(`[ZoeBrain] Mode: ${currentMode.toUpperCase()} | Codex: ${codexLoaded} | Memories: ${relevantMemories.length} | History: ${historyCount} msgs | Route: ${inferenceDecision?.route || 'unknown'}`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // CALL THE BRAIN
    // ─────────────────────────────────────────────────────────────────────────
    
    try {
      // ═══════════════════════════════════════════════════════════════════════
      // CLOUD-FIRST: Route through zoe-infinity-brain edge function (Gemini)
      // Sovereign M1 Pro mode available as future option when DNS resolves
      // ═══════════════════════════════════════════════════════════════════════
      
      console.log(`[ZoeBrain] ☁️ CLOUD MODE: Routing to zoe-infinity-brain (${currentMode})...`);
      
      const brainPayload: Record<string, unknown> = {
        messages: [
          ...conversationHistory.slice(-20),
          { role: 'user', content: message },
        ],
        mode: currentMode,
        soulCodex: codexLoaded ? codexStringRef.current : undefined,
        memoryContext: combinedMemoryContext || undefined,
        enableGrounding: true,
        intimacyLevel: undefined,
        clientTime: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          localTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          localISOString: new Date().toISOString(),
        },
      };

      if (personalityMatrix) {
        brainPayload.personalityMatrix = personalityMatrix;
      }
      // Emotion context is handled server-side via text detection

      const { data, error } = await supabase.functions.invoke('zoe-infinity-brain', {
        body: brainPayload,
      });

      if (error) throw error;
      
      const responseContent = data?.response || data?.text || "Hmm, I blanked for a sec — can you say that again?";
      const latencyMs = performance.now() - startTime;
      
      console.log(`[ZoeBrain] ☁️ Cloud responded in ${latencyMs.toFixed(0)}ms | Mode: ${currentMode}`);
      saveToOfflineMemory('assistant', responseContent);
      
      return {
        content: responseContent,
        mode: currentMode,
        fromCache: false,
        codexInjected: codexLoaded,
        latencyMs,
        emotionAttuned: true,
        inferenceRoute: 'cloud' as const,
        costSaved,
        hardwareUsed: ['lovable-cloud-gemini'],
        personalityActive: !!personalityMatrix,
        citations: data?.citations,
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
      
      const slmResult = await generateOfflineResponse(message, {
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
