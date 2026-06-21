/**
 * Zoe Voice - Deepgram Aura 2 TTS (Primary) + Browser Fallback
 * ==============================================================
 * Primary: Deepgram Aura 2 "aura-2-janus-en" (feminine, warm, expressive)
 * Fallback: Browser SpeechSynthesis API
 * Features:
 * - Deepgram Aura 2 premium voice as primary
 * - Automatic fallback to browser TTS on failure
 * - Chrome keep-alive workaround for long utterances
 * - Text chunking for reliability
 */

import { speakWithDeepgram, stopDeepgramSpeech, isDeepgramPlaying } from './deepgramTTS';

// Voice preference priority
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
 * CALM SOOTHING VOICE FORMULA:
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

// Cached voice reference
let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesInitialized = false;
let voiceInitTimestamp = 0;
const VOICE_CACHE_EXPIRY_MS = 60000;

// Chrome bug workaround
let chromeKeepAliveInterval: ReturnType<typeof setInterval> | null = null;

// Current utterance tracking
let currentUtteranceQueue: SpeechSynthesisUtterance[] = [];
let currentChunkIndex = 0;
let isSpeakingActive = false;
let speechCancelled = false;

// ═══════════════════════════════════════════════════════════════════════════════
// CHROME KEEP-ALIVE
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
// BROWSER TTS
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
// MAIN PUBLIC API
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
 * SPEAK AS ZOE - Browser Native Voice
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
  
  // Try Deepgram Aura 2 first (premium voice)
  console.log('[ZoeVoice] 🎙️ Attempting Deepgram Aura 2 (aura-2-janus-en)...');
  const deepgramSuccess = await speakWithDeepgram(cleaned, onStart, onEnd, (err) => {
    console.warn('[ZoeVoice] Deepgram failed, falling back to browser TTS:', err?.message);
  });
  
  if (deepgramSuccess) {
    console.log('[ZoeVoice] ✅ Deepgram Aura 2 playing');
    return;
  }
  
  // Fallback to browser TTS
  console.log('[ZoeVoice] 📱 Falling back to browser TTS');
  await initializeZoeVoices();
  speakWithBrowserTTS(cleaned, ZOE_VOICE_CONFIG, cachedVoice, onStart, onEnd, onError);
};

/**
 * SPEAK AS SMITH - Browser Native Voice (Male persona)
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
  
  // Find male voice
  const voices = window.speechSynthesis?.getVoices() || [];
  const maleVoice = voices.find(v => 
    ['Daniel', 'Alex', 'David', 'Male', 'Fred', 'Thomas', 'James'].some(name => 
      v.name.toLowerCase().includes(name.toLowerCase())
    ) && v.lang.startsWith('en')
  ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
  
  speakWithBrowserTTS(cleaned, SMITH_VOICE_CONFIG, maleVoice, onStart, onEnd, onError);
};

export const speakAsSmith = speakAsSmithVoice;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const stopZoeSpeech = (): void => {
  // Stop Deepgram audio
  stopDeepgramSpeech();
  
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
  const browserSpeaking = 'speechSynthesis' in window && window.speechSynthesis.speaking;
  return isSpeakingActive || browserSpeaking || isDeepgramPlaying();
};

export const isAssistantSpeaking = isZoeSpeaking;

export const pauseZoeSpeech = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.pause();
  }
};

export const pauseSpeaking = pauseZoeSpeech;

export const resumeZoeSpeech = (): void => {
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
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY STUBS
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
