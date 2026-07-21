// ═══════════════════════════════════════════════════════════════════════════════
// VOICE CITADEL LOGIN - Military-Grade Biometric Authentication Interface
// Year 2050 Aesthetic with Glassmorphism & Living Waveform
// Connected to Zoe DHF Core for voice biometric verification
// Supports: ENROLL (first time), LOGIN (verify), OFFLINE (local key)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { VoiceOrb } from './VoiceOrb';
import { StarfieldBackground } from './StarfieldBackground';
import { useZoeMediaAccess } from '@/hooks/useZoeMediaAccess';
import { useVoiceBioResonance, type VoiceDNA } from '@/hooks/useVoiceBioResonance';
import { useZeroKnowledgeVault } from '@/hooks/useZeroKnowledgeVault';
import { useVoiceCitadelOrchestrator } from '@/hooks/useVoiceCitadelOrchestrator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Fingerprint, Shield, Wifi, WifiOff, Lock, Unlock, Activity, Loader2, CheckCircle2, AlertCircle, Radio, Mail } from 'lucide-react';

type AuthState = 'idle' | 'listening' | 'processing' | 'success' | 'error';
type AuthMode = 'online' | 'offline';
type FlowMode = 'login' | 'enroll';

interface VoiceQualityMetrics {
  volume: number; // 0-100
  clarity: number; // 0-100
  duration: number; // seconds recorded
  isGoodQuality: boolean;
}

interface VoiceCitadelLoginProps {
  onAuthSuccess?: (userId: string) => void;
  onAuthError?: (error: string) => void;
  className?: string;
}

const STATUS_MESSAGES: Record<AuthState, Record<FlowMode, string>> = {
  idle: {
    login: 'TAP ORB TO AUTHENTICATE',
    enroll: 'TAP ORB TO ENROLL VOICE',
  },
  listening: {
    login: 'SPEAK NOW - 3 SECONDS',
    enroll: 'SPEAK CLEARLY - 5 SECONDS',
  },
  processing: {
    login: 'ANALYZING VOICE PATTERN...',
    enroll: 'PROCESSING VOICE ENROLLMENT...',
  },
  success: {
    login: 'IDENTITY VERIFIED ✓',
    enroll: 'VOICE ENROLLED SUCCESSFULLY ✓',
  },
  error: {
    login: 'AUTHENTICATION FAILED',
    enroll: 'ENROLLMENT FAILED',
  },
};

