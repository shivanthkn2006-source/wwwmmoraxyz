/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STREAM-TO-STREAM BRIDGE - "Her" Zero-Latency Voice Pipeline
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * THE PROBLEM: Gemini Nano generates text... waits... then sends to Deepgram.
 * THE FIX: Token-level streaming - As Nano outputs words, immediately send to TTS.
 * 
 * SPECULATIVE AUDIO BUFFERING:
 * - Chunk every 5 words or punctuation (. , ! ?)
 * - Send chunk to Deepgram immediately while Nano is still thinking
 * - Play audio chunks in a gapless queue
 * - Result: She starts talking before she finishes thinking
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/integrations/supabase/client';
import { getEffectiveVoiceExperience } from '@/utils/voiceExperienceLock';

// ═══ CONFIGURATION ═══
const CHUNK_WORD_THRESHOLD = 5;
const PUNCTUATION_TRIGGERS = ['.', ',', '!', '?', ';', ':'];
const AUDIO_GAP_MS = 50; // Small gap between audio chunks for natural speech

// ═══ TYPES ═══
export interface StreamingVoiceOptions {
  voice?: 'zoe' | 'smith';
  onChunkSpoken?: (chunk: string) => void;
  onAllSpoken?: () => void;
  onError?: (error: Error) => void;
}

interface AudioQueueItem {
  text: string;
  audio: HTMLAudioElement;
  blob: Blob;
}

