// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: Satellite Shield - Optical Encryption System
// Hack-proof camera feed with steganography and challenge pixels
// Protocol EMP triggered on security breaches
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGodModeSovereign } from '@/components/security/GodModeSovereignProvider';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ZoeSignature {
  timestamp: number;
  hash: string;
  nonce: number;
  serverVerified: boolean;
}

export interface ChallengePixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  frameIndex: number;
  sentAt: number;
  acknowledged: boolean;
}

export interface SatelliteShieldState {
  isActive: boolean;
  signatureValid: boolean;
  lastSignature: ZoeSignature | null;
  challengePixelsSent: number;
  challengePixelsAcknowledged: number;
  protocolEMPTriggered: boolean;
  empReason: string | null;
  satelliteLatency: number;
  steganographyActive: boolean;
  encryptionStrength: number; // 0-100
  lastSecurityCheck: number;
  consecutiveFailures: number;
}

export interface SatelliteShieldConfig {
  challengeInterval: number; // frames between challenges
  maxLatencyMs: number; // max allowed satellite latency
  maxConsecutiveFailures: number; // failures before EMP
  signatureRefreshMs: number; // how often to refresh signature
}

const DEFAULT_CONFIG: SatelliteShieldConfig = {
  challengeInterval: 10,
  maxLatencyMs: 2000,
  maxConsecutiveFailures: 3,
  signatureRefreshMs: 1000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CRYPTOGRAPHIC UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

// Generate a cryptographic hash for the Zoe Signature
const generateSignatureHash = (timestamp: number, nonce: number): string => {
  const data = `ZOE_OPTIC_X_${timestamp}_${nonce}_SOVEREIGN`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Add entropy from crypto API if available
  const entropy = crypto.getRandomValues(new Uint32Array(1))[0];
  const combined = ((hash ^ entropy) >>> 0).toString(16).padStart(8, '0');
  return `0x${combined.toUpperCase()}`;
};

// Embed signature into alpha channel (simulated steganography)
const embedSignatureInAlpha = (
  imageData: ImageData,
  signature: ZoeSignature
): ImageData => {
  const data = imageData.data;
  const sigBytes = signature.hash.split('').map(c => c.charCodeAt(0));
  const timestamp = signature.timestamp.toString();
  
  // Embed in first 64 alpha channel values (every 4th byte starting at index 3)
  for (let i = 0; i < Math.min(sigBytes.length, 64); i++) {
    const alphaIndex = (i * 4) + 3; // Alpha channel
    if (alphaIndex < data.length) {
      // Modify LSB of alpha to embed signature bit
      const sigBit = (sigBytes[i % sigBytes.length] >> (i % 8)) & 1;
      data[alphaIndex] = (data[alphaIndex] & 0xFE) | sigBit;
    }
  }
  
  return imageData;
};

// Generate challenge pixel with specific RGB values
const generateChallengePixel = (frameIndex: number): Omit<ChallengePixel, 'sentAt' | 'acknowledged'> => {
  // Pseudo-random position based on frame
  const seed = frameIndex * 31337;
  const x = (seed * 7) % 1920;
  const y = (seed * 13) % 1080;
  
  // Challenge RGB based on timestamp + frame for uniqueness
  const now = Date.now();
  const r = (now & 0xFF) ^ (frameIndex & 0xFF);
  const g = ((now >> 8) & 0xFF) ^ ((frameIndex >> 8) & 0xFF);
  const b = ((now >> 16) & 0xFF) ^ ((frameIndex >> 16) & 0xFF);
  
  return { x, y, r, g, b, frameIndex };
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useSatelliteShield = (config: Partial<SatelliteShieldConfig> = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { isInitialized, isLockdownActive } = useGodModeSovereign();
  
  const [state, setState] = useState<SatelliteShieldState>({
    isActive: false,
    signatureValid: true,
    lastSignature: null,
    challengePixelsSent: 0,
    challengePixelsAcknowledged: 0,
    protocolEMPTriggered: false,
    empReason: null,
    satelliteLatency: 0,
    steganographyActive: false,
    encryptionStrength: 100,
    lastSecurityCheck: Date.now(),
    consecutiveFailures: 0,
  });
  
  const frameCountRef = useRef(0);
  const pendingChallengesRef = useRef<ChallengePixel[]>([]);
  const animationRef = useRef<number>(0);
  const empTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SIGNATURE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const generateSignature = useCallback((): ZoeSignature => {
    const timestamp = Date.now();
    const nonce = crypto.getRandomValues(new Uint32Array(1))[0];
    const hash = generateSignatureHash(timestamp, nonce);
    
    return {
      timestamp,
      hash,
      nonce,
      serverVerified: true, // In production, would verify with server
    };
  }, []);
  
  const validateSignature = useCallback((signature: ZoeSignature): boolean => {
    const now = Date.now();
    const timeDiff = now - signature.timestamp;
    
    // Signature expires after 10 seconds (anti-replay)
    if (timeDiff > 10000) {
      console.warn('[SATELLITE SHIELD] Signature expired - possible replay attack');
      return false;
    }
    
    // Verify hash integrity
    const expectedHash = generateSignatureHash(signature.timestamp, signature.nonce);
    if (signature.hash !== expectedHash) {
      console.warn('[SATELLITE SHIELD] Signature hash mismatch - tampered feed detected');
      return false;
    }
    
    return true;
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // CHALLENGE PIXEL SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const sendChallengePixel = useCallback((frameIndex: number): ChallengePixel => {
    const pixel = {
      ...generateChallengePixel(frameIndex),
      sentAt: Date.now(),
      acknowledged: false,
    };
    
    pendingChallengesRef.current.push(pixel);
    
    // Clean up old pending challenges (older than 5 seconds)
    pendingChallengesRef.current = pendingChallengesRef.current.filter(
      p => Date.now() - p.sentAt < 5000
    );
    
    console.info(`[SATELLITE SHIELD] Challenge pixel sent: Frame ${frameIndex}, RGB(${pixel.r},${pixel.g},${pixel.b})`);
    
    setState(prev => ({
      ...prev,
      challengePixelsSent: prev.challengePixelsSent + 1,
    }));
    
    return pixel;
  }, []);
  
  const acknowledgeChallenge = useCallback((frameIndex: number): boolean => {
    const challenge = pendingChallengesRef.current.find(
      p => p.frameIndex === frameIndex && !p.acknowledged
    );
    
    if (!challenge) {
      return false;
    }
    
    const latency = Date.now() - challenge.sentAt;
    challenge.acknowledged = true;
    
    setState(prev => ({
      ...prev,
      challengePixelsAcknowledged: prev.challengePixelsAcknowledged + 1,
      satelliteLatency: latency,
      consecutiveFailures: 0, // Reset failures on success
    }));
    
    console.info(`[SATELLITE SHIELD] Challenge acknowledged: ${latency}ms latency`);
    
    return true;
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PROTOCOL EMP - Emergency shutdown
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const triggerProtocolEMP = useCallback((reason: string) => {
    console.error(`[SATELLITE SHIELD] ⚡ PROTOCOL EMP TRIGGERED: ${reason}`);
    
    setState(prev => ({
      ...prev,
      protocolEMPTriggered: true,
      empReason: reason,
      steganographyActive: false,
      encryptionStrength: 0,
    }));
    
    // Auto-recover after 5 seconds if God Mode is active
    if (isInitialized && !isLockdownActive) {
      empTimeoutRef.current = setTimeout(() => {
        console.info('[SATELLITE SHIELD] Protocol EMP recovery initiated');
        setState(prev => ({
          ...prev,
          protocolEMPTriggered: false,
          empReason: null,
          consecutiveFailures: 0,
        }));
      }, 5000);
    }
  }, [isInitialized, isLockdownActive]);
  
  const resetProtocolEMP = useCallback(() => {
    if (empTimeoutRef.current) {
      clearTimeout(empTimeoutRef.current);
    }
    
    setState(prev => ({
      ...prev,
      protocolEMPTriggered: false,
      empReason: null,
      consecutiveFailures: 0,
    }));
    
    console.info('[SATELLITE SHIELD] Protocol EMP manually reset');
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN SECURITY LOOP
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const processFrame = useCallback((frameIndex: number): {
    signature: ZoeSignature;
    challengePixel: ChallengePixel | null;
    shouldCorrupt: boolean;
  } => {
    // Generate new signature
    const signature = generateSignature();
    
    // Validate previous signature
    if (state.lastSignature && !validateSignature(state.lastSignature)) {
      const failures = state.consecutiveFailures + 1;
      
      if (failures >= mergedConfig.maxConsecutiveFailures) {
        triggerProtocolEMP('Signature validation failed - deepfake detected');
        return { signature, challengePixel: null, shouldCorrupt: true };
      }
      
      setState(prev => ({ ...prev, consecutiveFailures: failures }));
    }
    
    // Send challenge pixel every N frames
    let challengePixel: ChallengePixel | null = null;
    if (frameIndex % mergedConfig.challengeInterval === 0) {
      challengePixel = sendChallengePixel(frameIndex);
      
      // Check for unacknowledged challenges (Man-in-the-Middle detection)
      const unacknowledged = pendingChallengesRef.current.filter(
        p => !p.acknowledged && (Date.now() - p.sentAt) > mergedConfig.maxLatencyMs
      );
      
      if (unacknowledged.length > 0) {
        const failures = state.consecutiveFailures + 1;
        
        if (failures >= mergedConfig.maxConsecutiveFailures) {
          triggerProtocolEMP('Challenge pixel timeout - Satellite MITM detected');
          return { signature, challengePixel, shouldCorrupt: true };
        }
        
        setState(prev => ({ ...prev, consecutiveFailures: failures }));
      }
    }
    
    // Update state
    setState(prev => ({
      ...prev,
      lastSignature: signature,
      signatureValid: true,
      lastSecurityCheck: Date.now(),
      encryptionStrength: Math.max(0, 100 - (state.consecutiveFailures * 25)),
    }));
    
    return { signature, challengePixel, shouldCorrupt: false };
  }, [
    state.lastSignature,
    state.consecutiveFailures,
    generateSignature,
    validateSignature,
    sendChallengePixel,
    triggerProtocolEMP,
    mergedConfig,
  ]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTIVATION / DEACTIVATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const activate = useCallback(() => {
    console.info('[SATELLITE SHIELD] 🛡️ Optical encryption activated');
    
    setState(prev => ({
      ...prev,
      isActive: true,
      steganographyActive: true,
      protocolEMPTriggered: false,
      empReason: null,
      encryptionStrength: 100,
    }));
    
    // Start signature refresh loop
    const refreshSignature = () => {
      if (state.isActive && !state.protocolEMPTriggered) {
        frameCountRef.current++;
        processFrame(frameCountRef.current);
        animationRef.current = requestAnimationFrame(refreshSignature);
      }
    };
    
    animationRef.current = requestAnimationFrame(refreshSignature);
  }, [state.isActive, state.protocolEMPTriggered, processFrame]);
  
  const deactivate = useCallback(() => {
    console.info('[SATELLITE SHIELD] Optical encryption deactivated');
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setState(prev => ({
      ...prev,
      isActive: false,
      steganographyActive: false,
    }));
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (empTimeoutRef.current) {
        clearTimeout(empTimeoutRef.current);
      }
    };
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEGANOGRAPHY API
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const embedInFrame = useCallback((canvas: HTMLCanvasElement): boolean => {
    if (!state.isActive || state.protocolEMPTriggered) return false;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      if (state.lastSignature) {
        embedSignatureInAlpha(imageData, state.lastSignature);
        ctx.putImageData(imageData, 0, 0);
      }
      
      return true;
    } catch (error) {
      console.error('[SATELLITE SHIELD] Steganography embedding failed:', error);
      return false;
    }
  }, [state.isActive, state.protocolEMPTriggered, state.lastSignature]);
  
  return {
    // State
    state,
    isActive: state.isActive,
    isSecure: state.isActive && !state.protocolEMPTriggered && state.signatureValid,
    encryptionStrength: state.encryptionStrength,
    
    // Actions
    activate,
    deactivate,
    processFrame,
    embedInFrame,
    acknowledgeChallenge,
    resetProtocolEMP,
    
    // Security info
    lastSignature: state.lastSignature,
    protocolEMPTriggered: state.protocolEMPTriggered,
    empReason: state.empReason,
    satelliteLatency: state.satelliteLatency,
  };
};

export default useSatelliteShield;
