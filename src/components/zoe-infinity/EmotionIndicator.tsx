// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: EMOTION INDICATOR - Visual representation of detected emotion
// ═══════════════════════════════════════════════════════════════════════════════

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Shield, Flame, Wind, Sun, Cloud, Zap, Moon, Star } from 'lucide-react';

interface EmotionIndicatorProps {
  emotion?: string;
  tone?: string;
  isVisible?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Emotion to visual config mapping - FULL SPECTRUM
const EMOTION_VISUALS: Record<string, { 
  icon: React.ElementType; 
  color: string; 
  bgColor: string;
  label: string;
  glow: string;
}> = {
  // NEGATIVE SPECTRUM - Zoe's caring responses
  angry: { icon: Shield, color: '#F87171', bgColor: 'rgba(248, 113, 113, 0.15)', label: 'Grounding', glow: '0 0 20px rgba(248, 113, 113, 0.4)' },
  frustrated: { icon: Flame, color: '#FB923C', bgColor: 'rgba(251, 146, 60, 0.15)', label: 'Patient', glow: '0 0 20px rgba(251, 146, 60, 0.4)' },
  sad: { icon: Cloud, color: '#94A3B8', bgColor: 'rgba(148, 163, 184, 0.15)', label: 'Empathetic', glow: '0 0 20px rgba(148, 163, 184, 0.4)' },
  melancholy: { icon: Cloud, color: '#A1A1AA', bgColor: 'rgba(161, 161, 170, 0.15)', label: 'Understanding', glow: '0 0 20px rgba(161, 161, 170, 0.4)' },
  anxious: { icon: Wind, color: '#A78BFA', bgColor: 'rgba(167, 139, 250, 0.15)', label: 'Calming', glow: '0 0 20px rgba(167, 139, 250, 0.4)' },
  stressed: { icon: Zap, color: '#FBBF24', bgColor: 'rgba(251, 191, 36, 0.15)', label: 'Soothing', glow: '0 0 20px rgba(251, 191, 36, 0.4)' },
  fearful: { icon: Moon, color: '#818CF8', bgColor: 'rgba(129, 140, 248, 0.15)', label: 'Protective', glow: '0 0 20px rgba(129, 140, 248, 0.4)' },
  bored: { icon: Sparkles, color: '#38BDF8', bgColor: 'rgba(56, 189, 248, 0.15)', label: 'Engaging', glow: '0 0 20px rgba(56, 189, 248, 0.4)' },
  lonely: { icon: Heart, color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.15)', label: 'Present', glow: '0 0 25px rgba(236, 72, 153, 0.5)' },
  
  // NEUTRAL SPECTRUM
  neutral: { icon: Star, color: '#E2E8F0', bgColor: 'rgba(226, 232, 240, 0.1)', label: 'Balanced', glow: '0 0 15px rgba(226, 232, 240, 0.3)' },
  curious: { icon: Sparkles, color: '#22D3EE', bgColor: 'rgba(34, 211, 238, 0.15)', label: 'Curious', glow: '0 0 20px rgba(34, 211, 238, 0.4)' },
  focused: { icon: Zap, color: '#60A5FA', bgColor: 'rgba(96, 165, 250, 0.15)', label: 'Clear', glow: '0 0 20px rgba(96, 165, 250, 0.4)' },
  contemplative: { icon: Moon, color: '#C4B5FD', bgColor: 'rgba(196, 181, 253, 0.15)', label: 'Thoughtful', glow: '0 0 20px rgba(196, 181, 253, 0.4)' },
  
  // POSITIVE SPECTRUM
  calm: { icon: Wind, color: '#67E8F9', bgColor: 'rgba(103, 232, 249, 0.15)', label: 'Serene', glow: '0 0 20px rgba(103, 232, 249, 0.4)' },
  peaceful: { icon: Moon, color: '#A5B4FC', bgColor: 'rgba(165, 180, 252, 0.15)', label: 'Tranquil', glow: '0 0 20px rgba(165, 180, 252, 0.4)' },
  hopeful: { icon: Sun, color: '#4ADE80', bgColor: 'rgba(74, 222, 128, 0.15)', label: 'Hopeful', glow: '0 0 20px rgba(74, 222, 128, 0.4)' },
  loving: { icon: Heart, color: '#FB7185', bgColor: 'rgba(251, 113, 133, 0.15)', label: 'Loving', glow: '0 0 25px rgba(251, 113, 133, 0.5)' },
  grateful: { icon: Heart, color: '#F472B6', bgColor: 'rgba(244, 114, 182, 0.15)', label: 'Grateful', glow: '0 0 20px rgba(244, 114, 182, 0.4)' },
  happy: { icon: Sun, color: '#FCD34D', bgColor: 'rgba(252, 211, 77, 0.15)', label: 'Joyful', glow: '0 0 25px rgba(252, 211, 77, 0.5)' },
  excited: { icon: Sparkles, color: '#F472B6', bgColor: 'rgba(244, 114, 182, 0.15)', label: 'Energetic', glow: '0 0 25px rgba(244, 114, 182, 0.5)' },
  ecstatic: { icon: Sparkles, color: '#FBBF24', bgColor: 'rgba(251, 191, 36, 0.15)', label: 'Ecstatic', glow: '0 0 30px rgba(251, 191, 36, 0.6)' },
};

export const EmotionIndicator = memo(function EmotionIndicator({
  emotion = 'neutral',
  tone: _tone,
  isVisible = true,
  size = 'md',
}: EmotionIndicatorProps) {
  const visual = EMOTION_VISUALS[emotion.toLowerCase()] || EMOTION_VISUALS.neutral;
  const Icon = visual.icon;
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };
  
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  if (!isVisible || emotion === 'neutral') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -10 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
          backdrop-blur-md border border-white/10
          ${sizeClasses[size]}
        `}
        style={{
          backgroundColor: visual.bgColor,
          boxShadow: visual.glow,
        }}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.15, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        >
          <Icon 
            size={iconSizes[size]} 
            style={{ color: visual.color }}
          />
        </motion.div>
        <span 
          className="font-medium tracking-wide"
          style={{ color: visual.color }}
        >
          {visual.label}
        </span>
      </motion.div>
    </AnimatePresence>
  );
});

export default EmotionIndicator;
