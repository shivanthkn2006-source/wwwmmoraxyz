/**
 * Centralized Microphone Permission Manager
 * Handles mic permissions globally for all Zoe voice features
 *
 * IMPORTANT:
 * - Browsers require explicit user permission for microphone.
 * - Some audio APIs (AudioContext resume) require a user gesture.
 * - We never "auto-grant" permission in code.
 */

// Permission state cache
import { zoeDebugLog, zoeDebugSetState, zoeDebugSpeechStart, zoeDebugSpeechStop } from '@/features/zoe-handsfree/debugBus';

let permissionGranted = false;
let lastPermissionCheck = 0;
const PERMISSION_CACHE_MS = 60000; // Cache for 60 seconds

// Global AudioContext reference
let globalAudioContext: AudioContext | null = null;

type SpeechRecognitionOwner = 'wake-word' | 'voice-input' | string;

let activeSpeechRecognition: { owner: SpeechRecognitionOwner; recognition: any } | null = null;
let speechRecognitionReservedBy: SpeechRecognitionOwner | null = null;
let lastVoiceInputClaimAt = 0;
const VOICE_INPUT_HANDOFF_GRACE_MS = 1500;

const stopRecognitionInstanceForHandoff = (recognition: any | null) => {
  if (!recognition) return;
  zoeDebugSpeechStop(activeSpeechRecognition?.owner || 'unknown', 'handoff to another SpeechRecognition owner');
  try { (recognition as any).__keepAlive = false; } catch { /* noop */ }
  try { stopRecognitionKeepAlive(recognition); } catch { /* noop */ }
  try {
    if (typeof recognition.abort === 'function') recognition.abort();
    else recognition.stop();
  } catch { /* noop */ }
};

export const reserveSpeechRecognition = (owner: SpeechRecognitionOwner): boolean => {
  speechRecognitionReservedBy = owner;
  const current = activeSpeechRecognition;
  if (!current || current.owner === owner) return false;

  zoeDebugLog('voice', `SpeechRecognition handoff · ${current.owner} → ${owner}`);
  stopRecognitionInstanceForHandoff(current.recognition);
  activeSpeechRecognition = null;
  return true;
};

export const claimSpeechRecognition = (owner: SpeechRecognitionOwner, recognition: any): boolean => {
  const interrupted = reserveSpeechRecognition(owner);
  if (owner === 'voice-input') lastVoiceInputClaimAt = Date.now();
  activeSpeechRecognition = { owner, recognition };
  return interrupted;
};

export const releaseSpeechRecognition = (owner: SpeechRecognitionOwner, recognition?: any | null): void => {
  if (
    activeSpeechRecognition?.owner === owner &&
    (!recognition || activeSpeechRecognition.recognition === recognition)
  ) {
    activeSpeechRecognition = null;
    zoeDebugSetState({ activeRecognizer: null });
  }

  if (speechRecognitionReservedBy === owner) {
    speechRecognitionReservedBy = null;
  }
};

export const getActiveSpeechRecognitionOwner = (): SpeechRecognitionOwner | null => {
  if (
    !activeSpeechRecognition &&
    !speechRecognitionReservedBy &&
    Date.now() - lastVoiceInputClaimAt < VOICE_INPUT_HANDOFF_GRACE_MS
  ) {
    return 'voice-input';
  }
  return activeSpeechRecognition?.owner ?? speechRecognitionReservedBy;
};

const notifyMicPermissionChanged = (state: 'granted' | 'denied' | 'prompt') => {
  zoeDebugSetState({ micPermission: state });
  zoeDebugLog(state === 'granted' ? 'info' : state === 'denied' ? 'error' : 'info', `mic permission: ${state}`);
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('zoe-mic-permission-changed', { detail: { state } }));
};

/**
 * Resume AudioContext if suspended (often requires user gesture)
 */
