// ═══════════════════════════════════════════════════════════════════════════════
// ZOE IDENTITY - THE VOID GATE
// Year 2120 Bio-Quantum Resonance Authentication Portal
// ═══════════════════════════════════════════════════════════════════════════════
// 
// "In the year 2120, humans do not type passwords or wait for OTPs.
//  They utilize Bio-Quantum Resonance. Touch the Shard to Resonate."
// 
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Radio, Fingerprint, ArrowLeft, Volume2, VolumeX, Zap } from 'lucide-react';
import { useGenesisImprint, ImprintState } from '@/hooks/useGenesisImprint';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

// Use the safe shard with 2D fallback
import { SafeQuantumShard as QuantumShard } from '@/components/zoe-infinity/SafeQuantumShard';

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_MESSAGES: Record<ImprintState, { title: string; subtitle: string }> = {
  idle: {
    title: 'TOUCH THE SHARD',
    subtitle: 'To initiate resonance',
  },
  sensing: {
    title: 'SENSING KINETIC SIGNATURE',
    subtitle: 'Analyzing micro-tremors...',
  },
  biometric: {
    title: 'VERIFY SOUL SIGNATURE',
    subtitle: 'Biometric resonance in progress...',
  },
  voice: {
    title: 'VOICE AUTHENTICATION',
    subtitle: 'Speak your truth...',
  },
  generating: {
    title: 'GENERATING ZERO-KNOWLEDGE PROOF',
    subtitle: 'Crystallizing your soul hash...',
  },
  verifying: {
    title: 'QUANTUM ENTANGLEMENT VERIFICATION',
    subtitle: 'Matching soul resonance...',
  },
  success: {
    title: 'IDENTITY VERIFIED',
    subtitle: 'Welcome to the Infinity',
  },
  error: {
    title: 'RESONANCE FAILED',
    subtitle: 'Soul signature mismatch',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SATELLITE SHIELD INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

const SatelliteShield: React.FC<{ securityLevel: string; entropyBits: number }> = ({ 
  securityLevel, 
  entropyBits 
}) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.5 }}
    className="absolute top-6 right-6 flex items-center gap-2 text-cyan-400/60"
  >
    <Shield className="w-4 h-4" />
    <div className="text-[10px] font-mono tracking-wider">
      <div className="text-cyan-400/80">{entropyBits}-BIT ENTROPY</div>
      <div className="text-cyan-400/40">PQC ENCRYPTED</div>
    </div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ENTROPY PROGRESS RING
// ═══════════════════════════════════════════════════════════════════════════════

const EntropyRing: React.FC<{ progress: number; state: ImprintState }> = ({ progress, state }) => {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  
  const stateColors: Record<ImprintState, string> = {
    idle: '#ff3366',
    sensing: '#00ffff',
    biometric: '#00ccff',
    voice: '#ffaa00',
    generating: '#00ff88',
    verifying: '#00ffff',
    success: '#00ff88',
    error: '#ff4444',
  };
  
  return (
    <svg 
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 300 300"
    >
      {/* Background ring */}
      <circle
        cx="150"
        cy="150"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="2"
      />
      
      {/* Progress ring */}
      <motion.circle
        cx="150"
        cy="150"
        r={radius}
        fill="none"
        stroke={stateColors[state]}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 150 150)"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          filter: `drop-shadow(0 0 10px ${stateColors[state]})`,
        }}
      />
      
      {/* Glow particles */}
      {state === 'sensing' || state === 'biometric' || state === 'generating' ? (
        Array.from({ length: 8 }).map((_, i) => (
          <motion.circle
            key={i}
            cx="150"
            cy="150"
            r="3"
            fill={stateColors[state]}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0],
              cx: [150, 150 + Math.cos((i / 8) * Math.PI * 2) * radius],
              cy: [150, 150 + Math.sin((i / 8) * Math.PI * 2) * radius],
            }}
            transition={{
              duration: 2,
              delay: i * 0.1,
              repeat: Infinity,
            }}
          />
        ))
      ) : null}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING FALLBACK FOR 3D SHARD
// ═══════════════════════════════════════════════════════════════════════════════

