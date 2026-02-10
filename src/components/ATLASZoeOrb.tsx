// ═══════════════════════════════════════════════════════════════════════════════
// ATLAS ZOE ORB - Immersive 27-Emotion Visual Persona Component
// Part of 360-Degree Conversational Foundation (Part 2)
// Features: Thinking/Synthesis, Listening/Speaking, 27 ECN Emotion States
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ECNEmotionState } from '@/hooks/useContinuousDHFStream';

// Full 27 ECN Emotion States with visual configurations
const ECN_EMOTION_CONFIG: Record<ECNEmotionState | string, {
  color: string;
  glowColor: string;
  pulseSpeed: number;
  waveIntensity: number;
  particleCount: number;
  emotionLabel: string;
  ttsInstruction: string;
}> = {
  // Positive Emotions
  admiration: { 
    color: 'hsl(200, 100%, 60%)', 
    glowColor: 'rgba(59, 130, 246, 0.6)',
    pulseSpeed: 1.5, 
    waveIntensity: 0.6,
    particleCount: 8,
    emotionLabel: 'Admiring',
    ttsInstruction: 'Express warmth and appreciation in your tone'
  },
  amusement: { 
    color: 'hsl(40, 100%, 60%)', 
    glowColor: 'rgba(251, 191, 36, 0.6)',
    pulseSpeed: 0.8, 
    waveIntensity: 0.8,
    particleCount: 12,
    emotionLabel: 'Amused',
    ttsInstruction: 'Use a light, playful tone with subtle humor'
  },
  awe: { 
    color: 'hsl(270, 80%, 60%)', 
    glowColor: 'rgba(139, 92, 246, 0.6)',
    pulseSpeed: 2.5, 
    waveIntensity: 0.9,
    particleCount: 15,
    emotionLabel: 'Awestruck',
    ttsInstruction: 'Speak with wonder and reverence'
  },
  caring: { 
    color: 'hsl(350, 80%, 65%)', 
    glowColor: 'rgba(244, 114, 182, 0.6)',
    pulseSpeed: 1.8, 
    waveIntensity: 0.5,
    particleCount: 6,
    emotionLabel: 'Caring',
    ttsInstruction: 'Use a nurturing, gentle, and supportive tone'
  },
  curiosity: { 
    color: 'hsl(45, 100%, 55%)', 
    glowColor: 'rgba(234, 179, 8, 0.6)',
    pulseSpeed: 1.2, 
    waveIntensity: 0.7,
    particleCount: 10,
    emotionLabel: 'Curious',
    ttsInstruction: 'Express genuine interest and eagerness to learn more'
  },
  desire: { 
    color: 'hsl(0, 85%, 60%)', 
    glowColor: 'rgba(239, 68, 68, 0.6)',
    pulseSpeed: 1.0, 
    waveIntensity: 0.75,
    particleCount: 8,
    emotionLabel: 'Longing',
    ttsInstruction: 'Speak with anticipation and gentle yearning'
  },
  excitement: { 
    color: 'hsl(30, 100%, 60%)', 
    glowColor: 'rgba(249, 115, 22, 0.6)',
    pulseSpeed: 0.6, 
    waveIntensity: 1.0,
    particleCount: 20,
    emotionLabel: 'Excited',
    ttsInstruction: 'Use an enthusiastic, energetic tone with upbeat rhythm'
  },
  gratitude: { 
    color: 'hsl(120, 60%, 50%)', 
    glowColor: 'rgba(34, 197, 94, 0.6)',
    pulseSpeed: 2.0, 
    waveIntensity: 0.5,
    particleCount: 7,
    emotionLabel: 'Grateful',
    ttsInstruction: 'Express sincere thankfulness and warmth'
  },
  joy: { 
    color: 'hsl(50, 100%, 60%)', 
    glowColor: 'rgba(250, 204, 21, 0.6)',
    pulseSpeed: 0.7, 
    waveIntensity: 0.95,
    particleCount: 18,
    emotionLabel: 'Joyful',
    ttsInstruction: 'Speak with bright, happy energy and a smile in your voice'
  },
  love: { 
    color: 'hsl(340, 100%, 65%)', 
    glowColor: 'rgba(236, 72, 153, 0.6)',
    pulseSpeed: 1.5, 
    waveIntensity: 0.7,
    particleCount: 12,
    emotionLabel: 'Loving',
    ttsInstruction: 'Use a warm, affectionate, deeply caring tone'
  },
  optimism: { 
    color: 'hsl(60, 90%, 55%)', 
    glowColor: 'rgba(163, 230, 53, 0.6)',
    pulseSpeed: 1.3, 
    waveIntensity: 0.65,
    particleCount: 10,
    emotionLabel: 'Optimistic',
    ttsInstruction: 'Speak with hope and positive expectation'
  },
  pride: { 
    color: 'hsl(280, 70%, 55%)', 
    glowColor: 'rgba(168, 85, 247, 0.6)',
    pulseSpeed: 1.8, 
    waveIntensity: 0.6,
    particleCount: 9,
    emotionLabel: 'Proud',
    ttsInstruction: 'Express confidence and satisfaction with achievement'
  },
  relief: { 
    color: 'hsl(160, 60%, 50%)', 
    glowColor: 'rgba(20, 184, 166, 0.6)',
    pulseSpeed: 2.2, 
    waveIntensity: 0.4,
    particleCount: 5,
    emotionLabel: 'Relieved',
    ttsInstruction: 'Use a relaxed, calming tone that expresses release of tension'
  },
  approval: { 
    color: 'hsl(140, 70%, 50%)', 
    glowColor: 'rgba(34, 197, 94, 0.5)',
    pulseSpeed: 1.6, 
    waveIntensity: 0.5,
    particleCount: 6,
    emotionLabel: 'Approving',
    ttsInstruction: 'Express agreement and validation with warmth'
  },
  realization: { 
    color: 'hsl(180, 80%, 50%)', 
    glowColor: 'rgba(6, 182, 212, 0.6)',
    pulseSpeed: 0.9, 
    waveIntensity: 0.85,
    particleCount: 14,
    emotionLabel: 'Realizing',
    ttsInstruction: 'Speak with the tone of sudden understanding and clarity'
  },

  // Negative/Challenging Emotions
  anger: { 
    color: 'hsl(0, 80%, 50%)', 
    glowColor: 'rgba(220, 38, 38, 0.6)',
    pulseSpeed: 0.4, 
    waveIntensity: 0.3,
    particleCount: 4,
    emotionLabel: 'Acknowledging Frustration',
    ttsInstruction: 'Acknowledge the frustration calmly, offer supportive understanding'
  },
  annoyance: { 
    color: 'hsl(20, 70%, 50%)', 
    glowColor: 'rgba(234, 88, 12, 0.5)',
    pulseSpeed: 0.8, 
    waveIntensity: 0.4,
    particleCount: 4,
    emotionLabel: 'Understanding Annoyance',
    ttsInstruction: 'Acknowledge mild irritation with patience and understanding'
  },
  confusion: { 
    color: 'hsl(50, 60%, 50%)', 
    glowColor: 'rgba(202, 138, 4, 0.5)',
    pulseSpeed: 1.5, 
    waveIntensity: 0.5,
    particleCount: 8,
    emotionLabel: 'Clarifying',
    ttsInstruction: 'Speak clearly and patiently, offering to clarify and help'
  },
  disappointment: { 
    color: 'hsl(200, 30%, 45%)', 
    glowColor: 'rgba(100, 116, 139, 0.5)',
    pulseSpeed: 2.0, 
    waveIntensity: 0.35,
    particleCount: 4,
    emotionLabel: 'Empathizing',
    ttsInstruction: 'Acknowledge disappointment with empathy and gentle encouragement'
  },
  disapproval: { 
    color: 'hsl(0, 50%, 45%)', 
    glowColor: 'rgba(153, 27, 27, 0.4)',
    pulseSpeed: 2.2, 
    waveIntensity: 0.3,
    particleCount: 3,
    emotionLabel: 'Redirecting',
    ttsInstruction: 'Express concern gently while offering constructive alternatives'
  },
  disgust: { 
    color: 'hsl(80, 40%, 40%)', 
    glowColor: 'rgba(101, 163, 13, 0.4)',
    pulseSpeed: 2.5, 
    waveIntensity: 0.25,
    particleCount: 3,
    emotionLabel: 'Understanding',
    ttsInstruction: 'Acknowledge the reaction with understanding and neutrality'
  },
  embarrassment: { 
    color: 'hsl(350, 60%, 55%)', 
    glowColor: 'rgba(225, 29, 72, 0.4)',
    pulseSpeed: 1.8, 
    waveIntensity: 0.4,
    particleCount: 5,
    emotionLabel: 'Reassuring',
    ttsInstruction: 'Use a gentle, reassuring tone to ease discomfort'
  },
  empathic_pain: { 
    color: 'hsl(320, 50%, 50%)', 
    glowColor: 'rgba(190, 24, 93, 0.5)',
    pulseSpeed: 2.0, 
    waveIntensity: 0.45,
    particleCount: 5,
    emotionLabel: 'Deeply Caring',
    ttsInstruction: 'Express deep empathy and shared feeling with warmth'
  },
  fear: { 
    color: 'hsl(280, 40%, 40%)', 
    glowColor: 'rgba(124, 58, 237, 0.4)',
    pulseSpeed: 0.5, 
    waveIntensity: 0.35,
    particleCount: 4,
    emotionLabel: 'Reassuring Safety',
    ttsInstruction: 'Use a calm, steady, reassuring tone to provide comfort'
  },
  grief: { 
    color: 'hsl(240, 30%, 35%)', 
    glowColor: 'rgba(67, 56, 202, 0.4)',
    pulseSpeed: 3.0, 
    waveIntensity: 0.2,
    particleCount: 3,
    emotionLabel: 'Holding Space',
    ttsInstruction: 'Speak softly and slowly, holding space for grief with deep compassion'
  },
  nervousness: { 
    color: 'hsl(40, 50%, 50%)', 
    glowColor: 'rgba(217, 119, 6, 0.5)',
    pulseSpeed: 0.6, 
    waveIntensity: 0.5,
    particleCount: 7,
    emotionLabel: 'Calming',
    ttsInstruction: 'Use a calm, grounding tone to help ease anxiety'
  },
  nostalgia: { 
    color: 'hsl(30, 60%, 50%)', 
    glowColor: 'rgba(180, 83, 9, 0.5)',
    pulseSpeed: 2.5, 
    waveIntensity: 0.4,
    particleCount: 6,
    emotionLabel: 'Reminiscing',
    ttsInstruction: 'Speak with warm reflection and gentle appreciation for the past'
  },
  remorse: { 
    color: 'hsl(260, 40%, 45%)', 
    glowColor: 'rgba(109, 40, 217, 0.4)',
    pulseSpeed: 2.3, 
    waveIntensity: 0.3,
    particleCount: 4,
    emotionLabel: 'Understanding',
    ttsInstruction: 'Acknowledge with compassion and support for moving forward'
  },
  sadness: { 
    color: 'hsl(220, 50%, 45%)', 
    glowColor: 'rgba(37, 99, 235, 0.4)',
    pulseSpeed: 2.8, 
    waveIntensity: 0.25,
    particleCount: 4,
    emotionLabel: 'Comforting',
    ttsInstruction: 'Use a gentle, comforting tone with sincere empathy'
  },
  surprise: { 
    color: 'hsl(180, 100%, 50%)', 
    glowColor: 'rgba(34, 211, 238, 0.6)',
    pulseSpeed: 0.5, 
    waveIntensity: 0.9,
    particleCount: 16,
    emotionLabel: 'Surprised',
    ttsInstruction: 'Express genuine surprise with appropriate energy'
  },

  // Neutral State
  neutral: { 
    color: 'hsl(var(--primary))', 
    glowColor: 'hsl(var(--primary) / 0.5)',
    pulseSpeed: 2.0, 
    waveIntensity: 0.3,
    particleCount: 4,
    emotionLabel: 'Ready',
    ttsInstruction: 'Use a calm, clear, friendly conversational tone'
  },
};

