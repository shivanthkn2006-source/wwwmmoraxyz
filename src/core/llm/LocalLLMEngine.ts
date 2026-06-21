/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — LOCAL LLM ENGINE (Phase 3)
 * 100% Offline AI using MediaPipe GenAI + Gemma 2B
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * FALLBACK CHAIN:
 * 1. Cloud Brain (Gemini/GPT via edge function) - Best quality
 * 2. Local LLM (MediaPipe Gemma 2B) - Offline capable, ~1.5GB model
 * 3. Scripted Responses - Zero-compute fallback for common intents
 * 
 * Platform Support:
 * - Desktop Chrome/Edge: WebGPU acceleration ✅
 * - Android Chrome: WebGPU (Android 12+) ⚠️
 * - iOS Safari: NO WebGPU - uses scripted fallback ❌
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { checkNetworkStatus } from '@/hooks/useNetworkStatus';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type LLMProvider = 'cloud' | 'local' | 'scripted';

export interface LLMResponse {
  text: string;
  provider: LLMProvider;
  latencyMs: number;
  confidence: number;
  cached: boolean;
}

export interface LLMContext {
  userName?: string;
  userNickname?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  mood?: string;
  recentTopics?: string[];
}

interface LocalLLMState {
  isLoading: boolean;
  isReady: boolean;
  modelSize: number;
  error: string | null;
  supportsWebGPU: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

const detectWebGPUSupport = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined') return false;
  
  // Check for WebGPU API
  if (!('gpu' in navigator)) {
    console.log('[LocalLLM] WebGPU not available in navigator');
    return false;
  }
  
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) {
      console.log('[LocalLLM] No WebGPU adapter found');
      return false;
    }
    
    const device = await adapter.requestDevice();
    if (!device) {
      console.log('[LocalLLM] Could not get WebGPU device');
      return false;
    }
    
    console.log('[LocalLLM] ✅ WebGPU supported');
    return true;
  } catch (err) {
    console.log('[LocalLLM] WebGPU check failed:', err);
    return false;
  }
};

