/**
 * ZOE - Deepgram Aura 2 + Browser-Native Voice System
 * Unified Assistant Voice Configuration
 * 
 * Primary: Deepgram Aura 2 "aura-2-janus-en" (feminine, warm, expressive)
 * Fallback: Browser Web Speech API
 * Supports dynamic switching between Zoe (female) and Smith (male) voices.
 */

import { speakWithDeepgram, stopDeepgramSpeech, isDeepgramPlaying } from './deepgramTTS';

export type AssistantVoiceType = 'Zoe' | 'Smith';

interface VoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
}

export const VOICE_CONFIGS: Record<AssistantVoiceType, VoiceSettings> = {
  Zoe: {
    rate: 1.0,
    pitch: 1.1,
    volume: 0.95,
  },
  Smith: {
    rate: 1.0,
    pitch: 0.9,
    volume: 1.0,
  }
};

// Preferred voice patterns for each assistant
const ZOE_VOICE_PATTERNS = [
  'Samantha', 'Google UK English Female', 'Microsoft Zira',
  'Karen', 'Victoria', 'Tessa', 'Susan',
];

const SMITH_VOICE_PATTERNS = [
  'Daniel', 'Alex', 'Google UK English Male', 'Microsoft David',
  'Fred', 'Thomas', 'Oliver', 'James',
];

// Current active assistant
let currentAssistant: AssistantVoiceType = 'Zoe';
let isSpeakingActive = false;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
let pauseMonitorInterval: ReturnType<typeof setInterval> | null = null;

// Utterance queue for chunked speech
let utteranceQueue: SpeechSynthesisUtterance[] = [];
let currentChunkIndex = 0;
let speechCancelled = false;

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
  
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.length > 0 ? chunks : [text];
};

export const getCurrentAssistant = (): AssistantVoiceType => currentAssistant;

export const setCurrentAssistant = (assistant: AssistantVoiceType): void => {
  if (currentAssistant !== assistant) {
    console.log(`[Voice] Switching assistant: ${currentAssistant} → ${assistant}`);
    currentAssistant = assistant;
    window.dispatchEvent(new CustomEvent('assistant-changed', { detail: { assistant } }));
  }
};

export const detectAssistantFromInput = (text: string): AssistantVoiceType | null => {
  const lower = text.toLowerCase();
  const zoePatterns = [/\bzoe\b/, /\bzoey\b/, /\bzo\b/];
  const smithPatterns = [/\bsmith\b/, /\bsmyth\b/];
  
  for (const pattern of smithPatterns) {
    if (pattern.test(lower)) return 'Smith';
  }
  for (const pattern of zoePatterns) {
    if (pattern.test(lower)) return 'Zoe';
  }
  return null;
};

export const findBestVoice = (assistant: AssistantVoiceType): SpeechSynthesisVoice | null => {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  
  const patterns = assistant === 'Smith' ? SMITH_VOICE_PATTERNS : ZOE_VOICE_PATTERNS;

  for (const preferred of patterns) {
    const voice = voices.find(v => v.name.includes(preferred));
    if (voice) return voice;
  }

  if (assistant === 'Smith') {
    const maleVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('male') || 
       ['alex', 'daniel', 'david', 'james', 'tom', 'fred'].some(name => 
         v.name.toLowerCase().includes(name)
       ))
    );
    if (maleVoice) return maleVoice;
  } else {
    const femaleVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('woman') ||
       ['samantha', 'karen', 'victoria', 'susan', 'zira', 'tessa'].some(name => 
         v.name.toLowerCase().includes(name)
       ))
    );
    if (femaleVoice) return femaleVoice;
  }

  return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
};

const cleanupSpeechState = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  if (pauseMonitorInterval) {
    clearInterval(pauseMonitorInterval);
    pauseMonitorInterval = null;
  }
  isSpeakingActive = false;
  currentUtterance = null;
  utteranceQueue = [];
  currentChunkIndex = 0;
  speechCancelled = false;
};