export const resumeAudioContext = async (): Promise<boolean> => {
  try {
    if (!globalAudioContext) {
      globalAudioContext = new AudioContext();
    }

    if (globalAudioContext.state === 'suspended') {
      await globalAudioContext.resume();
      console.log('[MicManager] AudioContext resumed successfully');
    }

    return globalAudioContext.state === 'running';
  } catch (err) {
    console.warn('[MicManager] AudioContext resume failed:', err);
    return false;
  }
};

/**
 * Request microphone permission.
 * Returns true if permission is granted, false otherwise.
 */
export const requestMicPermission = async (forceRefresh = false): Promise<boolean> => {
  // Check cache first
  const now = Date.now();
  if (!forceRefresh && permissionGranted && (now - lastPermissionCheck) < PERMISSION_CACHE_MS) {
    // Try to resume AudioContext (non-fatal if blocked)
    resumeAudioContext().catch(() => {});
    notifyMicPermissionChanged('granted');
    return true;
  }

  try {
    console.log('[MicManager] Requesting microphone permission...');

    // Try to resume AudioContext first (may require gesture; not fatal)
    resumeAudioContext().catch(() => {});

    // Request with broadly compatible settings (avoid strict constraints that break on some devices)
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      // Fallback for older/quirky browsers
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    // Release the stream immediately - we just needed permission
    stream.getTracks().forEach((track) => track.stop());

    permissionGranted = true;
    lastPermissionCheck = now;
    notifyMicPermissionChanged('granted');

    console.log('[MicManager] Microphone permission granted');
    return true;
  } catch (err: any) {
    console.error('[MicManager] Microphone permission denied:', err?.name || err);
    permissionGranted = false;
    notifyMicPermissionChanged(err?.name === 'NotAllowedError' ? 'denied' : 'prompt');

    if (err?.name === 'NotAllowedError') {
      console.warn('[MicManager] User denied microphone access');
    } else if (err?.name === 'NotFoundError') {
      console.warn('[MicManager] No microphone found on device');
    } else if (err?.name === 'NotReadableError') {
      console.warn('[MicManager] Microphone is in use by another application');
    }

    return false;
  }
};

/**
 * Check if microphone permission is already granted
 */
export const checkMicPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
  try {
    // Try Permissions API first (modern browsers)
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (result.state === 'granted') {
        permissionGranted = true;
        lastPermissionCheck = Date.now();
      } else if (result.state === 'denied') {
        permissionGranted = false;
      }
      notifyMicPermissionChanged(result.state as 'granted' | 'denied' | 'prompt');
      return result.state as 'granted' | 'denied' | 'prompt';
    }
  } catch {
    // Permissions API not supported or failed
  }

  // Fallback: check cache
  if (permissionGranted) return 'granted';
  notifyMicPermissionChanged('prompt');
  return 'prompt';
};

/**
 * Initialize mic permission on app startup.
 * NOTE: This does NOT prompt the user. It only caches "granted" if already allowed.
 */
export const initializeMicPermission = async (): Promise<void> => {
  try {
    const status = await checkMicPermission();
    if (status === 'granted') {
      permissionGranted = true;
      lastPermissionCheck = Date.now();
      notifyMicPermissionChanged('granted');
      console.log('[MicManager] Mic already permitted');

      // Attempt resume (non-fatal if blocked without gesture)
      resumeAudioContext().catch(() => {});
    }
  } catch (err) {
    console.warn('[MicManager] Init check failed:', err);
  }
};

/**
 * Check if SpeechRecognition is supported
 */
export const isSpeechRecognitionSupported = (): boolean => {
  return !!(
    (window as any).webkitSpeechRecognition || 
    (window as any).SpeechRecognition
  );
};

/**
 * Check if SpeechSynthesis is supported
 */
export const isSpeechSynthesisSupported = (): boolean => {
  return 'speechSynthesis' in window;
};

/**
 * Get SpeechRecognition constructor
 */
