/**
 * Offline Voice System for Zoe Infinity
 * ======================================
 * 100% offline voice synthesis using browser's native speechSynthesis API.
 * No network required - works in airplane mode.
 * 
 * Features:
 * - Platform-optimized voice selection
 * - Calm, soothing voice configuration
 * - Chrome keep-alive workaround
 * - Text chunking for reliability
 * - Queue management for sequential speech
 */

import { checkNetworkStatus } from '@/hooks/useNetworkStatus';

// Platform-specific voice preferences (offline-friendly)
const OFFLINE_VOICE_PRIORITIES = {
  ios: ['Samantha', 'Karen', 'Moira', 'Fiona', 'Victoria'],
  android: ['Google US English', 'English United States'],
  windows: ['Microsoft Zira', 'Microsoft Hazel', 'Microsoft Susan'],
  mac: ['Samantha', 'Karen', 'Moira', 'Fiona', 'Victoria', 'Alex'],
  linux: ['English', 'en-US'],
  default: ['Samantha', 'Google US English', 'Microsoft Zira', 'Alex'],
};

// Zoe's calm, soothing voice configuration
const OFFLINE_VOICE_CONFIG = {
  rate: 0.88,      // Slower = more calming
  pitch: 0.92,     // Lower = warmer tone
  volume: 0.85,    // Slightly softer = intimate feel
};

// State management
let cachedOfflineVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;
let voicesLoadedAt = 0;
const VOICE_CACHE_EXPIRY_MS = 60000; // BUG FIX: Re-check voices every 60 seconds
let speechQueue: string[] = [];
let isSpeaking = false;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let chromeKeepAliveInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Detect platform for voice selection
 */
const detectPlatform = (): keyof typeof OFFLINE_VOICE_PRIORITIES => {
  const ua = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows/.test(ua)) return 'windows';
  if (/mac os|macintosh/.test(ua)) return 'mac';
  if (/linux/.test(ua)) return 'linux';
  
  return 'default';
};

/**
 * Find best available offline voice for current platform
 */
const findBestOfflineVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  if (!voices.length) return null;
  
  const platform = detectPlatform();
  const priorities = OFFLINE_VOICE_PRIORITIES[platform];
  
  // Try platform-specific voices first
  for (const preferredName of priorities) {
    const match = voices.find(v => 
      v.name.toLowerCase().includes(preferredName.toLowerCase()) &&
      v.lang.startsWith('en')
    );
    if (match) {
      console.log(`[OfflineVoice] ✅ Found ${platform} voice: ${match.name}`);
      return match;
    }
  }
  
  // Try default priorities
  for (const preferredName of OFFLINE_VOICE_PRIORITIES.default) {
    const match = voices.find(v => 
      v.name.toLowerCase().includes(preferredName.toLowerCase()) &&
      v.lang.startsWith('en')
    );
    if (match) return match;
  }
  
  // Last resort: any English voice
  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  if (englishVoice) return englishVoice;
  
  // Ultimate fallback: first available voice
  return voices[0];
};

/**
 * Initialize offline voices (call on app start)
 */
export const initializeOfflineVoices = (): Promise<SpeechSynthesisVoice | null> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('[OfflineVoice] ⚠️ SpeechSynthesis not supported');
      resolve(null);
      return;
    }
    
    // BUG FIX: Re-check voices if cache expired
    const now = Date.now();
    if (voicesLoaded && cachedOfflineVoice && now - voicesLoadedAt < VOICE_CACHE_EXPIRY_MS) {
      resolve(cachedOfflineVoice);
      return;
    }
    
    let resolved = false;
    
    const resolveOnce = (voice: SpeechSynthesisVoice | null) => {
      if (resolved) return;
      resolved = true;
      voicesLoaded = true;
      voicesLoadedAt = Date.now(); // BUG FIX: Track when voices were loaded
      resolve(voice);
    };
    
    const loadVoices = () => {
      if (resolved) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        cachedOfflineVoice = findBestOfflineVoice(voices);
        console.log('[OfflineVoice] 🔊 Offline voice ready:', cachedOfflineVoice?.name || 'default');
        resolveOnce(cachedOfflineVoice);
      }
    };
    
    // Try loading immediately
    loadVoices();
    
    // Listen for voices changed event (use addEventListener to avoid overwriting)
    const handleVoicesChanged = () => {
      loadVoices();
      if (resolved) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    
    // Retry with delays (some browsers load voices asynchronously)
    setTimeout(loadVoices, 100);
    setTimeout(loadVoices, 500);
    
    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        console.log('[OfflineVoice] ⏱️ Timeout - using default voice');
        resolveOnce(cachedOfflineVoice);
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      }
    }, 2000);
  });
};

/**
 * Chrome keep-alive workaround (prevents speech stopping after ~15s)
 */
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

/**
 * Split text into chunks for reliable synthesis
 */
