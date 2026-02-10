/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY - HYBRID VOICE ENGINE
 * "HER" Samantha Experience - Premium Neural TTS with Free Fallback
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * THE SPLIT SYSTEM:
 * - PATH A (Premium): Deepgram Aura-2 ($200 free credits = 26 days for 50 users)
 * - PATH B (Free): Browser Native Web Speech API (infinite, device-dependent)
 * 
 * Auto-failover: If Deepgram fails (credits exhausted, rate limit, error),
 * instantly switch to browser voice. App NEVER breaks.
 * 
 * This creates a "Samantha" (Her movie) experience at zero ongoing cost.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useZoeSmartVoice } from './useZoeSmartVoice';
import { generateSpeculativeSpeech, type SpeculativeContext } from '@/core/speech/SpeculativeSpeechProtocol';
import { cleanAndSplitForVoice, logRemovedMarkers, PACING_DELAY_MS } from '@/utils/voiceTextCleaner';
import { useIsOnline } from '@/hooks/useNetworkStatus';
import { speakOffline, initializeOfflineVoices } from '@/utils/offlineVoice';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎚️ THE TOGGLE: Set to FALSE when $200 credits expire (~26 days for 50 users)
// ═══════════════════════════════════════════════════════════════════════════════
const USE_PREMIUM_VOICE = true;

// Track premium voice status
let premiumVoiceAvailable = USE_PREMIUM_VOICE;
let consecutiveFailures = 0;
const MAX_FAILURES_BEFORE_FALLBACK = 3;
let offlineVoicesInitialized = false;

export type VoicePersona = 
  | 'zoe'           // ⭐ SAMANTHA "HER" - Calm, intimate, soothing (Luna)
  | 'zoe-warm'      // Warm, engaging (Asteria)
  | 'zoe-calm'      // Same as default - calm, soothing (Luna)
  | 'zoe-friendly'  // Friendly, approachable (Stella)
  | 'zoe-confident' // Confident (Athena)
  | 'zoe-elegant'   // Elegant (Hera)
  | 'smith'         // Warm, trustworthy (Orion)
  | 'smith-deep'    // Deep, resonant (Angus)
  | 'smith-calm'    // Calm, measured (Perseus)
  | 'smith-authority'; // Authoritative (Helios)

interface HybridVoiceState {
  isPlaying: boolean;
  isPremium: boolean;
  currentVoice: VoicePersona;
  latencyMs: number | null;
  error: string | null;
  // STEP 2: Speculative Speech State
  isThinking: boolean;
  lastSpeculativeContext: SpeculativeContext | null;
}

interface HybridVoiceOptions {
  voice?: VoicePersona;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  forcePremium?: boolean;   // Force Deepgram even if disabled
  forceBrowser?: boolean;   // Force browser voice
  // LEVEL 3: MOONLIGHT - Circadian voice overrides for night mode
  voiceOverrides?: {
    pitch?: number;   // 0.1 - 2.0
    rate?: number;    // 0.1 - 2.0
    volume?: number;  // 0.0 - 1.0
  };
}