export const getSpeechRecognition = (): any | null => {
  const SpeechRec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  return SpeechRec || null;
};


/**
 * Platform detection for speech recognition quirks
 * Enhanced Safari/iOS detection for cross-browser compatibility
 */
export const getPlatformInfo = () => {
  const ua = navigator.userAgent;
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  // Enhanced iOS detection including iPad in desktop mode
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
    (navigator.platform === 'MacIntel' && maxTouchPoints > 1);
  // Safari detection excluding Chrome/Edge/etc that include "Safari" in UA
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isEdge = /Edge|Edg/.test(ua);
  const isWebKit = /AppleWebKit/.test(ua) && !/Chrome/.test(ua);
  const isTouchSafariLike = isSafari && maxTouchPoints > 0;
  
  // Parse versions
  let iosVersion: number | null = null;
  if (isIOS) {
    const match = ua.match(/OS (\d+)_/);
    if (match) iosVersion = parseInt(match[1], 10);
  }
  
  let safariVersion: number | null = null;
  if (isSafari) {
    const match = ua.match(/Version\/(\d+)/);
    if (match) safariVersion = parseInt(match[1], 10);
  }
  
  return { 
    isIOS, 
    isSafari, 
    isChrome, 
    isAndroid, 
    isFirefox, 
    isEdge, 
    isWebKit,
    isTouchSafariLike,
    iosVersion,
    safariVersion,
  };
};

// Global keep-alive manager to prevent 5-second timeout
const keepAliveRegistry = new Map<any, NodeJS.Timeout>();
const restartRegistry = new Map<any, { count: number; lastRestart: number }>();
const watchdogRegistry = new Map<any, NodeJS.Timeout>();

/**
 * Start aggressive keep-alive for a recognition instance
 * Uses dual strategy: pause/resume + restart watchdog
 */
const startRecognitionKeepAlive = (recognition: any) => {
  // Clear any existing intervals
  const existing = keepAliveRegistry.get(recognition);
  if (existing) clearInterval(existing);
  const existingWatchdog = watchdogRegistry.get(recognition);
  if (existingWatchdog) clearInterval(existingWatchdog);
  
  const platform = getPlatformInfo();
  // Aggressive intervals to prevent 5-second browser timeout
  const intervalMs = platform.isIOS || platform.isSafari ? 3000 : 2500;
  
  let lastResultTime = Date.now();
  (recognition as any).__lastResultTime = lastResultTime;
  
  // Primary keep-alive: touch recognition periodically
  const interval = setInterval(() => {
    try {
      // Update timestamp to show we're still active
      (recognition as any).__keepAliveTimestamp = Date.now();
    } catch (e) {
      // Ignore errors
    }
  }, intervalMs);
  
  keepAliveRegistry.set(recognition, interval);
  
  // Watchdog: detect if recognition has gone silent for too long
  // FIXED: Only log once per threshold crossing, not every 2 seconds
  let watchdogTriggered = false;
  const SILENCE_THRESHOLD_MS = 30000; // 30 seconds before watchdog kicks in (was 4s causing spam)
  
  const watchdog = setInterval(() => {
    try {
      const now = Date.now();
      const lastResult = (recognition as any).__lastResultTime || now;
      const timeSinceResult = now - lastResult;
      
      // If more than threshold since last result and recognition should be active
      if (timeSinceResult > SILENCE_THRESHOLD_MS && (recognition as any).__keepAlive) {
        // Only trigger once per silence period to prevent log spam
        if (!watchdogTriggered) {
          watchdogTriggered = true;
          console.log('[MicManager] Watchdog: silence detected after', Math.round(timeSinceResult / 1000), 's - restarting');
          try {
            recognition.stop();
          } catch (e) {}
          // onend handler will auto-restart
        }
      } else if (timeSinceResult < SILENCE_THRESHOLD_MS) {
        // Reset trigger when we get activity
        watchdogTriggered = false;
      }
    } catch (e) {
      // Ignore
    }
  }, 5000); // Check every 5 seconds instead of 2 to reduce overhead
  
  watchdogRegistry.set(recognition, watchdog);
};