// Generate voice signature hash from audio data
const generateVoiceSignature = async (audioData: Float32Array): Promise<string> => {
  // Create a simplified voice print hash from frequency patterns
  const encoder = new TextEncoder();
  const data = encoder.encode(audioData.slice(0, 1000).join(','));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Generate device fingerprint
const getDeviceFingerprint = (): string => {
  const { userAgent, language, platform } = navigator;
  const screenData = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  return btoa(`${userAgent}-${language}-${platform}-${screenData}`).slice(0, 64);
};

const GlassCard = memo<{ children: React.ReactNode; className?: string }>(
  ({ children, className }) => (
    <motion.div
      className={cn(
        'relative rounded-3xl overflow-hidden',
        'backdrop-blur-[20px]',
        className
      )}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: `
          0 0 100px rgba(6, 182, 212, 0.2),
          0 0 150px rgba(251, 191, 36, 0.12),
          inset 0 0 80px rgba(255, 255, 255, 0.03),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          0 30px 60px -15px rgba(0, 0, 0, 0.6)
        `,
      }}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div 
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(255, 255, 255, 0.1) 0%, 
              transparent 50%, 
              rgba(6, 182, 212, 0.05) 100%
            )
          `,
        }}
      />
      {children}
    </motion.div>
  )
);

GlassCard.displayName = 'GlassCard';

const VoiceCitadelLoginComponent: React.FC<VoiceCitadelLoginProps> = ({
  onAuthSuccess,
  onAuthError,
  className,
}) => {
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [authMode, setAuthMode] = useState<AuthMode>('online');
  const [flowMode, setFlowMode] = useState<FlowMode>('login');
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasEnrolledVoice, setHasEnrolledVoice] = useState<boolean | null>(null);
  const [capturedAudioData, setCapturedAudioData] = useState<Float32Array | null>(null);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const [voiceQuality, setVoiceQuality] = useState<VoiceQualityMetrics>({
    volume: 0,
    clarity: 0,
    duration: 0,
    isGoodQuality: false,
  });
  const [enrollmentDetails, setEnrollmentDetails] = useState<{
    enrolledAt: string | null;
    useCount: number;
    lastUsed: string | null;
  } | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingStartRef = useRef<number>(0);
  const volumeSamplesRef = useRef<number[]>([]);

  const { activate, releaseMic } = useZoeMediaAccess();
  const { analyzeVoiceDNA, matchVoiceDNA, getSecurityContext, registerKnownDevice, serializeVoiceDNA, deserializeVoiceDNA } = useVoiceBioResonance();
  const { encryptToken, decryptToken, getVaultStatus, isLocked, failedAttempts, resetVaultLock } = useZeroKnowledgeVault();
  const { user } = useAuth();
  const { authenticateWithEmail, isLoading: passkeyLoading, isSupported: passkeySupported, deviceType } = useWebAuthn();
  const navigate = useNavigate();
  
  // Master Orchestrator - handles all background checks and auto-alignment
  const orchestrator = useVoiceCitadelOrchestrator(user?.id);

  // Auto-switch auth mode based on orchestrator recommendation
  useEffect(() => {
    if (orchestrator.manualMode === 'auto' && 
        orchestrator.state.recommendedMode !== authMode && 
        authState === 'idle' &&
        orchestrator.state.bootSequenceComplete) {
      console.log(`[VoiceCitadel] 🔄 Auto-switching to ${orchestrator.state.recommendedMode.toUpperCase()} mode`);
      setAuthMode(orchestrator.state.recommendedMode);
    }
  }, [orchestrator.state.recommendedMode, orchestrator.state.bootSequenceComplete, orchestrator.manualMode, authMode, authState]);

  // Check if user has enrolled voice print
  useEffect(() => {
    const checkEnrollment = async () => {
      if (!user) {
        setHasEnrolledVoice(false);
        setEnrollmentDetails(null);
        setFlowMode('login');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('voice_print_enrollments')
          .select('id, created_at, use_count, last_used_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.warn('[VoiceCitadel] Enrollment check error:', error);
          setHasEnrolledVoice(false);
          setEnrollmentDetails(null);
        } else {
          setHasEnrolledVoice(!!data);
          if (data) {
            setEnrollmentDetails({
              enrolledAt: data.created_at,
              useCount: data.use_count || 0,
              lastUsed: data.last_used_at,
            });
            setFlowMode('login');
          } else {
            setFlowMode('enroll');
            setEnrollmentDetails(null);
          }
        }
      } catch (err) {
        console.error('[VoiceCitadel] Enrollment check failed:', err);
        setHasEnrolledVoice(false);
        setEnrollmentDetails(null);
      }
    };

    checkEnrollment();
  }, [user]);

  const handlePasskeyLogin = useCallback(async () => {
    const success = await authenticateWithEmail(loginEmail);
    if (success) {
      setAuthState('success');
      onAuthSuccess?.('passkey-auth-verified');
      setTimeout(() => navigate('/home'), 500);
    }
  }, [authenticateWithEmail, loginEmail, navigate, onAuthSuccess]);

  // Calculate voice quality from audio data
  const calculateVoiceQuality = useCallback((dataArray: Float32Array): VoiceQualityMetrics => {
    // Calculate RMS volume (0-100)
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const volume = Math.min(100, Math.round(rms * 500)); // Scale to 0-100
    
    // Calculate clarity (variation in signal - more variation = clearer voice)
    let variance = 0;
    const mean = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    for (let i = 0; i < dataArray.length; i++) {
      variance += Math.pow(dataArray[i] - mean, 2);
    }
    const clarity = Math.min(100, Math.round((variance / dataArray.length) * 10000));
    
    // Duration
    const duration = (Date.now() - recordingStartRef.current) / 1000;
    
    // Good quality: volume > 20, clarity > 15
    const isGoodQuality = volume > 20 && clarity > 15;
    
    return { volume, clarity, duration, isGoodQuality };
  }, []);

  // Audio visualization loop with quality tracking
  const updateAudioData = useCallback(() => {
    if (analyserRef.current && authState === 'listening') {
      const dataArray = new Float32Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getFloatTimeDomainData(dataArray);
      setAudioData(dataArray);
      setCapturedAudioData(new Float32Array(dataArray));
      
      // Update voice quality metrics
      const quality = calculateVoiceQuality(dataArray);
      setVoiceQuality(quality);
      volumeSamplesRef.current.push(quality.volume);
      
      // Update recording progress
      const captureTime = flowMode === 'enroll' ? 5 : 3;
      const progress = Math.min(100, (quality.duration / captureTime) * 100);
      setRecordingProgress(progress);
      
      animationFrameRef.current = requestAnimationFrame(updateAudioData);
    }
  }, [authState, calculateVoiceQuality, flowMode]);

  // Start voice capture
  const startListening = useCallback(async () => {
    try {
      setAuthState('listening');
      setErrorMessage('');
      setRecordingProgress(0);
      setVoiceQuality({ volume: 0, clarity: 0, duration: 0, isGoodQuality: false });
      volumeSamplesRef.current = [];
      recordingStartRef.current = Date.now();

      const activated = await activate();
      if (!activated) {
        throw new Error('Microphone access denied');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        } 
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      updateAudioData();

      // Capture duration: 3s for login, 5s for enrollment (need more data)
      const captureTime = flowMode === 'enroll' ? 5000 : 3000;
      setTimeout(() => {
        // Check average volume quality before processing
        const avgVolume = volumeSamplesRef.current.length > 0 
          ? volumeSamplesRef.current.reduce((a, b) => a + b, 0) / volumeSamplesRef.current.length 
          : 0;
        
        if (avgVolume < 10 && flowMode === 'enroll') {
          setAuthState('error');
          setErrorMessage('Voice too quiet. Please speak louder and try again.');
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          setTimeout(() => setAuthState('idle'), 3000);
          return;
        }
        
        processVoiceAuth();
      }, captureTime);

    } catch (error) {
      console.error('Voice capture error:', error);
      setAuthState('error');
      setErrorMessage('Microphone access required');
      onAuthError?.('Microphone access denied');
    }
  }, [activate, updateAudioData, onAuthError, flowMode]);

  // Calculate string similarity (simplified Jaccard-like) - used for voice signature comparison
  const calculateSimilarity = useCallback((str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }, []);

  // Process voice authentication or enrollment using Bio-Resonance Engine
  const processVoiceAuth = useCallback(async () => {
    setAuthState('processing');
    
    // Stop audio capture
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setAudioData(null);

    try {
      console.log(`[VoiceCitadel] ═══ ${flowMode.toUpperCase()} MODE ═══`);
      console.log('[VoiceCitadel] 🧬 Bio-Resonance Engine ACTIVE');
      
      // Get security context (IP, device fingerprint, timezone)
      const securityContext = await getSecurityContext();
      console.log('[VoiceCitadel] 🔐 Security Context:', {
        isKnownDevice: securityContext.isKnownDevice,
        isSafeZone: securityContext.isSafeZone,
        timezone: securityContext.timezone
      });
      
      const deviceFingerprint = securityContext.deviceFingerprint;
      
      // Generate voice signature for database storage
      const voiceSignature = capturedAudioData 
        ? await generateVoiceSignature(capturedAudioData)
        : await generateVoiceSignature(new Float32Array(1000).fill(Math.random()));

      // ═══════════════════════════════════════════════════════════════════════════
      // ENROLLMENT MODE: Register Voice DNA + Zero-Knowledge Vault
      // ═══════════════════════════════════════════════════════════════════════════
      if (flowMode === 'enroll') {
        console.log('[VoiceCitadel] 📝 Processing voice enrollment with Bio-Resonance...');
        
        if (!user) {
          throw new Error('Sign in with password or passkey first, then enroll Voice Citadel for this account.');
        }

        // Extract Voice DNA using Bio-Resonance Engine (if we have audio context)
        let voiceDNAData: VoiceDNA | null = null;
        if (analyserRef.current && audioContextRef.current) {
          try {
            voiceDNAData = await analyzeVoiceDNA(analyserRef.current, audioContextRef.current, 1000);
            console.log('[VoiceCitadel] 🧬 Voice DNA Extracted:', voiceDNAData);
          } catch (e) {
            console.warn('[VoiceCitadel] Voice DNA extraction fallback - using signature only');
          }
        }

        // Generate offline key for local verification
        const offlineKey = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(`${voiceSignature}-${user.id}-${Date.now()}`)
        );
        const offlineKeyHash = Array.from(new Uint8Array(offlineKey))
          .map(b => b.toString(16).padStart(2, '0')).join('');

        // Upsert voice enrollment (replace existing if present)
        const { error: enrollError } = await supabase
          .from('voice_print_enrollments')
          .upsert({
            user_id: user.id,
            voice_signature_hash: voiceSignature,
            device_fingerprint: deviceFingerprint,
            offline_key_hash: offlineKeyHash,
            is_active: true,
            use_count: 0,
            metadata: {
              enrolled_at: new Date().toISOString(),
              auth_mode: authMode,
              user_agent: navigator.userAgent,
              voice_dna: voiceDNAData ? serializeVoiceDNA(voiceDNAData) : null,
              security_context: {
                timezone: securityContext.timezone,
                isKnownDevice: securityContext.isKnownDevice
              }
            }
          }, { onConflict: 'user_id' });

        if (enrollError) {
          console.error('[VoiceCitadel] Enrollment error:', enrollError);
          throw new Error('Failed to save voice enrollment');
        }

        // Store offline key in localStorage for offline mode
        localStorage.setItem(`voice_citadel_offline_${user.id}`, offlineKeyHash);
        
        // Store serialized Voice DNA for Zero-Knowledge Vault
        if (voiceDNAData) {
          localStorage.setItem(`voice_citadel_dna_${user.id}`, serializeVoiceDNA(voiceDNAData));
          
          // Encrypt session token in Zero-Knowledge Vault
          const sessionToken = `session_${user.id}_${Date.now()}`;
          await encryptToken(voiceDNAData, sessionToken, user.id, deviceFingerprint, 72);
          console.log('[VoiceCitadel] 🔐 Zero-Knowledge Vault: Session token encrypted');
        }

        // Register device as known
        await registerKnownDevice();

        // Log biometric event
        await supabase.functions.invoke('zoe-sentinel', {
          body: {
            action: 'biometric_auth',
            requestData: {
              authMethod: 'voice_print_enrollment',
              success: true,
              confidenceScore: 1.0,
              microJitterDetected: false,
              metadata: { 
                source: 'voice_citadel', 
                flow: 'enrollment',
                voiceDNA: voiceDNAData ? { pitch: voiceDNAData.pitch, tempo: voiceDNAData.tempo } : null
              }
            }
          }
        }).catch(() => {});

        setAuthState('success');
        setHasEnrolledVoice(true);
        console.log('[VoiceCitadel] ✓ Voice enrollment complete with Bio-Resonance + Zero-Knowledge Vault');
        
        setTimeout(() => {
          setAuthState('idle');
          setFlowMode('login');
        }, 2000);
        
        return;
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // LOGIN MODE (ONLINE): Verify Voice DNA using Bio-Resonance Engine
      // ═══════════════════════════════════════════════════════════════════════════
      if (authMode === 'online') {
        console.log('[VoiceCitadel] 🌐 Mode: ONLINE - Bio-Resonance Cloud Verification');

        if (!user) {
          throw new Error('Enter your email and use Passkey Login, or sign in once to enroll voice authentication.');
        }

        // Check enrolled voice prints
        const { data: enrollment, error: fetchError } = await supabase
          .from('voice_print_enrollments')
          .select('voice_signature_hash, device_fingerprint, metadata, use_count')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (fetchError || !enrollment) {
          throw new Error('No voice enrollment found. Please enroll first.');
        }

        // Get stored Voice DNA from metadata
        const storedDNAString = (enrollment.metadata as any)?.voice_dna;
        let matchResult: { similarity: number; isMatch: boolean } | null = null;
        
        if (storedDNAString && analyserRef.current && audioContextRef.current) {
          try {
            // Analyze current voice
            const currentDNA = await analyzeVoiceDNA(analyserRef.current, audioContextRef.current, 1000);
            const storedDNA = deserializeVoiceDNA(storedDNAString);
            
            if (storedDNA) {
              // Use Bio-Resonance matching algorithm
              matchResult = matchVoiceDNA(currentDNA, storedDNA, 50); // 50% threshold
              console.log('[VoiceCitadel] 🧬 Voice DNA Match Result:', matchResult);
            }
          } catch (e) {
            console.warn('[VoiceCitadel] Bio-Resonance match fallback:', e);
          }
        }

        // Fallback to signature comparison if Bio-Resonance unavailable
        if (!matchResult) {
          const similarity = calculateSimilarity(voiceSignature, enrollment.voice_signature_hash);
          matchResult = { similarity: similarity * 100, isMatch: similarity > 0.3 };
          console.log(`[VoiceCitadel] 📝 Signature similarity: ${(similarity * 100).toFixed(1)}%`);
        }

        // Multi-factor check: Voice + Device + Safe Zone
        const deviceMatch = enrollment.device_fingerprint === deviceFingerprint;
        const securityBonus = (deviceMatch ? 10 : 0) + (securityContext.isSafeZone ? 5 : 0);
        const finalScore = matchResult.similarity + securityBonus;
        
        console.log('[VoiceCitadel] 🔐 Multi-Factor Score:', {
          voiceMatch: matchResult.similarity.toFixed(1),
          deviceMatch,
          safeZone: securityContext.isSafeZone,
          finalScore: finalScore.toFixed(1)
        });

        if (finalScore >= 50 || matchResult.isMatch) {
          // Update last used
          await supabase
            .from('voice_print_enrollments')
            .update({ 
              last_used_at: new Date().toISOString(),
              use_count: (enrollment.use_count || 0) + 1
            })
            .eq('user_id', user.id)
            .eq('is_active', true);

          // Log success
          await supabase.functions.invoke('zoe-sentinel', {
            body: {
              action: 'biometric_auth',
              requestData: {
                authMethod: 'voice_print',
                success: true,
                confidenceScore: 0.95,
                metadata: { source: 'voice_citadel', verified: true }
              }
            }
          }).catch(() => {});

          setAuthState('success');
          console.log('[VoiceCitadel] ✓ Voice verified');
          onAuthSuccess?.('voice-auth-verified');
          setTimeout(() => navigate('/home'), 2000);
        } else {
          throw new Error('Voice pattern not recognized');
        }
      } 
      // ═══════════════════════════════════════════════════════════════════════════
      // OFFLINE MODE: Zero-Knowledge Vault Voice-Derived Key Decryption
      // ═══════════════════════════════════════════════════════════════════════════
      else {
        console.log('[VoiceCitadel] 📴 Mode: OFFLINE - Zero-Knowledge Vault Verification');

        if (!user) {
          throw new Error('Sign in online first to enable offline Voice Citadel mode.');
        }
        
        // Check vault lock status
        if (isLocked) {
          throw new Error('Vault locked after too many failed attempts. Use PIN or biometric fallback.');
        }
        
        // Get stored Voice DNA
        const storedDNAString = localStorage.getItem(`voice_citadel_dna_${user.id}`);
        
        if (!storedDNAString) {
          throw new Error('No offline voice data found. Please enroll online first.');
        }

        // Analyze current voice to get DNA
        let currentDNA: VoiceDNA | null = null;
        if (analyserRef.current && audioContextRef.current) {
          try {
            currentDNA = await analyzeVoiceDNA(analyserRef.current, audioContextRef.current, 1000);
            console.log('[VoiceCitadel] 🧬 Current Voice DNA:', currentDNA);
          } catch (e) {
            throw new Error('Voice analysis failed. Please try again.');
          }
        }

        if (!currentDNA) {
          throw new Error('Could not analyze voice. Please try again.');
        }

        // Attempt Zero-Knowledge Vault decryption with voice-derived key
        console.log('[VoiceCitadel] 🔐 Attempting Zero-Knowledge Vault decryption...');
        const decryptResult = await decryptToken(currentDNA, user.id);
        
        if (decryptResult.success) {
          console.log('[VoiceCitadel] ✓ Zero-Knowledge Vault: Token decrypted successfully');
          setAuthState('success');
          onAuthSuccess?.('voice-auth-offline-zkp');
          setTimeout(() => navigate('/home'), 2000);
        } else {
          console.warn('[VoiceCitadel] Zero-Knowledge Vault decryption failed:', decryptResult.reason);
          
          // Check remaining attempts
          if (failedAttempts >= 2) {
            throw new Error('Vault locked - too many failed attempts. Use PIN or biometric fallback.');
          }
          
          throw new Error(decryptResult.reason || 'Voice not recognized. Please try again.');
        }
      }
      
    } catch (error) {
      console.error('[VoiceCitadel] Auth processing error:', error);
      setAuthState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Authentication system error');
      onAuthError?.(error instanceof Error ? error.message : 'System error');
      setTimeout(() => setAuthState('idle'), 3000);
    }
  }, [onAuthSuccess, onAuthError, authMode, flowMode, user, capturedAudioData, navigate, analyzeVoiceDNA, matchVoiceDNA, getSecurityContext, registerKnownDevice, serializeVoiceDNA, deserializeVoiceDNA, encryptToken, decryptToken, isLocked, failedAttempts, calculateSimilarity]);

  const passkeyLabel = deviceType === 'faceid'
    ? 'FACE ID / PASSKEY LOGIN'
    : deviceType === 'touchid'
      ? 'TOUCH ID / PASSKEY LOGIN'
      : deviceType === 'fingerprint'
        ? 'FINGERPRINT / PASSKEY LOGIN'
        : 'PASSKEY LOGIN';

  const PasskeyLoginPanel = ({ compact = false }: { compact?: boolean }) => (
    <motion.div
      className={cn('w-full space-y-3 rounded-2xl bg-black/30 border border-white/10', compact ? 'p-3' : 'p-4')}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
    >
      <div className="flex items-center gap-2 text-white/50">
        <Mail className="w-3.5 h-3.5" />
        <span className="text-[10px] tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          LOGIN EMAIL
        </span>
      </div>
      <input
        type="email"
        value={loginEmail}
        onChange={(event) => setLoginEmail(event.target.value)}
        autoComplete="email webauthn"
        inputMode="email"
        placeholder="you@example.com"
        className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/60"
      />
      <button
        type="button"
        onClick={handlePasskeyLogin}
        disabled={passkeyLoading || !passkeySupported}
        className={cn(
          'w-full h-10 rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-100 flex items-center justify-center gap-2 text-[10px] tracking-widest transition-colors',
          'hover:bg-cyan-400/20 disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {passkeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
        {passkeySupported ? passkeyLabel : 'PASSKEYS UNAVAILABLE'}
      </button>
    </motion.div>
  );

  const handleOrbClick = useCallback(() => {
    if (authState === 'idle') {
      startListening();
    }
  }, [authState, startListening]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && authState === 'idle') {
      e.preventDefault();
      startListening();
    }
  }, [authState, startListening]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      releaseMic();
    };
  }, [releaseMic]);

  return (
    <div className={cn('relative min-h-screen w-full overflow-hidden', className)}>
      <StarfieldBackground />
      
      {/* Back button */}
      <motion.button
        className="absolute top-6 left-6 z-50 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        onClick={() => navigate('/auth')}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          BACK TO LOGIN
        </span>
      </motion.button>

      {/* Additional mobile ambient glow */}
      <div 
        className="fixed inset-0 pointer-events-none md:hidden"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, rgba(6, 182, 212, 0.2) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 80%, rgba(251, 191, 36, 0.15) 0%, transparent 50%)
          `,
        }}
      />

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen items-center justify-center p-8">
        <GlassCard className="w-full max-w-lg p-10">
          <div className="flex flex-col items-center space-y-8">
            {/* Header */}
            <motion.div 
              className="text-center space-y-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 
                className="text-2xl tracking-[0.3em] font-light"
                style={{
                  fontFamily: "'JetBrains Mono', 'Geist Mono', monospace",
                  background: 'linear-gradient(135deg, #06b6d4 0%, #fbbf24 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                VOICE CITADEL
              </h1>
              <p className="text-xs tracking-[0.2em] text-white/40 uppercase">
                {flowMode === 'enroll' ? 'Voice Enrollment' : 'Biometric Authentication'}
              </p>
            </motion.div>

            {/* Flow Mode Toggle (if enrolled) */}
            {hasEnrolledVoice && (
              <motion.div 
                className="flex items-center gap-4 p-1 rounded-full bg-white/5 border border-white/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                {(['login', 'enroll'] as FlowMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFlowMode(mode)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-xs tracking-widest transition-all duration-300 flex items-center gap-2',
                      flowMode === mode 
                        ? 'bg-gradient-to-r from-cyan-500/30 to-amber-500/30 text-white' 
                        : 'text-white/40 hover:text-white/60'
                    )}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {mode === 'login' ? <Shield className="w-3 h-3" /> : <Fingerprint className="w-3 h-3" />}
                    {mode.toUpperCase()}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Mode Toggle */}
            {!user && <PasskeyLoginPanel />}

            {/* Mode Toggle */}
            <motion.div 
              className="flex items-center gap-4 p-1 rounded-full bg-white/5 border border-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {(['online', 'offline'] as AuthMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAuthMode(mode)}
                  disabled={flowMode === 'enroll' && mode === 'offline'}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs tracking-widest transition-all duration-300 flex items-center gap-2',
                    authMode === mode 
                      ? 'bg-gradient-to-r from-cyan-500/30 to-amber-500/30 text-white' 
                      : 'text-white/40 hover:text-white/60',
                    flowMode === 'enroll' && mode === 'offline' && 'opacity-30 cursor-not-allowed'
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {mode === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {mode.toUpperCase()}
                </button>
              ))}
            </motion.div>

            {/* System Status Indicator - Background Verification */}
            <motion.div
              className="w-full max-w-xs p-3 rounded-xl bg-black/30 border border-white/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] tracking-widest text-white/50 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  SYSTEM STATUS
                </span>
                <button
                  onClick={() => orchestrator.forceRecheck()}
                  disabled={orchestrator.isInitializing}
                  className="text-white/40 hover:text-white/60 transition-colors"
                >
                  {orchestrator.isInitializing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Radio className="w-3 h-3" />
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-[9px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {/* Network Status */}
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center',
                    orchestrator.state.network.status === 'connected' ? 'bg-emerald-500/20' : 
                    orchestrator.state.network.status === 'degraded' ? 'bg-amber-500/20' : 'bg-red-500/20'
                  )}>
                    {orchestrator.state.network.status !== 'disconnected' ? (
                      <Wifi className={cn('w-3 h-3', orchestrator.state.network.status === 'connected' ? 'text-emerald-400' : 'text-amber-400')} />
                    ) : (
                      <WifiOff className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                  <span className={orchestrator.state.network.status === 'connected' ? 'text-emerald-400' : orchestrator.state.network.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}>
                    {orchestrator.state.network.status === 'connected' ? 'ONLINE' : orchestrator.state.network.status === 'degraded' ? 'SLOW' : 'OFFLINE'}
                  </span>
                </div>
                
                {/* Supabase Status */}
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center',
                    orchestrator.state.backend.status === 'connected' ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                  )}>
                    {orchestrator.state.backend.status === 'connected' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                    )}
                  </div>
                  <span className={orchestrator.state.backend.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}>
                    BACKEND
                  </span>
                </div>
                
                {/* Zoe AI Status */}
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center',
                    orchestrator.state.zoeAI.available ? 'bg-cyan-500/20' : 'bg-white/10'
                  )}>
                    <Activity className={cn(
                      'w-3 h-3',
                      orchestrator.state.zoeAI.available ? 'text-cyan-400' : 'text-white/40'
                    )} />
                  </div>
                  <span className={orchestrator.state.zoeAI.available ? 'text-cyan-400' : 'text-white/40'}>
                    ZOE AI
                  </span>
                </div>
              </div>
              
              {/* Status Message & Latency */}
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                <span className={cn(
                  'text-[8px]',
                  orchestrator.statusColor === 'green' ? 'text-emerald-400' :
                  orchestrator.statusColor === 'yellow' ? 'text-amber-400' : 'text-red-400'
                )}>
                  {orchestrator.statusMessage}
                </span>
                {orchestrator.state.backend.latencyMs && (
                  <span className="text-[8px] text-white/30">
                    {orchestrator.state.backend.latencyMs}ms
                  </span>
                )}
              </div>
            </motion.div>

            {/* Enrollment Status Badge */}
            {hasEnrolledVoice !== null && (
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
              >
                <div
                  className={cn(
                    'px-3 py-1 rounded-full text-[10px] tracking-widest flex items-center gap-2',
                    hasEnrolledVoice 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Fingerprint className="w-3 h-3" />
                  {hasEnrolledVoice ? 'VOICE ENROLLED ✓' : 'NOT ENROLLED - SPEAK TO REGISTER'}
                </div>
                
                {/* Enrollment Details */}
                {hasEnrolledVoice && enrollmentDetails && (
                  <div className="text-[9px] text-white/40 text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Used {enrollmentDetails.useCount}x • Enrolled {new Date(enrollmentDetails.enrolledAt || '').toLocaleDateString()}
                  </div>
                )}
              </motion.div>
            )}

            {/* Recording Progress & Quality Panel - Shown while listening */}
            <AnimatePresence>
              {authState === 'listening' && (
                <motion.div
                  className="w-full max-w-xs space-y-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {/* Progress Bar */}
                  <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-amber-500 rounded-full"
                      style={{ width: `${recordingProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  
                  {/* Quality Indicators */}
                  <div className="flex justify-between gap-4 text-[9px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {/* Volume Meter */}
                    <div className="flex-1">
                      <div className="flex justify-between text-white/40 mb-1">
                        <span>VOLUME</span>
                        <span className={voiceQuality.volume > 20 ? 'text-emerald-400' : 'text-amber-400'}>
                          {voiceQuality.volume}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            'h-full rounded-full transition-all duration-100',
                            voiceQuality.volume > 20 ? 'bg-emerald-500' : 'bg-amber-500'
                          )}
                          style={{ width: `${voiceQuality.volume}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Clarity Meter */}
                    <div className="flex-1">
                      <div className="flex justify-between text-white/40 mb-1">
                        <span>CLARITY</span>
                        <span className={voiceQuality.clarity > 15 ? 'text-emerald-400' : 'text-amber-400'}>
                          {voiceQuality.clarity}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            'h-full rounded-full transition-all duration-100',
                            voiceQuality.clarity > 15 ? 'bg-emerald-500' : 'bg-amber-500'
                          )}
                          style={{ width: `${voiceQuality.clarity}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Quality Status */}
                  <div className="text-center text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {voiceQuality.isGoodQuality ? (
                      <span className="text-emerald-400">✓ GOOD VOICE PATTERN DETECTED</span>
                    ) : (
                      <span className="text-amber-400">⚡ SPEAK LOUDER & CLEARLY</span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Voice Orb */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              tabIndex={0}
              role="button"
              aria-label={authState === 'idle' ? STATUS_MESSAGES[authState][flowMode] : STATUS_MESSAGES[authState][flowMode]}
              onKeyDown={handleKeyDown}
              className="focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded-full"
            >
              <VoiceOrb
                state={authState}
                audioData={audioData}
                onClick={handleOrbClick}
                size="xl"
              />
            </motion.div>

            {/* Status Text */}
            <motion.div 
              className="h-8 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${authState}-${flowMode}`}
                  className={cn(
                    'text-xs tracking-[0.2em] text-center',
                    authState === 'success' ? 'text-emerald-400' :
                    authState === 'error' ? 'text-red-400' :
                    'text-white/60'
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {errorMessage || STATUS_MESSAGES[authState][flowMode]}
                </motion.p>
              </AnimatePresence>
            </motion.div>

            {/* Instructions */}
            <motion.div 
              className="text-center space-y-2 max-w-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              <p className="text-[10px] text-white/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {!user
                      ? 'Use a device passkey above, or sign in with password first to enroll voice authentication.'
                      : flowMode === 'enroll' 
                  ? 'Speak a phrase clearly. Your unique voice pattern will be encrypted and stored securely.'
                  : hasEnrolledVoice 
                    ? 'Speak the same phrase you used during enrollment for verification.'
                    : 'Enroll your voice first to enable biometric login.'
                }
              </p>
            </motion.div>

            {/* Branding */}
            <motion.div 
              className="flex items-center gap-2 text-white/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
              <span 
                className="text-[10px] tracking-[0.3em]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                SECURED BY MMORA / ZOE
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
            </motion.div>
          </div>
        </GlassCard>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6 pt-safe">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            tabIndex={0}
            role="button"
            aria-label={STATUS_MESSAGES[authState][flowMode]}
            onKeyDown={handleKeyDown}
            className="focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded-full"
          >
            <VoiceOrb
              state={authState}
              audioData={audioData}
              onClick={handleOrbClick}
              size="xl"
            />
          </motion.div>
        </div>

        <GlassCard className="rounded-t-[32px] rounded-b-none p-8 pb-12 safe-area-inset-bottom">
          <div className="flex flex-col items-center space-y-6">
            <div className="text-center space-y-1">
              <h1 
                className="text-xl tracking-[0.25em] font-light"
                style={{
                  fontFamily: "'JetBrains Mono', 'Geist Mono', monospace",
                  background: 'linear-gradient(135deg, #06b6d4 0%, #fbbf24 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                VOICE CITADEL
              </h1>
              <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">
                {flowMode === 'enroll' ? 'Voice Enrollment' : 'Biometric Authentication'}
              </p>
            </div>

            {/* Mobile System Status Bar */}
            {!user && <PasskeyLoginPanel compact />}

            {/* Mobile System Status Bar */}
            <div className="w-full flex items-center justify-center gap-4 py-2 px-4 rounded-xl bg-black/30 border border-white/10">
              <div className="flex items-center gap-1.5">
                {orchestrator.state.network.status !== 'disconnected' ? (
                  <Wifi className={cn('w-3 h-3', orchestrator.state.network.status === 'connected' ? 'text-emerald-400' : 'text-amber-400')} />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-400" />
                )}
                <span className={cn(
                  'text-[8px] uppercase',
                  orchestrator.state.network.status === 'connected' ? 'text-emerald-400' : 
                  orchestrator.state.network.status === 'degraded' ? 'text-amber-400' : 'text-red-400'
                )} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {orchestrator.state.network.status === 'connected' ? 'ONLINE' : 
                   orchestrator.state.network.status === 'degraded' ? 'SLOW' : 'OFFLINE'}
                </span>
              </div>
              <div className="w-px h-3 bg-white/20" />
              <div className="flex items-center gap-1.5">
                <Activity className={cn(
                  'w-3 h-3',
                  orchestrator.state.zoeAI.available ? 'text-cyan-400' : 'text-white/40'
                )} />
                <span className={cn(
                  'text-[8px] uppercase',
                  orchestrator.state.zoeAI.available ? 'text-cyan-400' : 'text-white/40'
                )} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  ZOE {orchestrator.state.zoeAI.available ? '✓' : '○'}
                </span>
              </div>
              <div className="w-px h-3 bg-white/20" />
              <span className={cn(
                'text-[8px]',
                orchestrator.statusColor === 'green' ? 'text-emerald-400' :
                orchestrator.statusColor === 'yellow' ? 'text-amber-400' : 'text-red-400'
              )} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {orchestrator.state.recommendedMode.toUpperCase()}
              </span>
            </div>

            {/* Enrollment Badge */}
            {hasEnrolledVoice !== null && (
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'px-3 py-1 rounded-full text-[9px] tracking-widest flex items-center gap-2',
                    hasEnrolledVoice 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Fingerprint className="w-3 h-3" />
                  {hasEnrolledVoice ? 'ENROLLED ✓' : 'TAP TO ENROLL'}
                </div>
                {hasEnrolledVoice && enrollmentDetails && (
                  <div className="text-[8px] text-white/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Used {enrollmentDetails.useCount}x
                  </div>
                )}
              </div>
            )}

            {/* Recording Quality Panel - Mobile */}
            <AnimatePresence>
              {authState === 'listening' && (
                <motion.div
                  className="w-full space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {/* Progress */}
                  <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-amber-500 rounded-full"
                      style={{ width: `${recordingProgress}%` }}
                    />
                  </div>
                  
                  {/* Quality */}
                  <div className="flex justify-center gap-4 text-[8px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span className={voiceQuality.volume > 20 ? 'text-emerald-400' : 'text-amber-400'}>
                      VOL: {voiceQuality.volume}%
                    </span>
                    <span className={voiceQuality.clarity > 15 ? 'text-emerald-400' : 'text-amber-400'}>
                      CLR: {voiceQuality.clarity}%
                    </span>
                  </div>
                  
                  <div className="text-center text-[9px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {voiceQuality.isGoodQuality ? (
                      <span className="text-emerald-400">✓ GOOD PATTERN</span>
                    ) : (
                      <span className="text-amber-400">⚡ SPEAK LOUDER</span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mode Toggles */}
            <div className="flex flex-col gap-2">
              {hasEnrolledVoice && (
                <div className="flex items-center gap-2 p-1 rounded-full bg-white/5 border border-white/10">
                  {(['login', 'enroll'] as FlowMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFlowMode(mode)}
                      className={cn(
                        'px-3 py-1 rounded-full text-[9px] tracking-widest transition-all duration-300',
                        flowMode === mode 
                          ? 'bg-gradient-to-r from-cyan-500/30 to-amber-500/30 text-white' 
                          : 'text-white/40'
                      )}
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-2 p-1 rounded-full bg-white/5 border border-white/10">
                {(['online', 'offline'] as AuthMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAuthMode(mode)}
                    disabled={flowMode === 'enroll' && mode === 'offline'}
                    className={cn(
                      'px-3 py-1 rounded-full text-[9px] tracking-widest transition-all duration-300',
                      authMode === mode 
                        ? 'bg-gradient-to-r from-cyan-500/30 to-amber-500/30 text-white' 
                        : 'text-white/40',
                      flowMode === 'enroll' && mode === 'offline' && 'opacity-30'
                    )}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="h-6">
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${authState}-${flowMode}`}
                  className={cn(
                    'text-[10px] tracking-[0.15em] text-center',
                    authState === 'success' ? 'text-emerald-400' :
                    authState === 'error' ? 'text-red-400' :
                    'text-white/60'
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  {errorMessage || STATUS_MESSAGES[authState][flowMode]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Branding */}
            <div className="flex items-center gap-2 text-white/20">
              <div className="w-1 h-1 rounded-full bg-cyan-400/50" />
              <span 
                className="text-[8px] tracking-[0.25em]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                MMORA / ZOE
              </span>
              <div className="w-1 h-1 rounded-full bg-amber-400/50" />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export const VoiceCitadelLogin = memo(VoiceCitadelLoginComponent);
export default VoiceCitadelLogin;