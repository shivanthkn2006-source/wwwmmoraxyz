/**
 * ZOE UNIFIED MEDIA ACCESS SYSTEM
 * ================================
 * Ultra-fast, error-free voice/audio/video/camera access for Zoe Orb
 * One-click activation with platform-wide defaults
 * 
 * Features:
 * - Pre-warmed AudioContext for instant TTS
 * - Cached media streams for fast switching
 * - Optimized for low-latency voice interactions
 * - Error-resilient with graceful fallbacks
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & STATE
// ═══════════════════════════════════════════════════════════════════════════════

export type MediaType = 'microphone' | 'camera' | 'audio' | 'all';
export type MediaState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

interface ZoeMediaState {
  microphone: MediaState;
  camera: MediaState;
  audio: MediaState;
  lastError: string | null;
  isWarmedUp: boolean;
  audioContext: AudioContext | null;
  micStream: MediaStream | null;
  cameraStream: MediaStream | null;
}

// Global state for ultra-fast access
const state: ZoeMediaState = {
  microphone: 'idle',
  camera: 'idle',
  audio: 'idle',
  lastError: null,
  isWarmedUp: false,
  audioContext: null,
  micStream: null,
  cameraStream: null,
};

// Session storage keys
const MEDIA_GRANTED_KEY = 'zoe_media_granted';
const AUDIO_WARMED_KEY = 'zoe_audio_warmed';

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO CONTEXT (Pre-warm for instant TTS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get or create the global AudioContext
 * Pre-warmed for instant voice responses
 */
export const getAudioContext = (): AudioContext | null => {
  if (state.audioContext && state.audioContext.state !== 'closed') {
    return state.audioContext;
  }
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    
    state.audioContext = new AudioContextClass({ sampleRate: 24000 });
    (window as any).__zoeAudioContext = state.audioContext;
    console.log('[ZoeMedia] AudioContext created');
    return state.audioContext;
  } catch (e) {
    console.warn('[ZoeMedia] AudioContext creation failed:', e);
    return null;
  }
};

/**
 * Warm up audio engine for instant playback
 * Call on user interaction for best results
 */
export const warmUpAudio = async (): Promise<boolean> => {
  if (state.isWarmedUp) return true;
  
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    
    // Resume if suspended
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Play silent buffer to unlock audio
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    
    state.isWarmedUp = true;
    state.audio = 'granted';
    
    try {
      sessionStorage.setItem(AUDIO_WARMED_KEY, 'true');
    } catch {}
    
    console.log('[ZoeMedia] Audio engine warmed up');
    return true;
  } catch (e) {
    console.warn('[ZoeMedia] Audio warm-up failed:', e);
    return false;
  }
};

/**
 * Resume audio context (call after user gesture)
 */
export const resumeAudio = async (): Promise<boolean> => {
  const ctx = getAudioContext();
  if (!ctx) return false;
  
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      console.log('[ZoeMedia] AudioContext resumed');
      return true;
    } catch (e) {
      console.warn('[ZoeMedia] AudioContext resume failed:', e);
      return false;
    }
  }
  
  return ctx.state === 'running';
};

// ═══════════════════════════════════════════════════════════════════════════════
// MICROPHONE ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Optimal audio constraints for voice recognition
 */
const OPTIMAL_MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000,
    channelCount: 1,
  },
};

/**
 * Request microphone access with optimal settings
 * Returns cached stream if available
 */
export const requestMicrophone = async (
  forceNew = false
): Promise<{ granted: boolean; stream: MediaStream | null; error?: string }> => {
  // Return cached stream if available and valid
  if (!forceNew && state.micStream && state.micStream.active) {
    return { granted: true, stream: state.micStream };
  }
  
  state.microphone = 'requesting';
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(OPTIMAL_MIC_CONSTRAINTS);
    
    state.micStream = stream;
    state.microphone = 'granted';
    state.lastError = null;
    
    // Also warm up audio
    warmUpAudio();
    
    console.log('[ZoeMedia] ✓ Microphone access granted');
    return { granted: true, stream };
  } catch (e: any) {
    state.microphone = 'denied';
    state.lastError = e?.message || 'Microphone access denied';
    
    console.warn('[ZoeMedia] ✗ Microphone denied:', e?.name);
    return { 
      granted: false, 
      stream: null, 
      error: e?.name === 'NotAllowedError' 
        ? 'Please allow microphone access for voice features'
        : e?.message 
    };
  }
};