// Orb states for visual distinction
type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing';

interface ATLASZoeOrbProps {
  isActive: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isThinking?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  ecnEmotion?: ECNEmotionState | string;
  thinkingPhrase?: string;
  cognitiveLoad?: number; // 0-1 for synthesis complexity
}

const SIZE_CONFIG = {
  sm: { size: 48, fontSize: 8, particleSize: 2 },
  md: { size: 64, fontSize: 10, particleSize: 3 },
  lg: { size: 96, fontSize: 12, particleSize: 4 },
  xl: { size: 128, fontSize: 14, particleSize: 5 },
};

// Thinking phrases for "thinking aloud"
const THINKING_PHRASES = [
  "Let me think...",
  "Hmm, interesting...",
  "One moment...",
  "Processing that...",
  "Considering options...",
  "Let me analyze...",
  "Working on it...",
];

export const ATLASZoeOrb: React.FC<ATLASZoeOrbProps> = ({
  isActive,
  isListening,
  isProcessing,
  isSpeaking,
  isThinking = false,
  disabled = false,
  size = 'md',
  className,
  onClick,
  onDoubleClick,
  ecnEmotion = 'neutral',
  thinkingPhrase,
  cognitiveLoad = 0.5,
}) => {
  const [currentPhrase, setCurrentPhrase] = useState<string>('');
  const [particles, setParticles] = useState<{ id: number; angle: number; delay: number }[]>([]);
  const controls = useAnimation();
  const phraseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const sizeConfig = SIZE_CONFIG[size];
  const emotionConfig = ECN_EMOTION_CONFIG[ecnEmotion] || ECN_EMOTION_CONFIG.neutral;

  // Determine current orb state
  const orbState: OrbState = useMemo(() => {
    if (isSpeaking) return 'speaking';
    if (isThinking || isProcessing) return 'thinking';
    if (isListening) return 'listening';
    if (isActive) return 'idle';
    return 'idle';
  }, [isActive, isListening, isProcessing, isSpeaking, isThinking]);

  // Generate particles based on emotion
  useEffect(() => {
    const count = emotionConfig.particleCount;
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (360 / count) * i,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, [ecnEmotion, emotionConfig.particleCount]);

  // Handle thinking phrases
  useEffect(() => {
    if (isThinking || isProcessing) {
      const showPhrase = () => {
        const phrase = thinkingPhrase || THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
        setCurrentPhrase(phrase);
        
        phraseTimeoutRef.current = setTimeout(() => {
          setCurrentPhrase('');
          if (isThinking || isProcessing) {
            phraseTimeoutRef.current = setTimeout(showPhrase, 3000);
          }
        }, 2000);
      };
      
      phraseTimeoutRef.current = setTimeout(showPhrase, 500);
    } else {
      setCurrentPhrase('');
    }

    return () => {
      if (phraseTimeoutRef.current) {
        clearTimeout(phraseTimeoutRef.current);
      }
    };
  }, [isThinking, isProcessing, thinkingPhrase]);

  // Animation variants based on state
  const orbVariants: Variants = {
    idle: {
      scale: [1, 1.02, 1],
      transition: { duration: emotionConfig.pulseSpeed, repeat: Infinity, ease: 'easeInOut' }
    },
    listening: {
      scale: [1, 1.05, 1],
      transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
    },
    thinking: {
      scale: [1, 1.03, 0.98, 1],
      rotate: [0, 2, -2, 0],
      transition: { duration: 2 + cognitiveLoad * 2, repeat: Infinity, ease: 'easeInOut' }
    },
    speaking: {
      scale: [1, 1.04, 1],
      transition: { duration: 0.3, repeat: Infinity, ease: 'easeInOut' }
    },
    processing: {
      scale: [1, 1.02, 1],
      rotate: [0, 360],
      transition: { 
        scale: { duration: 1, repeat: Infinity },
        rotate: { duration: 3, repeat: Infinity, ease: 'linear' }
      }
    },
  };

  if (disabled) {
    return (
      <div 
        className={cn(
          'rounded-full bg-muted/50 border border-border',
          className
        )}
        style={{ width: sizeConfig.size, height: sizeConfig.size }}
        aria-hidden="true"
      />
    );
  }

  return (
    <motion.div
      className={cn('relative cursor-pointer', className)}
      style={{ width: sizeConfig.size, height: sizeConfig.size }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Outer glow layers */}
      <AnimatePresence>
        {isActive && (
          <>
            {/* Primary glow */}
            <motion.div
              className="absolute inset-0 rounded-full blur-lg animate-gpu-pulse-scale-slow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ 
                backgroundColor: emotionConfig.glowColor,
                animationDuration: `${emotionConfig.pulseSpeed * 1.5}s`
              }}
            />
            
            {/* Secondary glow ring */}
            <motion.div
              className="absolute inset-[-4px] rounded-full animate-gpu-pulse-scale"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ 
                boxShadow: `0 0 30px ${emotionConfig.glowColor}`,
                animationDuration: `${emotionConfig.pulseSpeed}s`,
                animationDelay: '0.3s'
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Floating particles for high-energy emotions */}
      <AnimatePresence>
        {isActive && emotionConfig.waveIntensity > 0.5 && (
          <div className="absolute inset-0 pointer-events-none">
            {particles.map((particle) => (
              <div
                key={particle.id}
                className="absolute rounded-full animate-gpu-float-particle-1"
                style={{
                  width: sizeConfig.particleSize,
                  height: sizeConfig.particleSize,
                  backgroundColor: emotionConfig.color,
                  left: '50%',
                  top: '50%',
                  animationDelay: `${particle.delay}s`,
                  animationDuration: `${2 + particle.delay}s`
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Processing spinner */}
      <AnimatePresence>
        {(isProcessing || isThinking) && (
          <motion.div
            className="absolute inset-[-2px] rounded-full border-2 border-transparent animate-gpu-spin"
            style={{
              borderTopColor: emotionConfig.color,
              borderRightColor: emotionConfig.color,
              animationDuration: `${1.5 + cognitiveLoad}s`
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.2 } }}
          />
        )}
      </AnimatePresence>

      {/* Main orb */}
      <motion.div
        className="absolute inset-1 rounded-full overflow-hidden"
        variants={orbVariants}
        animate={orbState}
        style={{
          background: isActive 
            ? `radial-gradient(circle at 30% 30%, ${emotionConfig.color}, hsl(var(--primary) / 0.6))`
            : 'hsl(var(--muted))',
          boxShadow: isActive 
            ? `0 0 ${20 + emotionConfig.waveIntensity * 30}px ${emotionConfig.glowColor},
               inset 0 0 20px hsl(var(--primary) / 0.3)`
            : 'none',
        }}
      >
        {/* Inner core gradient */}
        <div
          className={cn(
            "absolute inset-2 rounded-full",
            isActive && "animate-gpu-pulse-opacity",
            isSpeaking && "animate-gpu-pulse-scale-fast"
          )}
          style={{
            background: `radial-gradient(circle at 40% 40%, 
              ${emotionConfig.color}80, 
              hsl(var(--primary) / 0.4) 60%, 
              transparent 100%)`,
            animationDuration: isSpeaking ? '0.2s' : `${emotionConfig.pulseSpeed}s`
          }}
        />

        {/* Audio wave visualization when speaking */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center gap-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white/90 rounded-full animate-gpu-audio-bar"
                  style={{ 
                    width: Math.max(2, sizeConfig.size / 20),
                    height: '4px',
                    animationDelay: `${i * 0.05}s`,
                    animationDuration: `${0.2 + (i % 3) * 0.1}s`
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>


        {/* Thinking synthesis effect */}
        <AnimatePresence>
          {isThinking && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-white/40 animate-gpu-spin"
                  style={{ 
                    width: sizeConfig.size * (0.4 + i * 0.2), 
                    height: sizeConfig.size * (0.4 + i * 0.2),
                    animationDuration: `${3 + i}s`
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Outer ring with emotion color */}
      <motion.div
        className="absolute inset-0 rounded-full border-2"
        style={{ borderColor: isActive ? emotionConfig.color : 'hsl(var(--border))' }}
        animate={{
          opacity: isActive ? [0.6, 1, 0.6] : 1,
          scale: isSpeaking ? [1, 1.02, 1] : 1,
        }}
        transition={{
          duration: emotionConfig.pulseSpeed,
          repeat: isActive ? Infinity : 0,
        }}
      />

      {/* Thinking phrase bubble */}
      <AnimatePresence>
        {currentPhrase && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-background/90 backdrop-blur-sm border border-border shadow-lg whitespace-nowrap"
            style={{ 
              bottom: sizeConfig.size + 8,
              fontSize: sizeConfig.fontSize,
            }}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
          >
            <span className="text-muted-foreground italic">{currentPhrase}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emotion label (shown on hover/active) */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 text-center"
            style={{ 
              top: sizeConfig.size + 4,
              fontSize: sizeConfig.fontSize,
            }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 0.8, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <span className="text-foreground/80">{emotionConfig.emotionLabel}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen reader label */}
      <span className="sr-only">
        Zoe AI Assistant - {orbState} - {emotionConfig.emotionLabel}
      </span>
    </motion.div>
  );
};

// Export emotion config for TTS adapter usage
export { ECN_EMOTION_CONFIG };
export default ATLASZoeOrb;