// ═══ STREAM-TO-STREAM BRIDGE CLASS ═══
class StreamToStreamBridge {
  private audioQueue: AudioQueueItem[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;
  private textBuffer = '';
  private wordCount = 0;
  private aborted = false;
  private onChunkSpoken?: (chunk: string) => void;
  private onAllSpoken?: () => void;
  private onError?: (error: Error) => void;
  private voice: 'zoe' | 'smith' = 'zoe';
  private pendingChunks = 0;
  private useBrowserFallback = false;

  /**
   * Connect a Gemini Nano stream to Deepgram TTS
   * Tokens flow in → Audio flows out in real-time
   */
  async connectStream(
    textStream: AsyncGenerator<string>,
    options: StreamingVoiceOptions = {}
  ): Promise<void> {
    this.reset();
    this.voice = options.voice || 'zoe';
    this.onChunkSpoken = options.onChunkSpoken;
    this.onAllSpoken = options.onAllSpoken;
    this.onError = options.onError;

    console.log('[StreamBridge] 🌊 Starting stream-to-speech pipeline');

    try {
      for await (const token of textStream) {
        if (this.aborted) break;
        this.processToken(token);
      }

      // Flush any remaining text
      if (this.textBuffer.trim()) {
        await this.flushChunk(this.textBuffer.trim());
      }

      // Wait for all audio to finish
      await this.waitForQueueEmpty();
      this.onAllSpoken?.();
      
      console.log('[StreamBridge] ✅ Stream complete');
    } catch (error) {
      console.error('[StreamBridge] ❌ Stream error:', error);
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Process a single token from the stream
   */
  private processToken(token: string): void {
    this.textBuffer += token;

    // Check for punctuation triggers
    const lastChar = token.trim().slice(-1);
    const hitPunctuation = PUNCTUATION_TRIGGERS.includes(lastChar);

    // Count words
    const words = this.textBuffer.trim().split(/\s+/);
    this.wordCount = words.length;

    // Trigger chunk if threshold reached
    if (hitPunctuation || this.wordCount >= CHUNK_WORD_THRESHOLD) {
      const chunk = this.textBuffer.trim();
      if (chunk) {
        this.flushChunk(chunk);
        this.textBuffer = '';
        this.wordCount = 0;
      }
    }
  }

  /**
   * Send a chunk to Deepgram and queue for playback
   */
  private async flushChunk(text: string): Promise<void> {
    if (!text.trim() || this.aborted) return;

    this.pendingChunks++;
    console.log(`[StreamBridge] 📤 Chunk: "${text.substring(0, 30)}..." (pending: ${this.pendingChunks})`);

    try {
      const exp = getEffectiveVoiceExperience();

      // Skip Deepgram if we're in fallback mode
      if (this.useBrowserFallback) {
        await this.speakWithBrowserTTS(text);
        this.pendingChunks--;
        return;
      }

      // Call Deepgram via edge function
      const { data, error } = await supabase.functions.invoke(
        'zoe-voice',
        {
          body: {
            text,
            voice: this.voice,
            encoding: 'mp3',
          },
          responseType: 'arraybuffer',
        } as any
      );

      if (error) {
        if (exp === 'zoe-infinity') {
          console.warn('[StreamBridge] Deepgram error (Infinity mode; no browser fallback):', error);
          this.pendingChunks--;
          this.onError?.(new Error('Deepgram voice unavailable'));
          return;
        }
        console.warn('[StreamBridge] Deepgram error, falling back to browser TTS:', error);
        this.useBrowserFallback = true;
        await this.speakWithBrowserTTS(text);
        this.pendingChunks--;
        return;
      }

      // Check for fallback signal (zoe-voice returns JSON { useBrowserFallback: true } on 402/429).
      if (data instanceof ArrayBuffer) {
        try {
          const decoded = new TextDecoder().decode(new Uint8Array(data)).trim();
          if (decoded.startsWith('{') || decoded.startsWith('[')) {
            const maybeJson = JSON.parse(decoded);
            if (maybeJson?.useBrowserFallback || maybeJson?.fallback) {
              if (exp === 'zoe-infinity') {
                console.log('[StreamBridge] Deepgram returned fallback signal (Infinity mode; no browser fallback)');
                this.pendingChunks--;
                this.onError?.(new Error('Deepgram voice unavailable'));
                return;
              }
              console.log('[StreamBridge] Deepgram returned fallback signal, using browser TTS');
              this.useBrowserFallback = true;
              await this.speakWithBrowserTTS(text);
              this.pendingChunks--;
              return;
            }
          }
        } catch {
          // ignore
        }
      }

      // Create audio from blob
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      // Queue the audio
      this.audioQueue.push({ text, audio, blob });
      this.pendingChunks--;

      // Start playing if not already
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (err) {
      console.warn('[StreamBridge] Chunk failed:', err);
      this.pendingChunks--;
      // Try browser fallback only outside Infinity
      if (getEffectiveVoiceExperience() === 'zoe-infinity') {
        this.onError?.(new Error('Deepgram voice unavailable'));
        return;
      }
      this.useBrowserFallback = true;
      await this.speakWithBrowserTTS(text);
    }
  }

  /**
   * Fallback to browser TTS for a chunk
   */
  private speakWithBrowserTTS(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = this.voice === 'smith' ? 0.85 : 0.95;
      utterance.rate = this.voice === 'smith' ? 0.88 : 0.9;
      utterance.volume = 0.85;

      utterance.onend = () => {
        this.onChunkSpoken?.(text);
        resolve();
      };

      utterance.onerror = () => {
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Play the next audio chunk in queue
   */
  private playNext(): void {
    if (this.audioQueue.length === 0 || this.aborted) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const item = this.audioQueue.shift()!;
    this.currentAudio = item.audio;

    item.audio.onended = () => {
      URL.revokeObjectURL(item.audio.src);
      this.onChunkSpoken?.(item.text);
      
      // Small gap for natural speech flow
      setTimeout(() => this.playNext(), AUDIO_GAP_MS);
    };

    item.audio.onerror = () => {
      URL.revokeObjectURL(item.audio.src);
      this.playNext();
    };

    item.audio.play().catch(() => {
      this.playNext();
    });
  }

  /**
   * Wait for all queued audio to finish
   */
  private waitForQueueEmpty(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.audioQueue.length === 0 && !this.isPlaying && this.pendingChunks === 0) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  /**
   * Abort the current stream
   */
  abort(): void {
    this.aborted = true;
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      URL.revokeObjectURL(this.currentAudio.src);
    }

    // Clean up queued audio
    for (const item of this.audioQueue) {
      URL.revokeObjectURL(item.audio.src);
    }

    // Stop browser TTS if active
    window.speechSynthesis?.cancel();

    this.reset();
  }

  /**
   * Reset state
   */
  private reset(): void {
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentAudio = null;
    this.textBuffer = '';
    this.wordCount = 0;
    this.aborted = false;
    this.pendingChunks = 0;
    this.useBrowserFallback = false;
  }
}

// ═══ SINGLETON INSTANCE ═══
let bridgeInstance: StreamToStreamBridge | null = null;

export function getStreamBridge(): StreamToStreamBridge {
  if (!bridgeInstance) {
    bridgeInstance = new StreamToStreamBridge();
  }
  return bridgeInstance;
}

// ═══ CONVENIENCE FUNCTIONS ═══

/**
 * Connect Gemini Nano's streaming output directly to Deepgram voice
 * Zero-latency: She speaks as she thinks
 */
export async function speakAsStreaming(
  textStream: AsyncGenerator<string>,
  options?: StreamingVoiceOptions
): Promise<void> {
  return getStreamBridge().connectStream(textStream, options);
}

/**
 * Abort the current streaming speech
 */
export function abortStreamingSpeech(): void {
  getStreamBridge().abort();
}

/**
 * Split text into a mock stream (for testing or non-streaming sources)
 */
export async function* textToStream(text: string, delayMs = 50): AsyncGenerator<string> {
  const words = text.split(' ');
  for (const word of words) {
    yield word + ' ';
    await new Promise(r => setTimeout(r, delayMs));
  }
}

/**
 * Speak text with stream-like chunking (for non-streaming AI responses)
 * Provides similar low-latency feel by chunking and streaming to TTS
 */
export async function speakWithChunking(
  text: string,
  options?: StreamingVoiceOptions
): Promise<void> {
  const stream = textToStream(text, 10);
  return speakAsStreaming(stream, options);
}
