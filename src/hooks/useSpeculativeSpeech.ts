// ═══════════════════════════════════════════════════════════════════════════════
// SPECULATIVE SPEECH HOOK - React integration for instant voice responses
// Provides the "Samantha Effect" - speaks immediately while thinking deeply
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';
import {
  generateSpeculativeSpeech,
  startSpeculativeSpeech,
  processWithSpeculativeSpeech,
  abortSpeculativeSpeech,
  isSpeculativeSpeechActive,
  type EmotionalTone,
  type QueryComplexity,
  type SpeculativeContext,
} from '@/core/speech/SpeculativeSpeechProtocol';

// Re-export types
export type { EmotionalTone, QueryComplexity, SpeculativeContext };

export interface UseSpeculativeSpeechReturn {
  // State
  isActive: boolean;
  lastContext: SpeculativeContext | null;
  lastLatencyMs: number;
  acknowledgedEarlyMs: number;
  
  // Core functions
  analyzeMessage: (message: string) => {
    immediatePhrase: string;
    transitionPhrase: string;
    estimatedThinkingMs: number;
    shouldSpeak: boolean;
    context: SpeculativeContext;
  };
  
  // Process with speculative speech (main function)
  processWithSpeech: <T>(
    userMessage: string,
    heavyProcessor: () => Promise<T>,
    options?: {
      speakFullResponse?: boolean;
      onAcknowledgmentSpoken?: () => void;
      onProcessingComplete?: (result: T) => void;
    }
  ) => Promise<{
    result: T;
    speculativeContext: SpeculativeContext;
    totalLatencyMs: number;
    acknowledgedEarlyMs: number;
  }>;
  
  // Manual control
  startSession: (
    userMessage: string,
    onFullResponseReady?: (response: string, context: SpeculativeContext) => void
  ) => Promise<{
    speakAcknowledgment: () => Promise<void>;
    setFullResponse: (response: string) => void;
    abort: () => void;
  }>;
  
  abort: () => void;
}

export function useSpeculativeSpeech(): UseSpeculativeSpeechReturn {
  const [isActive, setIsActive] = useState(false);
  const [lastContext, setLastContext] = useState<SpeculativeContext | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState(0);
  const [acknowledgedEarlyMs, setAcknowledgedEarlyMs] = useState(0);
  const sessionRef = useRef<ReturnType<typeof startSpeculativeSpeech> | null>(null);
  
  // Analyze message without starting speech
  const analyzeMessage = useCallback((message: string) => {
    return generateSpeculativeSpeech(message);
  }, []);
  
  // Process with speculative speech (main function)
  const processWithSpeech = useCallback(async <T,>(
    userMessage: string,
    heavyProcessor: () => Promise<T>,
    options?: {
      speakFullResponse?: boolean;
      onAcknowledgmentSpoken?: () => void;
      onProcessingComplete?: (result: T) => void;
    }
  ) => {
    setIsActive(true);
    
    try {
      const result = await processWithSpeculativeSpeech(userMessage, heavyProcessor, {
        ...options,
        onAcknowledgmentSpoken: () => {
          options?.onAcknowledgmentSpoken?.();
        },
        onProcessingComplete: (result) => {
          setIsActive(false);
          options?.onProcessingComplete?.(result);
        },
      });
      
      setLastContext(result.speculativeContext);
      setLastLatencyMs(result.totalLatencyMs);
      setAcknowledgedEarlyMs(result.acknowledgedEarlyMs);
      
      return result;
    } catch (error) {
      setIsActive(false);
      throw error;
    }
  }, []);
  
  // Start manual session
  const startSession = useCallback(async (
    userMessage: string,
    onFullResponseReady?: (response: string, context: SpeculativeContext) => void
  ) => {
    setIsActive(true);
    
    const session = await startSpeculativeSpeech(userMessage, (response, context) => {
      setIsActive(false);
      setLastContext(context);
      onFullResponseReady?.(response, context);
    });
    
    sessionRef.current = Promise.resolve(session);
    
    return {
      speakAcknowledgment: session.speakAcknowledgment,
      setFullResponse: session.setFullResponse,
      abort: () => {
        session.abort();
        setIsActive(false);
        sessionRef.current = null;
      },
    };
  }, []);
  
  // Abort current session
  const abort = useCallback(() => {
    abortSpeculativeSpeech();
    setIsActive(false);
    sessionRef.current = null;
  }, []);
  
  return {
    isActive: isActive || isSpeculativeSpeechActive(),
    lastContext,
    lastLatencyMs,
    acknowledgedEarlyMs,
    analyzeMessage,
    processWithSpeech,
    startSession,
    abort,
  };
}

export default useSpeculativeSpeech;
