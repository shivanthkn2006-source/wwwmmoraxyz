/**
 * ZOE INFINITY - BIOLOGICAL VOICE PROTOCOL
 * Unified Assistant Voice Configuration (Zero Cost)
 * 
 * Supports dynamic switching between Zoe (female) and Smith (male) voices
 * Using browser-native Web Speech API with Persona Tuning
 * 
 * The Physics:
 * - Pitch shift hacks human brain to perceive personality
 * - Rate shift creates emotional intelligence perception
 * 
 * Zoe (Female): Pitch 1.15 (Bright), Rate 1.05 (Quick-witted)
 * Smith (Male): Pitch 0.85 (Deep), Rate 0.95 (Calculated)
 */

export type AssistantVoiceType = 'Zoe' | 'Smith';

interface VoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
}

/**
 * ZOE PROTOCOL: "BIOLOGICAL VOICE" (Zero Cost)
 * 
 * Persona Tuning via Web Speech API physics:
 * - Pitch: Creates perceived gender/personality
 * - Rate: Creates perceived intelligence/emotion
 * - Volume: Creates perceived confidence
 */
export const VOICE_CONFIGS: Record<AssistantVoiceType, VoiceSettings> = {
  Zoe: {
    rate: 1.0,       // Normal speed (natural pacing)
    pitch: 1.1,      // Slightly higher (warm personality)
    volume: 0.95,    // Clear presence
  },
  Smith: {
    rate: 1.0,       // Normal speed (natural pacing)
    pitch: 0.9,      // Slightly lower (authoritative)
    volume: 1.0,     // Confident presence
  }
};

// Preferred voice patterns for each assistant
const ZOE_VOICE_PATTERNS = [
  'Samantha',
  'Google UK English Female',
  'Microsoft Zira',
  'Karen',
  'Victoria',
  'Tessa',
  'Susan',
];

const SMITH_VOICE_PATTERNS = [
  'Daniel',
  'Alex',
  'Google UK English Male',
  'Microsoft David',
  'Fred',
  'Thomas',
  'Oliver',
  'James',
];

// Current active assistant (global state for voice system)
let currentAssistant: AssistantVoiceType = 'Zoe';
let isSpeakingActive = false;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
let pauseMonitorInterval: ReturnType<typeof setInterval> | null = null;

// Utterance queue for chunked speech
let utteranceQueue: SpeechSynthesisUtterance[] = [];
let currentChunkIndex = 0;
let speechCancelled = false;

// Split text into chunks at sentence boundaries for reliable playback
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

/**
 * Get the current active assistant
 */
export const getCurrentAssistant = (): AssistantVoiceType => currentAssistant;

/**
 * Set the active assistant (Zoe or Smith)
 */
export const setCurrentAssistant = (assistant: AssistantVoiceType): void => {
  if (currentAssistant !== assistant) {
    console.log(`[Voice] Switching assistant: ${currentAssistant} → ${assistant}`);
    currentAssistant = assistant;
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('assistant-changed', { detail: { assistant } }));
  }
};

/**
 * Detect which assistant the user is addressing from input text
 * Returns the detected assistant name or null if no wake word found
 */
export const detectAssistantFromInput = (text: string): AssistantVoiceType | null => {
  const lower = text.toLowerCase();
  
  // Check for explicit name mentions
  const zoePatterns = [/\bzoe\b/, /\bzoey\b/, /\bzo\b/];
  const smithPatterns = [/\bsmith\b/, /\bsmyth\b/];
  
  for (const pattern of smithPatterns) {
    if (pattern.test(lower)) return 'Smith';
  }
  
  for (const pattern of zoePatterns) {
    if (pattern.test(lower)) return 'Zoe';
  }
  
  return null; // No explicit mention - use current assistant
};

/**
 * Find the best available voice for the specified assistant
 */
export const findBestVoice = (assistant: AssistantVoiceType): SpeechSynthesisVoice | null => {
  if (!('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  
  const patterns = assistant === 'Smith' ? SMITH_VOICE_PATTERNS : ZOE_VOICE_PATTERNS;

  // Try preferred voices first
  for (const preferred of patterns) {
    const voice = voices.find(v => v.name.includes(preferred));
    if (voice) return voice;
  }

  // Fallback: find any English voice that sounds appropriate
  if (assistant === 'Smith') {
    // Look for male-sounding voices
    const maleVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('male') || 
       ['alex', 'daniel', 'david', 'james', 'tom', 'fred'].some(name => 
         v.name.toLowerCase().includes(name)
       ))
    );
    if (maleVoice) return maleVoice;
  } else {
    // Look for female-sounding voices
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

  // Ultimate fallback
  return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
};

/**
 * Complete cleanup of speech state
 */
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

/**
 * Chrome bug workaround
 */
const chromeKeepAlive = () => {
  if (!isSpeakingActive) return;
  
  const synth = window.speechSynthesis;
  
  if (synth.paused) {
    console.log('[Voice] Detected pause, resuming...');
    synth.resume();
    return;
  }
  
  if (synth.speaking) {
    synth.pause();
    synth.resume();
  }
};

/**
 * STEP 4 CONNECTION: Get pre-warmed AudioContext from AuthPage
 * This prevents garbage collection on M05/low-end devices
 */
const getPreWarmedAudioContext = (): AudioContext | null => {
  return (window as any).__zoeAudioContext || null;
};

/**
 * Wake up audio engine if not already done (fallback for direct voice calls)
 */
const ensureAudioEngineAwake = (): void => {
  if ((window as any).__zoeAudioContext) return; // Already awake
  
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
    console.log('[Voice] Audio engine wake-up (fallback)');
  } catch (e) {
    console.warn('[Voice] Audio wake-up fallback failed:', e);
  }
};