const splitTextIntoChunks = (text: string, maxLength = 180): string[] => {
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

/**
 * Clean text for speech synthesis
 */
const cleanTextForSpeech = (text: string): string => {
  return text
    .replace(/\[\[[^\]]+\]\]/g, '')           // Remove [[PATTERN:...]] markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')        // Remove markdown bold
    .replace(/\*([^*]+)\*/g, '$1')            // Remove markdown italic
    .replace(/<[^>]+>/g, '')                  // Remove HTML/SSML tags
    .replace(/\{[^}]+\}/g, '')                // Remove {placeholders}
    .replace(/\s+/g, ' ')                     // Normalize whitespace
    .trim();
};

/**
 * Process speech queue
 */
const processQueue = (
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: any) => void
): void => {
  if (speechQueue.length === 0) {
    isSpeaking = false;
    stopChromeKeepAlive();
    onEnd?.();
    window.dispatchEvent(new CustomEvent('zoe-speak-end'));
    return;
  }
  
  const text = speechQueue.shift()!;
  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;
  
  if (cachedOfflineVoice) {
    utterance.voice = cachedOfflineVoice;
  }
  
  utterance.rate = OFFLINE_VOICE_CONFIG.rate;
  utterance.pitch = OFFLINE_VOICE_CONFIG.pitch;
  utterance.volume = OFFLINE_VOICE_CONFIG.volume;
  
  utterance.onstart = () => {
    if (!isSpeaking) {
      isSpeaking = true;
      onStart?.();
      window.dispatchEvent(new CustomEvent('zoe-speak'));
    }
  };
  
  utterance.onend = () => {
    currentUtterance = null;
    setTimeout(() => processQueue(undefined, onEnd, onError), 100);
  };
  
  utterance.onerror = (event) => {
    if (event.error === 'interrupted' || event.error === 'canceled') {
      // User stopped speech - not an error
      speechQueue = [];
      isSpeaking = false;
      stopChromeKeepAlive();
      onEnd?.();
      return;
    }
    
    console.error('[OfflineVoice] ❌ Speech error:', event.error);
    currentUtterance = null;
    onError?.(event);
    
    // Try next chunk
    setTimeout(() => processQueue(undefined, onEnd, onError), 100);
  };
  
  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('[OfflineVoice] ❌ Speak failed:', err);
    onError?.(err);
    setTimeout(() => processQueue(undefined, onEnd, onError), 100);
  }
};

/**
 * MAIN API: Speak text offline (no network required)
 */
export const speakOffline = async (
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: any) => void
): Promise<void> => {
  if (!text?.trim()) {
    onEnd?.();
    return;
  }
  
  if (!('speechSynthesis' in window)) {
    console.warn('[OfflineVoice] ⚠️ SpeechSynthesis not available');
    onError?.(new Error('SpeechSynthesis not supported'));
    return;
  }
  
  // Ensure voices are loaded
  if (!voicesLoaded) {
    await initializeOfflineVoices();
  }
  
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) {
    onEnd?.();
    return;
  }
  
  // Stop any current speech
  stopOfflineSpeech();
  
  // Split into chunks and queue
  const chunks = splitTextIntoChunks(cleaned);
  speechQueue = chunks;
  
  console.log(`[OfflineVoice] 🔇 Speaking offline: ${chunks.length} chunk(s)`);
  
  startChromeKeepAlive();
  processQueue(onStart, onEnd, onError);
};

/**
 * Stop offline speech
 */
export const stopOfflineSpeech = (): void => {
  speechQueue = [];
  isSpeaking = false;
  stopChromeKeepAlive();
  
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  
  currentUtterance = null;
};

/**
 * Check if offline speech is currently active
 */
export const isOfflineSpeaking = (): boolean => {
  return isSpeaking || window.speechSynthesis?.speaking || false;
};

/**
 * Get available offline voices
 */
export const getAvailableOfflineVoices = (): SpeechSynthesisVoice[] => {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
};

/**
 * Should use offline voice? (based on network status)
 */
export const shouldUseOfflineVoice = (): boolean => {
  const status = checkNetworkStatus();
  return !status.isOnline || status.isSlowConnection;
};

/**
 * Hybrid speak: auto-selects online/offline based on network
 * For Zoe Infinity, this provides seamless voice regardless of connectivity
 */
export const speakHybrid = async (
  text: string,
  onlineSpeaker?: (text: string, onStart?: () => void, onEnd?: () => void, onError?: (e: any) => void) => Promise<void>,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: any) => void
): Promise<void> => {
  const useOffline = shouldUseOfflineVoice();
  
  if (useOffline || !onlineSpeaker) {
    console.log('[OfflineVoice] 📴 Using offline voice');
    return speakOffline(text, onStart, onEnd, onError);
  }
  
  try {
    console.log('[OfflineVoice] 🌐 Using online voice');
    await onlineSpeaker(text, onStart, onEnd, onError);
  } catch (err) {
    console.warn('[OfflineVoice] ⚠️ Online voice failed, falling back to offline');
    return speakOffline(text, onStart, onEnd, onError);
  }
};
