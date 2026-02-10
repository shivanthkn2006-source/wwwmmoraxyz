// ═══════════════════════════════════════════════════════════════════════════════
// BIO-RESONANCE ENGINE - Voice DNA Extraction via Web Audio API
// Extracts: Pitch (Fundamental Frequency), Tempo (Cadence), Spectral Centroid
// No Deep Learning - Pure Signal Processing
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef, useState } from 'react';

export interface VoiceDNA {
  pitch: number;           // Fundamental frequency (Hz) - deep vs high voice
  tempo: number;           // Speaking cadence (syllables per second estimate)
  spectralCentroid: number; // Voice "brightness" / timbre
  energy: number;          // RMS energy level
  zeroCrossingRate: number; // Voice texture indicator
  mfccHash: string;        // Mel-frequency cepstral coefficients hash
}

export interface VoiceMatchResult {
  similarity: number;      // 0-100 match percentage
  isMatch: boolean;        // True if similarity > threshold
  confidenceFactors: {
    pitchMatch: number;
    tempoMatch: number;
    spectralMatch: number;
    overallConfidence: number;
  };
}

export interface SecurityContext {
  ipAddress: string | null;
  deviceFingerprint: string;
  timezone: string;
  screenSignature: string;
  isKnownDevice: boolean;
  isSafeZone: boolean;
}

