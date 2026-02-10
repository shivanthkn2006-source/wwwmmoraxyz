import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BehavioralFingerprint {
  typingRhythm: number[];
  mouseMovements: { x: number; y: number; t: number }[];
  clickPattern: number[];
  reactionTimeMs: number;
  scrollBehavior: { direction: string; speed: number }[];
  microJitter: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  method: 'voice_print' | 'face_liveness' | 'behavioral' | 'memory_question' | 'bio_hash';
  confidence: number;
  shadowAISuspected: boolean;
  fingerprint?: string;
}

export function useBioCitadel() {
  const { toast } = useToast();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authPhase, setAuthPhase] = useState<'idle' | 'voice' | 'face' | 'behavioral' | 'memory' | 'complete'>('idle');
  const [fingerprintData, setFingerprintData] = useState<BehavioralFingerprint | null>(null);
  const [confidenceScore, setConfidenceScore] = useState(0);
  
  // Track behavioral patterns
  const keyPressTimesRef = useRef<number[]>([]);
  const mouseMovementsRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const clickTimesRef = useRef<number[]>([]);
  const lastActivityRef = useRef<number>(Date.now());

  // Start collecting behavioral fingerprint
  const startFingerprintCollection = useCallback(() => {
    keyPressTimesRef.current = [];
    mouseMovementsRef.current = [];
    clickTimesRef.current = [];
    lastActivityRef.current = Date.now();
    
    // Keyboard listener
    const handleKeyDown = () => {
      const now = Date.now();
      if (keyPressTimesRef.current.length > 0) {
        const interval = now - keyPressTimesRef.current[keyPressTimesRef.current.length - 1];
        keyPressTimesRef.current.push(interval);
      } else {
        keyPressTimesRef.current.push(now);
      }
      lastActivityRef.current = now;
    };

    // Mouse movement listener
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      mouseMovementsRef.current.push({ x: e.clientX, y: e.clientY, t: now });
      
      // Keep only last 100 movements
      if (mouseMovementsRef.current.length > 100) {
        mouseMovementsRef.current.shift();
      }
      lastActivityRef.current = now;
    };

    // Click listener
    const handleClick = () => {
      const now = Date.now();
      clickTimesRef.current.push(now);
      lastActivityRef.current = now;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  // Analyze collected fingerprint
  const analyzeFingerprintData = useCallback((): BehavioralFingerprint => {
    const typingRhythm = keyPressTimesRef.current.slice(-20);
    const mouseMovements = mouseMovementsRef.current.slice(-50);
    const clickPattern = clickTimesRef.current.slice(-10);
    
    // Calculate micro-jitter from mouse movements
    let hasJitter = false;
    if (mouseMovements.length > 5) {
      const jitterDeltas: number[] = [];
      for (let i = 1; i < mouseMovements.length; i++) {
        const dx = mouseMovements[i].x - mouseMovements[i - 1].x;
        const dy = mouseMovements[i].y - mouseMovements[i - 1].y;
        jitterDeltas.push(Math.sqrt(dx * dx + dy * dy));
      }
      // Humans have small, irregular movements (micro-jitter)
      const avgDelta = jitterDeltas.reduce((a, b) => a + b, 0) / jitterDeltas.length;
      const variance = jitterDeltas.reduce((sum, d) => sum + Math.pow(d - avgDelta, 2), 0) / jitterDeltas.length;
      hasJitter = variance > 5 && avgDelta < 50; // Human-like variance
    }
    
    // Calculate reaction time
    let reactionTimeMs = 0;
    if (clickPattern.length > 1) {
      const intervals = [];
      for (let i = 1; i < clickPattern.length; i++) {
        intervals.push(clickPattern[i] - clickPattern[i - 1]);
      }
      reactionTimeMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }
    
    const fingerprint: BehavioralFingerprint = {
      typingRhythm,
      mouseMovements,
      clickPattern,
      reactionTimeMs,
      scrollBehavior: [],
      microJitter: hasJitter
    };
    
    setFingerprintData(fingerprint);
    return fingerprint;
  }, []);

  // Voice authentication (using Web Speech API for recognition)
  const authenticateVoice = useCallback(async (expectedPhrase: string): Promise<BiometricAuthResult> => {
    setAuthPhase('voice');
    
    return new Promise((resolve) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        resolve({
          success: false,
          method: 'voice_print',
          confidence: 0,
          shadowAISuspected: false
        });
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        const expected = expectedPhrase.toLowerCase();
        const confidence = event.results[0][0].confidence * 100;
        
        // Check if the phrase matches
        const phraseMatch = transcript.includes('zoe') && transcript.includes('authenticate');
        
        resolve({
          success: phraseMatch && confidence > 70,
          method: 'voice_print',
          confidence,
          shadowAISuspected: confidence < 50 // Very low confidence might be synthesized
        });
      };

      recognition.onerror = () => {
        resolve({
          success: false,
          method: 'voice_print',
          confidence: 0,
          shadowAISuspected: false
        });
      };

      recognition.start();
      
      // Timeout after 10 seconds
      setTimeout(() => {
        recognition.stop();
      }, 10000);
    });
  }, []);

  // Face liveness detection (using webcam)
  const authenticateFace = useCallback(async (): Promise<BiometricAuthResult> => {
    setAuthPhase('face');
    
    return new Promise((resolve) => {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(async (stream) => {
          const video = document.createElement('video');
          video.srcObject = stream;
          await video.play();
          
          // Simple liveness check: detect movement over time
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 240;
          const ctx = canvas.getContext('2d')!;
          
          const frames: ImageData[] = [];
          let frameCount = 0;
          
          const captureFrame = () => {
            ctx.drawImage(video, 0, 0, 320, 240);
            frames.push(ctx.getImageData(0, 0, 320, 240));
            frameCount++;
            
            if (frameCount < 5) {
              setTimeout(captureFrame, 500);
            } else {
              // Analyze frames for movement (liveness)
              let totalDiff = 0;
              for (let i = 1; i < frames.length; i++) {
                const diff = compareFrames(frames[i - 1], frames[i]);
                totalDiff += diff;
              }
              
              const avgMovement = totalDiff / (frames.length - 1);
              const isLive = avgMovement > 500 && avgMovement < 50000; // Human blink/movement range
              
              stream.getTracks().forEach(track => track.stop());
              
              resolve({
                success: isLive,
                method: 'face_liveness',
                confidence: isLive ? 85 : 30,
                shadowAISuspected: avgMovement < 100 // Static image = bot
              });
            }
          };
          
          setTimeout(captureFrame, 500);
        })
        .catch(() => {
          resolve({
            success: false,
            method: 'face_liveness',
            confidence: 0,
            shadowAISuspected: false
          });
        });
    });
  }, []);

  // Compare two image frames for movement detection
  const compareFrames = (frame1: ImageData, frame2: ImageData): number => {
    let diff = 0;
    const data1 = frame1.data;
    const data2 = frame2.data;
    
    for (let i = 0; i < data1.length; i += 4) {
      diff += Math.abs(data1[i] - data2[i]); // R
      diff += Math.abs(data1[i + 1] - data2[i + 1]); // G
      diff += Math.abs(data1[i + 2] - data2[i + 2]); // B
    }
    
    return diff;
  };

  // Behavioral fingerprint authentication
  const authenticateBehavioral = useCallback(async (): Promise<BiometricAuthResult> => {
    setAuthPhase('behavioral');
    
    const fingerprint = analyzeFingerprintData();
    
    // Check for human-like patterns
    let confidence = 50;
    
    // Micro-jitter is a strong human indicator
    if (fingerprint.microJitter) {
      confidence += 25;
    }
    
    // Natural typing rhythm variance
    if (fingerprint.typingRhythm.length > 5) {
      const avg = fingerprint.typingRhythm.reduce((a, b) => a + b, 0) / fingerprint.typingRhythm.length;
      const variance = fingerprint.typingRhythm.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / fingerprint.typingRhythm.length;
      if (variance > 100 && variance < 10000) {
        confidence += 15;
      }
    }
    
    // Human-like reaction time (200-1500ms)
    if (fingerprint.reactionTimeMs > 200 && fingerprint.reactionTimeMs < 1500) {
      confidence += 10;
    }
    
    setConfidenceScore(confidence);
    
    return {
      success: confidence >= 70,
      method: 'behavioral',
      confidence,
      shadowAISuspected: !fingerprint.microJitter || confidence < 40
    };
  }, [analyzeFingerprintData]);

  // Memory question authentication (fallback)
  const authenticateMemory = useCallback(async (question: string, answer: string, expectedAnswer: string): Promise<BiometricAuthResult> => {
    setAuthPhase('memory');
    
    // Simple similarity check
    const normalize = (s: string) => s.toLowerCase().trim().replace(/[^\w\s]/g, '');
    const similarity = calculateSimilarity(normalize(answer), normalize(expectedAnswer));
    
    return {
      success: similarity > 0.7,
      method: 'memory_question',
      confidence: similarity * 100,
      shadowAISuspected: false
    };
  }, []);

  // Calculate string similarity (Levenshtein-based)
  const calculateSimilarity = (s1: string, s2: string): number => {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshtein(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const levenshtein = (s1: string, s2: string): number => {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

  // Generate Bio-Hash from all methods
  const generateBioHash = useCallback((results: BiometricAuthResult[]): string => {
    const hashInput = results.map(r => `${r.method}:${r.confidence}`).join('|');
    return btoa(hashInput).slice(0, 32);
  }, []);

  // Full authentication flow
  const runFullAuthentication = useCallback(async (): Promise<BiometricAuthResult> => {
    setIsAuthenticating(true);
    const results: BiometricAuthResult[] = [];
    
    try {
      // Phase 1: Behavioral (already collected in background)
      const behavioralResult = await authenticateBehavioral();
      results.push(behavioralResult);
      
      if (!behavioralResult.success) {
        toast({
          title: "Behavioral Analysis",
          description: "Please interact with the page naturally",
          variant: "destructive"
        });
      }
      
      // Phase 2: Voice (optional)
      // const voiceResult = await authenticateVoice('Zoe, Authenticate Protocol');
      // results.push(voiceResult);
      
      // Phase 3: Face liveness
      const faceResult = await authenticateFace();
      results.push(faceResult);
      
      // Calculate overall confidence
      const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
      const allPassed = results.every(r => r.success);
      const anyShadowAI = results.some(r => r.shadowAISuspected);
      
      const bioHash = generateBioHash(results);
      
      setAuthPhase('complete');
      setConfidenceScore(avgConfidence);
      
      return {
        success: allPassed || avgConfidence >= 75,
        method: 'bio_hash',
        confidence: avgConfidence,
        shadowAISuspected: anyShadowAI,
        fingerprint: bioHash
      };
    } catch (error) {
      console.error('[BIO_CITADEL] Auth error:', error);
      return {
        success: false,
        method: 'bio_hash',
        confidence: 0,
        shadowAISuspected: true
      };
    } finally {
      setIsAuthenticating(false);
    }
  }, [authenticateBehavioral, authenticateFace, generateBioHash, toast]);

  // Start fingerprint collection on mount
  useEffect(() => {
    const cleanup = startFingerprintCollection();
    return cleanup;
  }, [startFingerprintCollection]);

  return {
    // State
    isAuthenticating,
    authPhase,
    fingerprintData,
    confidenceScore,
    
    // Actions
    startFingerprintCollection,
    analyzeFingerprintData,
    authenticateVoice,
    authenticateFace,
    authenticateBehavioral,
    authenticateMemory,
    runFullAuthentication,
    generateBioHash,
    
    // Setters
    setAuthPhase
  };
}
