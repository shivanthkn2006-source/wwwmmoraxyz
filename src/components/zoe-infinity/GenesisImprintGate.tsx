// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS IMPRINT GATE - Quantum Shard Authentication for Zoe Infinity
// "Touch the Shard to Resonate" - Zero Password, Zero OTP, Pure Biometric
// With optional email fallback for myzoe.xyz standalone domain
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Fingerprint, Zap, Lock, Mail } from 'lucide-react';
import { SafeQuantumShard as QuantumShard } from '@/components/zoe-infinity/SafeQuantumShard';
import { BiometricAuthButton } from '@/components/quantum/BiometricAuthButton';
import { useGenesisImprint, ImprintState } from '@/hooks/useGenesisImprint';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { isZoeInfinityStandaloneDomain } from '@/hooks/useDomainRouter';
import { cn } from '@/lib/utils';

interface GenesisImprintGateProps {
  onUnlock: () => void;
  children: React.ReactNode;
}

// Map imprint state to shard state
const mapImprintToShardState = (state: ImprintState): 'locked' | 'scanning' | 'unlocked' | 'error' => {
  switch (state) {
    case 'idle':
      return 'locked';
    case 'sensing':
    case 'biometric':
    case 'voice':
    case 'generating':
    case 'verifying':
      return 'scanning';
    case 'success':
      return 'unlocked';
    case 'error':
      return 'error';
    default:
      return 'locked';
  }
};

