/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STREAM-TO-STREAM BRIDGE - Zero-Latency Voice Pipeline
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Token-level streaming - As Nano outputs words, immediately send to Browser TTS.
 * Chunks every 5 words or punctuation → speaks immediately via Web Speech API.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══ CONFIGURATION ═══
const CHUNK_WORD_THRESHOLD = 5;
const PUNCTUATION_TRIGGERS = ['.', ',', '!', '?', ';', ':'];

// ═══ TYPES ═══
export interface StreamingVoiceOptions {
  voice?: 'zoe' | 'smith';
  onChunkSpoken?: (chunk: string) => void;
  onAllSpoken?: () => void;
  onError?: (error: Error) => void;
}

// ═══ STREAM-TO-STREAM BRIDGE CLASS ═══
class StreamToStreamBridge {
  private textBuffer = '';
  private wordCount = 0;
  private aborted = false;
  private onChunkSpoken?: (chunk: string) => void;
  private onAllSpoken?: () => void;
  private onError?: (error: Error) => void;
  private voice: 'zoe' | 'smith' = 'zoe';
  private pendingChunks = 0;

  async connectStream(
    textStream: AsyncGenerator<string>,
    options: StreamingVoiceOptions = {}
  ): Promise<void> {
    this.reset();
    this.voice = options.voice || 'zoe';
    this.onChunkSpoken = options.onChunkSpoken;
    this.onAllSpoken = options.onAllSpoken;
    this.onError = options.onError;

    console.log('[StreamBridge] 🌊 Starting stream-to-speech pipeline (Browser TTS)');

    try {
      for await (const token of textStream) {
        if (this.aborted) break;
        this.processToken(token);
      }

      if (this.textBuffer.trim()) {
        await this.speakChunk(this.textBuffer.trim());
      }

      await this.waitForComplete();
      this.onAllSpoken?.();
      console.log('[StreamBridge] ✅ Stream complete');
    } catch (error) {
      console.error('[StreamBridge] ❌ Stream error:', error);
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private processToken(token: string): void {
    this.textBuffer += token;
    const lastChar = token.trim().slice(-1);
    const hitPunctuation = PUNCTUATION_TRIGGERS.includes(lastChar);
    const words = this.textBuffer.trim().split(/\s+/);
    this.wordCount = words.length;

    if (hitPunctuation || this.wordCount >= CHUNK_WORD_THRESHOLD) {
      const chunk = this.textBuffer.trim();
      if (chunk) {
        this.speakChunk(chunk);
        this.textBuffer = '';
        this.wordCount = 0;
      }
    }
  }

  private async speakChunk(text: string): Promise<void> {
    if (!text.trim() || this.aborted) return;
    this.pendingChunks++;

    return new Promise<void>((resolve) => {
      if (!('speechSynthesis' in window)) {
        this.pendingChunks--;
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = this.voice === 'smith' ? 0.85 : 0.95;
      utterance.rate = this.voice === 'smith' ? 0.88 : 0.9;
      utterance.volume = 0.85;

      utterance.onend = () => {
        this.pendingChunks--;
        this.onChunkSpoken?.(text);
        resolve();
      };

      utterance.onerror = () => {
        this.pendingChunks--;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  private waitForComplete(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.pendingChunks === 0) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  abort(): void {
    this.aborted = true;
    window.speechSynthesis?.cancel();
    this.reset();
  }

  private reset(): void {
    this.textBuffer = '';
    this.wordCount = 0;
    this.aborted = false;
    this.pendingChunks = 0;
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

export async function speakAsStreaming(
  textStream: AsyncGenerator<string>,
  options?: StreamingVoiceOptions
): Promise<void> {
  return getStreamBridge().connectStream(textStream, options);
}

export function abortStreamingSpeech(): void {
  getStreamBridge().abort();
}

export async function* textToStream(text: string, delayMs = 50): AsyncGenerator<string> {
  const words = text.split(' ');
  for (const word of words) {
    yield word + ' ';
    await new Promise(r => setTimeout(r, delayMs));
  }
}

export async function speakWithChunking(
  text: string,
  options?: StreamingVoiceOptions
): Promise<void> {
  const stream = textToStream(text, 10);
  return speakAsStreaming(stream, options);
}
