// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ORB COMPONENT - Visual Representation of Zoe's Active State
// OPTIMIZED: CSS-based animations for cross-device stability, minimal JS
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ZoeOrbProps {
  isActive: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  ecnEmotion?: string;
}

// Emotion to color mapping
const EMOTION_COLORS: Record<string, string> = {
  joy: '50, 100%, 60%',
  excitement: '30, 100%, 60%',
  love: '340, 100%, 65%',
  neutral: 'var(--primary)',
  curiosity: '45, 100%, 55%',
  sadness: '220, 50%, 45%',
  anger: '0, 80%, 50%',
  fear: '280, 40%, 40%',
};

const SIZE_CLASSES = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

// Pure CSS audio wave bars - no JS animation loops
const AudioWaveBars = memo(() => (
  <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-0 animate-[fadeIn_0.2s_ease-out_forwards]">
    {[0, 1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="w-0.5 bg-white/80 rounded-full animate-[audioWave_0.4s_ease-in-out_infinite]"
        style={{
          height: '4px',
          animationDelay: `${i * 0.05}s`,
          animationDuration: `${0.25 + (i % 2) * 0.1}s`,
        }}
      />
    ))}
  </div>
));

AudioWaveBars.displayName = 'AudioWaveBars';

const ZoeOrbComponent: React.FC<ZoeOrbProps> = ({
  isActive,
  isListening,
  isProcessing,
  isSpeaking,
  disabled = false,
  size = 'md',
  className,
  onClick,
  ecnEmotion = 'neutral',
}) => {
  const emotionHsl = EMOTION_COLORS[ecnEmotion] || EMOTION_COLORS.neutral;
  const emotionColor = emotionHsl.includes('var(') ? `hsl(${emotionHsl})` : `hsl(${emotionHsl})`;

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  if (disabled) {
    return (
      <div 
        className={cn(SIZE_CLASSES[size], 'rounded-full bg-muted/50 border border-border', className)}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={cn(
        SIZE_CLASSES[size],
        'relative cursor-pointer rounded-full transition-transform duration-200 ease-out',
        'hover:scale-105 active:scale-95',
        className
      )}
      onClick={handleClick}
      style={{
        transform: 'translateZ(0)', // GPU layer
      }}
    >
      {/* Outer glow - CSS animation only */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-full animate-[orbPulse_2s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(circle, ${emotionColor} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Processing spinner - CSS animation */}
      {isProcessing && (
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent animate-[spin_1s_linear_infinite]"
          style={{
            borderTopColor: emotionColor,
            borderRightColor: emotionColor,
          }}
        />
      )}

      {/* Main orb body */}
      <div
        className={cn(
          'absolute inset-1 rounded-full overflow-hidden transition-all duration-300',
          isSpeaking && 'animate-[orbSpeak_0.5s_ease-in-out_infinite]'
        )}
        style={{
          background: isActive 
            ? `radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.6))`
            : 'hsl(var(--muted))',
          boxShadow: isActive 
            ? `0 0 25px ${emotionColor}40, inset 0 0 20px hsl(var(--primary) / 0.3)`
            : 'none',
        }}
      >
        {/* Inner core */}
        <div
          className={cn(
            'absolute inset-2 rounded-full transition-opacity duration-300',
            isActive ? 'animate-[coreGlow_1.5s_ease-in-out_infinite]' : 'opacity-30'
          )}
          style={{
            background: `radial-gradient(circle at 40% 40%, ${emotionColor}60, hsl(var(--primary) / 0.4) 60%, transparent 100%)`,
          }}
        />

        {/* Audio visualization */}
        {isSpeaking && <AudioWaveBars />}
      </div>

      {/* Status ring - simple opacity pulse via CSS */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-2 transition-colors duration-300',
          isActive && 'animate-[ringPulse_2s_ease-in-out_infinite]'
        )}
        style={{
          borderColor: isActive ? emotionColor : 'hsl(var(--border))',
        }}
      />

      <span className="sr-only">
        Zoe AI Assistant - {isListening ? 'Listening' : isSpeaking ? 'Speaking' : isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
};

export const ZoeOrb = memo(ZoeOrbComponent);
export default ZoeOrb;
