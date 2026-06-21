// ═══════════════════════════════════════════════════════════════════════════════
// SAFARI BROWSER FIXES - Cross-browser compatibility for voice/video calls
// Handles Safari, iOS Safari, and WebKit-specific quirks
// ═══════════════════════════════════════════════════════════════════════════════

// Platform detection
export interface BrowserCapabilities {
  isSafari: boolean;
  isIOS: boolean;
  isMacOS: boolean;
  isWebKit: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  supportsMediaRecorder: boolean;
  supportsSpeechRecognition: boolean;
  supportsSpeechSynthesis: boolean;
  supportsWebRTC: boolean;
  supportsAudioContext: boolean;
  iosVersion: number | null;
  safariVersion: number | null;
}

let cachedCapabilities: BrowserCapabilities | null = null;

export const detectBrowserCapabilities = (): BrowserCapabilities => {
  if (cachedCapabilities) return cachedCapabilities;
  
  if (typeof navigator === 'undefined') {
    return {
      isSafari: false, isIOS: false, isMacOS: false, isWebKit: false,
      isChrome: false, isFirefox: false, isEdge: false,
      supportsMediaRecorder: false, supportsSpeechRecognition: false,
      supportsSpeechSynthesis: false, supportsWebRTC: false,
      supportsAudioContext: false, iosVersion: null, safariVersion: null,
    };
  }
  
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isMacOS = /Mac/.test(ua) && !isIOS;
  const isWebKit = /AppleWebKit/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isEdge = /Edge|Edg/.test(ua);
  
  // Parse iOS version
  let iosVersion: number | null = null;
  if (isIOS) {
    const match = ua.match(/OS (\d+)_/);
    if (match) iosVersion = parseInt(match[1], 10);
  }
  
  // Parse Safari version
  let safariVersion: number | null = null;
  if (isSafari) {
    const match = ua.match(/Version\/(\d+)/);
    if (match) safariVersion = parseInt(match[1], 10);
  }
  
  cachedCapabilities = {
    isSafari,
    isIOS,
    isMacOS,
    isWebKit,
    isChrome,
    isFirefox,
    isEdge,
    supportsMediaRecorder: 'MediaRecorder' in window,
    supportsSpeechRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    supportsSpeechSynthesis: 'speechSynthesis' in window,
    supportsWebRTC: 'RTCPeerConnection' in window,
    supportsAudioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
    iosVersion,
    safariVersion,
  };
  
  return cachedCapabilities;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPEECH RECOGNITION FIXES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SafariSpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  maxAlternatives?: number;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
}

