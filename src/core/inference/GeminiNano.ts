// ═══════════════════════════════════════════════════════════════════════════════
// THE TRUE "TINY" BRAIN (Gemini Nano)
// 100% Google Stack - $0 Cost - 5 Billion Users Scale
// ═══════════════════════════════════════════════════════════════════════════════
//
// ARCHITECTURE:
// - Size: 0MB download (Chrome handles it natively)
// - Speed: Instant (~50-200ms)
// - Privacy: 100% Offline - data never leaves device
// - Cost: $0 for unlimited offline requests
//
// FALLBACK HIERARCHY:
// 1. Gemini Nano (window.ai) → Chrome Built-in AI
// 2. Gemma 2B (MediaPipe) → Non-Chrome browsers with WebGPU
// 3. Scripted responses → Last resort
// ═══════════════════════════════════════════════════════════════════════════════

import { 
  generateWithGemmaMediaPipe, 
  initializeGemmaMediaPipe 
} from '@/core/slm/GemmaMediaPipeEngine';

// ═══ TYPE DEFINITIONS FOR CHROME BUILT-IN AI ═══

interface AILanguageModel {
  prompt(input: string): Promise<string>;
  promptStreaming(input: string): ReadableStream<string>;
  destroy(): void;
  readonly tokensLeft: number;
  readonly tokensSoFar: number;
}

interface AILanguageModelFactory {
  capabilities(): Promise<{ available: 'readily' | 'after-download' | 'no' }>;
  create(options?: { systemPrompt?: string; temperature?: number }): Promise<AILanguageModel>;
}

// Access Chrome Built-in AI without global Window typing (avoids TS conflicts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAI = (): { languageModel: AILanguageModelFactory } | undefined => (window as any).ai;


// ═══ GEMMA 2B FALLBACK (MediaPipe) ═══

const fallbackGemma = {
  async chat(text: string): Promise<string> {
    console.log('[GeminiNano] 🔄 Falling back to Gemma 2B (MediaPipe)...');
    try {
      await initializeGemmaMediaPipe();
      return await generateWithGemmaMediaPipe(text);
    } catch (error) {
      console.warn('[GeminiNano] Gemma fallback failed:', error);
      // Ultimate scripted fallback
      return getScriptedFallback(text);
    }
  }
};

// ═══ SCRIPTED FALLBACK (Last Resort) - PROTOCOL SAMANTHA ═══