/**
 * Release microphone stream
 */
export const releaseMicrophone = (): void => {
  if (state.micStream) {
    state.micStream.getTracks().forEach(track => track.stop());
    state.micStream = null;
    console.log('[ZoeMedia] Microphone released');
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Optimal camera constraints for Zoe vision
 */
const OPTIMAL_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'user',
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30 },
  },
};

/**
 * Request camera access
 */
export const requestCamera = async (
  forceNew = false,
  facing: 'user' | 'environment' = 'user'
): Promise<{ granted: boolean; stream: MediaStream | null; error?: string }> => {
  // Return cached stream if available and valid
  if (!forceNew && state.cameraStream && state.cameraStream.active) {
    return { granted: true, stream: state.cameraStream };
  }
  
  state.camera = 'requesting';
  
  try {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: facing,
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    state.cameraStream = stream;
    state.camera = 'granted';
    state.lastError = null;
    
    console.log('[ZoeMedia] ✓ Camera access granted');
    return { granted: true, stream };
  } catch (e: any) {
    state.camera = 'denied';
    state.lastError = e?.message || 'Camera access denied';
    
    console.warn('[ZoeMedia] ✗ Camera denied:', e?.name);
    return { 
      granted: false, 
      stream: null, 
      error: e?.name === 'NotAllowedError'
        ? 'Please allow camera access for vision features'
        : e?.message
    };
  }
};

/**
 * Release camera stream
 */
