/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY - HYBRID VOICE ENGINE
 * Browser-Native Voice with Offline Fallback
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Uses Browser Web Speech API exclusively (zero external dependencies).
 * Auto-fallback to offline voices when network is unavailable.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useZoeSmartVoice } from './useZoeSmartVoice';
import { generateSpeculativeSpeech, type SpeculativeContext } from '@/core/speech/SpeculativeSpeechProtocol';
import { cleanAndSplitForVoice, logRemovedMarkers, PACING_DELAY_MS } from '@/utils/voiceTextCleaner';
import { useIsOnline } from '@/hooks/useNetworkStatus';
import { speakOffline, initializeOfflineVoices, stopOfflineSpeech } from '@/utils/offlineVoice';

let offlineVoicesInitialized = false;

export type VoicePersona = 
  | 'zoe'           // Calm, intimate, soothing
  | 'zoe-warm'      // Warm, engaging
  | 'zoe-calm'      // Same as default
  | 'zoe-friendly'  // Friendly, approachable
  | 'zoe-confident' // Confident
  | 'zoe-elegant'   // Elegant
  | 'smith'         // Warm, trustworthy
  | 'smith-deep'    // Deep, resonant
  | 'smith-calm'    // Calm, measured
  | 'smith-authority'; // Authoritative

interface HybridVoiceState {
  isPlaying: boolean;
  isPremium: boolean;
  currentVoice: VoicePersona;
  latencyMs: number | null;
  error: string | null;
  isThinking: boolean;
  lastSpeculativeContext: SpeculativeContext | null;
}

interface HybridVoiceOptions {
  voice?: VoicePersona;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  forcePremium?: boolean;
  forceBrowser?: boolean;
  voiceOverrides?: {
    pitch?: number;
    rate?: number;
    volume?: number;
  };
}