// Safari-safe speech recognition wrapper
export const createSafariSpeechRecognition = (options: SafariSpeechRecognitionOptions = {}) => {
  const caps = detectBrowserCapabilities();
  
  if (!caps.supportsSpeechRecognition) {
    console.warn('[SafariFix] Speech recognition not supported');
    return null;
  }
  
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  // Safari-specific settings
  if (caps.isSafari || caps.isIOS) {
    // iOS Safari has issues with continuous mode - disable it
    recognition.continuous = caps.isIOS ? false : (options.continuous ?? true);
    // iOS Safari has bugs with interimResults
    recognition.interimResults = caps.isIOS ? false : (options.interimResults ?? true);
    // Safari times out at ~7 seconds, so we need aggressive restart
    console.log('[SafariFix] Safari mode: continuous=' + recognition.continuous + ', interim=' + recognition.interimResults);
  } else {
    recognition.continuous = options.continuous ?? true;
    recognition.interimResults = options.interimResults ?? true;
  }
  
  recognition.lang = options.lang ?? 'en-US';
  recognition.maxAlternatives = options.maxAlternatives ?? 1;
  
  // Timeout handling for Safari's ~7s cutoff
  let restartTimeout: NodeJS.Timeout | null = null;
  let isManualStop = false;
  let restartCount = 0;
  const MAX_RESTARTS = 100;
  
  const scheduleRestart = () => {
    if (restartTimeout) clearTimeout(restartTimeout);
    
    // Safari times out at ~7s, Chrome at ~60s
    const timeoutMs = caps.isSafari || caps.isIOS ? 5000 : 50000;
    
    restartTimeout = setTimeout(() => {
      if (!isManualStop && restartCount < MAX_RESTARTS) {
        try {
          recognition.stop();
          // onend will trigger restart
        } catch (e) {
          // Ignore
        }
      }
    }, timeoutMs);
  };
  
  // Wrap handlers
  recognition.onstart = () => {
    console.log('[SafariFix] Recognition started');
    restartCount = 0;
    scheduleRestart();
    options.onStart?.();
  };
  
  recognition.onresult = (event: any) => {
    scheduleRestart(); // Reset timeout on activity
    
    let finalTranscript = '';
    let interimTranscript = '';
    
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }
    
    const transcript = finalTranscript || interimTranscript;
    options.onResult?.(transcript, !!finalTranscript);
  };
  
  recognition.onerror = (event: any) => {
    const error = event.error;
    
    // These are expected and non-fatal
    if (error === 'no-speech' || error === 'aborted') {
      console.log('[SafariFix] Expected event:', error);
      return;
    }
    
    console.error('[SafariFix] Recognition error:', error);
    options.onError?.(error);
  };
  
  recognition.onend = () => {
    if (restartTimeout) {
      clearTimeout(restartTimeout);
      restartTimeout = null;
    }
    
    // Auto-restart for Safari/iOS unless manually stopped
    if (!isManualStop && restartCount < MAX_RESTARTS && (caps.isSafari || caps.isIOS)) {
      restartCount++;
      const delay = caps.isIOS ? 100 : 50; // iOS needs slightly longer delay
      
      setTimeout(() => {
        try {
          recognition.start();
          console.log('[SafariFix] Auto-restart #' + restartCount);
        } catch (e: any) {
          if (!e?.message?.includes('already started')) {
            console.warn('[SafariFix] Restart failed:', e);
          }
        }
      }, delay);
      return;
    }
    
    options.onEnd?.();
  };
  
  // Custom stop method that prevents auto-restart
  const originalStop = recognition.stop.bind(recognition);
  recognition.stop = () => {
    isManualStop = true;
    if (restartTimeout) {
      clearTimeout(restartTimeout);
      restartTimeout = null;
    }
    originalStop();
  };
  
  // Custom start method
  const originalStart = recognition.start.bind(recognition);
  recognition.start = () => {
    isManualStop = false;
    restartCount = 0;
    originalStart();
  };
  
  return recognition;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPEECH SYNTHESIS FIXES
// ═══════════════════════════════════════════════════════════════════════════════