const ShardLoader: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center">
    <motion.div
      className="w-24 h-24 border-2 border-cyan-500/30 rounded-full"
      animate={{
        rotate: 360,
        borderColor: ['rgba(0,255,255,0.3)', 'rgba(0,255,255,0.8)', 'rgba(0,255,255,0.3)'],
      }}
      transition={{
        rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
        borderColor: { duration: 1.5, repeat: Infinity },
      }}
    >
      <motion.div
        className="absolute inset-4 border-2 border-cyan-400/50 rounded-full"
        animate={{ rotate: -360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const ZoeIdentity: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const haptics = useHapticFeedback();
  const { status, touchShard, reset, abort, deviceType } = useGenesisImprint();
  
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  
  // Map imprint state to shard state
  const getShardState = (): 'locked' | 'scanning' | 'unlocked' | 'error' => {
    switch (status.state) {
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
  
  // Handle successful authentication
  useEffect(() => {
    if (status.state === 'success') {
      const timer = setTimeout(() => {
        navigate('/zoe-infinity');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status.state, navigate]);
  
  // Handle shard touch
  const handleShardTouch = useCallback(async () => {
    setShowInstructions(false);
    haptics.zoeSingularity();
    await touchShard();
  }, [touchShard, haptics]);
  
  // Handle retry
  const handleRetry = useCallback(() => {
    reset();
    setShowInstructions(true);
  }, [reset]);
  
  // Handle back navigation
  const handleBack = useCallback(() => {
    abort();
    navigate(-1);
  }, [abort, navigate]);
  
  const currentMessage = STATUS_MESSAGES[status.state];
  const shardState = getShardState();
  
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* THE VOID - Pure Black Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-black">
        {/* Subtle star field effect */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, transparent 0%, black 100%),
              radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.3), transparent),
              radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.2), transparent),
              radial-gradient(2px 2px at 50px 160px, rgba(255,255,255,0.3), transparent),
              radial-gradient(2px 2px at 90px 40px, rgba(255,255,255,0.2), transparent),
              radial-gradient(2px 2px at 130px 80px, rgba(255,255,255,0.3), transparent)`,
            backgroundSize: '200px 200px',
          }}
        />
      </div>
      
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={handleBack}
        className="absolute top-6 left-6 p-2 text-white/40 hover:text-white/80 transition-colors z-50"
      >
        <ArrowLeft className="w-6 h-6" />
      </motion.button>
      
      {/* Satellite Shield Indicator */}
      <SatelliteShield 
        securityLevel={status.securityLevel} 
        entropyBits={status.entropyLevel || 1024}
      />
      
      {/* Audio Toggle */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        onClick={() => setAudioEnabled(!audioEnabled)}
        className="absolute top-6 right-32 p-2 text-white/40 hover:text-white/80 transition-colors z-50"
      >
        {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </motion.button>
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        
        {/* Mode Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute top-20 text-center"
        >
          <div className="flex items-center gap-2 text-cyan-400/60 text-xs tracking-[0.3em] font-mono">
            <Radio className="w-3 h-3" />
            {status.mode === 'genesis' ? 'GENESIS IMPRINT' : 'RESONANCE MODE'}
          </div>
        </motion.div>
        
        {/* The Quantum Shard */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96">
          {/* Entropy Ring */}
          <EntropyRing progress={status.progress} state={status.state} />
          
          {/* 3D Crystal - SafeQuantumShard handles its own loading/fallback */}
          <div className="absolute inset-8">
            <QuantumShard 
              state={shardState} 
              onTouch={status.state === 'idle' || status.state === 'error' ? handleShardTouch : undefined}
            />
          </div>
        </div>
        
        {/* Status Messages */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={status.state}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <h2 className={cn(
                "text-lg sm:text-xl font-light tracking-[0.2em]",
                status.state === 'success' && "text-emerald-400",
                status.state === 'error' && "text-red-400",
                status.state === 'idle' && "text-cyan-400",
                !['success', 'error', 'idle'].includes(status.state) && "text-cyan-300"
              )}>
                {currentMessage.title}
              </h2>
              <p className="text-white/40 text-sm tracking-wide">
                {status.errorMessage || currentMessage.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
          
          {/* Soul Hash Preview */}
          {status.soulHashPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 font-mono text-xs text-cyan-500/50 tracking-widest"
            >
              SOUL HASH: {status.soulHashPreview}...
            </motion.div>
          )}
          
          {/* Progress Percentage */}
          {status.progress > 0 && status.state !== 'success' && status.state !== 'error' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-xs text-white/30 font-mono"
            >
              {status.progress}%
            </motion.div>
          )}
        </motion.div>
        
        {/* Touch Instructions */}
        <AnimatePresence>
          {showInstructions && status.state === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 1 }}
              className="absolute bottom-32 flex items-center gap-2 text-white/30 text-sm"
            >
              <Fingerprint className="w-4 h-4" />
              <span>Hold thumb on crystal to imprint</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Retry Button */}
        <AnimatePresence>
          {status.state === 'error' && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleRetry}
              className="mt-8 px-6 py-2 border border-cyan-500/30 text-cyan-400/80 
                         text-sm tracking-wider hover:bg-cyan-500/10 transition-colors rounded-full"
            >
              RETRY RESONANCE
            </motion.button>
          )}
        </AnimatePresence>
        
        {/* Device Type Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 flex items-center gap-2 text-white/20 text-xs font-mono"
        >
          <Zap className="w-3 h-3" />
          {deviceType === 'faceid' && 'FACE ID READY'}
          {deviceType === 'touchid' && 'TOUCH ID READY'}
          {deviceType === 'fingerprint' && 'FINGERPRINT READY'}
          {deviceType === 'unknown' && 'BIOMETRIC FALLBACK'}
        </motion.div>
      </div>
      
      {/* Success Overlay */}
      <AnimatePresence>
        {status.state === 'success' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent pointer-events-none"
          >
            {/* Shatter effect particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-emerald-400 rounded-full"
                initial={{ 
                  left: '50%', 
                  top: '40%',
                  opacity: 1,
                }}
                animate={{
                  left: `${50 + (Math.random() - 0.5) * 100}%`,
                  top: `${40 + (Math.random() - 0.5) * 80}%`,
                  opacity: 0,
                  scale: [1, 2, 0],
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.05,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ZoeIdentity;
