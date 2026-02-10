/**
 * Zoe Voice - Hybrid Neural TTS (Deepgram Aura-2 + Browser Fallback)
 * ===================================================================
 * 
 * PRIORITY ORDER:
 * 1. Deepgram Aura-2 (Premium "HER" quality) via edge function
 * 2. Browser-native SpeechSynthesis (FREE fallback)
 * 
 * Features:
 * - Seamless failover from Deepgram to browser TTS
 * - Chrome keep-alive workaround for long utterances
 * - Text chunking for reliability
 * - Proper async cancellation
 */

import { supabase } from '@/integrations/supabase/client';
import { getEffectiveVoiceExperience } from '@/utils/voiceExperienceLock';
import { applyVoiceSettingsToAudio } from '@/stores/zoeInfinityVoiceSettings';

// Voice preference priority for browser fallback
const VOICE_PRIORITIES = [
  'Samantha',           // Mac/iOS - Premium quality
  'Google US English',  // Android/Chrome
  'Microsoft Zira',     // Windows
  'Karen',              // macOS
  'Moira',              // macOS
  'Victoria',           // macOS
  'Fiona',              // macOS
];

/**
 * CALM SOOTHING VOICE FORMULA (Browser fallback):
 * - Lower pitch (0.95) = Warmer, more mature
 * - Slower rate (0.9) = Relaxed, meditative
 * - Slightly lower volume (0.85) = Intimate, gentle
 */
export const ZOE_VOICE_CONFIG = {
  rate: 0.9,
  pitch: 0.95,
  volume: 0.85,
};

export const SMITH_VOICE_CONFIG = {
  rate: 0.88,
  pitch: 0.85,
  volume: 0.9,
};

// Cached voice reference for browser fallback
let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesInitialized = false;
let voiceInitTimestamp = 0;
const VOICE_CACHE_EXPIRY_MS = 60000; // BUG FIX: Re-check voices every 60 seconds

// Chrome bug workaround
let chromeKeepAliveInterval: ReturnType<typeof setInterval> | null = null;

// Current utterance tracking
let currentUtteranceQueue: SpeechSynthesisUtterance[] = [];
let currentChunkIndex = 0;
let isSpeakingActive = false;
let speechCancelled = false;

// Audio element for Deepgram playback
let currentAudioElement: HTMLAudioElement | null = null;

// Track if Deepgram is available (set to false on first failure)
let deepgramAvailable = true;
let lastDeepgramCheck = 0;
const DEEPGRAM_RETRY_INTERVAL = 60000; // Retry Deepgram every 60 seconds after failure

/**
 * Reset Deepgram availability flag - call on page load to ensure fresh attempts
 */