// Safari has a 15-second speech cutoff bug - implement chunking
export const safariSpeakText = async (
  text: string,
  options?: {
    voice?: SpeechSynthesisVoice;
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Event) => void;
  }
): Promise<void> => {
  const caps = detectBrowserCapabilities();
  
  if (!caps.supportsSpeechSynthesis) {
    console.warn('[SafariFix] Speech synthesis not supported');
    return;
  }
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  // For Chrome: workaround for 15-second bug
  // For Safari: workaround for audio cutoff
  const needsChunking = caps.isChrome || caps.isSafari || caps.isIOS;
  const MAX_CHUNK_LENGTH = 150; // Characters per chunk for Safari safety
  
  // Split text into sentences/chunks
  const splitIntoChunks = (text: string): string[] => {
    if (!needsChunking || text.length <= MAX_CHUNK_LENGTH) {
      return [text];
    }
    
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    
    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > MAX_CHUNK_LENGTH) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    
    return chunks;
  };
  
  const chunks = splitIntoChunks(text);
  let currentIndex = 0;
  let hasStarted = false;
  let chromeKeepAlive: NodeJS.Timeout | null = null;
  
  // Chrome keep-alive workaround
  const startChromeKeepAlive = () => {
    if (caps.isChrome && !chromeKeepAlive) {
      chromeKeepAlive = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
    }
  };
  
  const stopChromeKeepAlive = () => {
    if (chromeKeepAlive) {
      clearInterval(chromeKeepAlive);
      chromeKeepAlive = null;
    }
  };
  
  return new Promise((resolve, reject) => {
    const speakNextChunk = () => {
      if (currentIndex >= chunks.length) {
        stopChromeKeepAlive();
        options?.onEnd?.();
        resolve();
        return;
      }
      
      const chunk = chunks[currentIndex];
      const utterance = new SpeechSynthesisUtterance(chunk);
      
      if (options?.voice) utterance.voice = options.voice;
      utterance.rate = options?.rate ?? 1.0;
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.volume = options?.volume ?? 1.0;
      
      utterance.onstart = () => {
        if (!hasStarted) {
          hasStarted = true;
          startChromeKeepAlive();
          options?.onStart?.();
        }
      };
      
      utterance.onend = () => {
        currentIndex++;
        // Small delay between chunks for natural speech
        setTimeout(speakNextChunk, 50);
      };
      
      utterance.onerror = (event) => {
        stopChromeKeepAlive();
        console.error('[SafariFix] Speech error:', event.error);
        options?.onError?.(event);
        reject(event);
      };
      
      window.speechSynthesis.speak(utterance);
    };
    
    speakNextChunk();
  });
};

// Get best voice for Safari (prefers Samantha/Google voices)
export const getSafariFriendlyVoice = (): SpeechSynthesisVoice | null => {
  const caps = detectBrowserCapabilities();
  const voices = window.speechSynthesis.getVoices();
  
  if (voices.length === 0) return null;
  
  // Priority list
  const priorities = [
    'Samantha', // macOS/iOS high quality
    'Google US English', // Android/Chrome
    'Google UK English Female',
    'Microsoft Zira',
    'Karen', // Australian
    'Moira', // Irish
  ];
  
  for (const name of priorities) {
    const voice = voices.find(v => v.name.includes(name));
    if (voice) return voice;
  }
  
  // Fallback: any English female voice
  const englishFemale = voices.find(v => 
    v.lang.startsWith('en') && 
    (v.name.toLowerCase().includes('female') || 
     v.name.includes('Samantha') || 
     v.name.includes('Karen') ||
     v.name.includes('Moira'))
  );
  if (englishFemale) return englishFemale;
  
  // Final fallback: any English voice
  return voices.find(v => v.lang.startsWith('en')) || voices[0];
};

// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA STREAM FIXES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SafariMediaConstraints {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

// Safari-compatible getUserMedia
export const safariGetUserMedia = async (
  constraints: SafariMediaConstraints
): Promise<MediaStream> => {
  const caps = detectBrowserCapabilities();
  
  // Safari-specific constraint adjustments
  let adjustedConstraints: MediaStreamConstraints = { ...constraints };
  
  if (caps.isSafari || caps.isIOS) {
    // Safari has issues with certain constraints
    if (constraints.audio === true) {
      adjustedConstraints.audio = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Safari doesn't like sampleRate constraint
      };
    } else if (typeof constraints.audio === 'object') {
      const audioConstraints = { ...constraints.audio } as any;
      // Remove problematic Safari constraints
      delete audioConstraints.sampleRate;
      delete audioConstraints.sampleSize;
      adjustedConstraints.audio = audioConstraints;
    }
    
    if (typeof constraints.video === 'object') {
      const videoConstraints = { ...constraints.video } as any;
      // Safari prefers 'ideal' over 'exact'
      if (videoConstraints.width?.exact) {
        videoConstraints.width = { ideal: videoConstraints.width.exact };
      }
      if (videoConstraints.height?.exact) {
        videoConstraints.height = { ideal: videoConstraints.height.exact };
      }
      adjustedConstraints.video = videoConstraints;
    }
  }
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(adjustedConstraints);
    return stream;
  } catch (err: any) {
    console.error('[SafariFix] getUserMedia error:', err.name, err.message);
    
    // Fallback: try without constraints
    if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
      console.log('[SafariFix] Retrying with basic constraints');
      return navigator.mediaDevices.getUserMedia({
        audio: !!constraints.audio,
        video: !!constraints.video,
      });
    }
    
    throw err;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO CONTEXT FIXES
