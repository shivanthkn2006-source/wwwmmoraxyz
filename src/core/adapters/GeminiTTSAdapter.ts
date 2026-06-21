// ═══════════════════════════════════════════════════════════════════════════════
// GEMINI TTS ADAPTER - Browser-Native Voice Synthesis
// Uses Web Speech API exclusively (no external dependencies)
// ═══════════════════════════════════════════════════════════════════════════════

import type { TTSServicePort, TTSRequest, TTSResponse, TTSAdapterConfig, VoiceStyle } from '../ports/TTSServicePort';

const DEFAULT_CONFIG: TTSAdapterConfig = {
  name: 'Browser_TTS_Adapter',
  version: '3.0.0',
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
    return this.speakWithWebSpeech(request, performance.now() - startTime);
  }
  
  private async speakWithWebSpeech(request: TTSRequest, latencyMs: number): Promise<TTSResponse> {
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
    return { healthy: 'speechSynthesis' in window, latencyMs: 0 };
  }
  
  async getAvailableVoices(): Promise<Array<{ id: string; name: string; style: VoiceStyle; language: string; }>> {
    return [
      { id: 'zoe-default', name: 'Zoe', style: 'calm_soothing', language: 'en-US' },
    ];
  }
}

export const createGeminiTTSAdapter = (config?: Partial<TTSAdapterConfig>): TTSServicePort => {
  return new GeminiTTSAdapter(config);
};