/**
 * Ensure speech synthesis is ready before speaking
 */
const ensureSynthesisReady = async (): Promise<boolean> => {
  if (!('speechSynthesis' in window)) return false;
  
  // STEP 4: Ensure audio engine is awake for M05/low-end devices
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

/**
 * Speak next chunk in queue
 */
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
 * Speaks text with the current assistant's voice
 * Auto-detects assistant from text if wake word is present
 * Uses chunking for reliable long-text playback
 */
export const speakAs = async (
  text: string,
  overrideAssistant?: AssistantVoiceType,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error?: Error | any) => void
): Promise<void> => {
  if (!('speechSynthesis' in window)) {
    console.warn('[Voice] Speech synthesis not supported');
    onError?.(new Error('Speech synthesis not supported'));
    return;
  }

  if (!text || !text.trim()) {
    onEnd?.();
    return;
  }

  // Clean the text
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

  // Determine which assistant to use
  const detectedAssistant = detectAssistantFromInput(cleanText);
  const assistant = overrideAssistant || detectedAssistant || currentAssistant;
  
  if (detectedAssistant && !overrideAssistant) {
    setCurrentAssistant(detectedAssistant);
  }

  // Stop any existing speech
  speechCancelled = true;
  stopSpeaking();
  
  await new Promise(resolve => setTimeout(resolve, 50));
  await ensureSynthesisReady();
  
  // Reset state
  speechCancelled = false;
  isSpeakingActive = true;
  currentChunkIndex = 0;

  localStorage.setItem('assistant-last-spoken', cleanText);
  window.dispatchEvent(new CustomEvent('assistant-speak', { detail: { text: cleanText, assistant } }));

  // Split into chunks for reliability
  const chunks = splitIntoChunks(cleanText, 200);
  console.log(`[Voice] Speaking as ${assistant}:`, chunks.length, 'chunk(s)', cleanText.substring(0, 50));

  // Get voice settings
  const settings = VOICE_CONFIGS[assistant];
  const voice = findBestVoice(assistant);
  
  if (voice) {
    console.log(`[Voice] Using voice: ${voice.name}`);
  }

  // Create utterances for each chunk
  utteranceQueue = chunks.map(chunk => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;
    if (voice) utterance.voice = voice;
    return utterance;
  });

  // Chrome keep-alive: pause/resume to prevent 15s cutoff
  keepAliveInterval = setInterval(() => {
    if (isSpeakingActive && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10000);
  
  // Monitor for unexpected pauses
  pauseMonitorInterval = setInterval(() => {
    if (!isSpeakingActive) return;
    if (window.speechSynthesis.paused && isSpeakingActive) {
      console.log('[Voice] Force resuming from unexpected pause');
      window.speechSynthesis.resume();
    }
  }, 500);

  // Begin speaking chunks
  speakNextChunk(assistant, onStart, onEnd, onError);
};

/**
 * Stops any ongoing speech
 */
export const stopSpeaking = (): void => {
  cleanupSpeechState();
  
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('[Voice] Cancel error:', e);
    }
  }
};

/**
 * Checks if assistant is currently speaking
 */
export const isAssistantSpeaking = (): boolean => {
  if (!('speechSynthesis' in window)) return false;
  return isSpeakingActive || window.speechSynthesis.speaking;
};

/**
 * Pauses speech
 */
export const pauseSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.pause();
  }
};

/**
 * Resumes speech
 */
export const resumeSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.resume();
  }
};

/**
 * Get current speech state for debugging
 */
export const getAssistantSpeechState = () => ({
  isSpeakingActive,
  hasSynthesis: 'speechSynthesis' in window,
  isSynthesisSpeaking: 'speechSynthesis' in window ? window.speechSynthesis.speaking : false,
  isPaused: 'speechSynthesis' in window ? window.speechSynthesis.paused : false,
  currentAssistant,
  chunksRemaining: utteranceQueue.length - currentChunkIndex,
});

/**
 * Initialize voice system
 */
export const initializeAssistantVoices = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('[Voice] Speech synthesis not supported');
      resolve();
      return;
    }

    cleanupSpeechState();
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

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
      const voiceCount = window.speechSynthesis.getVoices().length;
      console.log(`[Voice] Init timeout, voices: ${voiceCount}`);
      resolve();
    }, 2000);
  });
};

// Backwards compatibility exports (alias to old names)
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