export const releaseCamera = (): void => {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
    console.log('[ZoeMedia] Camera released');
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED ACCESS (One-click activation)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ZoeMediaActivationResult {
  microphone: boolean;
  camera: boolean;
  audio: boolean;
  allGranted: boolean;
  errors: string[];
}

/**
 * ONE-CLICK: Activate all Zoe media access
 * Optimized for platform-wide voice/camera features
 */
export const activateZoeMedia = async (
  options: { microphone?: boolean; camera?: boolean } = { microphone: true, camera: false }
): Promise<ZoeMediaActivationResult> => {
  console.log('[ZoeMedia] ═══════════════════════════════════════');
  console.log('[ZoeMedia] 🎤 ZOE MEDIA ACTIVATION');
  console.log('[ZoeMedia] ═══════════════════════════════════════');
  
  const result: ZoeMediaActivationResult = {
    microphone: false,
    camera: false,
    audio: false,
    allGranted: false,
    errors: [],
  };
  
  // Always warm up audio first
  result.audio = await warmUpAudio();
  
  // Request microphone if needed
  if (options.microphone !== false) {
    const micResult = await requestMicrophone();
    result.microphone = micResult.granted;
    if (micResult.error) result.errors.push(micResult.error);
  }
  
  // Request camera if needed
  if (options.camera) {
    const camResult = await requestCamera();
    result.camera = camResult.granted;
    if (camResult.error) result.errors.push(camResult.error);
  }
  
  // Check if all requested permissions granted
  const requestedMic = options.microphone !== false;
  const requestedCam = options.camera === true;
  result.allGranted = 
    result.audio &&
    (!requestedMic || result.microphone) &&
    (!requestedCam || result.camera);
  
  // Store activation state
  try {
    if (result.microphone || result.camera) {
      sessionStorage.setItem(MEDIA_GRANTED_KEY, JSON.stringify({
        microphone: result.microphone,
        camera: result.camera,
        audio: result.audio,
        timestamp: Date.now(),
      }));
    }
  } catch {}
  
  // Dispatch global event
  window.dispatchEvent(new CustomEvent('zoe-media-activated', { detail: result }));
  
  console.log('[ZoeMedia] ═══════════════════════════════════════');
  console.log(`[ZoeMedia] ✓ Mic: ${result.microphone} | Cam: ${result.camera} | Audio: ${result.audio}`);
  console.log('[ZoeMedia] ═══════════════════════════════════════');
  
  return result;
};

/**
 * Check if media was previously activated this session
 */
export const wasMediaActivated = (): boolean => {
  try {
    const stored = sessionStorage.getItem(MEDIA_GRANTED_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return data.microphone || data.camera;
    }
  } catch {}
  return false;
};

/**
 * Get current media state
 */
export const getMediaState = (): Readonly<ZoeMediaState> => ({ ...state });

// ═══════════════════════════════════════════════════════════════════════════════
// SPEECH RECOGNITION (Optimized for Zoe voice commands)
// ═══════════════════════════════════════════════════════════════════════════════

export interface SpeechRecognitionConfig {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  autoRestart?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

/**
 * Get SpeechRecognition constructor
 */
export const getSpeechRecognition = (): any | null => {
  return (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition || null;
};

/**
 * Check if speech recognition is supported
 */
export const isSpeechRecognitionSupported = (): boolean => {
  return getSpeechRecognition() !== null;
};

/**
 * Create optimized speech recognition instance for Zoe
 */
export const createZoeSpeechRecognition = (config: SpeechRecognitionConfig = {}): any | null => {
  const SpeechRec = getSpeechRecognition();
  if (!SpeechRec) {
    console.warn('[ZoeMedia] SpeechRecognition not supported');
    return null;
  }
  
  const recognition = new SpeechRec();
  
  // Optimal settings for voice commands
  recognition.continuous = config.continuous ?? true;
  recognition.interimResults = config.interimResults ?? true;
  recognition.lang = config.language ?? 'en-US';
  recognition.maxAlternatives = 1;
  
  // Track state
  let isActive = false;
  let restartTimeout: NodeJS.Timeout | null = null;
  let lastResultTime = Date.now();
  
  recognition.onstart = () => {
    isActive = true;
    lastResultTime = Date.now();
    console.log('[ZoeMedia] Speech recognition started');
  };
  
  recognition.onresult = (event: any) => {
    lastResultTime = Date.now();
    
    const last = event.results.length - 1;
    const transcript = event.results[last][0].transcript;
    const isFinal = event.results[last].isFinal;
    
    config.onResult?.(transcript, isFinal);
  };
  
  recognition.onerror = (event: any) => {
    // Ignore 'no-speech' and 'aborted' as non-critical
    if (event.error === 'no-speech' || event.error === 'aborted') {
      return;
    }
    
    console.warn('[ZoeMedia] Speech recognition error:', event.error);
    config.onError?.(event.error);
  };
  
  recognition.onend = () => {
    isActive = false;
    
    // Auto-restart if configured
    if (config.autoRestart) {
      restartTimeout = setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          // Ignore
        }
      }, 100);
    }
    
    config.onEnd?.();
  };
  
  // Add stop method that prevents auto-restart
  const originalStop = recognition.stop.bind(recognition);
  recognition.stop = () => {
    config.autoRestart = false;
    if (restartTimeout) {
      clearTimeout(restartTimeout);
      restartTimeout = null;
    }
    originalStop();
  };
  
  return recognition;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPEECH SYNTHESIS (Optimized TTS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if speech synthesis is supported
 */
export const isSpeechSynthesisSupported = (): boolean => {
  return 'speechSynthesis' in window;
};

/**
 * Get available voices (cached)
 */
let voicesCache: SpeechSynthesisVoice[] | null = null;

export const getVoices = async (): Promise<SpeechSynthesisVoice[]> => {
  if (voicesCache && voicesCache.length > 0) {
    return voicesCache;
  }
  
  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  
  if (voices.length === 0) {
    await new Promise<void>(resolve => {
      const handler = () => {
        synth.onvoiceschanged = null;
        resolve();
      };
      synth.onvoiceschanged = handler;
      setTimeout(resolve, 1000);
    });
    voices = synth.getVoices();
  }
  
  voicesCache = voices;
  return voices;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Release all media resources
 */
export const releaseAllMedia = (): void => {
  releaseMicrophone();
  releaseCamera();
  
  if (state.audioContext && state.audioContext.state !== 'closed') {
    state.audioContext.close().catch(() => {});
    state.audioContext = null;
  }
  
  state.isWarmedUp = false;
  console.log('[ZoeMedia] All media released');
};

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', releaseAllMedia);
}
