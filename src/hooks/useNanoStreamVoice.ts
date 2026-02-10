/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NANO STREAM VOICE - Zero-Latency Speaking While Thinking
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PROMPT 2 IMPLEMENTATION: "The Hybrid Bridge (Speed)"
 * 
 * LOGIC:
 * - Chunking: Do NOT wait for full Nano response
 * - Streaming: Every time Nano generates 4 words, push to Deepgram immediately
 * - Goal: Zero latency - She speaks while she thinks
 * 
 * WIRING:
 * geminiNano.chatStream() → StreamToStreamBridge → Deepgram/BrowserTTS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useRef, useState } from 'react';
import { geminiNano } from '@/core/inference/GeminiNano';
import { getStreamBridge, type StreamingVoiceOptions } from '@/core/speech/StreamToStreamBridge';
import { processNanoResponse, getNanoReflexPrompt } from '@/core/slm/NanoReflexProtocol';

interface NanoStreamVoiceOptions {
  voice?: 'zoe' | 'smith';
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onChunkSpoken?: (chunk: string) => void;
  onError?: (error: Error) => void;
  processReflexActions?: boolean; // Enable [ACTION:*] processing
}

interface NanoStreamVoiceReturn {
  // Speak with streaming - zero latency
  speakStreaming: (userMessage: string) => Promise<string>;
  
  // Regular Nano chat (non-streaming)
  chat: (message: string) => Promise<string>;
  
  // Abort current speech
  abort: () => void;
  
  // State
  isThinking: boolean;
  isSpeaking: boolean;
  isStreaming: boolean;
  lastResponse: string | null;
}

export function useNanoStreamVoice(options: NanoStreamVoiceOptions = {}): NanoStreamVoiceReturn {
  const {
    voice = 'zoe',
    onThinkingStart,
    onThinkingEnd,
    onSpeechStart,
    onSpeechEnd,
    onChunkSpoken,
    onError,
    processReflexActions = true,
  } = options;

  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const abortedRef = useRef(false);

  /**
   * 🎙️ SPEAK STREAMING - The Zero-Latency Pipeline
   * 
   * GeminiNano generates tokens → StreamBridge chunks every 4-5 words
   * → Deepgram TTS (or browser fallback) speaks immediately
   * 
   * Result: Zoe starts speaking within ~200ms instead of waiting for full response
   */
  const speakStreaming = useCallback(async (userMessage: string): Promise<string> => {
    abortedRef.current = false;
    let fullResponse = '';
    
    console.log('[NanoStreamVoice] 🌊 Starting zero-latency speech pipeline');
    
    setIsThinking(true);
    setIsStreaming(true);
    onThinkingStart?.();

    try {
      // Check if Gemini Nano is available
      const nanoAvailable = await geminiNano.isAvailable();
      
      if (!nanoAvailable) {
        console.log('[NanoStreamVoice] Nano unavailable, using regular chat');
        fullResponse = await geminiNano.chat(userMessage);
        setIsThinking(false);
        onThinkingEnd?.();
        
        // Process reflex actions if enabled
        if (processReflexActions) {
          fullResponse = await processNanoResponse(fullResponse);
        }
        
        setLastResponse(fullResponse);
        return fullResponse;
      }

      // Get the stream generator from Nano
      const textStream = geminiNano.chatStream(userMessage);
      
      // Create a wrapped generator that accumulates the response
      async function* wrappedStream(): AsyncGenerator<string> {
        for await (const chunk of textStream) {
          if (abortedRef.current) break;
          
          // Nano returns cumulative text, we need deltas
          const delta = chunk.slice(fullResponse.length);
          fullResponse = chunk;
          
          if (delta) {
            yield delta;
          }
        }
      }

      setIsThinking(false);
      setIsSpeaking(true);
      onThinkingEnd?.();
      onSpeechStart?.();

      // Connect to StreamBridge for chunked TTS
      await getStreamBridge().connectStream(wrappedStream(), {
        voice,
        onChunkSpoken: (chunk) => {
          onChunkSpoken?.(chunk);
        },
        onAllSpoken: () => {
          setIsSpeaking(false);
          setIsStreaming(false);
          onSpeechEnd?.();
        },
        onError: (err) => {
          console.error('[NanoStreamVoice] Stream error:', err);
          onError?.(err);
        },
      });

      // Process reflex actions after speech completes
      if (processReflexActions && fullResponse) {
        const cleanResponse = await processNanoResponse(fullResponse);
        setLastResponse(cleanResponse);
        return cleanResponse;
      }

      setLastResponse(fullResponse);
      return fullResponse;

    } catch (error) {
      console.error('[NanoStreamVoice] Error:', error);
      setIsThinking(false);
      setIsSpeaking(false);
      setIsStreaming(false);
      onThinkingEnd?.();
      onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [voice, onThinkingStart, onThinkingEnd, onSpeechStart, onSpeechEnd, onChunkSpoken, onError, processReflexActions]);

  /**
   * Regular Nano chat (non-streaming, for when you don't need TTS)
   */
  const chat = useCallback(async (message: string): Promise<string> => {
    setIsThinking(true);
    onThinkingStart?.();

    try {
      let response = await geminiNano.chat(message);
      
      if (processReflexActions) {
        response = await processNanoResponse(response);
      }
      
      setLastResponse(response);
      return response;
    } finally {
      setIsThinking(false);
      onThinkingEnd?.();
    }
  }, [onThinkingStart, onThinkingEnd, processReflexActions]);

  /**
   * Abort current streaming speech
   */
  const abort = useCallback(() => {
    abortedRef.current = true;
    getStreamBridge().abort();
    setIsThinking(false);
    setIsSpeaking(false);
    setIsStreaming(false);
  }, []);

  return {
    speakStreaming,
    chat,
    abort,
    isThinking,
    isSpeaking,
    isStreaming,
    lastResponse,
  };
}

export default useNanoStreamVoice;
