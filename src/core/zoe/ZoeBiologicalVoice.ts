/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY - BIOLOGICAL VOICE PROTOCOL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ZERO-COST browser-native voice synthesis - NO API KEYS REQUIRED
 * Uses Web Speech API (SpeechSynthesis) for TTS
 * Uses Web Speech API (SpeechRecognition) for STT
 * 
 * ARCHITECTURE OVERVIEW:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                     ZOE INFINITY VOICE ARCHITECTURE                         │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
 * │  │  User Speaks    │ ──▶ │ SpeechRecog API │ ──▶ │  Text Transcript │       │
 * │  │  (Microphone)   │     │ (Browser Native)│     │                  │       │
 * │  └─────────────────┘     └─────────────────┘     └────────┬────────┘       │
 * │                                                           │                 │
 * │                                                           ▼                 │
 * │                                    ┌─────────────────────────────────────┐  │
 * │                                    │      ZOE DHF ORCHESTRATOR           │  │
 * │                                    │  • Parent Zoe (Universal Brain)     │  │
 * │                                    │  • Sub-Zoe Swarm (10 Specialists)   │  │
 * │                                    │  • Lovable AI Gateway (Zero Cost)   │  │
 * │                                    └────────────────┬────────────────────┘  │
 * │                                                     │                       │
 * │                                                     ▼                       │
 * │  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
 * │  │  Audio Output   │ ◀── │ SpeechSynth API │ ◀── │  Zoe Response   │       │
 * │  │  (Speaker)      │     │ (Browser Native)│     │                  │       │
 * │  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * VOICE SYNTHESIS COMPONENTS:
 * 
 * 1. src/utils/zoeVoice.ts - Core TTS engine with:
 *    • Chrome keep-alive workaround (prevents 15s cutoff)
 *    • Text chunking for long responses
 *    • Proper async cancellation
 *    • State event dispatching
 * 
 * 2. src/hooks/useNativeZoeVoice.ts - React hook with:
 *    • Queue management
 *    • Priority voice selection (Samantha > Google US > Microsoft Zira)
 *    • Pause/Resume/Stop controls
 * 
 * 3. src/hooks/useZoeVoiceCommands.ts - Voice command processing:
 *    • Pattern matching for 100+ commands
 *    • NLP fallback for natural language
 *    • Fuzzy matching for variations
 * 
 * VOICE RECOGNITION COMPONENTS:
 * 
 * 1. src/hooks/useZoeVoiceInput.ts - Voice input handling
 * 2. src/hooks/useVRVoiceCommands.ts - VR-specific voice controls
 * 3. src/components/zoe-infinity/InfinityInput.tsx - Voice input UI
 * 
 * CONNECTION TO DHF CORE:
 * 
 * The Biological Voice connects to Zoe's DHF (Digital Human Fingerprint) through:
 * - ZoeDHFOrchestrator: Routes voice queries to appropriate Sub-Zoe
 * - ParentZoeCore: Validates responses through Reward Model
 * - Lovable AI Gateway: Zero-cost AI inference (no API key needed)
 * 
 * EDGE FUNCTIONS (Backend Voice Processing):
 * 
 * - supabase/functions/zoe-realtime-voice/index.ts
 *   Handles server-side voice processing with Lovable AI
 *   Returns text that is spoken client-side for low latency
 * 
 * - supabase/functions/realtime-voice/index.ts
 *   WebSocket support for streaming voice conversations
 * 
 * ZERO-COST GUARANTEE:
 * All voice synthesis uses browser-native SpeechSynthesis API
 * All voice recognition uses browser-native SpeechRecognition API
 * No third-party TTS/STT APIs are required
 * Works offline for basic voice output
 */

import { 
  speakAsZoe, 
  stopZoeSpeech, 
  pauseZoeSpeech,
  resumeZoeSpeech,
  isZoeSpeaking,
  initializeZoeVoices,
  getZoeSpeechState,
  ZOE_VOICE_CONFIG,
  SMITH_VOICE_CONFIG 
} from '@/utils/zoeVoice';

import { 
  speakAs, 
  setCurrentAssistant,
  getCurrentAssistant,
  VOICE_CONFIGS 
} from '@/utils/assistantVoice';

import { zoeDHFOrchestrator, OrchestratorResponse } from './ZoeDHFOrchestrator';

// ═══════════════════════════════════════════════════════════════════════════════
// BIOLOGICAL VOICE STATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface BiologicalVoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  voiceName: string | null;
  isInitialized: boolean;
  lastTranscript: string | null;
  lastResponse: string | null;
  errorState: string | null;
}

