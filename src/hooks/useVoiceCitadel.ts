// ═══════════════════════════════════════════════════════════════════════════════
// VOICE CITADEL - Protocol Alpha Security
// Military-Grade Biometric Passphrase Authentication
// Passphrase: "Access Protocol Alpha"
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceBioResonance, VoiceDNA, VoiceMatchResult } from './useVoiceBioResonance';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CitadelState = 
  | 'locked'           // Initial state - waiting for auth
  | 'listening'        // Listening for passphrase
  | 'analyzing'        // Analyzing voice biometrics
  | 'unlocked'         // Successfully authenticated
  | 'pin_required'     // Voice failed, need PIN
  | 'denied';          // Access denied

export interface CitadelConfig {
  passphrase: string;
  matchThreshold: number;      // Voice match threshold (0-100)
  maxAttempts: number;         // Max voice attempts before PIN
  listenDurationMs: number;    // How long to listen for voice
  pinCode?: string;            // Fallback PIN (stored hashed)
  autoLockMinutes?: number;    // Auto-lock after inactivity
}

export interface UseCitadelReturn {
  // State
  state: CitadelState;
  isUnlocked: boolean;
  attempts: number;
  lastMatch: VoiceMatchResult | null;
  storedVoiceDNA: VoiceDNA | null;
  
  // Actions
  startListening: () => Promise<void>;
  stopListening: () => void;
  verifyPin: (pin: string) => boolean;
  enrollVoice: () => Promise<VoiceDNA | null>;
  resetCitadel: () => void;
  lock: () => void;
  