// Map imprint state to biometric auth state
const mapImprintToBiometricState = (state: ImprintState): 'idle' | 'scanning' | 'success' | 'error' => {
  switch (state) {
    case 'idle':
      return 'idle';
    case 'sensing':
    case 'biometric':
    case 'voice':
    case 'generating':
    case 'verifying':
      return 'scanning';
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
};

export function GenesisImprintGate({ onUnlock, children }: GenesisImprintGateProps) {
  const navigate = useNavigate();
  
  // Destructure only what the hook actually returns
  const {
    status,
    touchShard,
    reset,
    deviceType,
  } = useGenesisImprint();
  
  const haptics = useHapticFeedback();
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const isStandaloneDomain = isZoeInfinityStandaloneDomain();

  // Handle successful authentication
  useEffect(() => {
    if (status.state === 'success' && !isUnlocked) {
      setIsUnlocked(true);
      haptics.zoeSingularity();
      
      // Delay to show shatter animation
      setTimeout(() => {
        onUnlock();
      }, 1500);
    }
  }, [status.state, isUnlocked, onUnlock, haptics]);

  // Handle shard touch
  const handleShardTouch = useCallback(async () => {
    if (status.state === 'idle' || status.state === 'error') {
      haptics.impact('heavy');
      await touchShard();
    }
  }, [status.state, touchShard, haptics]);

  // If unlocked, render children ONLY (no gate elements)
  if (isUnlocked && status.state === 'success') {
    return <>{children}</>;
  }

  // Don't render the gate if children are being shown
  if (isUnlocked) {
    return <>{children}</>;
  }

  const shardState = mapImprintToShardState(status.state);
  const biometricState = mapImprintToBiometricState(status.state);

  const getStatusMessage = (): string => {
    switch (status.state) {
      case 'idle':
        return status.mode === 'genesis' 
          ? 'Touch the Shard to Imprint Your Soul'
          : 'Touch the Shard to Resonate';
      case 'sensing':
        return 'Sensing Kinetic Signature...';
      case 'biometric':
        return 'Verifying Biometric Identity...';
      case 'voice':
        return 'Analyzing Voice Resonance...';
      case 'generating':
        return 'Generating Soul Hash...';
      case 'verifying':
        return 'Verifying Quantum Signature...';
      case 'success':
        return 'ACCESS GRANTED';
      case 'error':
        return status.errorMessage || 'Resonance Failed - Try Again';
      default:
        return 'Awaiting Resonance...';
    }
  };

  const getSecurityColor = (): string => {
    switch (status.securityLevel) {
      case 'IRONCLAD':
        return 'hsl(280, 100%, 60%)'; // Purple
      case 'QUANTUM':
        return 'hsl(180, 100%, 50%)'; // Cyan
      case 'BASIC':
        return 'hsl(45, 100%, 50%)'; // Gold
      default:
        return 'hsl(0, 0%, 50%)'; // Gray
    }
  };

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#000000' }}
    >
      {/* Animated quantum grid background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, ${getSecurityColor()}40 0%, transparent 50%),
            linear-gradient(${getSecurityColor()}15 1px, transparent 1px),
            linear-gradient(90deg, ${getSecurityColor()}15 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: getSecurityColor(),
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20],
              x: [-10, 10],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-4"
        >
          <h1 
            className="text-2xl md:text-3xl font-bold tracking-[0.3em] mb-2"
            style={{ 
              fontFamily: "'Orbitron', sans-serif",
              color: getSecurityColor(),
              textShadow: `0 0 30px ${getSecurityColor()}60`,
            }}
          >
            GENESIS IMPRINT
          </h1>
          <p className="text-white/40 text-sm tracking-wider">
            {status.mode === 'genesis' ? 'FIRST CONTACT PROTOCOL' : 'QUANTUM RESONANCE PROTOCOL'}
          </p>
        </motion.div>

        {/* 3D Quantum Shard */}
        <div className="relative w-64 h-64 md:w-80 md:h-80">
          <QuantumShard
            state={shardState}
            onTouch={handleShardTouch}
            className="w-full h-full"
          />
          
          {/* Progress ring overlay */}
          {status.progress > 0 && status.progress < 100 && (
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={getSecurityColor()}
                strokeWidth="0.5"
                strokeDasharray={`${status.progress * 2.83} 283`}
                strokeLinecap="round"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                  filter: `drop-shadow(0 0 10px ${getSecurityColor()})`,
                }}
              />
            </svg>
          )}
        </div>

        {/* Alternative: Biometric Button (for devices without 3D support) */}
        <div className="mt-4">
          <BiometricAuthButton
            onClick={handleShardTouch}
            state={biometricState}
            mode={status.mode === 'genesis' ? 'register' : 'login'}
            deviceType={deviceType}
            disabled={status.state !== 'idle' && status.state !== 'error'}
            size="md"
          />
        </div>

        {/* Status message */}
        <motion.div
          key={status.state}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p 
            className={cn(
              "text-lg font-medium tracking-wide",
              status.state === 'success' && 'text-emerald-400',
              status.state === 'error' && 'text-red-400',
              status.state !== 'success' && status.state !== 'error' && 'text-white/70'
            )}
            style={{
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            {getStatusMessage()}
          </p>
        </motion.div>

        {/* Entropy meter */}
        {status.entropyLevel > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-sm"
          >
            <Shield className="w-4 h-4" style={{ color: getSecurityColor() }} />
            <div className="flex flex-col">
              <span className="text-white/40">Entropy Level</span>
              <div className="flex items-center gap-2">
                <div 
                  className="h-1 rounded-full"
                  style={{
                    width: `${(status.entropyLevel / 1024) * 100}px`,
                    background: `linear-gradient(90deg, ${getSecurityColor()}, hsl(280, 100%, 60%))`,
                  }}
                />
                <span style={{ color: getSecurityColor() }}>
                  {status.entropyLevel} bits
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Security level badge */}
        {status.securityLevel !== 'NONE' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: `${getSecurityColor()}20`,
              border: `1px solid ${getSecurityColor()}40`,
            }}
          >
            {status.securityLevel === 'IRONCLAD' && <Zap className="w-4 h-4" style={{ color: getSecurityColor() }} />}
            {status.securityLevel === 'QUANTUM' && <Fingerprint className="w-4 h-4" style={{ color: getSecurityColor() }} />}
            {status.securityLevel === 'BASIC' && <Lock className="w-4 h-4" style={{ color: getSecurityColor() }} />}
            <span 
              className="text-sm font-medium tracking-wider"
              style={{ color: getSecurityColor() }}
            >
              {status.securityLevel} SECURITY
            </span>
          </motion.div>
        )}

        {/* Soul Hash preview */}
        {status.soulHashPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <p className="text-white/30 text-xs mb-1">Soul Hash Preview</p>
            <code 
              className="text-sm font-mono tracking-wider"
              style={{ color: getSecurityColor() }}
            >
              {status.soulHashPreview}...
            </code>
          </motion.div>
        )}

        {/* Error retry button */}
        {status.state === 'error' && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={reset}
            className="px-6 py-3 rounded-lg text-sm font-medium tracking-wide transition-all"
            style={{
              background: 'rgba(255, 50, 50, 0.2)',
              border: '1px solid rgba(255, 50, 50, 0.4)',
              color: 'hsl(0, 100%, 70%)',
            }}
          >
            Reset & Try Again
          </motion.button>
        )}

        {/* Email fallback link - shown on standalone domain */}
        {isStandaloneDomain && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={() => navigate('/zoe-infinity/auth')}
            className="flex items-center gap-2 text-white/30 text-sm hover:text-cyan-400/60 transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>Or sign in with email</span>
          </motion.button>
        )}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 text-white/20 text-xs"
        >
          <div className="flex items-center gap-1">
            <Fingerprint className="w-3 h-3" />
            <span>1024-bit Entropy</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Zero-Knowledge Proof</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>No Passwords</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default GenesisImprintGate;
