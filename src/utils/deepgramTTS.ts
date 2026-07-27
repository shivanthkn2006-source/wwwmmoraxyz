/**
 * Deepgram Aura 2 TTS Client - Fast-Start Streaming Queue
 * ========================================================
 * Optimized for low time-to-first-audio:
 * 1) Split response into short sentence chunks
 * 2) Fetch first chunk immediately
 * 3) Fetch remaining chunks in parallel while first chunk is playing
 * 4) Play all chunks sequentially in order
 */

import { supabase } from '@/integrations/supabase/client';
import type { TTSAudioMetadata } from './zoeTTSAudioBus';

/** Resolve current user's access token (or null if unauthenticated). */
async function getActiveAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

const DEEPGRAM_MODEL_FEMALE = 'aura-2-janus-en';
const DEEPGRAM_MODEL_MALE = 'aura-2-orion-en';
const MAX_CHUNK_CHARS = 180;

/** Get the active Deepgram voice model based on stored voice persona */
function getActiveModel(): string {
  try {
    const pref = localStorage.getItem('zoe_voice_persona');
    if (pref === 'male') return DEEPGRAM_MODEL_MALE;
  } catch {}
  return DEEPGRAM_MODEL_FEMALE;
}
const FIRST_CHUNK_MAX_CHARS = 120;

let currentAudio: HTMLAudioElement | null = null;
let isDeepgramSpeaking = false;
let isQueuePlaying = false;
let aborted = false;
let currentOnEnd: (() => void) | undefined;
let currentOnError: ((error: Error) => void) | undefined;

function buildChunkMetadata(fullText: string, chunks: string[]): TTSAudioMetadata[] {
  let cursor = 0;
  return chunks.map((chunk, index) => {
    const trimmed = chunk.trim();
    const found = fullText.indexOf(trimmed, cursor);
    const charStart = found >= 0 ? found : cursor;
    const charEnd = Math.min(fullText.length, charStart + trimmed.length);
    cursor = charEnd;
    return {
      charStart,
      charEnd,
      chunkText: trimmed,
      chunkIndex: index,
      totalChunks: chunks.length,
    };
  });
}

/**
 * Split text into sentence-level chunks for reliable and fast playback.
 */
function splitIntoSentences(text: string): string[] {
  const raw = text.match(/[^.!?]*[.!?]+[\s]*/g) || [text];
  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of raw) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (buffer.length + trimmed.length + 1 <= MAX_CHUNK_CHARS) {
      buffer = buffer ? `${buffer} ${trimmed}` : trimmed;
    } else {
      if (buffer) chunks.push(buffer);
      buffer = trimmed;
    }
  }

  if (buffer) chunks.push(buffer);

  const normalized = chunks.length > 0 ? chunks : [text.trim()];
  if (normalized.length === 0) return [text];

  // Force a very short lead chunk so first audio starts quicker.
  const first = normalized[0];
  if (first.length > FIRST_CHUNK_MAX_CHARS) {
    const splitAt = first
      .slice(0, FIRST_CHUNK_MAX_CHARS)
      .replace(/\s+\S*$/, '')
      .trim().length;

    if (splitAt > 40) {
      const lead = first.slice(0, splitAt).trim();
      const rest = first.slice(splitAt).trim();
      return [lead, ...(rest ? [rest] : []), ...normalized.slice(1)];
    }
  }

  return normalized;
}

/**
 * Fetch a single audio chunk from Deepgram (no playback).
 */
async function fetchChunk(text: string, model?: string): Promise<Blob> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/deepgram-tts`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
      // Auth gate (added Apr 2026): TTS now requires a Bearer token to prevent
      // uncapped Deepgram billing if the publishable key is scraped.
      Authorization: `Bearer ${(await getActiveAccessToken()) || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''}`,
    },
    body: JSON.stringify({ text, model: model || getActiveModel() }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Deepgram TTS failed [${response.status}]: ${errorData}`);
  }

  return response.blob();
}

/**
 * Play a single audio blob and resolve when it completes.
 */
function playBlob(
  blob: Blob,
  onPlaybackStart?: () => void,
  metadata: TTSAudioMetadata | null = null
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    // CORS-safe so Web Audio analyser can read samples (lip-sync)
    try { audio.crossOrigin = 'anonymous'; } catch { /* noop */ }
    let started = false;
    let resolved = false;

    const cleanup = (result: boolean) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(safetyTimer);
      isDeepgramSpeaking = false;
      URL.revokeObjectURL(audioUrl);
      if (currentAudio === audio) currentAudio = null;
      // Lip-sync: notify bus that audio is gone
      import('./zoeTTSAudioBus').then(bus => bus.clearTTSAudio(audio)).catch(() => {});
      resolve(result);
    };

    const safeStart = () => {
      if (started) return;
      started = true;
      // Lip-sync: publish active audio so 3D avatar can tap amplitude
      import('./zoeTTSAudioBus').then(bus => bus.publishTTSAudio(audio, metadata)).catch(() => {});
      onPlaybackStart?.();
    };

    // Safety timeout: if onended never fires (mobile/PWA bug), resolve after duration + 3s
    // For short chunks, use 30s max fallback
    const safetyMs = Math.max((audio.duration || 30) * 1000 + 3000, 8000);
    const safetyTimer = setTimeout(() => {
      if (!resolved) {
        console.warn('[DeepgramTTS] ⏰ Safety timeout fired — audio may have stalled');
        try { audio.pause(); } catch {}
        cleanup(true); // treat as success to continue queue
      }
    }, safetyMs);

    currentAudio = audio;
    isDeepgramSpeaking = true;

    audio.onplaying = () => safeStart();

    // Update safety timer once we know actual duration
    audio.onloadedmetadata = () => {
      if (!resolved && audio.duration && isFinite(audio.duration)) {
        clearTimeout(safetyTimer);
        const accurateMs = audio.duration * 1000 + 3000;
        setTimeout(() => {
          if (!resolved) {
            console.warn('[DeepgramTTS] ⏰ Duration-based timeout fired');
            try { audio.pause(); } catch {}
            cleanup(true);
          }
        }, accurateMs);
      }
    };

    audio.onended = () => cleanup(true);

    audio.onerror = (e) => {
      console.warn('[DeepgramTTS] Audio element error:', e);
      cleanup(false);
    };

    audio.play().catch((err) => {
      console.warn('[DeepgramTTS] audio.play() rejected:', err?.message || err);
      cleanup(false);
    });
  });
}