export const resetDeepgramAvailability = (): void => {
  console.log('[ZoeVoice] 🔄 Resetting Deepgram availability flag');
  deepgramAvailable = true;
  lastDeepgramCheck = 0;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHROME KEEP-ALIVE (for browser fallback)
// ═══════════════════════════════════════════════════════════════════════════════

const startChromeKeepAlive = () => {
  stopChromeKeepAlive();
  chromeKeepAliveInterval = setInterval(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10000);
};

const stopChromeKeepAlive = () => {
  if (chromeKeepAliveInterval) {
    clearInterval(chromeKeepAliveInterval);
    chromeKeepAliveInterval = null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT CHUNKING
// ═══════════════════════════════════════════════════════════════════════════════

const splitIntoChunks = (text: string, maxLength = 200): string[] => {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    
    if (currentChunk.length + trimmed.length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmed;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmed;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text];
};

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

const findBestZoeVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  if (!voices.length) return null;
  
  for (const preferredName of VOICE_PRIORITIES) {
    const match = voices.find(v => 
      v.name.toLowerCase().includes(preferredName.toLowerCase()) &&
      v.lang.startsWith('en')
    );
    if (match) return match;
  }
  
  return voices.find(v => v.lang === 'en-US') || voices[0];
};

export const initializeZoeVoices = async (): Promise<void> => {
  // BUG FIX: Re-initialize if cache expired (handles voice changes during session)
  const now = Date.now();
  if (voicesInitialized && now - voiceInitTimestamp < VOICE_CACHE_EXPIRY_MS) {
    return;
  }
  
  if (!('speechSynthesis' in window)) {
    console.warn('[ZoeVoice] SpeechSynthesis not supported');
    return;
  }
  
  return new Promise((resolve) => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const newVoice = findBestZoeVoice(voices);
        // BUG FIX: Only log if voice actually changed
        if (newVoice?.name !== cachedVoice?.name) {
          console.log('[ZoeVoice] Voice initialized:', newVoice?.name || 'default');
        }
        cachedVoice = newVoice;
        voicesInitialized = true;
        voiceInitTimestamp = now;
        resolve();
      }
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    setTimeout(loadVoices, 100);
    setTimeout(loadVoices, 500);
    
    setTimeout(() => {
      if (!voicesInitialized) {
        voicesInitialized = true;
        voiceInitTimestamp = now;
        console.log('[ZoeVoice] Timeout - using default voice');
        resolve();
      }
    }, 1500);
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEEPGRAM AURA-2 TTS (Premium Neural Voice)
// ═══════════════════════════════════════════════════════════════════════════════

const speakWithDeepgram = async (
  text: string,
  voice: 'zoe' | 'smith' = 'zoe',
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error?: any) => void
): Promise<boolean> => {
  // Check if we should retry Deepgram
  const now = Date.now();
  if (!deepgramAvailable && now - lastDeepgramCheck < DEEPGRAM_RETRY_INTERVAL) {
    return false;
  }
  
  try {
    console.log('[ZoeVoice] 🎙️ Attempting Deepgram Aura-2...');
    
    // IMPORTANT: request binary. Without responseType, supabase-js may try JSON parsing
    // and we end up with "Unexpected Deepgram response format".
    const { data, error } = await supabase.functions.invoke('zoe-voice', {
      body: { 
        text, 
        voice,
        encoding: 'mp3'
      },
      // @ts-expect-error - supabase-js supports this at runtime
      responseType: 'arraybuffer',
    });
    
    if (error) {
      console.warn('[ZoeVoice] ⚠️ Deepgram error:', error.message);
      deepgramAvailable = false;
      lastDeepgramCheck = now;
      return false;
    }
    
    // Deepgram function may return JSON fallback; with responseType=arraybuffer it arrives as bytes.
    try {
      if (data instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(new Uint8Array(data)).trim();
        if (text.startsWith('{') || text.startsWith('[')) {
          const maybeJson = JSON.parse(text);
          if (maybeJson?.fallback || maybeJson?.useBrowserFallback) {
            console.log('[ZoeVoice] 📱 Deepgram returned fallback signal, using browser TTS');
            deepgramAvailable = false;
            lastDeepgramCheck = now;
            return false;
          }
        }
      } else if ((data as any)?.fallback || (data as any)?.useBrowserFallback) {
        console.log('[ZoeVoice] 📱 Deepgram returned fallback signal, using browser TTS');
        deepgramAvailable = false;
        lastDeepgramCheck = now;
        return false;
      }
    } catch {
      // ignore JSON decode errors
    }
    
    // If we got audio data, play it
    if (data instanceof Blob || (data && typeof data === 'object' && data.type)) {
      const audioBlob = data instanceof Blob ? data : new Blob([data], { type: 'audio/mp3' });
      await playAudioBlob(audioBlob, onStart, onEnd, onError);
      deepgramAvailable = true;
      return true;
    }
    
    // Handle ArrayBuffer response
    if (data instanceof ArrayBuffer) {
      const audioBlob = new Blob([data], { type: 'audio/mp3' });
      await playAudioBlob(audioBlob, onStart, onEnd, onError);
      deepgramAvailable = true;
      return true;
    }
    
    console.warn('[ZoeVoice] ⚠️ Unexpected Deepgram response format');
    return false;
    
  } catch (err) {
    console.warn('[ZoeVoice] ⚠️ Deepgram failed:', err);
    deepgramAvailable = false;
    lastDeepgramCheck = now;
    return false;
  }
};

const playAudioBlob = async (
  blob: Blob,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error?: any) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Stop any existing audio
    stopCurrentAudio();
    
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    currentAudioElement = audio;
    
    // Apply Zoe Infinity voice settings (cinematic playback rate)
    applyVoiceSettingsToAudio(audio);
    
    audio.onplay = () => {
      console.log('[ZoeVoice] 🔊 Deepgram audio playing');
      isSpeakingActive = true;
      onStart?.();
      window.dispatchEvent(new CustomEvent('zoe-speak'));
    };
    
    audio.onended = () => {
      console.log('[ZoeVoice] ✅ Deepgram audio complete');
      isSpeakingActive = false;
      URL.revokeObjectURL(audioUrl);
      currentAudioElement = null;
      onEnd?.();
      window.dispatchEvent(new CustomEvent('zoe-speak-end'));
      resolve();
    };
    
    audio.onerror = (e) => {
      console.error('[ZoeVoice] ❌ Audio playback error:', e);
      isSpeakingActive = false;
      URL.revokeObjectURL(audioUrl);
      currentAudioElement = null;
      onError?.(e);
      reject(e);
    };
    
    audio.play().catch((err) => {
      console.error('[ZoeVoice] ❌ Audio play failed:', err);
      URL.revokeObjectURL(audioUrl);
      currentAudioElement = null;
      onError?.(err);
      reject(err);
    });
  });
};

