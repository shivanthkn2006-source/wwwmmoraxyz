// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HEXAGONAL ARCHITECTURE - PLACEHOLDER TTS ADAPTER
// Adapter Layer: Temporary TTS implementation until exclusive voice is ready
// ═══════════════════════════════════════════════════════════════════════════════

import type { 
  TTSServicePort, 
  TTSRequest, 
  TTSResponse, 
  TTSAdapterConfig,
  VoiceStyle 
} from '../ports/TTSServicePort';

const DEFAULT_CONFIG: TTSAdapterConfig = {
  name: 'Placeholder_TTS_Adapter',
  version: '1.0.0',
  voiceId: 'default',
  voiceStyle: 'calm_soothing',
  isPlaceholder: true,
  supportsStreaming: false,
};

/**
 * Placeholder TTS Adapter
 * 
 * Uses the Web Speech API as a temporary solution until the
 * exclusive "calm and soothing" Zoe voice becomes available.
 * 
 * Future replacement: Exclusive_Voice_TTS_Adapter with custom voice model
 */
export class PlaceholderTTSAdapter implements TTSServicePort {
  readonly config: TTSAdapterConfig;
  private synthesis: SpeechSynthesis | null = null;
  
  constructor(config?: Partial<TTSAdapterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
    }
  }
  
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const startTime = performance.now();
    
    if (!this.synthesis) {
      return {
        success: false,
        format: 'mp3',
        durationMs: 0,
        latencyMs: performance.now() - startTime,
        voiceUsed: 'none',
        error: 'Speech synthesis not available in this environment',
      };
    }
    
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(request.text);
      
      // Configure voice parameters
      utterance.rate = request.speed || 0.9;  // Slightly slower for calm effect
      utterance.pitch = request.pitch || 0.95; // Slightly lower for soothing
      utterance.volume = request.volume || 1.0;
      utterance.lang = request.language || 'en-US';
      
      // Try to find a female voice for calm/soothing effect
      const voices = this.synthesis!.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Google') && v.name.includes('Female')
      ) || voices.find(v => 
        v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha')
      ) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onend = () => {
        const latencyMs = performance.now() - startTime;
        resolve({
          success: true,
          format: 'webm',
          durationMs: latencyMs,
          latencyMs,
          voiceUsed: preferredVoice?.name || 'default',
        });
      };
      
      utterance.onerror = (event) => {
        resolve({
          success: false,
          format: 'webm',
          durationMs: 0,
          latencyMs: performance.now() - startTime,
          voiceUsed: 'none',
          error: event.error,
        });
      };
      
      this.synthesis!.speak(utterance);
    });
  }
  
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const startTime = performance.now();
    
    if (!this.synthesis) {
      return {
        healthy: false,
        latencyMs: performance.now() - startTime,
        error: 'Speech synthesis not available',
      };
    }
    
    return {
      healthy: true,
      latencyMs: performance.now() - startTime,
    };
  }
  
  async getAvailableVoices(): Promise<Array<{
    id: string;
    name: string;
    style: VoiceStyle;
    language: string;
    preview?: string;
  }>> {
    if (!this.synthesis) {
      return [];
    }
    
    const voices = this.synthesis.getVoices();
    
    return voices.map(voice => ({
      id: voice.voiceURI,
      name: voice.name,
      style: 'default' as VoiceStyle,
      language: voice.lang,
    }));
  }
}

// Factory function
export const createPlaceholderTTSAdapter = (config?: Partial<TTSAdapterConfig>): TTSServicePort => {
  return new PlaceholderTTSAdapter(config);
};