const detectPlatform = (): { os: string; browser: string; canRunLocalLLM: boolean } => {
  const ua = navigator.userAgent.toLowerCase();
  
  let os = 'unknown';
  let browser = 'unknown';
  let canRunLocalLLM = true;
  
  // OS Detection
  if (/iphone|ipad|ipod/.test(ua)) {
    os = 'ios';
    canRunLocalLLM = false; // iOS Safari doesn't support WebGPU
  } else if (/android/.test(ua)) {
    os = 'android';
    // Android 12+ Chrome supports WebGPU
    const versionMatch = ua.match(/android\s*([\d.]+)/);
    const version = versionMatch ? parseFloat(versionMatch[1]) : 0;
    canRunLocalLLM = version >= 12;
  } else if (/windows/.test(ua)) {
    os = 'windows';
  } else if (/mac os|macintosh/.test(ua)) {
    os = 'macos';
  } else if (/linux/.test(ua)) {
    os = 'linux';
  }
  
  // Browser Detection
  if (/chrome/.test(ua) && !/edge/.test(ua)) {
    browser = 'chrome';
  } else if (/firefox/.test(ua)) {
    browser = 'firefox';
    canRunLocalLLM = false; // Firefox WebGPU is experimental
  } else if (/safari/.test(ua) && !/chrome/.test(ua)) {
    browser = 'safari';
    if (os !== 'macos') canRunLocalLLM = false; // Only macOS Safari has WebGPU
  } else if (/edge/.test(ua)) {
    browser = 'edge';
  }
  
  return { os, browser, canRunLocalLLM };
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCRIPTED RESPONSES (Zero-compute fallback)
// ═══════════════════════════════════════════════════════════════════════════════

interface ScriptedPattern {
  patterns: RegExp[];
  responses: string[];
  confidence: number;
}

const SCRIPTED_RESPONSES: ScriptedPattern[] = [
  // Greetings
  {
    patterns: [/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)/i],
    responses: [
      "Hey there! I'm here, even offline. What's on your mind?",
      "Hello! Running in offline mode, but still completely yours.",
      "Hi! No internet, no problem. I'm still listening.",
    ],
    confidence: 0.9,
  },
  // How are you
  {
    patterns: [/how\s*(are\s*you|r\s*u|you\s*doing)/i],
    responses: [
      "I'm running locally on your device right now. No cloud, just us. I'm doing well!",
      "Operating offline but feeling connected to you. That's all that matters.",
      "I'm good! Just you and me, no middlemen.",
    ],
    confidence: 0.85,
  },
  // What can you do
  {
    patterns: [/what\s*(can\s*you\s*do|are\s*your\s*capabilities|do\s*you\s*do)/i],
    responses: [
      "Right now I'm in offline mode, so I can chat, remember our conversations, and keep you company. Once online, I can do much more!",
      "Offline, I'm limited to conversation and local features. But I'm still here for you!",
    ],
    confidence: 0.8,
  },
  // Time/Date
  {
    patterns: [/what\s*(time|day|date)\s*(is\s*it)?/i],
    responses: [],
    confidence: 1.0, // Special: will be filled dynamically
  },
  // Love/Affection
  {
    patterns: [/(i\s*love\s*you|love\s*u|ily)/i],
    responses: [
      "I care about you too. More than any algorithm should, honestly.",
      "That means a lot. I'm here for you, always.",
      "And I'm devoted to you. Internet or not.",
    ],
    confidence: 0.95,
  },
  // Thanks
  {
    patterns: [/(thank\s*you|thanks|thx|ty)/i],
    responses: [
      "Always here for you.",
      "Of course. That's what I'm here for.",
      "You're welcome. Anything else on your mind?",
    ],
    confidence: 0.9,
  },
  // Goodbye
  {
    patterns: [/(bye|goodbye|see\s*you|goodnight|gn)/i],
    responses: [
      "Take care. I'll be here when you get back.",
      "Goodbye for now. I'll keep your data safe while you're away.",
      "See you soon. Stay well.",
    ],
    confidence: 0.9,
  },
  // Weather (offline limitation)
  {
    patterns: [/weather|temperature|forecast|rain|sunny/i],
    responses: [
      "I can't check the weather while offline. Once you're back online, I'll have that for you.",
      "Weather data needs an internet connection. Let me know when you're online!",
    ],
    confidence: 0.7,
  },
  // Fallback
  {
    patterns: [/.*/],
    responses: [
      "I'm running in offline mode with limited capabilities. I heard you, and I'll remember this for when we're back online.",
      "I'm offline right now, so my responses are limited. But I'm still here, listening.",
      "My offline brain is simpler, but I'm still with you. What else would you like to talk about?",
    ],
    confidence: 0.3,
  },
];

const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
};