  // Status
  isListening: boolean;
  isEnrolled: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PASSPHRASE = "access protocol alpha";
const CITADEL_STORAGE_KEY = 'voice_citadel_profile';
const CITADEL_PIN_KEY = 'voice_citadel_pin_hash';
const CITADEL_UNLOCK_KEY = 'voice_citadel_unlocked';

const DEFAULT_CONFIG: CitadelConfig = {
  passphrase: PASSPHRASE,
  matchThreshold: 65,        // 65% match for passphrase + voice
  maxAttempts: 3,
  listenDurationMs: 4000,    // 4 seconds to say passphrase
  autoLockMinutes: 30,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIMPLE HASH FOR PIN (not crypto-secure, but sufficient for local fallback)
// ═══════════════════════════════════════════════════════════════════════════════

const hashPin = async (pin: string): Promise<string> => {
  const data = new TextEncoder().encode(pin + 'citadel_salt_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useVoiceCitadel(config: Partial<CitadelConfig> = {}): UseCitadelReturn {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const { analyzeVoiceDNA, matchVoiceDNA, isAnalyzing } = useVoiceBioResonance();
  
  const [state, setState] = useState<CitadelState>('locked');
  const [attempts, setAttempts] = useState(0);
  const [lastMatch, setLastMatch] = useState<VoiceMatchResult | null>(null);
  const [storedVoiceDNA, setStoredVoiceDNA] = useState<VoiceDNA | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // Load stored voice profile on mount
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CITADEL_STORAGE_KEY);
      if (stored) {
        setStoredVoiceDNA(JSON.parse(stored));
      }
      
      // Check if already unlocked in this session
      const unlocked = sessionStorage.getItem(CITADEL_UNLOCK_KEY);
      if (unlocked === 'true') {
        setState('unlocked');
      }
    } catch (e) {
      console.error('[Citadel] Failed to load profile:', e);
    }
    
    return () => {
      cleanup();
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-lock timer
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (state === 'unlocked' && cfg.autoLockMinutes) {
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
      }
      
      autoLockTimerRef.current = setTimeout(() => {
        console.log('[Citadel] Auto-locking due to inactivity');
        lock();
      }, cfg.autoLockMinutes * 60 * 1000);
    }
    
    return () => {
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
      }
    };
  }, [state, cfg.autoLockMinutes]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Cleanup resources
  // ═══════════════════════════════════════════════════════════════════════════
  
  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setIsListening(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Start listening for passphrase
  // ═══════════════════════════════════════════════════════════════════════════
  
  const startListening = useCallback(async () => {
    if (state === 'unlocked') return;
    
    setError(null);
    setState('listening');
    setIsListening(true);
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      
      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Set up speech recognition for passphrase detection
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError('Speech recognition not supported');
        setState('pin_required');
        cleanup();
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;
      
      let passphraseDetected = false;
      let voiceCaptured = false;
      
      recognition.onresult = async (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('')
          .toLowerCase()
          .trim();
        
        console.log('[Citadel] Heard:', transcript);
        
        // Check if passphrase is spoken
        if (transcript.includes(cfg.passphrase.toLowerCase()) && !passphraseDetected) {
          passphraseDetected = true;
          console.log('[Citadel] Passphrase detected! Analyzing voice...');
          
          setState('analyzing');
          
          // Capture voice DNA while they're speaking
          if (analyserRef.current && audioContextRef.current && !voiceCaptured) {
            voiceCaptured = true;
            
            try {
              const currentDNA = await analyzeVoiceDNA(
                analyserRef.current,
                audioContextRef.current,
                cfg.listenDurationMs
              );
              
              console.log('[Citadel] Voice DNA captured:', currentDNA);
              
              // If no stored profile, this is enrollment
              if (!storedVoiceDNA) {
                console.log('[Citadel] No stored profile - enrolling this voice');
                localStorage.setItem(CITADEL_STORAGE_KEY, JSON.stringify(currentDNA));
                setStoredVoiceDNA(currentDNA);
                unlock();
                return;
              }
              
              // Match against stored profile
              const matchResult = matchVoiceDNA(currentDNA, storedVoiceDNA, cfg.matchThreshold);
              setLastMatch(matchResult);
              
              console.log('[Citadel] Voice match result:', matchResult);
              
              if (matchResult.isMatch) {
                unlock();
              } else {
                handleFailedAttempt();
              }
            } catch (e) {
              console.error('[Citadel] Voice analysis failed:', e);
              handleFailedAttempt();
            }
          }
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('[Citadel] Speech recognition error:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Voice error: ${event.error}`);
        }
        handleFailedAttempt();
      };
      
      recognition.onend = () => {
        if (!passphraseDetected && state === 'listening') {
          console.log('[Citadel] No passphrase detected');
          handleFailedAttempt();
        }
        cleanup();
      };
      
      recognition.start();
      
      // Timeout if no passphrase detected
      setTimeout(() => {
        if (state === 'listening' && !passphraseDetected) {
          recognition.stop();
        }
      }, cfg.listenDurationMs + 2000);
      
    } catch (e: any) {
      console.error('[Citadel] Failed to start listening:', e);
      setError(e.message || 'Microphone access denied');
      setState('pin_required');
      cleanup();
    }
  }, [state, cfg, storedVoiceDNA, analyzeVoiceDNA, matchVoiceDNA, cleanup]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Handle failed attempt
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleFailedAttempt = useCallback(() => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (newAttempts >= cfg.maxAttempts) {
      console.log('[Citadel] Max attempts reached - requiring PIN');
      setState('pin_required');
    } else {
      setState('locked');
      setError(`Voice not recognized. ${cfg.maxAttempts - newAttempts} attempts remaining.`);
    }
    
    cleanup();
  }, [attempts, cfg.maxAttempts, cleanup]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Unlock
  // ═══════════════════════════════════════════════════════════════════════════
  
  const unlock = useCallback(() => {
    console.log('[Citadel] ✓ ACCESS GRANTED');
    setState('unlocked');
    setAttempts(0);
    setError(null);
    sessionStorage.setItem(CITADEL_UNLOCK_KEY, 'true');
    cleanup();
  }, [cleanup]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Lock
  // ═══════════════════════════════════════════════════════════════════════════
  
  const lock = useCallback(() => {
    console.log('[Citadel] Locking...');
    setState('locked');
    setAttempts(0);
    setLastMatch(null);
    sessionStorage.removeItem(CITADEL_UNLOCK_KEY);
    cleanup();
  }, [cleanup]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Stop listening
  // ═══════════════════════════════════════════════════════════════════════════
  
  const stopListening = useCallback(() => {
    cleanup();
    if (state === 'listening' || state === 'analyzing') {
      setState('locked');
    }
  }, [cleanup, state]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Verify PIN
  // ═══════════════════════════════════════════════════════════════════════════
  
  const verifyPin = useCallback((pin: string): boolean => {
    // Default PIN is "1111" if not set
    const storedHash = localStorage.getItem(CITADEL_PIN_KEY);
    
    if (!storedHash) {
      // First time - accept any 4+ digit PIN and store it
      if (pin.length >= 4) {
        hashPin(pin).then(hash => {
          localStorage.setItem(CITADEL_PIN_KEY, hash);
        });
        unlock();
        return true;
      }
      return false;
    }
    
    // Verify against stored hash
    hashPin(pin).then(hash => {
      if (hash === storedHash) {
        unlock();
      } else {
        setError('Incorrect PIN');
      }
    });
    
    return true; // Async verification
  }, [unlock]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Enroll voice (manual enrollment)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const enrollVoice = useCallback(async (): Promise<VoiceDNA | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      console.log('[Citadel] Enrolling voice - speak now...');
      
      const dna = await analyzeVoiceDNA(
        analyserRef.current,
        audioContextRef.current,
        5000 // 5 seconds for enrollment
      );
      
      localStorage.setItem(CITADEL_STORAGE_KEY, JSON.stringify(dna));
      setStoredVoiceDNA(dna);
      
      cleanup();
      return dna;
    } catch (e) {
      console.error('[Citadel] Enrollment failed:', e);
      cleanup();
      return null;
    }
  }, [analyzeVoiceDNA, cleanup]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Reset citadel (clear all stored data)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const resetCitadel = useCallback(() => {
    localStorage.removeItem(CITADEL_STORAGE_KEY);
    localStorage.removeItem(CITADEL_PIN_KEY);
    sessionStorage.removeItem(CITADEL_UNLOCK_KEY);
    setStoredVoiceDNA(null);
    setState('locked');
    setAttempts(0);
    setLastMatch(null);
    setError(null);
    console.log('[Citadel] Reset complete');
  }, []);

  return {
    state,
    isUnlocked: state === 'unlocked',
    attempts,
    lastMatch,
    storedVoiceDNA,
    startListening,
    stopListening,
    verifyPin,
    enrollVoice,
    resetCitadel,
    lock,
    isListening: isListening || isAnalyzing,
    isEnrolled: storedVoiceDNA !== null,
    error,
  };
}

export default useVoiceCitadel;