// ═══════════════════════════════════════════════════════════════════════════════

let globalAudioContext: AudioContext | null = null;

export const getOrCreateAudioContext = (): AudioContext | null => {
  if (globalAudioContext && globalAudioContext.state !== 'closed') {
    return globalAudioContext;
  }
  
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    console.warn('[SafariFix] AudioContext not supported');
    return null;
  }
  
  try {
    globalAudioContext = new AudioContextClass();
    return globalAudioContext;
  } catch (err) {
    console.error('[SafariFix] AudioContext creation failed:', err);
    return null;
  }
};

// Resume audio context (required for Safari after user gesture)
export const resumeAudioContext = async (): Promise<boolean> => {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return false;
  
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      console.log('[SafariFix] AudioContext resumed');
      return true;
    } catch (err) {
      console.error('[SafariFix] AudioContext resume failed:', err);
      return false;
    }
  }
  
  return ctx.state === 'running';
};

// ═══════════════════════════════════════════════════════════════════════════════
// WEBRTC FIXES
// ═══════════════════════════════════════════════════════════════════════════════

// Safari-compatible ICE servers
export const getSafariICEServers = (): RTCIceServer[] => {
  const caps = detectBrowserCapabilities();
  
  // Standard STUN servers that work across all browsers
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  
  // Safari/iOS may need additional STUN servers
  if (caps.isSafari || caps.isIOS) {
    servers.push(
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' }
    );
  }
  
  return servers;
};

// Safari-compatible RTCPeerConnection config
export const getSafariRTCConfig = (): RTCConfiguration => {
  const caps = detectBrowserCapabilities();
  
  const config: RTCConfiguration = {
    iceServers: getSafariICEServers(),
    iceCandidatePoolSize: 10,
  };
  
  // Safari-specific adjustments
  if (caps.isSafari || caps.isIOS) {
    // Safari works better with bundlePolicy
    (config as any).bundlePolicy = 'max-bundle';
    (config as any).rtcpMuxPolicy = 'require';
  }
  
  return config;
};

// Initialize Safari fixes on module load
export const initSafariFixes = () => {
  const caps = detectBrowserCapabilities();
  
  console.log('[SafariFix] Detected:', {
    browser: caps.isSafari ? 'Safari' : caps.isChrome ? 'Chrome' : caps.isFirefox ? 'Firefox' : 'Other',
    iOS: caps.isIOS,
    iosVersion: caps.iosVersion,
    safariVersion: caps.safariVersion,
  });
  
  // Set up audio context resume on first user interaction
  if (caps.isSafari || caps.isIOS) {
    const resumeOnGesture = () => {
      resumeAudioContext();
      document.removeEventListener('touchstart', resumeOnGesture);
      document.removeEventListener('click', resumeOnGesture);
    };
    document.addEventListener('touchstart', resumeOnGesture, { once: true, passive: true });
    document.addEventListener('click', resumeOnGesture, { once: true });
  }
  
  // Pre-load voices for Safari
  if (caps.supportsSpeechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
};

export default {
  detectBrowserCapabilities,
  createSafariSpeechRecognition,
  safariSpeakText,
  getSafariFriendlyVoice,
  safariGetUserMedia,
  getOrCreateAudioContext,
  resumeAudioContext,
  getSafariICEServers,
  getSafariRTCConfig,
  initSafariFixes,
};
