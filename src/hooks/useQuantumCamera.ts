// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: Quantum Camera Hook
// Pipes webcam into WebGL canvas for real-time shader manipulation
// Simulates 2050 cybernetic eye optics with audio-reactive displacement
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useState, useCallback, useEffect } from 'react';

export interface QuantumCameraConfig {
  displacementIntensity: number;      // 0-1: How much audio affects mesh
  colorGradeIntensity: number;        // 0-1: 2050 color grade strength
  voidBlueDepth: number;              // 0-1: Shadow "Deep Void Blue" depth
  stellarGoldIntensity: number;       // 0-1: Highlight "Stellar Gold" brightness
  filmicExposure: number;             // 0.5-2: ACES Filmic exposure
  chromaticAberration: number;        // 0-0.02: Edge distortion amount
  vignetteStrength: number;           // 0-1: Edge darkening
  scanlineOpacity: number;            // 0-0.5: Cyberpunk scanline overlay
  noiseIntensity: number;             // 0-0.1: Film grain noise
}

export interface AudioAnalysis {
  frequency: Float32Array | null;
  timeDomain: Float32Array | null;
  volume: number;
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
}

export interface QuantumCameraState {
  isActive: boolean;
  hasPermission: boolean | null;
  error: string | null;
  audioAnalysis: AudioAnalysis;
  fps: number;
}

const DEFAULT_CONFIG: QuantumCameraConfig = {
  displacementIntensity: 0.4,
  colorGradeIntensity: 0.8,
  voidBlueDepth: 0.7,
  stellarGoldIntensity: 0.6,
  filmicExposure: 1.2,
  chromaticAberration: 0.005,
  vignetteStrength: 0.4,
  scanlineOpacity: 0.08,
  noiseIntensity: 0.03,
};

export const useQuantumCamera = (
  userConfig: Partial<QuantumCameraConfig> = {}
) => {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  
  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // State
  const [state, setState] = useState<QuantumCameraState>({
    isActive: false,
    hasPermission: null,
    error: null,
    audioAnalysis: {
      frequency: null,
      timeDomain: null,
      volume: 0,
      bassLevel: 0,
      midLevel: 0,
      trebleLevel: 0,
    },
    fps: 0,
  });

  // Initialize audio analysis
  const initAudioAnalysis = useCallback(async (stream: MediaStream) => {
    try {
      // Get audio tracks for analysis
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        // Try to get audio separately
        const audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: true 
        });
        stream = new MediaStream([
          ...stream.getVideoTracks(),
          ...audioStream.getAudioTracks()
        ]);
      }

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.7;
      source.connect(analyserRef.current);
      
      console.log('[QuantumCamera] Audio analysis initialized');
    } catch (e) {
      console.warn('[QuantumCamera] Audio analysis unavailable:', e);
    }
  }, []);

  // Analyze audio frequencies
  const analyzeAudio = useCallback((): AudioAnalysis => {
    if (!analyserRef.current) {
      return {
        frequency: null,
        timeDomain: null,
        volume: 0,
        bassLevel: 0,
        midLevel: 0,
        trebleLevel: 0,
      };
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const frequency = new Float32Array(bufferLength);
    const timeDomain = new Float32Array(bufferLength);
    
    analyserRef.current.getFloatFrequencyData(frequency);
    analyserRef.current.getFloatTimeDomainData(timeDomain);

    // Calculate frequency bands (bass, mid, treble)
    const bassEnd = Math.floor(bufferLength * 0.15);
    const midEnd = Math.floor(bufferLength * 0.5);
    
    let bassSum = 0, midSum = 0, trebleSum = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const normalizedValue = (frequency[i] + 140) / 140; // Normalize -140dB to 0dB
      const clampedValue = Math.max(0, Math.min(1, normalizedValue));
      
      if (i < bassEnd) {
        bassSum += clampedValue;
      } else if (i < midEnd) {
        midSum += clampedValue;
      } else {
        trebleSum += clampedValue;
      }
    }

    const bassLevel = bassSum / bassEnd;
    const midLevel = midSum / (midEnd - bassEnd);
    const trebleLevel = trebleSum / (bufferLength - midEnd);
    
    // Overall volume from time domain
    let volume = 0;
    for (let i = 0; i < bufferLength; i++) {
      volume += timeDomain[i] * timeDomain[i];
    }
    volume = Math.sqrt(volume / bufferLength);

    return {
      frequency,
      timeDomain,
      volume,
      bassLevel,
      midLevel,
      trebleLevel,
    };
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60, min: 30 },
        },
        audio: true, // For voice-reactive displacement
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      await initAudioAnalysis(stream);

      setState(prev => ({
        ...prev,
        isActive: true,
        hasPermission: true,
      }));

      console.log('[QuantumCamera] Camera started - 2050 Optics Online');
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Camera access denied';
      setState(prev => ({
        ...prev,
        hasPermission: false,
        error,
      }));
      console.error('[QuantumCamera] Failed to start:', error);
    }
  }, [initAudioAnalysis]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      audioAnalysis: {
        frequency: null,
        timeDomain: null,
        volume: 0,
        bassLevel: 0,
        midLevel: 0,
        trebleLevel: 0,
      },
    }));

    console.log('[QuantumCamera] Camera stopped');
  }, []);

  // FPS counter
  const updateFPS = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;
    
    if (now - lastFrameTimeRef.current >= 1000) {
      setState(prev => ({
        ...prev,
        fps: frameCountRef.current,
      }));
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
  }, []);

  // Main render loop (updates audio analysis)
  const tick = useCallback(() => {
    if (!state.isActive) return;

    const audioAnalysis = analyzeAudio();
    updateFPS();
    
    setState(prev => ({
      ...prev,
      audioAnalysis,
    }));

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [state.isActive, analyzeAudio, updateFPS]);

  // Start render loop when active
  useEffect(() => {
    if (state.isActive) {
      lastFrameTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(tick);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isActive, tick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    // Refs for components
    videoRef,
    
    // State
    ...state,
    
    // Config
    config,
    
    // Actions
    startCamera,
    stopCamera,
    
    // Audio analysis
    analyzeAudio,
  };
};

export default useQuantumCamera;