/**
 * Stop keep-alive for a recognition instance
 */
const stopRecognitionKeepAlive = (recognition: any) => {
  const interval = keepAliveRegistry.get(recognition);
  if (interval) {
    clearInterval(interval);
    keepAliveRegistry.delete(recognition);
  }
  const watchdog = watchdogRegistry.get(recognition);
  if (watchdog) {
    clearInterval(watchdog);
    watchdogRegistry.delete(recognition);
  }
  restartRegistry.delete(recognition);
};

/**
 * Create and configure a speech recognition instance with optimal settings
 * Includes aggressive workarounds for the 5-second timeout issue
 * Cross-browser compatible: Chrome, Safari, Firefox, Edge, iOS Safari
 */
export const createSpeechRecognition = (options?: {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  keepAlive?: boolean;
  onAutoRestart?: () => void;
}): any | null => {
  const SpeechRec = getSpeechRecognition();
  if (!SpeechRec) {
    console.warn('[MicManager] SpeechRecognition not supported');
    return null;
  }
  
  const recognition = new SpeechRec();
  const platform = getPlatformInfo();
  const recognitionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  (recognition as any).__zoeRecognitionId = recognitionId;
  
  // Platform-specific settings for Safari/iOS stability
  if (platform.isIOS || platform.isAndroid || platform.isTouchSafariLike) {
    // Mobile Web Speech has severe continuous-mode bugs; restart short segments instead.
    recognition.continuous = false;
    recognition.interimResults = false;
    console.log('[MicManager] Mobile speech mode: continuous=false, interim=false');
  } else if (platform.isSafari) {
    // Desktop Safari - more stable but still needs care
    recognition.continuous = options?.continuous ?? true;
    // Safari 14+ handles interim results better
    recognition.interimResults = (platform.safariVersion || 0) >= 14 
      ? (options?.interimResults ?? true) 
      : false;
    console.log('[MicManager] Safari mode: continuous=' + recognition.continuous + ', interim=' + recognition.interimResults);
  } else {
    // Chrome, Firefox, Edge - full features
    recognition.continuous = options?.continuous ?? true;
    recognition.interimResults = options?.interimResults ?? true;
  }
  
  recognition.lang = options?.lang ?? 'en-US';
  recognition.maxAlternatives = 1;
  
  // Store platform info and options for keep-alive handling
  (recognition as any).__platform = platform;
  (recognition as any).__keepAlive = options?.keepAlive ?? true;
  (recognition as any).__onAutoRestart = options?.onAutoRestart;
  (recognition as any).__lastResultTime = Date.now();
  
  // Initialize restart tracking
  restartRegistry.set(recognition, { count: 0, lastRestart: Date.now() });
  
  // Wrap onstart to enable keep-alive
  const originalOnStart = recognition.onstart;
  recognition.onstart = function(event: any) {
    console.log('[MicManager] Recognition started');
    (recognition as any).__lastResultTime = Date.now();
    const owner = activeSpeechRecognition?.recognition === recognition ? activeSpeechRecognition.owner : 'unclaimed';
    zoeDebugSpeechStart(owner, `native onstart · continuous=${Boolean(recognition.continuous)} interim=${Boolean(recognition.interimResults)} id=${recognitionId}`);
    if ((recognition as any).__keepAlive) {
      startRecognitionKeepAlive(recognition);
    }
    if (originalOnStart) originalOnStart.call(this, event);
  };
  
  // Wrap onresult to track activity
  const originalOnResult = recognition.onresult;
  recognition.onresult = function(event: any) {
    (recognition as any).__lastResultTime = Date.now();
    if (originalOnResult) originalOnResult.call(this, event);
  };
  
  // Wrap onend for auto-restart with intelligent backoff
  const originalOnEnd = recognition.onend;
  recognition.onend = function(event: any) {
    stopRecognitionKeepAlive(recognition);
    
    // Get restart tracking
    const tracking = restartRegistry.get(recognition);
    const now = Date.now();
    
    // Reset count if last restart was more than 30 seconds ago
    if (tracking && now - tracking.lastRestart > 30000) {
      tracking.count = 0;
    }
    
    // Auto-restart if enabled and not exceeded limit (with exponential backoff)
    if ((recognition as any).__keepAlive && tracking && tracking.count < 20) {
      // CRITICAL: Use exponential backoff to prevent restart loops
      // Base delay + exponential growth based on restart count
      const baseDelay = platform.isIOS || platform.isSafari ? 200 : 150;
      const backoffDelay = Math.min(baseDelay * Math.pow(1.5, tracking.count), 5000);
      
      setTimeout(() => {
        try {
          // Double-check keepAlive is still true before restarting
          if (!(recognition as any).__keepAlive) {
            console.log('[MicManager] Restart cancelled - keepAlive disabled');
            return;
          }
          recognition.start();
          tracking.count++;
          tracking.lastRestart = Date.now();
          console.log('[MicManager] Auto-restart #' + tracking.count + ' (delay: ' + Math.round(backoffDelay) + 'ms)');
          const owner = activeSpeechRecognition?.recognition === recognition ? activeSpeechRecognition.owner : 'unclaimed';
          zoeDebugSpeechStart(owner, `manager auto-restart #${tracking.count} after ${Math.round(backoffDelay)}ms`);
          
          if ((recognition as any).__onAutoRestart) {
            (recognition as any).__onAutoRestart();
          }
        } catch (e: any) {
          if (!e?.message?.includes('already started')) {
            console.warn('[MicManager] Auto-restart failed:', e?.message);
          }
        }
      }, backoffDelay);
    }
    
    if (originalOnEnd) originalOnEnd.call(this, event);
  };
  
  return recognition;
};

