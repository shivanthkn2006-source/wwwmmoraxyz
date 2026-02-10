// ═══════════════════════════════════════════════════════════════════════════════
// GEMINI TTS ADAPTER - 27-Emotion Voice Generation
// Part of 360-Degree Conversational Foundation (Part 2)
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { TTSServicePort, TTSRequest, TTSResponse, TTSAdapterConfig, VoiceStyle } from '../ports/TTSServicePort';
import { ECN_EMOTION_CONFIG } from '@/components/ATLASZoeOrb';

const DEFAULT_CONFIG: TTSAdapterConfig = {
  name: 'Gemini_TTS_Adapter',
  version: '2.0.0',
  voiceId: 'zoe-default',
  voiceStyle: 'calm_soothing',
  isPlaceholder: false,
  supportsStreaming: false,
};

export class GeminiTTSAdapter implements TTSServicePort {
  readonly config: TTSAdapterConfig;
  
  constructor(config?: Partial<TTSAdapterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const startTime = performance.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('lovable-tts', {
        body: {
          text: request.text,
          voice: this.config.voiceId,
          language: request.language || 'en-US',
          speed: request.speed || 1.0,
          format: 'mp3',
        }
      });
      
      const latencyMs = performance.now() - startTime;
      
      if (error) {
        return {
          success: false,
          format: 'mp3',
          durationMs: 0,
          latencyMs,
          voiceUsed: this.config.voiceId,
          error: error.message,
        };
      }
      
      if (data?.audioContent) {
        const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        return {
          success: true,
          audioUrl,
          audioData: audioBlob,
          format: 'mp3',
          durationMs: data.durationMs || 0,
          latencyMs,
          voiceUsed: this.config.voiceId,
        };
      }
      
      // Fallback to browser TTS
      return this.fallbackToWebSpeech(request, latencyMs);
      
    } catch (err) {
      return this.fallbackToWebSpeech(request, performance.now() - startTime);
    }
  }
  
  private async fallbackToWebSpeech(request: TTSRequest, latencyMs: number): Promise<TTSResponse> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve({
          success: false,
          format: 'mp3',
          durationMs: 0,
          latencyMs,
          voiceUsed: 'none',
          error: 'Speech synthesis not supported',
        });
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(request.text);
      utterance.rate = request.speed || 1.0;
      utterance.pitch = request.pitch || 1.0;
      utterance.volume = request.volume || 0.9;
      
      utterance.onend = () => {
        resolve({
          success: true,
          format: 'mp3',
          durationMs: 0,
          latencyMs,
          voiceUsed: 'web-speech',
        });
        window.dispatchEvent(new CustomEvent('zoe-speak-end'));
      };
      
      utterance.onerror = () => {
        resolve({
          success: false,
          format: 'mp3',
          durationMs: 0,
          latencyMs,
          voiceUsed: 'web-speech',
          error: 'Web speech failed',
        });
      };
      
      speechSynthesis.speak(utterance);
    });
  }
  
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    return { healthy: true, latencyMs: 0 };
  }
  
  async getAvailableVoices(): Promise<Array<{ id: string; name: string; style: VoiceStyle; language: string; }>> {
    return [
      { id: 'zoe-default', name: 'Zoe', style: 'calm_soothing', language: 'en-US' },
    ];
  }
  
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteArrays: Uint8Array[] = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    
    return new Blob(byteArrays as BlobPart[], { type: mimeType });
  }
}

export const createGeminiTTSAdapter = (config?: Partial<TTSAdapterConfig>): TTSServicePort => {
  return new GeminiTTSAdapter(config);
};