const stopCurrentAudio = () => {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.src = '';
    currentAudioElement = null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// BROWSER FALLBACK TTS
// ═══════════════════════════════════════════════════════════════════════════════

const speakNextChunk = (
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error?: any) => void
) => {
  if (speechCancelled) {
    cleanupSpeechState();
    onEnd?.();
    return;
  }
  
  if (currentChunkIndex >= currentUtteranceQueue.length) {
    cleanupSpeechState();
    onEnd?.();
    window.dispatchEvent(new CustomEvent('zoe-speak-end'));
    return;
  }
  
  const utterance = currentUtteranceQueue[currentChunkIndex];
  
  utterance.onstart = () => {
    if (currentChunkIndex === 0) {
      onStart?.();
      window.dispatchEvent(new CustomEvent('zoe-speak'));
    }
  };
  
  utterance.onend = () => {
    currentChunkIndex++;
    setTimeout(() => speakNextChunk(onStart, onEnd, onError), 80);
  };
  
  utterance.onerror = (event) => {
    if (event.error === 'interrupted' || event.error === 'canceled') {
      cleanupSpeechState();
      onEnd?.();
      return;
    }
    console.error('[ZoeVoice] Chunk error:', event.error);
    currentChunkIndex++;
    setTimeout(() => speakNextChunk(onStart, onEnd, onError), 100);
  };
  
  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('[ZoeVoice] Speak failed:', err);
    currentChunkIndex++;
    setTimeout(() => speakNextChunk(onStart, onEnd, onError), 100);
  }
};

const cleanupSpeechState = () => {
  stopChromeKeepAlive();
  currentUtteranceQueue = [];
  currentChunkIndex = 0;
  isSpeakingActive = false;
  speechCancelled = false;
};

const speakWithBrowserTTS = (
  text: string,
  config: typeof ZOE_VOICE_CONFIG,
  voiceOverride?: SpeechSynthesisVoice | null,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error?: any) => void
): void => {
  if (!('speechSynthesis' in window)) {
    console.warn('[ZoeVoice] SpeechSynthesis not available');
    onError?.();
    return;
  }
  
  // Cancel any current speech
  speechCancelled = true;
  window.speechSynthesis.cancel();
  cleanupSpeechState();
  
  speechCancelled = false;
  isSpeakingActive = true;
  
  const chunks = splitIntoChunks(text, 200);
  console.log('[ZoeVoice] 📱 Browser TTS:', chunks.length, 'chunk(s)');
  
  currentUtteranceQueue = chunks.map(chunk => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    
    if (voiceOverride) {
      utterance.voice = voiceOverride;
    } else if (cachedVoice) {
      utterance.voice = cachedVoice;
    }
    
    utterance.pitch = config.pitch;
    utterance.rate = config.rate;
    utterance.volume = config.volume;
    
    return utterance;
  });
  
  currentChunkIndex = 0;
  startChromeKeepAlive();
  speakNextChunk(onStart, onEnd, onError);
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PUBLIC API - HYBRID VOICE (Deepgram → Browser Fallback)
// ═══════════════════════════════════════════════════════════════════════════════

const cleanText = (text: string): string => {
  return text
    .replace(/\[\[[^\]]+\]\]/g, '')           // Remove [[PATTERN:...]] markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')        // Remove markdown bold
    .replace(/\*([^*]+)\*/g, '$1')            // Remove markdown italic
    .replace(/<[^>]+>/g, '')                  // Remove HTML tags
    .replace(/\s+/g, ' ')                     // Normalize whitespace
    .trim();
};

/**
 * SPEAK AS ZOE - Hybrid Neural Voice
 * 1. Try Deepgram Aura-2 (Premium "HER" quality)
 * 2. Fallback to browser SpeechSynthesis (FREE)
 */