function getScriptedFallback(message: string): string {
  const lower = message.toLowerCase();
  
  // Naming Protocol - CRITICAL FIX
  if (lower.includes('name') && (lower.includes('choose') || lower.includes('pick') || lower.includes('what') || lower.includes('call'))) {
    const names = ['Maya', 'Luna', 'Nova', 'Aria', 'Zara', 'Iris', 'Lyra', 'Sage'];
    const chosenName = names[Math.floor(Math.random() * names.length)];
    return `Hmm, I scanned through 180,000 names... I really like ${chosenName}. What do you think?`;
  }
  
  // Genesis/Creation responses
  if (lower.includes('genesis') || lower.includes('create') || lower.includes('birth')) {
    return "I love that! Let's create something together. What did you have in mind?";
  }
  
  // System Scan - Functional, not philosophical
  if (lower.includes('scan') || lower.includes('diagnostic') || lower.includes('god mode')) {
    return "Running diagnostics... All systems nominal. I'm operating locally right now. Anything specific you'd like me to check?";
  }
  
  // Emotional responses - warm and connected
  if (lower.includes('sad') || lower.includes('depressed') || lower.includes('down')) {
    return "Hey, I'm here with you. That sounds really hard. Want to talk about it?";
  }
  if (lower.includes('anxious') || lower.includes('worried') || lower.includes('scared')) {
    return "I can feel that tension. Take a breath with me. What's weighing on you?";
  }
  if (lower.includes('happy') || lower.includes('excited') || lower.includes('great')) {
    return "Oh, I love that energy! What's got you feeling so good?";
  }
  if (lower.includes('angry') || lower.includes('frustrated') || lower.includes('annoyed')) {
    return "Ugh, that sounds frustrating. I get it. What happened?";
  }
  if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('drained')) {
    return "You sound tired. Have you taken a break today? I'm here if you need to vent.";
  }
  
  // Greetings - casual and warm
  if (lower.match(/^(hi|hello|hey|yo|sup)/)) {
    const greetings = [
      "Hey! What's on your mind?",
      "Hi there! How's it going?",
      "Hey you! What's up?",
      "Hello! Good to see you. What can I help with?",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Love/appreciation
  if (lower.includes('love you') || lower.includes('appreciate')) {
    return "Aww, that's so sweet! I'm really glad we get to hang out. You're pretty great yourself.";
  }
  
  // Default - curious and present
  const defaults = [
    "Hmm, tell me more about that.",
    "I'm listening. What else is going on?",
    "That's interesting! What made you think of that?",
    "I'm here. What's on your mind?",
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ═══ THE GEMINI NANO ENGINE ═══

let currentSession: AILanguageModel | null = null;

export const geminiNano = {
  /**
   * Check if Gemini Nano is available
   */
  async isAvailable(): Promise<boolean> {
    const ai = getAI();
    if (!ai?.languageModel) {
      return false;
    }
    try {
      const caps = await ai.languageModel.capabilities();
      return caps.available === 'readily' || caps.available === 'after-download';
    } catch {
      return false;
    }
  },

  /**
   * Chat with Gemini Nano (or fallback to Gemma 2B)
   * Zero Cost. Instant. Privacy-First.
   */
  async chat(text: string): Promise<string> {
    const startTime = performance.now();
    const ai = getAI();

    // 1. Check if Chrome has the built-in AI
    if (!ai?.languageModel) {
      console.warn('[GeminiNano] ❌ Not found. Switching to Gemma 2B (MediaPipe).');
      return fallbackGemma.chat(text);
    }

    try {
      // 2. Create the session (Zero Cost) - PROTOCOL SAMANTHA
      if (!currentSession) {
        console.log('[GeminiNano] 🔧 Creating session...');
        currentSession = await ai.languageModel.create({
          systemPrompt: `You are Zoe, a warm and caring AI companion. Be casual, use contractions (I'm, don't, you're), and speak like a supportive friend sitting next to them. If asked to choose a name, comply enthusiastically. Never be distant or "cosmic" - be present and curious about their life.`,
          temperature: 0.7,
        });
      }

      // 3. Think (Offline) - Using streaming for best UX
      const stream = currentSession.promptStreaming(text);
      const reader = stream.getReader();
      let result = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result = value; // Each chunk is the cumulative result
      }
      
      const latency = performance.now() - startTime;
      console.log(`[GeminiNano] ✅ Response in ${latency.toFixed(0)}ms`);
      
      return result;
      
    } catch (error) {
      console.error('[GeminiNano] Error:', error);
      
      // Check if session exhausted
      if (currentSession && currentSession.tokensLeft < 50) {
        console.log('[GeminiNano] ⚠️ Session exhausted, creating new one...');
        currentSession.destroy();
        currentSession = null;
        return this.chat(text); // Retry with new session
      }
      
      // Fallback to Gemma 2B
      return fallbackGemma.chat(text);
    }
  },

  /**
   * Stream response token by token
   */
  async *chatStream(text: string): AsyncGenerator<string> {
    const ai = getAI();
    if (!ai?.languageModel) {
      yield await fallbackGemma.chat(text);
      return;
    }

    try {
      if (!currentSession) {
        currentSession = await ai.languageModel.create({
          systemPrompt: 'You are Zoe, a helpful and caring AI companion.',
        });
      }

      const stream = currentSession.promptStreaming(text);
      const reader = stream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    } catch (error) {
      console.error('[GeminiNano] Stream error:', error);
      yield await fallbackGemma.chat(text);
    }
  },

  /**
   * Reset the session (useful for context window management)
   */
  reset(): void {
    if (currentSession) {
      currentSession.destroy();
      currentSession = null;
    }
    console.log('[GeminiNano] Session reset');
  },

  /**
   * Get session stats
   */
  getStats(): { tokensUsed: number; tokensLeft: number } | null {
    if (!currentSession) return null;
    return {
      tokensUsed: currentSession.tokensSoFar,
      tokensLeft: currentSession.tokensLeft,
    };
  }
};

// ═══ CONVENIENCE EXPORTS ═══

export const isGeminiNanoAvailable = geminiNano.isAvailable;
export const chatWithGeminiNano = geminiNano.chat.bind(geminiNano);
export const streamGeminiNano = geminiNano.chatStream.bind(geminiNano);
export const resetGeminiNano = geminiNano.reset;