export const speakWithDeepgram = async (
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: Error) => void
): Promise<boolean> => {
  if (!text?.trim()) {
    onEnd?.();
    return false;
  }

  stopDeepgramSpeech();

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) {
    onError?.(new Error('No project ID'));
    return false;
  }

  aborted = false;
  currentOnEnd = onEnd;
  currentOnError = onError;

  try {
    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) throw new Error('No valid chunks to synthesize');
    const chunkMetadata = buildChunkMetadata(text, sentences);

    const startedAt = performance.now();
    const activeModel = getActiveModel();
    console.log(`[DeepgramTTS] 🎙️ Fast-start synthesis: ${sentences.length} chunks (${activeModel})`);

    const [firstText, ...remainingText] = sentences;
    const [firstMetadata, ...remainingMetadata] = chunkMetadata;

    // Start fetching the first chunk + remaining chunks in parallel.
    const firstChunkPromise = fetchChunk(firstText, activeModel);
    const remainingChunkPromises = remainingText.map((sentence, index) =>
      fetchChunk(sentence, activeModel).then(
        (blob) => ({ ok: true as const, blob, metadata: remainingMetadata[index] ?? null }),
        (error) => ({ ok: false as const, error })
      )
    );

    const firstBlob = await firstChunkPromise;
    if (aborted) return false;

    let emittedStart = false;
    const firstOk = await playBlob(firstBlob, () => {
      if (emittedStart) return;
      emittedStart = true;
      const latency = Math.round(performance.now() - startedAt);
      console.log(`[DeepgramTTS] ✅ First audio started in ${latency}ms`);
      onStart?.();
      window.dispatchEvent(new CustomEvent('zoe-speak'));
      window.dispatchEvent(new CustomEvent('zoe-speak-start'));
    }, firstMetadata ?? null);

    if (!firstOk || aborted) {
      window.dispatchEvent(new CustomEvent('zoe-speak-end'));
      currentOnEnd?.();
      return !firstOk ? false : false;
    }

    // Continue in strict order, but without delaying first playback.
    for (const pending of remainingChunkPromises) {
      if (aborted) break;

      const result = await pending;
      if (result.ok === false) {
        console.warn('[DeepgramTTS] Chunk fetch failed:', result.error);
        continue;
      }

      const ok = await playBlob(result.blob, undefined, result.metadata);
      if (!ok || aborted) break;
    }

    if (!aborted) {
      window.dispatchEvent(new CustomEvent('zoe-speak-end'));
      currentOnEnd?.();
    }

    return true;
  } catch (error) {
    isDeepgramSpeaking = false;
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    console.error('[DeepgramTTS] ❌ Error:', normalizedError);
    currentOnError?.(normalizedError);
    return false;
  } finally {
    isQueuePlaying = false;
    currentOnEnd = undefined;
    currentOnError = undefined;
  }
};

export const stopDeepgramSpeech = (): void => {
  aborted = true;
  isQueuePlaying = false;
  currentOnEnd = undefined;
  currentOnError = undefined;

  if (currentAudio) {
    import('./zoeTTSAudioBus').then(bus => bus.clearTTSAudio(currentAudio || undefined)).catch(() => {});
    currentAudio.pause();
    if (currentAudio.src) {
      URL.revokeObjectURL(currentAudio.src);
    }
    currentAudio = null;
  }

  isDeepgramSpeaking = false;
};

export const pauseDeepgramSpeech = (): void => {
  if (!currentAudio || currentAudio.paused) return;
  currentAudio.pause();
};

export const resumeDeepgramSpeech = (): void => {
  if (!currentAudio || !currentAudio.paused) return;
  currentAudio.play().catch((err) => {
    console.warn('[DeepgramTTS] audio.resume() rejected:', err?.message || err);
  });
};

export const isDeepgramPaused = (): boolean => {
  return isDeepgramSpeaking && currentAudio !== null && currentAudio.paused;
};

export const isDeepgramPlaying = (): boolean => {
  return isDeepgramSpeaking && currentAudio !== null && !currentAudio.paused;
};

export const testDeepgramConnection = async (): Promise<boolean> => {
  try {
    const success = await speakWithDeepgram('Hello.', undefined, undefined, undefined);
    stopDeepgramSpeech();
    return success;
  } catch {
    return false;
  }
};
