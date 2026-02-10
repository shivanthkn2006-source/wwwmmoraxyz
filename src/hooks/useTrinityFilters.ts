// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: Trinity Filter Integration Hook
// Connects GLSL filters to ECN (Emotion-Cognition Network) and God Mode Security
// Real-time bio-feedback and encryption visualization
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGodModeSovereign } from '@/components/security/GodModeSovereignProvider';
import { TrinityFilterType, TrinityFilterConfig } from '@/components/quantum-camera/TrinityFilterShaders';
import type { ECNEmotionState } from '@/hooks/useContinuousDHFStream';

// ECN emotion to stress/flow mapping
const ECN_STRESS_EMOTIONS: ECNEmotionState[] = [
  'anger', 'anxiety', 'fear', 'frustration', 'nervousness', 'grief', 'sadness'
];

const ECN_FLOW_EMOTIONS: ECNEmotionState[] = [
  'joy', 'amusement', 'excitement', 'love', 'gratitude', 'relief', 'optimism', 'pride'
];

interface ECNState {
  currentEmotion: ECNEmotionState;
  valence: number;      // -1 to 1
  arousal: number;      // 0 to 1
  stressLevel: number;  // 0 to 1
  flowLevel: number;    // 0 to 1
}

interface LatencyState {
  current: number;      // ms
  average: number;      // ms
  isStable: boolean;
}

interface SecurityState {
  encryptionKey: number;    // 0-1, changes per frame
  securityLevel: number;    // 0-1 from God Mode
  isAuthenticated: boolean;
  decryptionMatch: number;  // 0-1, how much face is visible
}

export interface TrinityFilterState {
  activeFilter: TrinityFilterType;
  ecn: ECNState;
  latency: LatencyState;
  security: SecurityState;
  rollingHash: string;
  frameCount: number;
}

