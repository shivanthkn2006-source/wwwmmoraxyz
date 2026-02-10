// ═══════════════════════════════════════════════════════════════════════════════
// AMBIENT LISTENER - Whisper Channel Audio Detection
// Detects non-verbal sounds: sighs, laughs, hums, yawns, coughs, sneezes
// Uses Web Audio API for real-time audio analysis (runs locally, $0 cost)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';

export type AmbientSound = 
  | 'sigh'
  | 'laugh'
  | 'hum'
  | 'yawn'
  | 'cough'
  | 'sneeze'
  | 'speech'
  | 'silence'
  | 'unknown';

interface AmbientListenerState {
  isListening: boolean;
  hasPermission: boolean | null;
  lastDetectedSound: AmbientSound;
  soundConfidence: number;
  audioLevel: number; // 0-1
  isSilent: boolean;
}

interface AmbientListenerConfig {
  silenceThreshold: number;    // Audio level below this = silence (0-1)
  detectionDebounce: number;   // Ms between detections
  onSoundDetected?: (sound: AmbientSound, confidence: number) => void;
}

const DEFAULT_CONFIG: AmbientListenerConfig = {
  silenceThreshold: 0.1,
  detectionDebounce: 3000, // 3 seconds between detections
};

/**
 * Simple audio pattern matching for ambient sounds
 * Uses frequency analysis and volume patterns
 */
const classifySound = (
  frequencyData: any,
  volumeLevel: number,
  previousVolume: number,
): { sound: AmbientSound; confidence: number } => {
  // Calculate frequency distribution
  const lowFreq = frequencyData.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
  const midFreq = frequencyData.slice(10, 50).reduce((a, b) => a + b, 0) / 40;
  const highFreq = frequencyData.slice(50, 100).reduce((a, b) => a + b, 0) / 50;
  
  const totalEnergy = lowFreq + midFreq + highFreq;
  const volumeChange = volumeLevel - previousVolume;
  
  // Silence detection
  if (volumeLevel < 0.05) {
    return { sound: 'silence', confidence: 0.95 };
  }
  
  // SIGH: Low frequency dominant, gradual volume decrease
  if (lowFreq > midFreq * 1.5 && volumeChange < -0.1) {
    return { sound: 'sigh', confidence: 0.6 + Math.min(0.3, Math.abs(volumeChange)) };
  }
  
  // LAUGH: High frequency bursts, volume fluctuation
  if (highFreq > lowFreq && Math.abs(volumeChange) > 0.2) {
    return { sound: 'laugh', confidence: 0.65 };
  }
  
  // HUM: Steady mid-frequency, consistent volume
  if (midFreq > lowFreq && midFreq > highFreq && Math.abs(volumeChange) < 0.05) {
    return { sound: 'hum', confidence: 0.55 };
  }
  
  // YAWN: Very low frequency, long duration pattern
  if (lowFreq > midFreq * 2 && lowFreq > highFreq * 2 && volumeChange < 0) {
    return { sound: 'yawn', confidence: 0.5 };
  }
  
  // COUGH: Sharp volume spike, broad frequency
  if (volumeChange > 0.3 && totalEnergy > 400) {
    return { sound: 'cough', confidence: 0.6 };
  }
  
  // SNEEZE: Very sharp volume spike
  if (volumeChange > 0.5) {
    return { sound: 'sneeze', confidence: 0.55 };
  }
  
  // SPEECH: Balanced frequencies, moderate volume
  if (midFreq > lowFreq * 0.5 && midFreq > highFreq * 0.5 && volumeLevel > 0.15) {
    return { sound: 'speech', confidence: 0.7 };
  }
  
  return { sound: 'unknown', confidence: 0.3 };
};

export const useAmbientListener = (config?: Partial<AmbientListenerConfig>) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<AmbientListenerState>({
    isListening: false,
    hasPermission: null,
    lastDetectedSound: 'silence',
    soundConfidence: 0,
    audioLevel: 0,
    isSilent: true,
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<number>(0);
  const previousVolumeRef = useRef<number>(0);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  
  const startListening = useCallback(async () => {
    if (state.isListening) return;
    
    try {
      console.log('[AmbientListener] 👂 Starting ambient audio listener...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // We want to hear ambient sounds
          autoGainControl: true,
        },
      });
      
      streamRef.current = stream;
      
      // Create audio context and analyser
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      setState(prev => ({
        ...prev,
        isListening: true,
        hasPermission: true,
      }));
      
      // Start analysis loop
      const analyze = () => {
        if (!analyserRef.current || !frequencyDataRef.current) return;
        
        analyserRef.current.getByteFrequencyData(frequencyDataRef.current as Uint8Array<ArrayBuffer>);
        
        // Calculate RMS volume level
        const dataArray = frequencyDataRef.current;
        const sum = dataArray.reduce((a, b) => a + b * b, 0);
        const rms = Math.sqrt(sum / dataArray.length) / 255;
        
        const isSilent = rms < mergedConfig.silenceThreshold;
        
        setState(prev => ({
          ...prev,
          audioLevel: rms,
          isSilent,
        }));
        
        // Classify sound if not silent and debounce has passed
        const now = Date.now();
        if (!isSilent && now - lastDetectionRef.current > mergedConfig.detectionDebounce) {
          const { sound, confidence } = classifySound(
            Array.from(dataArray) as unknown as Uint8Array,
            rms,
            previousVolumeRef.current
          );
          
          if (sound !== 'silence' && sound !== 'unknown' && confidence > 0.5) {
            lastDetectionRef.current = now;
            
            setState(prev => ({
              ...prev,
              lastDetectedSound: sound,
              soundConfidence: confidence,
            }));
            
            console.log(`[AmbientListener] 🔊 Detected: ${sound} (${(confidence * 100).toFixed(0)}%)`);
            
            // Call callback
            mergedConfig.onSoundDetected?.(sound, confidence);
            
            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('ambient-sound-detected', {
              detail: { sound, confidence },
            }));
          }
        }
        
        previousVolumeRef.current = rms;
        animationFrameRef.current = requestAnimationFrame(analyze);
      };
      
      analyze();
      console.log('[AmbientListener] ✓ Ambient listener active');
      
    } catch (error) {
      console.error('[AmbientListener] Failed to start:', error);
      setState(prev => ({
        ...prev,
        hasPermission: false,
        isListening: false,
      }));
    }
  }, [state.isListening, mergedConfig]);
  
  const stopListening = useCallback(() => {
    console.log('[AmbientListener] 👂 Stopping ambient listener...');
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    
    setState(prev => ({
      ...prev,
      isListening: false,
      audioLevel: 0,
      isSilent: true,
    }));
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);
  
  return {
    ...state,
    startListening,
    stopListening,
  };
};

export default useAmbientListener;