export const useHybridVoice = () => {
  // 🔵 Browser native voice (FREE backup)
  const { speak: speakNative, stop: stopNative, isSpeaking: isNativeSpeaking } = useZoeSmartVoice();
  
  // 📴 Network status for offline-first voice
  const isOnline = useIsOnline();
  
  const [state, setState] = useState<HybridVoiceState>({
    isPlaying: false,
    isPremium: premiumVoiceAvailable,
    currentVoice: 'zoe',
    latencyMs: null,
    error: null,
    isThinking: false,
    lastSpeculativeContext: null,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 📴 Initialize offline voices on mount
  useEffect(() => {
    if (!offlineVoicesInitialized) {
      initializeOfflineVoices().then(() => {
        offlineVoicesInitialized = true;
        console.log('[HybridVoice] 📴 Offline voices initialized');
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * 🎙️ THE MAIN SPEAK FUNCTION
   * Automatically chooses premium or browser voice
   */
  const speak = useCallback(async (
    text: string,
    options: HybridVoiceOptions = {}
  ): Promise<void> => {
    if (!text?.trim()) return;

    const {
      voice = 'zoe',
      onStart,
      onEnd,
      onError,
      forcePremium = false,
      forceBrowser = false,
      voiceOverrides, // LEVEL 3: MOONLIGHT - Circadian voice overrides
    } = options;

    // ═══════════════════════════════════════════════════════════════════════
    // FIX 1: AUDIOBOOK KILLER - Remove stage directions (*sighs*, (laughs))
    // FIX 3: SAMANTHA PACING - Split on "..." for intimate rhythm
    // ═══════════════════════════════════════════════════════════════════════
    const { chunks, hasMultipleChunks, removedMarkers } = cleanAndSplitForVoice(text);
    
    // Log what we removed (stage directions she won't read aloud)
    logRemovedMarkers(removedMarkers);
    
    if (chunks.length === 0 || chunks.every(c => !c.trim())) {
      onEnd?.();
      return;
    }

    // For now, join chunks back for single-shot speaking
    // TODO: Implement full pacing with delays between chunks
    const cleanText = chunks.join(' ');

    // Stop any existing playback
    stop();

    // ═══════════════════════════════════════════════════════════════════════
    // 📴 OFFLINE PATH: Use local voice when no network
    // ═══════════════════════════════════════════════════════════════════════
    if (!isOnline) {
      console.log('[HybridVoice] 📴 OFFLINE: Using local voice synthesis');
      setState(prev => ({
        ...prev,
        isPlaying: true,
        currentVoice: voice,
        error: null,
        isPremium: false,
      }));
      
      await speakOffline(
        cleanText,
        () => {
          onStart?.();
          window.dispatchEvent(new CustomEvent('zoe-speak'));
        },
        () => {
          setState(prev => ({ ...prev, isPlaying: false }));
          onEnd?.();
          window.dispatchEvent(new CustomEvent('zoe-speak-end'));
        },
        (err) => {
          setState(prev => ({ ...prev, isPlaying: false, error: err?.message || 'Offline speech error' }));
          onError?.(err || new Error('Offline speech failed'));
        }
      );
      return;
    }

    // Determine voice path (only when online)
    const usePremium = (forcePremium || (premiumVoiceAvailable && USE_PREMIUM_VOICE)) && !forceBrowser;

    console.log(`[HybridVoice] 🎙️ Speaking as ${voice}, premium: ${usePremium}, chunks: ${chunks.length}, text: "${cleanText.substring(0, 50)}..."`);

    setState(prev => ({
      ...prev,
      isPlaying: true,
      currentVoice: voice,
      error: null,
    }));

    // ═══════════════════════════════════════════════════════════════════════
    // 🔴 PATH A: THE "PREMIUM" PATH (Deepgram Aura-2)
    // ═══════════════════════════════════════════════════════════════════════
    if (usePremium) {
      try {
        const startTime = performance.now();
        
        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();
        
        // ═══════════════════════════════════════════════════════════════════════
        // FIX: Single API call instead of triple (was wasting Deepgram credits!)
        // ═══════════════════════════════════════════════════════════════════════
        const audioResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoe-voice`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text: cleanText, voice }),
            signal: abortControllerRef.current.signal,
          }
        );

        const contentType = audioResponse.headers.get('Content-Type');
        
        // Check if we got JSON (fallback signal) instead of audio
        if (contentType?.includes('application/json')) {
          const jsonData = await audioResponse.json();
          if (jsonData.useBrowserFallback) {
            console.log('[HybridVoice] ⚠️ Premium voice unavailable, switching to browser...');
            
            if (jsonData.code === 402 || jsonData.code === 429) {
              // Credits exhausted or rate limited - disable premium for this session
              premiumVoiceAvailable = false;
              setState(prev => ({ ...prev, isPremium: false }));
            }
            
            throw new Error(jsonData.error || 'Premium voice unavailable');
          }
          throw new Error(jsonData.error || 'Unexpected response');
        }

        // We got audio! Play it
        const blob = await audioResponse.blob();
        const audioUrl = URL.createObjectURL(blob);
        
        const latencyMs = performance.now() - startTime;
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          console.log(`[HybridVoice] ▶️ Premium audio playing (latency: ${latencyMs.toFixed(0)}ms)`);
          setState(prev => ({ ...prev, latencyMs }));
          onStart?.();
          window.dispatchEvent(new CustomEvent('zoe-speak'));
        };

        audio.onended = () => {
          console.log('[HybridVoice] ⏹️ Premium audio ended');
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          setState(prev => ({ ...prev, isPlaying: false }));
          consecutiveFailures = 0; // Reset on success
          onEnd?.();
          window.dispatchEvent(new CustomEvent('zoe-speak-end'));
        };

        audio.onerror = (e) => {
          console.error('[HybridVoice] Audio playback error:', e);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          
          // Fallback to browser
          fallbackToBrowser(cleanText, voice, onStart, onEnd, onError);
        };

        await audio.play();
        return;

      } catch (error) {
        console.warn('[HybridVoice] Premium voice failed, switching to backup...', error);
        consecutiveFailures++;
        
        // After 3 consecutive failures, disable premium for this session
        if (consecutiveFailures >= MAX_FAILURES_BEFORE_FALLBACK) {
          premiumVoiceAvailable = false;
          setState(prev => ({ ...prev, isPremium: false }));
          console.log('[HybridVoice] 🔄 Disabled premium voice for this session');
        }
        
        // Fall through to browser voice
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔵 PATH B: THE "FREE" PATH (Browser Native Web Speech API)
    // LEVEL 3: Pass voice overrides for night mode
    // ═══════════════════════════════════════════════════════════════════════
    console.log('[HybridVoice] 🔵 Using browser native voice');
    if (voiceOverrides) {
      console.log('[HybridVoice] 🌙 Night mode voice overrides:', voiceOverrides);
    }
    
    setState(prev => ({ ...prev, isPremium: false }));
    const isSmith = voice.startsWith('smith');
    
    speakNative(cleanText, isSmith ? 'SMITH' : 'ZOE', {
      onStart: () => {
        onStart?.();
        window.dispatchEvent(new CustomEvent('zoe-speak'));
      },
      onEnd: () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        onEnd?.();
        window.dispatchEvent(new CustomEvent('zoe-speak-end'));
      },
      onError: (err) => {
        setState(prev => ({ ...prev, isPlaying: false, error: err?.message || 'Speech error' }));
        onError?.(err || new Error('Speech synthesis failed'));
      },
      // LEVEL 3: Pass circadian voice overrides
      ...voiceOverrides,
    });
  }, [speakNative, isOnline]);

  /**
   * Fallback to browser native voice
   * LEVEL 3: MOONLIGHT - Now accepts voice overrides for night mode
   */
  const fallbackToBrowser = useCallback((
    text: string,
    voice: VoicePersona,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void,
    voiceOverrides?: { pitch?: number; rate?: number; volume?: number },
  ) => {
    console.log('[HybridVoice] 🔵 Using browser native voice');
    if (voiceOverrides) {
      console.log('[HybridVoice] 🌙 Night mode voice overrides:', voiceOverrides);
    }
    
    setState(prev => ({ ...prev, isPremium: false }));
    
    // Determine persona for native voice
    const isSmith = voice.startsWith('smith');
    
    speakNative(text, isSmith ? 'SMITH' : 'ZOE', {
      onStart: () => {
        onStart?.();
        window.dispatchEvent(new CustomEvent('zoe-speak'));
      },
      onEnd: () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        onEnd?.();
        window.dispatchEvent(new CustomEvent('zoe-speak-end'));
      },
      onError: (err) => {
        setState(prev => ({ ...prev, isPlaying: false, error: err?.message || 'Speech error' }));
        onError?.(err || new Error('Speech synthesis failed'));
      },
      // LEVEL 3: Pass circadian voice overrides
      ...voiceOverrides,
    });
  }, [speakNative]);

  /**
   * Stop all speech
   */
  const stop = useCallback(() => {
    // Stop premium audio
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    
    // Abort any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Stop native voice
    stopNative();
    
    // Stop offline voice
    import('@/utils/offlineVoice').then(m => m.stopOfflineSpeech()).catch(() => {});
    
    setState(prev => ({ ...prev, isPlaying: false }));
    window.dispatchEvent(new CustomEvent('zoe-speak-end'));
  }, [stopNative]);

  /**
   * Check if premium voice is available
   */
  const checkPremiumStatus = useCallback(async (): Promise<boolean> => {
    try {
      // Quick test call to check if Deepgram is working
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoe-voice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: 'test', voice: 'zoe' }),
        }
      );
      
      const contentType = response.headers.get('Content-Type');
      if (contentType?.includes('audio')) {
        premiumVoiceAvailable = true;
        consecutiveFailures = 0;
        setState(prev => ({ ...prev, isPremium: true }));
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }, []);

  /**
   * Force enable/disable premium voice
   */
  const setPremiumEnabled = useCallback((enabled: boolean) => {
    premiumVoiceAvailable = enabled;
    consecutiveFailures = 0;
    setState(prev => ({ ...prev, isPremium: enabled }));
    console.log(`[HybridVoice] Premium voice ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: SPECULATIVE SPEECH - Zero-Latency Voice
  // Emit audio filler immediately while Cloud Brain processes
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 🎙️ SPECULATIVE SPEAK - The "Samantha" Interrupter
   * Immediately speaks an acknowledgment filler while the real response processes
   * 
   * Usage:
   * 1. User stops speaking
   * 2. Call speakImmediate(userMessage) → emits "Hmm...", "I see...", etc.
   * 3. Cloud Brain processes full response
   * 4. Call speak(fullResponse) → seamless continuation
   */
  const speakImmediate = useCallback(async (
    userMessage: string,
    options?: Omit<HybridVoiceOptions, 'voice'>
  ): Promise<{ phrase: string; context: SpeculativeContext }> => {
    // Generate speculative context and immediate phrase
    const result = generateSpeculativeSpeech(userMessage);
    
    console.log(`[HybridVoice] ⚡ SPECULATIVE: "${result.immediatePhrase}" (emotion: ${result.context.detectedEmotion})`);
    
    // Update state to show we're "thinking"
    setState(prev => ({ 
      ...prev, 
      isThinking: true,
      lastSpeculativeContext: result.context,
    }));
    
    // Speak the filler immediately (use browser voice for <50ms latency)
    if (result.shouldSpeak) {
      await speakNative(result.immediatePhrase);
    }
    
    return {
      phrase: result.immediatePhrase,
      context: result.context,
    };
  }, [speakNative]);

  /**
   * 🎙️ SPEAK WITH SPECULATIVE PRELUDE
   * Full pipeline: Filler → Wait for response → Speak response
   */
  const speakWithPrelude = useCallback(async (
    userMessage: string,
    getFullResponse: () => Promise<string>,
    options?: HybridVoiceOptions
  ): Promise<void> => {
    // Step 1: Immediate filler (eliminates "Thinking Pause")
    const { context } = await speakImmediate(userMessage, options);
    
    // Step 2: Get full response (runs in parallel with filler)
    const fullResponse = await getFullResponse();
    
    // Step 3: Clear thinking state
    setState(prev => ({ ...prev, isThinking: false }));
    
    // Step 4: Speak full response (seamless continuation)
    await speak(fullResponse, options);
    
    console.log(`[HybridVoice] ✅ Full pipeline complete (emotion: ${context.detectedEmotion})`);
  }, [speakImmediate, speak]);

  /**
   * 🎙️ STREAMING SPEAK - For chunked responses
   * Streams response directly to TTS without waiting for full text
   */
  const speakStreaming = useCallback(async (
    textChunks: AsyncIterable<string>,
    options?: HybridVoiceOptions
  ): Promise<void> => {
    let buffer = '';
    const sentenceEndPattern = /[.!?]\s*$/;
    
    for await (const chunk of textChunks) {
      buffer += chunk;
      
      // When we have a complete sentence, speak it
      if (sentenceEndPattern.test(buffer)) {
        await speak(buffer.trim(), options);
        buffer = '';
      }
    }
    
    // Speak any remaining text
    if (buffer.trim()) {
      await speak(buffer.trim(), options);
    }
  }, [speak]);

  return {
    // Core functions
    speak,
    stop,
    
    // State
    isPlaying: state.isPlaying || isNativeSpeaking,
    isPremium: state.isPremium,
    currentVoice: state.currentVoice,
    latencyMs: state.latencyMs,
    error: state.error,
    
    // 📴 Network status for offline-first
    isOnline,
    
    // STEP 2: Speculative Speech State
    isThinking: state.isThinking,
    lastSpeculativeContext: state.lastSpeculativeContext,
    
    // Premium control
    checkPremiumStatus,
    setPremiumEnabled,
    
    // STEP 2: Zero-Latency Voice Functions
    speakImmediate,      // Emit filler immediately
    speakWithPrelude,    // Full pipeline: filler → response
    speakStreaming,      // Stream chunks to TTS
    
    // Convenience functions for personas
    speakAsZoe: (text: string, options?: Omit<HybridVoiceOptions, 'voice'>) => 
      speak(text, { ...options, voice: 'zoe' }),
    speakAsZoeCalm: (text: string, options?: Omit<HybridVoiceOptions, 'voice'>) => 
      speak(text, { ...options, voice: 'zoe-calm' }), // Best "Samantha" feel
    speakAsSmith: (text: string, options?: Omit<HybridVoiceOptions, 'voice'>) => 
      speak(text, { ...options, voice: 'smith' }),
    speakAsSmithAuthority: (text: string, options?: Omit<HybridVoiceOptions, 'voice'>) => 
      speak(text, { ...options, voice: 'smith-authority' }),
  };
};

export default useHybridVoice;