export interface VoiceConversationContext {
  userId?: string;
  location?: { lat: number; lng: number };
  emotionalState?: string;
  currentActivity?: string;
  currentPersona?: 'ZOE' | 'SMITH';
  conversationHistory: Array<{ role: 'user' | 'zoe'; content: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BIOLOGICAL VOICE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

class ZoeBiologicalVoiceEngine {
  private state: BiologicalVoiceState = {
    isListening: false,
    isSpeaking: false,
    isPaused: false,
    voiceName: null,
    isInitialized: false,
    lastTranscript: null,
    lastResponse: null,
    errorState: null,
  };

  private recognition: any = null;
  private context: VoiceConversationContext = {
    conversationHistory: [],
  };

  /**
   * Initialize the Biological Voice engine
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[BiologicalVoice] ═══ INITIALIZING ═══');
      
      // Initialize TTS voices
      await initializeZoeVoices();
      
      const voiceState = getZoeSpeechState();
      this.state.voiceName = voiceState.voiceName;
      this.state.isInitialized = true;
      
      // Initialize STT if available
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        console.log('[BiologicalVoice] STT initialized');
      } else {
        console.warn('[BiologicalVoice] STT not supported');
      }

      console.log('[BiologicalVoice] ✅ Initialization complete');
      console.log(`  - TTS Voice: ${this.state.voiceName}`);
      console.log(`  - STT Available: ${this.recognition !== null}`);
      
      return true;
    } catch (error) {
      console.error('[BiologicalVoice] Initialization error:', error);
      this.state.errorState = 'Failed to initialize voice engine';
      return false;
    }
  }

  /**
   * Speak text using browser-native TTS (ZERO COST)
   * Uses the unified speakAs with persona support from assistantVoice
   */
  speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error?: any) => void,
    persona?: 'ZOE' | 'SMITH'
  ): void {
    if (!text?.trim()) return;
    
    this.state.lastResponse = text;
    this.state.isSpeaking = true;
    
    // Use unified speakAs with persona support
    const assistant = persona === 'SMITH' ? 'Smith' : (this.context.currentPersona === 'SMITH' ? 'Smith' : 'Zoe');
    
    speakAs(
      text,
      assistant,
      () => {
        this.state.isSpeaking = true;
        onStart?.();
        window.dispatchEvent(new CustomEvent('zoe-biological-voice-start', { 
          detail: { persona: assistant } 
        }));
      },
      () => {
        this.state.isSpeaking = false;
        onEnd?.();
        window.dispatchEvent(new CustomEvent('zoe-biological-voice-end'));
      },
      (error) => {
        this.state.isSpeaking = false;
        this.state.errorState = error?.toString() || 'Speech error';
        onError?.(error);
      }
    );
  }

  /**
   * Speak as Zoe (female, bright, quick-witted)
   */
  speakAsZoe(text: string, onStart?: () => void, onEnd?: () => void): void {
    this.speak(text, onStart, onEnd, undefined, 'ZOE');
  }

  /**
   * Speak as Smith (male, deep, authoritative)
   */
  speakAsSmith(text: string, onStart?: () => void, onEnd?: () => void): void {
    this.speak(text, onStart, onEnd, undefined, 'SMITH');
  }

  /**
   * Switch active persona
   */
  switchPersona(persona: 'ZOE' | 'SMITH'): void {
    this.context.currentPersona = persona;
    setCurrentAssistant(persona === 'SMITH' ? 'Smith' : 'Zoe');
    console.log(`[BiologicalVoice] 🔄 Switched to ${persona}`);
  }

  /**
   * Stop current speech
   */
  stop(): void {
    stopZoeSpeech();
    this.state.isSpeaking = false;
    this.state.isPaused = false;
  }

  /**
   * Pause current speech
   */
  pause(): void {
    pauseZoeSpeech();
    this.state.isPaused = true;
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    resumeZoeSpeech();
    this.state.isPaused = false;
  }