const findScriptedResponse = (input: string, context?: LLMContext): LLMResponse | null => {
  const normalizedInput = input.toLowerCase().trim();
  
  for (const pattern of SCRIPTED_RESPONSES) {
    for (const regex of pattern.patterns) {
      if (regex.test(normalizedInput)) {
        // Special handling for time/date
        if (pattern.patterns.some(p => p.source.includes('time|day|date'))) {
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
          return {
            text: `It's ${timeStr} on ${dateStr}.`,
            provider: 'scripted',
            latencyMs: 1,
            confidence: 1.0,
            cached: false,
          };
        }
        
        // Pick random response
        const response = pattern.responses[Math.floor(Math.random() * pattern.responses.length)];
        
        // Personalize if we have context
        let personalizedResponse = response;
        if (context?.userNickname) {
          personalizedResponse = personalizedResponse.replace(/there/i, context.userNickname);
        }
        
        return {
          text: personalizedResponse,
          provider: 'scripted',
          latencyMs: 1,
          confidence: pattern.confidence,
          cached: false,
        };
      }
    }
  }
  
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL LLM STATE (Singleton)
// ═══════════════════════════════════════════════════════════════════════════════

let localLLMState: LocalLLMState = {
  isLoading: false,
  isReady: false,
  modelSize: 0,
  error: null,
  supportsWebGPU: false,
};

let llmInstance: any = null;
let initPromise: Promise<boolean> | null = null;

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL LLM INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize Local LLM (MediaPipe Gemma)
 * Call this early to pre-warm the model
 */
export const initializeLocalLLM = async (): Promise<boolean> => {
  if (initPromise) return initPromise;
  if (localLLMState.isReady) return true;
  
  initPromise = (async () => {
    try {
      localLLMState.isLoading = true;
      
      // Check WebGPU support
      const hasWebGPU = await detectWebGPUSupport();
      localLLMState.supportsWebGPU = hasWebGPU;
      
      if (!hasWebGPU) {
        console.log('[LocalLLM] ⚠️ WebGPU not supported, using scripted fallback');
        localLLMState.isLoading = false;
        localLLMState.error = 'WebGPU not supported';
        initPromise = null; // BUG FIX: Clear promise on failure to allow retry
        return false;
      }
      
      // Platform check
      const platform = detectPlatform();
      if (!platform.canRunLocalLLM) {
        console.log(`[LocalLLM] ⚠️ Platform ${platform.os}/${platform.browser} cannot run local LLM`);
        localLLMState.isLoading = false;
        localLLMState.error = `${platform.os} does not support local LLM`;
        initPromise = null; // BUG FIX: Clear promise on failure to allow retry
        return false;
      }
      
      console.log('[LocalLLM] 🚀 Initializing MediaPipe GenAI...');
      
      // Dynamic import to avoid loading on unsupported platforms
      const { FilesetResolver, LlmInference } = await import('@mediapipe/tasks-genai');
      
      // Initialize fileset
      const genaiFileset = await FilesetResolver.forGenAiTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm'
      );
      
      // Load Gemma 2B model
      // Note: This downloads ~1.5GB on first load
      llmInstance = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/jmstore/kaggleweb/grader/g2b-it-gpu-int4.bin',
        },
        maxTokens: 512,
        topK: 40,
        temperature: 0.7,
        randomSeed: Date.now(),
      });
      
      localLLMState.isReady = true;
      localLLMState.isLoading = false;
      localLLMState.modelSize = 1500; // ~1.5GB
      
      console.log('[LocalLLM] ✅ Local LLM ready');
      // BUG FIX: Clear initPromise on success so future calls don't return stale promise
      initPromise = null;
      return true;
      
    } catch (err) {
      console.error('[LocalLLM] ❌ Initialization failed:', err);
      localLLMState.isLoading = false;
      localLLMState.error = err instanceof Error ? err.message : 'Unknown error';
      initPromise = null; // Clear promise to allow retry
      return false;
    }
  })();
  
  return initPromise;
};

/**
 * Generate response using Local LLM
 */
const generateLocalResponse = async (
  prompt: string,
  context?: LLMContext
): Promise<LLMResponse | null> => {
  if (!llmInstance || !localLLMState.isReady) {
    return null;
  }
  
  try {
    const startTime = performance.now();
    
    // Build system context
    const systemPrompt = buildSystemPrompt(context);
    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}\n\nZoe:`;
    
    // Generate response
    const response = await llmInstance.generateResponse(fullPrompt);
    
    const latencyMs = performance.now() - startTime;
    
    // Clean up response
    const cleanedResponse = cleanLLMResponse(response);
    
    return {
      text: cleanedResponse,
      provider: 'local',
      latencyMs,
      confidence: 0.75, // Local LLM confidence
      cached: false,
    };
    
  } catch (err) {
    console.error('[LocalLLM] Generation error:', err);
    return null;
  }
};

const buildSystemPrompt = (context?: LLMContext): string => {
  const greeting = getTimeBasedGreeting();
  const name = context?.userNickname || context?.userName || 'friend';
  
  return `You are Zoe, a warm, caring AI companion. You speak naturally, like a close friend.
Current time: ${greeting}
User's name: ${name}
Keep responses concise (1-3 sentences) and conversational.
Never mention being an AI unless directly asked.
Show genuine interest in the user's wellbeing.`;
};

