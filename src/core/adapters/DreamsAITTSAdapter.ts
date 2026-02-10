// ═══════════════════════════════════════════════════════════════════════════════
// DREAMS AI TTS ADAPTER - Specialized Voice for Dream Narration
// Part of Hexagonal Architecture - Implements TTSServicePort
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { TTSServicePort, TTSRequest, TTSResponse, TTSAdapterConfig, VoiceStyle } from '../ports/TTSServicePort';

// ═══════════════════════════════════════════════════════════════════════════════
// DREAMS AI VOICE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DREAMS_VOICE_CONFIG: TTSAdapterConfig = {
  name: 'Dreams_AI_TTS_Adapter',
  version: '1.0.0',
  voiceId: 'zoe-dreams-narrator',
  voiceStyle: 'calm_soothing',
  isPlaceholder: false,
  supportsStreaming: false,
};

// Dream-specific voice parameters for ethereal, meditative narration
const DREAM_VOICE_PARAMS = {
  speed: 0.85,          // Slower for contemplative feel
  pitch: 0.95,          // Slightly lower, more soothing
  volume: 0.8,          // Softer delivery
  breathiness: 0.3,     // Adds ethereal quality
  warmth: 0.8,          // Emotional warmth
};

// Consciousness state to voice style mapping
const CONSCIOUSNESS_VOICE_MAP: Record<string, { speed: number; pitch: number; style: string }> = {
  hypnagogic: { speed: 0.75, pitch: 0.9, style: 'dreamy, fading' },
  hypnopompic: { speed: 0.9, pitch: 1.0, style: 'awakening, clarifying' },
  lucidDreaming: { speed: 0.8, pitch: 0.95, style: 'aware, introspective' },
  deepSynthesis: { speed: 0.7, pitch: 0.85, style: 'profound, resonant' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DREAMS AI TTS ADAPTER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class DreamsAITTSAdapter implements TTSServicePort {
  readonly config: TTSAdapterConfig;
  private currentConsciousnessState: string = 'deepSynthesis';

  constructor(config?: Partial<TTSAdapterConfig>) {
    this.config = { ...DREAMS_VOICE_CONFIG, ...config };
  }

  /**
   * Set the current consciousness state for voice modulation
   */
  setConsciousnessState(state: string): void {
    if (CONSCIOUSNESS_VOICE_MAP[state]) {
      this.currentConsciousnessState = state;
      console.log('[DreamsAI-TTS] Consciousness state set to:', state);
    }
  }

  /**
   * Synthesize dream narration with specialized voice parameters
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const startTime = performance.now();
    
    // Get consciousness-specific voice parameters
    const consciousnessParams = CONSCIOUSNESS_VOICE_MAP[this.currentConsciousnessState] || 
      CONSCIOUSNESS_VOICE_MAP.deepSynthesis;

    try {
      // Attempt Lovable TTS with dream-specific parameters
      const { data, error } = await supabase.functions.invoke('lovable-tts', {
        body: {
          text: this.preprocessDreamText(request.text),
          voice: this.config.voiceId,
          language: request.language || 'en-US',
          speed: request.speed || consciousnessParams.speed,
          pitch: request.pitch || consciousnessParams.pitch,
          format: 'mp3',
          style: 'dream_narration',
          consciousnessState: this.currentConsciousnessState,
        }
      });

      const latencyMs = performance.now() - startTime;

      if (error) {
        console.warn('[DreamsAI-TTS] Primary synthesis failed, using fallback:', error.message);
        return this.fallbackToWebSpeech(request, latencyMs);
      }

      if (data?.audioContent) {
        const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);

        // Log dream narration event
        this.logDreamNarrationEvent(request.text, latencyMs);

        return {
          success: true,
          audioUrl,
          audioData: audioBlob,
          format: 'mp3',
          durationMs: data.durationMs || this.estimateDuration(request.text),
          latencyMs,
          voiceUsed: `${this.config.voiceId}-${this.currentConsciousnessState}`,
        };
      }

      return this.fallbackToWebSpeech(request, latencyMs);

    } catch (err) {
      console.error('[DreamsAI-TTS] Synthesis error:', err);
      return this.fallbackToWebSpeech(request, performance.now() - startTime);
    }
  }

  /**
   * Preprocess dream text for optimal narration
   * - Add pauses between sentences
   * - Emphasize key dream imagery
   */
  private preprocessDreamText(text: string): string {
    // Add slight pauses at consciousness state transitions
    let processed = text
      .replace(/\.\.\./g, '... ... ')  // Extend ellipses for dreamy effect
      .replace(/—/g, '... ')            // Convert em-dashes to pauses
      .replace(/\n\n/g, '... ... ');    // Add pauses between paragraphs

    // Add emphasis to dream-specific words
    const emphasisWords = ['dreams', 'consciousness', 'synthesis', 'awakening', 'resolution'];
    emphasisWords.forEach(word => {
      const regex = new RegExp(`\\b(${word})\\b`, 'gi');
      processed = processed.replace(regex, ' $1 ');
    });

    return processed;
  }

  /**
   * Fallback to Web Speech API with dream-optimized parameters
   */
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

      const consciousnessParams = CONSCIOUSNESS_VOICE_MAP[this.currentConsciousnessState] || 
        CONSCIOUSNESS_VOICE_MAP.deepSynthesis;

      const utterance = new SpeechSynthesisUtterance(request.text);
      utterance.rate = request.speed || consciousnessParams.speed;
      utterance.pitch = request.pitch || consciousnessParams.pitch;
      utterance.volume = request.volume || DREAM_VOICE_PARAMS.volume;

      // Select a soothing voice if available
      const voices = speechSynthesis.getVoices();
      const soothingVoice = voices.find(v => 
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('karen') ||
        v.name.toLowerCase().includes('female') ||
        v.lang.startsWith('en')
      );
      if (soothingVoice) {
        utterance.voice = soothingVoice;
      }

      utterance.onend = () => {
        resolve({
          success: true,
          format: 'mp3',
          durationMs: this.estimateDuration(request.text),
          latencyMs,
          voiceUsed: `web-speech-dreams-${this.currentConsciousnessState}`,
        });
        window.dispatchEvent(new CustomEvent('zoe-dreams-narration-end'));
      };

      utterance.onerror = (event) => {
        resolve({
          success: false,
          format: 'mp3',
          durationMs: 0,
          latencyMs,
          voiceUsed: 'web-speech',
          error: `Web speech error: ${event.error}`,
        });
      };

      // Dispatch start event
      window.dispatchEvent(new CustomEvent('zoe-dreams-narration-start', {
        detail: { consciousnessState: this.currentConsciousnessState }
      }));

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Health check for Dreams AI TTS
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const startTime = performance.now();
    
    try {
      // Quick synthesis test
      const testResponse = await this.synthesize({
        text: 'Dream synthesis active.',
        speed: 1.0,
      });

      return {
        healthy: testResponse.success,
        latencyMs: performance.now() - startTime,
        error: testResponse.error,
      };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: performance.now() - startTime,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Get available dream narration voices
   */
  async getAvailableVoices(): Promise<Array<{ id: string; name: string; style: VoiceStyle; language: string }>> {
    return [
      { id: 'zoe-dreams-narrator', name: 'Zoe Dreams', style: 'calm_soothing', language: 'en-US' },
      { id: 'zoe-dreams-hypnagogic', name: 'Zoe Hypnagogic', style: 'calm_soothing', language: 'en-US' },
      { id: 'zoe-dreams-lucid', name: 'Zoe Lucid', style: 'calm_soothing', language: 'en-US' },
    ];
  }

  /**
   * Log dream narration event to sovereign memory
   */
  private async logDreamNarrationEvent(text: string, latencyMs: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'dreams_tts_narration',
        content_text: text.substring(0, 200),
        zoe_state_json: {
          adapter: 'Dreams_AI_TTS_Adapter',
          consciousness_state: this.currentConsciousnessState,
          latency_ms: latencyMs,
          voice_params: DREAM_VOICE_PARAMS,
        },
        importance_score: 60,
      });
    } catch (err) {
      console.warn('[DreamsAI-TTS] Failed to log narration event:', err);
    }
  }

  /**
   * Convert base64 to Blob
   */
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

  /**
   * Estimate narration duration based on text length
   */
  private estimateDuration(text: string): number {
    const wordsPerMinute = 120 * (DREAM_VOICE_PARAMS.speed || 0.85); // Slower for dreams
    const words = text.split(/\s+/).length;
    return Math.ceil((words / wordsPerMinute) * 60 * 1000);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export const createDreamsAITTSAdapter = (config?: Partial<TTSAdapterConfig>): DreamsAITTSAdapter => {
  return new DreamsAITTSAdapter(config);
};

// Export singleton for consistent usage
export const dreamsAITTSAdapter = new DreamsAITTSAdapter();
