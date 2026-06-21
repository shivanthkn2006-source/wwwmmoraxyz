/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NANO STREAM VOICE - Zero-Latency Speaking While Thinking
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Chunks Gemini Nano output every 4-5 words → Browser TTS speaks immediately.
 * Result: Zoe starts speaking within ~200ms instead of waiting for full response.
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
  processReflexActions?: boolean;
}

interface NanoStreamVoiceReturn {
  speakStreaming: (userMessage: string) => Promise<string>;
  chat: (message: string) => Promise<string>;
  abort: () => void;
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

  const speakStreaming = useCallback(async (userMessage: string): Promise<string> => {
    abortedRef.current = false;
    let fullResponse = '';
    
    console.log('[NanoStreamVoice] 🌊 Starting zero-latency speech pipeline (Browser TTS)');
    
    setIsThinking(true);
    setIsStreaming(true);
    onThinkingStart?.();

    try {
      const nanoAvailable = await geminiNano.isAvailable();
      
      if (!nanoAvailable) {
        fullResponse = await geminiNano.chat(userMessage);
        setIsThinking(false);
        onThinkingEnd?.();
        
        if (processReflexActions) fullResponse = await processNanoResponse(fullResponse);
        setLastResponse(fullResponse);
        return fullResponse;
      }

      const textStream = geminiNano.chatStream(userMessage);
      
      async function* wrappedStream(): AsyncGenerator<string> {
        for await (const chunk of textStream) {
          if (abortedRef.current) break;
          const delta = chunk.slice(fullResponse.length);
          fullResponse = chunk;
          if (delta) yield delta;
        }
      }

      setIsThinking(false);
      setIsSpeaking(true);
      onThinkingEnd?.();
      onSpeechStart?.();

      await getStreamBridge().connectStream(wrappedStream(), {
        voice,
        onChunkSpoken: (chunk) => onChunkSpoken?.(chunk),
        onAllSpoken: () => { setIsSpeaking(false); setIsStreaming(false); onSpeechEnd?.(); },
        onError: (err) => { console.error('[NanoStreamVoice] Stream error:', err); onError?.(err); },
      });

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

  const chat = useCallback(async (message: string): Promise<string> => {
    setIsThinking(true);
    onThinkingStart?.();
    try {
      let response = await geminiNano.chat(message);
      if (processReflexActions) response = await processNanoResponse(response);
      setLastResponse(response);
      return response;
    } finally {
      setIsThinking(false);
      onThinkingEnd?.();
    }
  }, [onThinkingStart, onThinkingEnd, processReflexActions]);

  const abort = useCallback(() => {
    abortedRef.current = true;
    getStreamBridge().abort();
    setIsThinking(false);
    setIsSpeaking(false);
    setIsStreaming(false);
  }, []);

  return { speakStreaming, chat, abort, isThinking, isSpeaking, isStreaming, lastResponse };
}

export default useNanoStreamVoice;