export const useTrinityFilters = () => {
  const { isInitialized, quantumShieldState, kernelState, isLockdownActive } = useGodModeSovereign();
  
  const [activeFilter, setActiveFilter] = useState<TrinityFilterType>('none');
  const [ecnState, setECNState] = useState<ECNState>({
    currentEmotion: 'neutral',
    valence: 0,
    arousal: 0.3,
    stressLevel: 0,
    flowLevel: 0.5,
  });
  const [latencyState, setLatencyState] = useState<LatencyState>({
    current: 20,
    average: 25,
    isStable: true,
  });
  const [securityState, setSecurityState] = useState<SecurityState>({
    encryptionKey: 0,
    securityLevel: 1,
    isAuthenticated: true,
    decryptionMatch: 1,
  });
  const [rollingHash, setRollingHash] = useState('0x00000000');
  const [frameCount, setFrameCount] = useState(0);
  
  const animationRef = useRef<number>(0);
  const latencyHistoryRef = useRef<number[]>([]);
  
  // Generate rolling hash (changes every frame for anti-deepfake)
  const generateRollingHash = useCallback((): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(16).slice(2, 10);
    const hash = `0x${random.toUpperCase()}`;
    return hash;
  }, []);
  
  // Update ECN from external emotional state
  const updateECN = useCallback((emotion: ECNEmotionState, valence?: number, arousal?: number) => {
    const isStress = ECN_STRESS_EMOTIONS.includes(emotion);
    const isFlow = ECN_FLOW_EMOTIONS.includes(emotion);
    
    setECNState(prev => ({
      currentEmotion: emotion,
      valence: valence ?? (isFlow ? 0.5 : isStress ? -0.5 : 0),
      arousal: arousal ?? (isStress || isFlow ? 0.7 : 0.3),
      stressLevel: isStress ? Math.min(prev.stressLevel + 0.1, 1) : Math.max(prev.stressLevel - 0.05, 0),
      flowLevel: isFlow ? Math.min(prev.flowLevel + 0.1, 1) : Math.max(prev.flowLevel - 0.03, 0),
    }));
  }, []);
  
  // Measure connection latency
  const measureLatency = useCallback(async () => {
    const start = performance.now();
    try {
      // Quick ping to measure network latency
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
        },
      });
      const latency = performance.now() - start;
      
      latencyHistoryRef.current.push(latency);
      if (latencyHistoryRef.current.length > 10) {
        latencyHistoryRef.current.shift();
      }
      
      const avg = latencyHistoryRef.current.reduce((a, b) => a + b, 0) / latencyHistoryRef.current.length;
      const isStable = latencyHistoryRef.current.every(l => l < 100);
      
      setLatencyState({
        current: Math.round(latency),
        average: Math.round(avg),
        isStable,
      });
    } catch {
      // Simulated latency on error
      setLatencyState(prev => ({
        ...prev,
        current: 150,
        isStable: false,
      }));
    }
  }, []);
  
  // Listen for Live Audit simulation events
  useEffect(() => {
    const handleSimulation = (event: CustomEvent<{ scenario: string }>) => {
      const { scenario } = event.detail;
      switch (scenario) {
        case 'stress':
          updateECN('anxiety', -0.7, 0.9);
          break;
        case 'flow':
          updateECN('joy', 0.9, 0.7);
          break;
        case 'unauthorized':
          setSecurityState(prev => ({
            ...prev,
            isAuthenticated: false,
            decryptionMatch: 0.1,
          }));
          break;
        case 'high-latency':
          setLatencyState(prev => ({
            ...prev,
            current: 150,
            isStable: false,
          }));
          break;
      }
    };

    window.addEventListener('live-audit-simulate', handleSimulation as EventListener);
    return () => window.removeEventListener('live-audit-simulate', handleSimulation as EventListener);
  }, [updateECN]);

  // Animation loop for real-time updates
  useEffect(() => {
    let lastLatencyCheck = 0;
    
    const tick = () => {
      const now = Date.now();
      
      // Update rolling hash every frame
      setRollingHash(generateRollingHash());
      setFrameCount(prev => prev + 1);
      
      // Update encryption key from security state
      setSecurityState(prev => ({
        ...prev,
        encryptionKey: (now % 1000) / 1000, // 0-1 cycles every second
        securityLevel: isLockdownActive ? 0.3 : (isInitialized ? 1 : 0.7),
        isAuthenticated: isInitialized,
        decryptionMatch: prev.isAuthenticated ? 1 : 0.2,
      }));
      
      // Measure latency every 2 seconds
      if (now - lastLatencyCheck > 2000) {
        measureLatency();
        lastLatencyCheck = now;
      }
      
      animationRef.current = requestAnimationFrame(tick);
    };
    
    if (activeFilter !== 'none') {
      animationRef.current = requestAnimationFrame(tick);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activeFilter, generateRollingHash, measureLatency, isLockdownActive, kernelState]);
  
  // Build filter config for shaders
  const getFilterConfig = useCallback((): TrinityFilterConfig => {
    return {
      type: activeFilter,
      // Chronos Echo
      latency: latencyState.current,
      rollingHash: parseInt(rollingHash.slice(2), 16) / 0xFFFFFFFF,
      // DHF Soul-Ray
      stressLevel: ecnState.stressLevel,
      flowLevel: ecnState.flowLevel,
      emotionValence: ecnState.valence,
      emotionArousal: ecnState.arousal,
      // Quantum Flux
      encryptionKey: securityState.encryptionKey,
      decryptionMatch: securityState.decryptionMatch,
      securityLevel: securityState.securityLevel,
    };
  }, [activeFilter, latencyState, rollingHash, ecnState, securityState]);
  
  // Simulate ECN changes for demo
  const simulateECNState = useCallback((scenario: 'stress' | 'flow' | 'neutral') => {
    switch (scenario) {
      case 'stress':
        updateECN('anxiety', -0.6, 0.8);
        break;
      case 'flow':
        updateECN('joy', 0.8, 0.6);
        break;
      case 'neutral':
      default:
        updateECN('neutral', 0, 0.3);
        break;
    }
  }, [updateECN]);
  
  return {
    // State
    activeFilter,
    ecnState,
    latencyState,
    securityState,
    rollingHash,
    frameCount,
    
    // Actions
    setActiveFilter,
    updateECN,
    getFilterConfig,
    simulateECNState,
    
    // Full state object
    state: {
      activeFilter,
      ecn: ecnState,
      latency: latencyState,
      security: securityState,
      rollingHash,
      frameCount,
    } as TrinityFilterState,
  };
};

export default useTrinityFilters;
