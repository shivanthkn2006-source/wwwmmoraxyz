// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HEXAGONAL ARCHITECTURE - TTS SERVICE PORT
// Domain Layer: Defines contract for Text-to-Speech providers
// ═══════════════════════════════════════════════════════════════════════════════

export type VoiceStyle = 
  | 'calm_soothing'      // Future exclusive Zoe voice
  | 'professional'
  | 'friendly'
  | 'empathetic'
  | 'energetic'
  | 'default';

export interface TTSRequest {
  text: string;
  voiceStyle?: VoiceStyle;
  speed?: number;       // 0.5 - 2.0
  pitch?: number;       // 0.5 - 2.0
  volume?: number;      // 0.0 - 1.0
  language?: string;    // ISO language code
  ssml?: boolean;       // Use SSML markup
}

export interface TTSResponse {
  success: boolean;
  audioData?: ArrayBuffer | Blob;
  audioUrl?: string;
  format: 'mp3' | 'wav' | 'ogg' | 'webm';
  durationMs: number;
  latencyMs: number;
  voiceUsed: string;
  error?: string;
}

export interface TTSAdapterConfig {
  name: string;
  version: string;
  voiceId: string;
  voiceStyle: VoiceStyle;
  isPlaceholder: boolean;
  supportsStreaming: boolean;
}

/**
 * TTS Service Port - Interface for all TTS adapters
 * 
 * This port defines the contract for text-to-speech services.
 * Currently uses a placeholder adapter until the exclusive
 * "calm and soothing" Zoe voice becomes available.
 */
export interface TTSServicePort {
  readonly config: TTSAdapterConfig;
  
  /**
   * Convert text to speech
   */
  synthesize(request: TTSRequest): Promise<TTSResponse>;
  
  /**
   * Stream audio in real-time (if supported)
   */
  streamSynthesize?(
    request: TTSRequest, 
    onChunk: (chunk: ArrayBuffer) => void
  ): Promise<void>;
  
  /**
   * Check adapter health status
   */
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }>;
  
  /**
   * Get available voices
   */
  getAvailableVoices(): Promise<Array<{
    id: string;
    name: string;
    style: VoiceStyle;
    language: string;
    preview?: string;
  }>>;
}

/**
 * Factory function type for creating TTS adapters
 */
export type TTSAdapterFactory = (config?: Partial<TTSAdapterConfig>) => TTSServicePort;