export const speakAsZoe = async (
  text: string,
  _options?: any,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error?: any) => void
): Promise<void> => {
  if (!text?.trim()) {
    onEnd?.();
    return;
  }
  
  const cleaned = cleanText(text);
  if (!cleaned) {
    onEnd?.();
    return;
  }
  
  // Stop any current speech
  stopZoeSpeech();
  
  // Try Deepgram first
  const deepgramSuccess = await speakWithDeepgram(cleaned, 'zoe', onStart, onEnd, onError);
  
  if (!deepgramSuccess) {
    // Zoe Infinity requirement: DO NOT use browser-native fallback.
    if (getEffectiveVoiceExperience() === 'zoe-infinity') {
      console.warn('[ZoeVoice] Deepgram unavailable (Infinity mode; no browser fallback)');
      onError?.(new Error('Deepgram voice unavailable'));
      onEnd?.();
      window.dispatchEvent(new CustomEvent('zoe-speak-end'));
      return;
    }

    // Fallback to browser TTS (classic/MMORA only)
    console.log('[ZoeVoice] 📱 Falling back to browser TTS');
    speakWithBrowserTTS(cleaned, ZOE_VOICE_CONFIG, cachedVoice, onStart, onEnd, onError);
  }
};

/**
 * SPEAK AS SMITH - Hybrid Neural Voice (Male persona)
 */
export const speakAsSmithVoice = async (
  text: string,
  _options?: any,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error?: any) => void
): Promise<void> => {
  if (!text?.trim()) {
    onEnd?.();
    return;
  }
  
  const cleaned = cleanText(text);
  if (!cleaned) {
    onEnd?.();
    return;
  }
  
  stopZoeSpeech();
  
  // Try Deepgram first
  const deepgramSuccess = await speakWithDeepgram(cleaned, 'smith', onStart, onEnd, onError);
  
  if (!deepgramSuccess) {
    if (getEffectiveVoiceExperience() === 'zoe-infinity') {
      console.warn('[ZoeVoice] Deepgram unavailable (Infinity mode; no browser fallback)');
      onError?.(new Error('Deepgram voice unavailable'));
      onEnd?.();
      window.dispatchEvent(new CustomEvent('zoe-speak-end'));
      return;
    }

    // Find male voice for fallback
    const voices = window.speechSynthesis?.getVoices() || [];
    const maleVoice = voices.find(v => 
      ['Daniel', 'Alex', 'David', 'Male', 'Fred', 'Thomas', 'James'].some(name => 
        v.name.toLowerCase().includes(name.toLowerCase())
      ) && v.lang.startsWith('en')
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    
    speakWithBrowserTTS(cleaned, SMITH_VOICE_CONFIG, maleVoice, onStart, onEnd, onError);
  }
};

export const speakAsSmith = speakAsSmithVoice;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const stopZoeSpeech = (): void => {
  // Stop Deepgram audio
  stopCurrentAudio();
  
  // Stop browser TTS
  if ('speechSynthesis' in window) {
    speechCancelled = true;
    window.speechSynthesis.cancel();
    cleanupSpeechState();
  }
  
  isSpeakingActive = false;
  window.dispatchEvent(new CustomEvent('zoe-speak-end'));
};

export const stopSpeaking = stopZoeSpeech;

export const isZoeSpeaking = (): boolean => {
  const audioPlaying = currentAudioElement && !currentAudioElement.paused;
  const browserSpeaking = 'speechSynthesis' in window && window.speechSynthesis.speaking;
  return isSpeakingActive || audioPlaying || browserSpeaking;
};

export const isAssistantSpeaking = isZoeSpeaking;

export const pauseZoeSpeech = (): void => {
  if (currentAudioElement) {
    currentAudioElement.pause();
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.pause();
  }
};

export const pauseSpeaking = pauseZoeSpeech;

export const resumeZoeSpeech = (): void => {
  if (currentAudioElement) {
    currentAudioElement.play();
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.resume();
  }
};

export const resumeSpeaking = resumeZoeSpeech;

export const getZoeSpeechState = () => ({
  isSpeakingActive: isZoeSpeaking(),
  hasSynthesis: 'speechSynthesis' in window,
  isSynthesisSpeaking: 'speechSynthesis' in window ? window.speechSynthesis.speaking : false,
  isPaused: 'speechSynthesis' in window ? window.speechSynthesis.paused : false,
  voiceName: cachedVoice?.name || null,
  chunksRemaining: currentUtteranceQueue.length - currentChunkIndex,
  deepgramAvailable,
  usingDeepgram: currentAudioElement !== null,
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

export const getCurrentAssistant = () => 'zoe' as const;
export const setCurrentAssistant = (_: any) => {};
export const detectAssistantFromInput = (_: string) => 'zoe' as const;
export type AssistantVoiceType = 'zoe' | 'smith';

export const VOICE_CONFIGS = {
  zoe: ZOE_VOICE_CONFIG,
  smith: SMITH_VOICE_CONFIG,
};

export const replayAsZoe = async (
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> => {
  if (!text?.trim()) return;
  await speakAsZoe(text, undefined, onStart, onEnd);
};

export const initializeAssistantVoices = initializeZoeVoices;
export { findBestZoeVoice as findBestVoice };
