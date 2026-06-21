/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - LOCKING ANIMATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Full-screen overlay animation when sending encrypted email
 * Shows shield closing sequence with encryption visualization
 */

import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Check, Send } from 'lucide-react';

interface LockingAnimationProps {
  isActive: boolean;
  stage?: 'encrypting' | 'routing' | 'sending' | 'complete';
  onComplete?: () => void;
}

export const LockingAnimation = memo(function LockingAnimation({
  isActive,
  stage = 'encrypting',
  onComplete,
}: LockingAnimationProps) {
  const [currentStage, setCurrentStage] = useState(stage);
  
  useEffect(() => {
    if (!isActive) return;
    
    // Animate through stages
    const stages: typeof stage[] = ['encrypting', 'routing', 'sending', 'complete'];
    const stageIndex = stages.indexOf(currentStage);
    
    if (stageIndex < stages.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStage(stages[stageIndex + 1]);
      }, 800);
      return () => clearTimeout(timer);
    } else if (currentStage === 'complete') {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, currentStage, onComplete]);
  
  // Reset when deactivated
  useEffect(() => {
    if (!isActive) {
      setCurrentStage('encrypting');
    }
  }, [isActive]);
  
  const getStageText = () => {
    switch (currentStage) {
      case 'encrypting': return 'Encrypting payload...';
      case 'routing': return 'Routing through Ironclad...';
      case 'sending': return 'Transmitting securely...';
      case 'complete': return 'Transmission complete';
    }
  };
  
  const getStageIcon = () => {
    switch (currentStage) {
      case 'encrypting': return Lock;
      case 'routing': return Shield;
      case 'sending': return Send;
      case 'complete': return Check;
    }
  };
  
  const StageIcon = getStageIcon();

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.9)' }}
        >
          {/* Hexagonal Grid Background */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-20 h-20 border border-cyan-500/30"
                style={{
                  left: `${(i % 5) * 25}%`,
                  top: `${Math.floor(i / 5) * 30}%`,
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                }}
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.1,
                  repeat: Infinity,
                }}
              />
            ))}
          </div>
          
          {/* Central Animation */}
          <div className="relative flex flex-col items-center">
            {/* Outer rotating ring */}
            <motion.div
              className="absolute w-48 h-48 rounded-full border-2 border-cyan-500/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Middle pulsing ring */}
            <motion.div
              className="absolute w-36 h-36 rounded-full border border-emerald-500/40"
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            
            {/* Inner shield container */}
            <motion.div
              className="relative w-24 h-24 rounded-full 
                         bg-gradient-to-br from-cyan-500/20 to-emerald-500/20
                         border border-white/20
                         flex items-center justify-center"
              animate={currentStage === 'complete' ? {
                scale: [1, 1.2, 1],
                boxShadow: [
                  '0 0 30px rgba(52, 211, 153, 0.3)',
                  '0 0 60px rgba(52, 211, 153, 0.6)',
                  '0 0 30px rgba(52, 211, 153, 0.3)',
                ],
              } : {}}
              transition={{ duration: 0.5 }}
            >
              {/* Stage Icon */}
              <motion.div
                key={currentStage}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <StageIcon className={`w-10 h-10 ${
                  currentStage === 'complete' ? 'text-emerald-400' : 'text-cyan-400'
                }`} />
              </motion.div>
            </motion.div>
            
            {/* Encryption particles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-cyan-400"
                  style={{
                    top: '50%',
                    left: '50%',
                  }}
                  animate={{
                    x: [0, Math.cos(i * 30 * Math.PI / 180) * 80],
                    y: [0, Math.sin(i * 30 * Math.PI / 180) * 80],
                    opacity: [1, 0],
                    scale: [1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.08,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
            
            {/* Status Text */}
            <motion.div
              className="mt-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.p
                key={currentStage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-lg font-medium ${
                  currentStage === 'complete' ? 'text-emerald-400' : 'text-cyan-300'
                }`}
              >
                {getStageText()}
              </motion.p>
              
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {['encrypting', 'routing', 'sending', 'complete'].map((s, i) => (
                  <motion.div
                    key={s}
                    className={`w-2 h-2 rounded-full ${
                      ['encrypting', 'routing', 'sending', 'complete'].indexOf(currentStage) >= i
                        ? currentStage === 'complete' ? 'bg-emerald-400' : 'bg-cyan-400'
                        : 'bg-white/20'
                    }`}
                    animate={
                      ['encrypting', 'routing', 'sending', 'complete'].indexOf(currentStage) === i
                        ? { scale: [1, 1.3, 1] }
                        : {}
                    }
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
            
            {/* Ironclad Badge */}
            <motion.div
              className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full
                         bg-black/50 border border-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-white/60 font-mono">
                PROTOCOL IRONCLAD • AES-256-GCM
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default LockingAnimation;