export const useHybridVoice = () => {
  const { speak: speakNative, stop: stopNative, isSpeaking: isNativeSpeaking } = useZoeSmartVoice();
  const isOnline = useIsOnline();
  
  const [state, setState] = useState<HybridVoiceState>({
    isPlaying: false,
    isPremium: false,
    currentVoice: 'zoe',
    latencyMs: null,
    error: null,
    isThinking: false,
    lastSpeculativeContext: null,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!offlineVoicesInitialized) {
      initializeOfflineVoices().then(() => {
        offlineVoicesInitialized = true;
        console.log('[HybridVoice] 📴 Offline voices initialized');
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }
    };
  }, []);

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
      voiceOverrides,
    } = options;

    const { chunks, removedMarkers } = cleanAndSplitForVoice(text);
    logRemovedMarkers(removedMarkers);
    
    if (chunks.length === 0 || chunks.every(c => !c.trim())) {
      onEnd?.();
      return;
    }

    const cleanText = chunks.join(' ');
    stop();

    // Offline path
    if (!isOnline) {
      console.log('[HybridVoice] 📴 OFFLINE: Using local voice synthesis');
      setState(prev => ({ ...prev, isPlaying: true, currentVoice: voice, error: null, isPremium: false }));
      
      await speakOffline(
        cleanText,
        () => { onStart?.(); window.dispatchEvent(new CustomEvent('zoe-speak')); },
        () => { setState(prev => ({ ...prev, isPlaying: false })); onEnd?.(); window.dispatchEvent(new CustomEvent('zoe-speak-end')); },
        (err) => { setState(prev => ({ ...prev, isPlaying: false, error: err?.message || 'Offline speech error' })); onError?.(err || new Error('Offline speech failed')); }
      );
      return;
    }

    console.log(`[HybridVoice] 🎙️ Speaking as ${voice} (Browser TTS), text: "${cleanText.substring(0, 50)}..."`);

    setState(prev => ({ ...prev, isPlaying: true, currentVoice: voice, error: null, isPremium: false }));

    // Browser Native Web Speech API
    if (voiceOverrides) {
      console.log('[HybridVoice] 🌙 Voice overrides:', voiceOverrides);
    }
    
    const isSmith = voice.startsWith('smith');
    
    speakNative(cleanText, isSmith ? 'SMITH' : 'ZOE', {
      onStart: () => { onStart?.(); window.dispatchEvent(new CustomEvent('zoe-speak')); },
      onEnd: () => { setState(prev => ({ ...prev, isPlaying: false })); onEnd?.(); window.dispatchEvent(new CustomEvent('zoe-speak-end')); },
      onError: (err) => { setState(prev => ({ ...prev, isPlaying: false, error: err?.message || 'Speech error' })); onError?.(err || new Error('Speech synthesis failed')); },
      ...voiceOverrides,
    });
  }, [speakNative, isOnline]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    stopNative();
    stopOfflineSpeech();
    setState(prev => ({ ...prev, isPlaying: false }));
    window.dispatchEvent(new CustomEvent('zoe-speak-end'));
  }, [stopNative]);

  const checkPremiumStatus = useCallback(async (): Promise<boolean> => {
    return false; // No external TTS services
  }, []);

  const setPremiumEnabled = useCallback((_enabled: boolean) => {
    // No-op: no external TTS services
  }, []);

  const speakImmediate = useCallback(async (
    userMessage: string,
    options?: Omit<HybridVoiceOptions, 'voice'>
  ): Promise<{ phrase: string; context: SpeculativeContext }> => {
    const result = generateSpeculativeSpeech(userMessage);
    
    console.log(`[HybridVoice] ⚡ SPECULATIVE: "${result.immediatePhrase}" (emotion: ${result.context.detectedEmotion})`);
    
    setState(prev => ({ ...prev, isThinking: true, lastSpeculativeContext: result.context }));
    
    if (result.shouldSpeak) {
      await speakNative(result.immediatePhrase);
    }
    
    return { phrase: result.immediatePhrase, context: result.context };
  }, [speakNative]);

  const speakWithPrelude = useCallback(async (
    userMessage: string,
    getFullResponse: () => Promise<string>,
    options?: HybridVoiceOptions
  ): Promise<void> => {
    const { context } = await speakImmediate(userMessage, options);
    const fullResponse = await getFullResponse();
    setState(prev => ({ ...prev, isThinking: false }));
    await speak(fullResponse, options);
    console.log(`[HybridVoice] ✅ Full pipeline complete (emotion: ${context.detectedEmotion})`);
  }, [speakImmediate, speak]);

  const speakStreaming = useCallback(async (
    textChunks: AsyncIterable<string>,
    options?: HybridVoiceOptions
  ): Promise<void> => {
    let buffer = '';
    const sentenceEndPattern = /[.!?]\s*$/;
    
    for await (const chunk of textChunks) {
      buffer += chunk;
      if (sentenceEndPattern.test(buffer)) {
        await speak(buffer.trim(), options);
        buffer = '';
      }
    }
    
    if (buffer.trim()) {
      await speak(buffer.trim(), options);
    }
  }, [speak]);

  return {
    speak,
    stop,
    isPlaying: state.isPlaying || isNativeSpeaking,
    isPremium: false,
    currentVoice: state.currentVoice,
    latencyMs: state.latencyMs,
    error: state.error,
    isOnline,
    isThinking: state.isThinking,
    lastSpeculativeContext: state.lastSpeculativeContext,
    checkPremiumStatus,
    setPremiumEnabled,
    speakImmediate,
    speakWithPrelude,
    speakStreaming,
    speakAsZoe: (text: string, options?: Omit<HybridVoiceOptions, 'voice'>) => 
      speak(text, { ...options, voice: 'zoe' }),
    speakAsZoeCalm: (text: string, options?: Omit<HybridVoiceOptions, 'voice'>) => 
      speak(text, { ...options, voice: 'zoe-calm' }),
    speakAsSmith: (text: string, options?: Omit<HybridVoiceOptions, 'voice'>) => 
      speak(text, { ...options, voice: 'smith' }),
    speakAsSmithAuthority: (text: string, options?: Omit<HybridVoiceOptions, 'voice'>) => 
      speak(text, { ...options, voice: 'smith-authority' }),
  };
};

export default useHybridVoice;