export function useVoiceBioResonance() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastVoiceDNA, setLastVoiceDNA] = useState<VoiceDNA | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PITCH DETECTION - Autocorrelation Method
  // ═══════════════════════════════════════════════════════════════════════════
  const detectPitch = useCallback((buffer: Float32Array, sampleRate: number): number => {
    // Autocorrelation pitch detection
    const SIZE = buffer.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);
    const correlations = new Float32Array(MAX_SAMPLES);
    
    let bestOffset = -1;
    let bestCorrelation = 0;
    let foundGoodCorrelation = false;
    
    // Find the offset with highest autocorrelation
    for (let offset = 50; offset < MAX_SAMPLES; offset++) {
      let correlation = 0;
      for (let i = 0; i < MAX_SAMPLES; i++) {
        correlation += Math.abs((buffer[i]) - (buffer[i + offset]));
      }
      correlation = 1 - (correlation / MAX_SAMPLES);
      correlations[offset] = correlation;
      
      if (correlation > 0.9 && correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
        foundGoodCorrelation = true;
      } else if (foundGoodCorrelation) {
        // Found a good correlation, but it's decreasing - break
        break;
      }
    }
    
    if (bestCorrelation > 0.7 && bestOffset > 0) {
      // Convert sample offset to frequency
      return sampleRate / bestOffset;
    }
    
    return 0; // Unable to detect pitch
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECTRAL CENTROID - Voice "Brightness" / Timbre
  // ═══════════════════════════════════════════════════════════════════════════
  const calculateSpectralCentroid = useCallback((frequencyData: Float32Array, sampleRate: number): number => {
    let weightedSum = 0;
    let sum = 0;
    const binFrequency = sampleRate / (frequencyData.length * 2);
    
    for (let i = 0; i < frequencyData.length; i++) {
      const magnitude = Math.pow(10, frequencyData[i] / 20); // Convert dB to linear
      const frequency = i * binFrequency;
      weightedSum += frequency * magnitude;
      sum += magnitude;
    }
    
    return sum > 0 ? weightedSum / sum : 0;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ZERO CROSSING RATE - Voice texture indicator
  // ═══════════════════════════════════════════════════════════════════════════
  const calculateZeroCrossingRate = useCallback((buffer: Float32Array): number => {
    let crossings = 0;
    for (let i = 1; i < buffer.length; i++) {
      if ((buffer[i] >= 0 && buffer[i - 1] < 0) || (buffer[i] < 0 && buffer[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / buffer.length;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RMS ENERGY - Voice loudness/energy
  // ═══════════════════════════════════════════════════════════════════════════
  const calculateRMSEnergy = useCallback((buffer: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPO ESTIMATION - Speaking cadence via energy envelope
  // ═══════════════════════════════════════════════════════════════════════════
  const estimateTempo = useCallback((energyFrames: number[], frameRate: number): number => {
    if (energyFrames.length < 10) return 0;
    
    // Find peaks in energy (syllables)
    const threshold = Math.max(...energyFrames) * 0.3;
    let peaks = 0;
    let wasAbove = false;
    
    for (const energy of energyFrames) {
      if (energy > threshold && !wasAbove) {
        peaks++;
        wasAbove = true;
      } else if (energy < threshold * 0.7) {
        wasAbove = false;
      }
    }
    
    // Convert to syllables per second
    const durationSeconds = energyFrames.length / frameRate;
    return durationSeconds > 0 ? peaks / durationSeconds : 0;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MFCC-LIKE HASH - Simplified spectral fingerprint
  // ═══════════════════════════════════════════════════════════════════════════
  const generateMFCCHash = useCallback(async (spectralData: number[]): Promise<string> => {
    // Create a normalized representation
    const normalized = spectralData.slice(0, 64).map(v => Math.round(v * 100) / 100);
    const data = new TextEncoder().encode(normalized.join(','));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN ANALYSIS - Extract Voice DNA from audio stream
  // ═══════════════════════════════════════════════════════════════════════════
  const analyzeVoiceDNA = useCallback(async (
    analyser: AnalyserNode,
    audioContext: AudioContext,
    durationMs: number = 3000
  ): Promise<VoiceDNA> => {
    setIsAnalyzing(true);
    audioBufferRef.current = [];
    
    const sampleRate = audioContext.sampleRate;
    const bufferLength = analyser.fftSize;
    const frameRate = sampleRate / bufferLength;
    
    const pitchSamples: number[] = [];
    const spectralCentroids: number[] = [];
    const energyFrames: number[] = [];
    const zcrs: number[] = [];
    const spectralData: number[] = [];
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const captureFrame = () => {
        const timeData = new Float32Array(bufferLength);
        const freqData = new Float32Array(analyser.frequencyBinCount);
        
        analyser.getFloatTimeDomainData(timeData);
        analyser.getFloatFrequencyData(freqData);
        
        // Extract features from this frame
        const pitch = detectPitch(timeData, sampleRate);
        if (pitch > 50 && pitch < 500) {
          pitchSamples.push(pitch);
        }
        
        const centroid = calculateSpectralCentroid(freqData, sampleRate);
        spectralCentroids.push(centroid);
        
        const energy = calculateRMSEnergy(timeData);
        energyFrames.push(energy);
        
        const zcr = calculateZeroCrossingRate(timeData);
        zcrs.push(zcr);
        
        // Collect spectral data for MFCC-like hash
        spectralData.push(...Array.from(freqData.slice(0, 32)));
        
        audioBufferRef.current.push(new Float32Array(timeData));
        
        if (Date.now() - startTime < durationMs) {
          requestAnimationFrame(captureFrame);
        } else {
          // Analysis complete - compute final DNA
          const avgPitch = pitchSamples.length > 0 
            ? pitchSamples.reduce((a, b) => a + b, 0) / pitchSamples.length 
            : 0;
          
          const avgSpectral = spectralCentroids.length > 0
            ? spectralCentroids.reduce((a, b) => a + b, 0) / spectralCentroids.length
            : 0;
          
          const avgEnergy = energyFrames.length > 0
            ? energyFrames.reduce((a, b) => a + b, 0) / energyFrames.length
            : 0;
          
          const avgZCR = zcrs.length > 0
            ? zcrs.reduce((a, b) => a + b, 0) / zcrs.length
            : 0;
          
          const tempo = estimateTempo(energyFrames, frameRate);
          
          generateMFCCHash(spectralData).then(mfccHash => {
            const voiceDNA: VoiceDNA = {
              pitch: Math.round(avgPitch * 100) / 100,
              tempo: Math.round(tempo * 100) / 100,
              spectralCentroid: Math.round(avgSpectral),
              energy: Math.round(avgEnergy * 10000) / 10000,
              zeroCrossingRate: Math.round(avgZCR * 10000) / 10000,
              mfccHash
            };
            
            setLastVoiceDNA(voiceDNA);
            setIsAnalyzing(false);
            
            console.log('[BIO-RESONANCE] Voice DNA Extracted:', voiceDNA);
            resolve(voiceDNA);
          });
        }
      };
      
      captureFrame();
    });
  }, [detectPitch, calculateSpectralCentroid, calculateRMSEnergy, calculateZeroCrossingRate, estimateTempo, generateMFCCHash]);

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE MATCHING - Compare two Voice DNA profiles
  // ═══════════════════════════════════════════════════════════════════════════
  const matchVoiceDNA = useCallback((current: VoiceDNA, stored: VoiceDNA, threshold: number = 75): VoiceMatchResult => {
    // Pitch match - allow 15% variance
    const pitchDiff = Math.abs(current.pitch - stored.pitch) / Math.max(stored.pitch, 1);
    const pitchMatch = Math.max(0, 100 - (pitchDiff * 150));
    
    // Tempo match - allow 20% variance
    const tempoDiff = Math.abs(current.tempo - stored.tempo) / Math.max(stored.tempo, 1);
    const tempoMatch = Math.max(0, 100 - (tempoDiff * 125));
    
    // Spectral centroid match - allow 25% variance
    const spectralDiff = Math.abs(current.spectralCentroid - stored.spectralCentroid) / Math.max(stored.spectralCentroid, 1);
    const spectralMatch = Math.max(0, 100 - (spectralDiff * 100));
    
    // ZCR match
    const zcrDiff = Math.abs(current.zeroCrossingRate - stored.zeroCrossingRate) / Math.max(stored.zeroCrossingRate, 0.001);
    const zcrMatch = Math.max(0, 100 - (zcrDiff * 50));
    
    // MFCC hash comparison (character-level similarity)
    let hashMatch = 0;
    const minLen = Math.min(current.mfccHash.length, stored.mfccHash.length);
    for (let i = 0; i < minLen; i++) {
      if (current.mfccHash[i] === stored.mfccHash[i]) hashMatch++;
    }
    hashMatch = (hashMatch / minLen) * 100;
    
    // Weighted overall score
    const overallConfidence = (
      pitchMatch * 0.30 +      // Pitch is very distinctive
      tempoMatch * 0.15 +      // Tempo varies more
      spectralMatch * 0.25 +   // Timbre is distinctive
      zcrMatch * 0.10 +        // Texture indicator
      hashMatch * 0.20         // Spectral fingerprint
    );
    
    const similarity = Math.round(overallConfidence * 100) / 100;
    
    console.log('[BIO-RESONANCE] Voice Match Analysis:', {
      pitchMatch: Math.round(pitchMatch),
      tempoMatch: Math.round(tempoMatch),
      spectralMatch: Math.round(spectralMatch),
      hashMatch: Math.round(hashMatch),
      overall: similarity
    });
    
    return {
      similarity,
      isMatch: similarity >= threshold,
      confidenceFactors: {
        pitchMatch: Math.round(pitchMatch),
        tempoMatch: Math.round(tempoMatch),
        spectralMatch: Math.round(spectralMatch),
        overallConfidence: Math.round(overallConfidence)
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY CONTEXT - Device/Network fingerprinting for multi-factor
  // ═══════════════════════════════════════════════════════════════════════════
  const getSecurityContext = useCallback(async (): Promise<SecurityContext> => {
    const { userAgent, language, platform, hardwareConcurrency } = navigator;
    const screenData = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Generate device fingerprint
    const fingerprintData = [
      userAgent,
      language,
      platform,
      screenData,
      hardwareConcurrency?.toString() || '0',
      timezone
    ].join('|');
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintData));
    const deviceFingerprint = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32);
    
    // Check if device fingerprint is stored locally (known device)
    const knownDevices = JSON.parse(localStorage.getItem('voice_citadel_known_devices') || '[]');
    const isKnownDevice = knownDevices.includes(deviceFingerprint);
    
    // Try to get IP (will fail silently if blocked)
    let ipAddress: string | null = null;
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
      const ipData = await ipResponse.json();
      ipAddress = ipData.ip;
    } catch {
      // IP check failed - continue without it
    }
    
    // Check safe zones from localStorage
    const safeTimezones = JSON.parse(localStorage.getItem('voice_citadel_safe_zones') || '[]');
    const isSafeZone = safeTimezones.length === 0 || safeTimezones.includes(timezone);
    
    return {
      ipAddress,
      deviceFingerprint,
      timezone,
      screenSignature: screenData,
      isKnownDevice,
      isSafeZone
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTER KNOWN DEVICE - Add current device to trusted list
  // ═══════════════════════════════════════════════════════════════════════════
  const registerKnownDevice = useCallback(async () => {
    const context = await getSecurityContext();
    const knownDevices = JSON.parse(localStorage.getItem('voice_citadel_known_devices') || '[]');
    
    if (!knownDevices.includes(context.deviceFingerprint)) {
      knownDevices.push(context.deviceFingerprint);
      localStorage.setItem('voice_citadel_known_devices', JSON.stringify(knownDevices));
    }
    
    // Also register current timezone as safe
    const safeZones = JSON.parse(localStorage.getItem('voice_citadel_safe_zones') || '[]');
    if (!safeZones.includes(context.timezone)) {
      safeZones.push(context.timezone);
      localStorage.setItem('voice_citadel_safe_zones', JSON.stringify(safeZones));
    }
  }, [getSecurityContext]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SERIALIZE VOICE DNA - For storage
  // ═══════════════════════════════════════════════════════════════════════════
  const serializeVoiceDNA = useCallback((dna: VoiceDNA): string => {
    return JSON.stringify(dna);
  }, []);

  const deserializeVoiceDNA = useCallback((data: string): VoiceDNA | null => {
    try {
      return JSON.parse(data) as VoiceDNA;
    } catch {
      return null;
    }
  }, []);

  return {
    // State
    isAnalyzing,
    lastVoiceDNA,
    
    // Voice DNA Analysis
    analyzeVoiceDNA,
    matchVoiceDNA,
    
    // Security Context
    getSecurityContext,
    registerKnownDevice,
    
    // Serialization
    serializeVoiceDNA,
    deserializeVoiceDNA
  };
}