const chromeKeepAlive = () => {
  if (!isSpeakingActive) return;
  const synth = window.speechSynthesis;
  if (synth.paused) {
    synth.resume();
    return;
  }
  if (synth.speaking) {
    synth.pause();
    synth.resume();
  }
};

const ensureAudioEngineAwake = (): void => {
  if ((window as any).__zoeAudioContext) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
    (window as any).__zoeAudioContext = audioCtx;
  } catch (e) {
    console.warn('[Voice] Audio wake-up fallback failed:', e);
  }
};

const ensureSynthesisReady = async (): Promise<boolean> => {
  if (!('speechSynthesis' in window)) return false;
  ensureAudioEngineAwake();
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    await new Promise<void>(resolve => {
      const timeout = setTimeout(resolve, 500);
      window.speechSynthesis.onvoiceschanged = () => {
        clearTimeout(timeout);
        window.speechSynthesis.onvoiceschanged = null;
        resolve();
      };
    });
  }
  return window.speechSynthesis.getVoices().length > 0;
};

const speakNextChunk = (
  assistant: AssistantVoiceType,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error?: Error | any) => void
) => {
  if (speechCancelled) {
    cleanupSpeechState();
    onEnd?.();
    return;
  }
  
  if (currentChunkIndex >= utteranceQueue.length) {
    cleanupSpeechState();
    window.dispatchEvent(new CustomEvent('assistant-speak-end', { detail: { assistant } }));
    onEnd?.();
    return;
  }
  
  const utterance = utteranceQueue[currentChunkIndex];
  currentUtterance = utterance;
  
  utterance.onstart = () => {
    if (currentChunkIndex === 0) {
      console.log(`[Voice] ${assistant} started speaking`);
      onStart?.();
    }
  };
  
  utterance.onend = () => {
    currentChunkIndex++;
    setTimeout(() => speakNextChunk(assistant, onStart, onEnd, onError), 80);
  };
  
  utterance.onerror = (event) => {
    if (event.error === 'interrupted' || event.error === 'canceled') {
      cleanupSpeechState();
      onEnd?.();
      return;
    }
    console.error('[Voice] Chunk error:', event.error);
    currentChunkIndex++;
    setTimeout(() => speakNextChunk(assistant, onStart, onEnd, onError), 100);
  };
  
  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('[Voice] Speak chunk failed:', err);
    currentChunkIndex++;
    setTimeout(() => speakNextChunk(assistant, onStart, onEnd, onError), 100);
  }
};

/**
 * Speaks text with the current assistant's voice (browser-native only)
 */
export const speakAs = async (
  text: string,
  overrideAssistant?: AssistantVoiceType,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error?: Error | any) => void
): Promise<void> => {
  if (!text || !text.trim()) {
    onEnd?.();
    return;
  }

  const cleanText = text
    .replace(/\[\[(PATTERN|MEMORY):[^\]]+\]\]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
    
  if (!cleanText) {
    onEnd?.();
    return;
  }

  const detectedAssistant = detectAssistantFromInput(cleanText);
  const assistant = overrideAssistant || detectedAssistant || currentAssistant;
  
  if (detectedAssistant && !overrideAssistant) {
    setCurrentAssistant(detectedAssistant);
  }

  // Stop any existing speech
  speechCancelled = true;
  stopSpeaking();
  await new Promise(resolve => setTimeout(resolve, 50));

  localStorage.setItem('assistant-last-spoken', cleanText);
  window.dispatchEvent(new CustomEvent('assistant-speak', { detail: { text: cleanText, assistant } }));

  // For Zoe: Try Deepgram Aura 2 first (premium voice)
  if (assistant === 'Zoe') {
    console.log('[Voice] 🎙️ Attempting Deepgram Aura 2 (aura-2-janus-en) for Zoe...');
    const deepgramSuccess = await speakWithDeepgram(cleanText, onStart, onEnd, (err) => {
      console.warn('[Voice] Deepgram failed, falling back to browser TTS:', err?.message);
    });
    
    if (deepgramSuccess) {
      console.log('[Voice] ✅ Deepgram Aura 2 playing as Zoe');
      return;
    }
    console.log('[Voice] 📱 Deepgram unavailable, falling back to browser TTS');
  }

  // Browser Native Web Speech API (fallback for Zoe, primary for Smith)
  if (!('speechSynthesis' in window)) {
    console.warn('[Voice] Speech synthesis not supported');
    onError?.(new Error('Speech synthesis not supported'));
    return;
  }

  await ensureSynthesisReady();
  
  speechCancelled = false;
  isSpeakingActive = true;
  currentChunkIndex = 0;

  const chunks = splitIntoChunks(cleanText, 200);
  console.log(`[Voice] 📱 Browser TTS as ${assistant}:`, chunks.length, 'chunk(s)');

  const settings = VOICE_CONFIGS[assistant];
  const voice = findBestVoice(assistant);
  
  if (voice) {
    console.log(`[Voice] Using voice: ${voice.name}`);
  }

  utteranceQueue = chunks.map(chunk => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;
    if (voice) utterance.voice = voice;
    return utterance;
  });

  keepAliveInterval = setInterval(() => {
    if (isSpeakingActive && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10000);
  
  pauseMonitorInterval = setInterval(() => {
    if (!isSpeakingActive) return;
    if (window.speechSynthesis.paused && isSpeakingActive) {
      window.speechSynthesis.resume();
    }
  }, 500);

  speakNextChunk(assistant, onStart, onEnd, onError);
};

export const stopSpeaking = (): void => {
  stopDeepgramSpeech();
  cleanupSpeechState();
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('[Voice] Cancel error:', e);
    }
  }
};