  /**
   * Start listening for voice input (ZERO COST)
   */
  startListening(
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ): boolean {
    if (!this.recognition) {
      onError?.('Speech recognition not supported');
      return false;
    }

    try {
      this.recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript;
        const isFinal = lastResult.isFinal;
        
        if (isFinal) {
          this.state.lastTranscript = transcript;
        }
        
        onTranscript(transcript, isFinal);
      };

      this.recognition.onerror = (event: any) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          this.state.errorState = event.error;
          onError?.(event.error);
        }
      };

      this.recognition.onend = () => {
        this.state.isListening = false;
      };

      this.recognition.start();
      this.state.isListening = true;
      console.log('[BiologicalVoice] 🎤 Listening started');
      return true;
    } catch (error) {
      console.error('[BiologicalVoice] Listen error:', error);
      onError?.('Failed to start listening');
      return false;
    }
  }

  /**
   * Stop listening for voice input
   */
  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.state.isListening = false;
      console.log('[BiologicalVoice] 🎤 Listening stopped');
    }
  }

  /**
   * Process voice input through DHF Orchestrator
   */
  async processVoiceQuery(
    transcript: string,
    context?: Partial<VoiceConversationContext>
  ): Promise<OrchestratorResponse> {
    // Update context
    if (context) {
      this.context = { ...this.context, ...context };
    }
    
    // Add to conversation history
    this.context.conversationHistory.push({
      role: 'user',
      content: transcript,
    });

    // Route through DHF Orchestrator
    const response = await zoeDHFOrchestrator.processQuery(transcript, {
      userId: this.context.userId,
      previousContext: this.context.conversationHistory.slice(-5).map(c => c.content),
    });

    // Add Zoe's response to history
    this.context.conversationHistory.push({
      role: 'zoe',
      content: response.content,
    });

    // Keep history manageable
    if (this.context.conversationHistory.length > 20) {
      this.context.conversationHistory = this.context.conversationHistory.slice(-20);
    }

    return response;
  }

  /**
   * Full voice conversation: Listen → Process → Speak
   */
  async converse(
    onListening?: () => void,
    onTranscript?: (text: string) => void,
    onResponse?: (response: OrchestratorResponse) => void,
    onSpeaking?: () => void,
    onComplete?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      onListening?.();
      
      const handleTranscript = async (transcript: string, isFinal: boolean) => {
        if (!isFinal) return;
        
        this.stopListening();
        onTranscript?.(transcript);
        
        // Process through DHF
        const response = await this.processVoiceQuery(transcript);
        onResponse?.(response);
        
        // Speak response
        onSpeaking?.();
        this.speak(
          response.content,
          undefined,
          () => {
            onComplete?.();
            resolve();
          }
        );
      };

      this.startListening(handleTranscript, (error) => {
        console.error('[BiologicalVoice] Conversation error:', error);
        this.speak("I couldn't hear you clearly. Could you try again?", undefined, () => {
          onComplete?.();
          resolve();
        });
      });
    });
  }

  /**
   * Get current state
   */
  getState(): BiologicalVoiceState {
    return {
      ...this.state,
      isSpeaking: isZoeSpeaking(),
    };
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): VoiceConversationContext['conversationHistory'] {
    return [...this.context.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.context.conversationHistory = [];
  }

  /**
   * Set user context
   */
  setContext(context: Partial<VoiceConversationContext>): void {
    this.context = { ...this.context, ...context };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

export const zoeBiologicalVoice = new ZoeBiologicalVoiceEngine();

// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const ZOE_BIOLOGICAL_VOICE_PROTOCOL = {
  name: 'ZOE PROTOCOL: BIOLOGICAL VOICE',
  version: '3.0.0',
  cost: 'ZERO ($0.00)',
  strategy: 'Persona Tuning via Web Speech API physics',
  
  personas: {
    ZOE: {
      gender: 'female',
      pitch: 1.15,  // Bright, optimistic
      rate: 1.05,   // Quick-witted, energetic
      description: 'Warm, empathetic, friendly assistant',
    },
    SMITH: {
      gender: 'male',
      pitch: 0.85,  // Deep, authoritative
      rate: 0.95,   // Calculated, deliberate
      description: 'Tactical, analytical, security-focused',
    },
  },
  
  components: {
    tts: {
      engine: 'Web Speech API (SpeechSynthesis)',
      files: [
        'src/utils/zoeVoice.ts',
        'src/utils/assistantVoice.ts',
      ],
      features: [
        'Persona-based pitch/rate tuning (Zoe/Smith)',
        'Chrome 15s timeout workaround',
        'Text chunking for long responses',
        'Async cancellation',
        'Voice priority selection (Samantha > Google > Zira)',
        'State event dispatching',
        'Auto-detect persona from text content',
      ],
    },
    stt: {
      engine: 'Web Speech API (SpeechRecognition)',
      files: [
        'src/hooks/useZoeVoiceInput.ts',
        'src/hooks/useZoeVoiceCommands.ts',
        'src/hooks/useVRVoiceCommands.ts',
      ],
      features: [
        '100+ voice commands',
        'Natural language processing',
        'Fuzzy matching',
        'Wake word detection',
      ],
    },
    hooks: [
      'useZoeSmartVoice - Plug & Play Biological Voice (Zoe/Smith personas)',
      'useNativeZoeVoice - React hook for TTS',
      'useZoeBiologicalVoice - DHF integration hook',
      'useZoeVoice - Unified voice hook',
      'useZoeVoiceCommands - Command processing',
      'useZoeVoiceInput - Voice input handling',
      'useVRVoiceCommands - VR voice controls',
      'useZoeSovereignVoice - Advanced voice features',
    ],
    edgeFunctions: [
      'zoe-realtime-voice - Server-side voice processing',
      'realtime-voice - WebSocket streaming',
    ],
  },
  
  connection: {
    dhfOrchestrator: 'src/core/zoe/ZoeDHFOrchestrator.ts',
    parentZoe: 'src/core/zoe/ParentZoeCore.ts',
    subZoeSwarm: 'src/core/zoe/SubZoeSwarm.ts',
  },
  
  voiceConfigs: {
    ZOE: ZOE_VOICE_CONFIG,
    SMITH: SMITH_VOICE_CONFIG,
  },
};

export default ZoeBiologicalVoiceEngine;
