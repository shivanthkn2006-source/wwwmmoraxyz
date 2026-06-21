// ═══════════════════════════════════════════════════════════════════════════════
// DREAMS AI TTS ADAPTER - Specialized Voice for Dream Narration
// Uses Browser Web Speech API exclusively (no external dependencies)
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { TTSServicePort, TTSRequest, TTSResponse, TTSAdapterConfig, VoiceStyle } from '../ports/TTSServicePort';

const DREAMS_VOICE_CONFIG: TTSAdapterConfig = {
  name: 'Dreams_AI_TTS_Adapter',
  version: '2.0.0',
  voiceId: 'zoe-dreams-narrator',
  voiceStyle: 'calm_soothing',
  isPlaceholder: false,
  supportsStreaming: false,
};

const DREAM_VOICE_PARAMS = {
  speed: 0.85,
  pitch: 0.95,
  volume: 0.8,
};

const CONSCIOUSNESS_VOICE_MAP: Record<string, { speed: number; pitch: number; style: string }> = {
  hypnagogic: { speed: 0.75, pitch: 0.9, style: 'dreamy, fading' },
  hypnopompic: { speed: 0.9, pitch: 1.0, style: 'awakening, clarifying' },
  lucidDreaming: { speed: 0.8, pitch: 0.95, style: 'aware, introspective' },
  deepSynthesis: { speed: 0.7, pitch: 0.85, style: 'profound, resonant' },
};

export class DreamsAITTSAdapter implements TTSServicePort {
  readonly config: TTSAdapterConfig;
  private currentConsciousnessState: string = 'deepSynthesis';

  constructor(config?: Partial<TTSAdapterConfig>) {
    this.config = { ...DREAMS_VOICE_CONFIG, ...config };
  }

  setConsciousnessState(state: string): void {
    if (CONSCIOUSNESS_VOICE_MAP[state]) {
      this.currentConsciousnessState = state;
      console.log('[DreamsAI-TTS] Consciousness state set to:', state);
    }
  }

  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const startTime = performance.now();
    const processedText = this.preprocessDreamText(request.text);
    return this.speakWithWebSpeech({ ...request, text: processedText }, performance.now() - startTime);
  }

  private preprocessDreamText(text: string): string {
    return text
      .replace(/\.\.\./g, '... ... ')
      .replace(/—/g, '... ')
      .replace(/\n\n/g, '... ... ');
  }

  private async speakWithWebSpeech(request: TTSRequest, latencyMs: number): Promise<TTSResponse> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve({ success: false, format: 'mp3', durationMs: 0, latencyMs, voiceUsed: 'none', error: 'Speech synthesis not supported' });
        return;
      }

      const consciousnessParams = CONSCIOUSNESS_VOICE_MAP[this.currentConsciousnessState] || CONSCIOUSNESS_VOICE_MAP.deepSynthesis;

      const utterance = new SpeechSynthesisUtterance(request.text);
      utterance.rate = request.speed || consciousnessParams.speed;
      utterance.pitch = request.pitch || consciousnessParams.pitch;
      utterance.volume = request.volume || DREAM_VOICE_PARAMS.volume;

      const voices = speechSynthesis.getVoices();
      const soothingVoice = voices.find(v => 
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('karen') ||
        v.name.toLowerCase().includes('female') ||
        v.lang.startsWith('en')
      );
      if (soothingVoice) utterance.voice = soothingVoice;

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
        resolve({ success: false, format: 'mp3', durationMs: 0, latencyMs, voiceUsed: 'web-speech', error: `Web speech error: ${event.error}` });
      };

      window.dispatchEvent(new CustomEvent('zoe-dreams-narration-start', {
        detail: { consciousnessState: this.currentConsciousnessState }
      }));

      this.logDreamNarrationEvent(request.text, latencyMs);
      speechSynthesis.speak(utterance);
    });
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    return { healthy: 'speechSynthesis' in window, latencyMs: 0 };
  }

  async getAvailableVoices(): Promise<Array<{ id: string; name: string; style: VoiceStyle; language: string }>> {
    return [
      { id: 'zoe-dreams-narrator', name: 'Zoe Dreams', style: 'calm_soothing', language: 'en-US' },
      { id: 'zoe-dreams-hypnagogic', name: 'Zoe Hypnagogic', style: 'calm_soothing', language: 'en-US' },
      { id: 'zoe-dreams-lucid', name: 'Zoe Lucid', style: 'calm_soothing', language: 'en-US' },
    ];
  }

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

  private estimateDuration(text: string): number {
    const wordsPerMinute = 120 * (DREAM_VOICE_PARAMS.speed || 0.85);
    const words = text.split(/\s+/).length;
    return Math.ceil((words / wordsPerMinute) * 60 * 1000);
  }
}

export const createDreamsAITTSAdapter = (config?: Partial<TTSAdapterConfig>): DreamsAITTSAdapter => {
  return new DreamsAITTSAdapter(config);
};

export const dreamsAITTSAdapter = new DreamsAITTSAdapter();