export const isAssistantSpeaking = (): boolean => {
  if (!('speechSynthesis' in window)) return isDeepgramPlaying();
  return isSpeakingActive || window.speechSynthesis.speaking || isDeepgramPlaying();
};

export const pauseSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.pause();
  }
};

export const resumeSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.resume();
  }
};

export const getAssistantSpeechState = () => ({
  isSpeakingActive,
  hasSynthesis: 'speechSynthesis' in window,
  isSynthesisSpeaking: 'speechSynthesis' in window ? window.speechSynthesis.speaking : false,
  isPaused: 'speechSynthesis' in window ? window.speechSynthesis.paused : false,
  currentAssistant,
  chunksRemaining: utteranceQueue.length - currentChunkIndex,
});

export const initializeAssistantVoices = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('[Voice] Speech synthesis not supported');
      resolve();
      return;
    }

    cleanupSpeechState();
    try { window.speechSynthesis.cancel(); } catch (e) {}

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const smithVoice = findBestVoice('Smith');
      const zoeVoice = findBestVoice('Zoe');
      console.log(`[Voice] Initialized. Smith: ${smithVoice?.name || 'default'}, Zoe: ${zoeVoice?.name || 'default'}`);
      resolve();
      return;
    }

    const onVoicesChanged = () => {
      const loadedVoices = window.speechSynthesis.getVoices();
      const smithVoice = findBestVoice('Smith');
      const zoeVoice = findBestVoice('Zoe');
      console.log(`[Voice] Voices loaded: ${loadedVoices.length}. Smith: ${smithVoice?.name || 'default'}, Zoe: ${zoeVoice?.name || 'default'}`);
      window.speechSynthesis.onvoiceschanged = null;
      resolve();
    };
    
    window.speechSynthesis.onvoiceschanged = onVoicesChanged;

    setTimeout(() => {
      window.speechSynthesis.onvoiceschanged = null;
      resolve();
    }, 2000);
  });
};

// Backwards compatibility
export const speakAsZoe = (
  text: string,
  options?: Partial<VoiceSettings>,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error?: Error | any) => void
) => speakAs(text, 'Zoe', onStart, onEnd, onError);

export const speakAsSmith = (
  text: string,
  options?: Partial<VoiceSettings>,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error?: Error | any) => void
) => speakAs(text, 'Smith', onStart, onEnd, onError);

export const stopZoeSpeech = stopSpeaking;
export const isZoeSpeaking = isAssistantSpeaking;
export const initializeZoeVoices = initializeAssistantVoices;