/**
 * Safe speech recognition start
 */
export const startSpeechRecognition = async (
  recognition: any,
  onError?: (error: string) => void
): Promise<boolean> => {
  const hasPermission = await requestMicPermission();
  if (!hasPermission) {
    onError?.('Microphone access required. Please allow in browser settings.');
    return false;
  }

  try {
    recognition.start();
    console.log('[MicManager] Speech recognition started');
    return true;
  } catch (err: any) {
    if (err?.message?.includes('already started')) {
      console.log('[MicManager] Recognition already started');
      return true;
    }
    console.error('[MicManager] Failed to start recognition:', err);
    onError?.('Could not start voice input. Please try again.');
    return false;
  }
};

/**
 * Safely stop speech recognition
 */
export const stopSpeechRecognition = (recognition: any | null): void => {
  if (!recognition) return;

  const owner = activeSpeechRecognition?.recognition === recognition ? activeSpeechRecognition.owner : 'unknown';
  zoeDebugSpeechStop(owner, 'stopSpeechRecognition called');

  if (activeSpeechRecognition?.recognition === recognition) {
    activeSpeechRecognition = null;
  }

  // Disable auto-restart
  (recognition as any).__keepAlive = false;
  stopRecognitionKeepAlive(recognition);

  try {
    recognition.stop();
  } catch {
    // Ignore stop errors
  }
};

// Export permission state for components that need to check without async
export const isPermissionCached = (): boolean => permissionGranted;

export const getCachedMicPermission = (): 'granted' | 'prompt' => permissionGranted ? 'granted' : 'prompt';

// Backward-compat no-ops (older code may still import these)
export const setCurrentUser = (_username?: string | null): void => {
  // no-op
};

export const isAdminUser = (_username?: string | null): boolean => {
  return false;
};

export const isCurrentUserAdmin = (): boolean => false;