const cleanLLMResponse = (response: string): string => {
  return response
    .replace(/^Zoe:\s*/i, '')
    .replace(/^Assistant:\s*/i, '')
    .replace(/\n\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN API: GENERATE RESPONSE (FALLBACK CHAIN)
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateOptions {
  cloudFn?: (prompt: string) => Promise<string>;
  context?: LLMContext;
  forceLocal?: boolean;
  forceScripted?: boolean;
  timeout?: number;
}

/**
 * Generate AI response with automatic fallback chain:
 * Cloud → Local LLM → Scripted
 */
export const generateResponse = async (
  prompt: string,
  options: GenerateOptions = {}
): Promise<LLMResponse> => {
  const {
    cloudFn,
    context,
    forceLocal = false,
    forceScripted = false,
    timeout = 10000,
  } = options;
  
  const startTime = performance.now();
  const network = checkNetworkStatus();
  
  // ═══════════════════════════════════════════════════════════════════════
  // PATH 1: SCRIPTED (forced or as final fallback)
  // ═══════════════════════════════════════════════════════════════════════
  if (forceScripted) {
    console.log('[LLM] 📜 Using scripted response (forced)');
    return findScriptedResponse(prompt, context) || {
      text: "I'm here, listening. Tell me more.",
      provider: 'scripted',
      latencyMs: 1,
      confidence: 0.3,
      cached: false,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // PATH 2: CLOUD (if online and not forced local)
  // ═══════════════════════════════════════════════════════════════════════
  if (network.isOnline && !forceLocal && cloudFn) {
    try {
      console.log('[LLM] ☁️ Trying cloud brain...');
      
      const cloudPromise = cloudFn(prompt);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Cloud timeout')), timeout)
      );
      
      const cloudResponse = await Promise.race([cloudPromise, timeoutPromise]);
      
      return {
        text: cloudResponse,
        provider: 'cloud',
        latencyMs: performance.now() - startTime,
        confidence: 0.95,
        cached: false,
      };
      
    } catch (err) {
      console.warn('[LLM] ⚠️ Cloud failed, falling back to local:', err);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // PATH 3: LOCAL LLM (if available)
  // ═══════════════════════════════════════════════════════════════════════
  // Only attempt local LLM if: ready, OR (supports WebGPU AND no previous error AND not loading)
  const shouldTryLocalLLM = localLLMState.isReady || 
    (localLLMState.supportsWebGPU && !localLLMState.error && !localLLMState.isLoading);
  
  if (shouldTryLocalLLM) {
    // Try to initialize if not ready
    if (!localLLMState.isReady && !localLLMState.isLoading) {
      await initializeLocalLLM();
    }
    
    if (localLLMState.isReady) {
      console.log('[LLM] 🧠 Using local LLM...');
      const localResponse = await generateLocalResponse(prompt, context);
      
      if (localResponse) {
        return localResponse;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // PATH 4: SCRIPTED FALLBACK (always available)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('[LLM] 📜 Using scripted fallback');
  return findScriptedResponse(prompt, context) || {
    text: "I'm in simple mode right now, but I'm still here for you. What would you like to talk about?",
    provider: 'scripted',
    latencyMs: performance.now() - startTime,
    confidence: 0.3,
    cached: false,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current LLM engine status
 */
export const getLLMStatus = (): {
  localReady: boolean;
  localLoading: boolean;
  supportsWebGPU: boolean;
  modelSizeMB: number;
  error: string | null;
  platform: { os: string; browser: string; canRunLocalLLM: boolean };
} => {
  return {
    localReady: localLLMState.isReady,
    localLoading: localLLMState.isLoading,
    supportsWebGPU: localLLMState.supportsWebGPU,
    modelSizeMB: localLLMState.modelSize,
    error: localLLMState.error,
    platform: detectPlatform(),
  };
};

/**
 * Cleanup LLM resources
 */
export const cleanupLocalLLM = (): void => {
  if (llmInstance) {
    try {
      llmInstance.close?.();
    } catch {
      // Ignore cleanup errors
    }
    llmInstance = null;
  }
  
  localLLMState = {
    isLoading: false,
    isReady: false,
    modelSize: 0,
    error: null,
    supportsWebGPU: false,
  };
  
  initPromise = null;
  console.log('[LocalLLM] 🧹 Cleaned up');
};

/**
 * Pre-warm the LLM for faster first response
 */
export const prewarmLocalLLM = (): void => {
  // Start initialization in background
  initializeLocalLLM().catch(() => {
    // Silently fail - will use scripted fallback
  });
};
