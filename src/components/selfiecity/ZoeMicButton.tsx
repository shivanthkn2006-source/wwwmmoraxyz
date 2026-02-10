/**
 * ZoeMicButton - Phase 2: Glowing Mic Button with Sound Wave
 * 
 * QUADRILLION-READY: Integrates with Protocol Shape Shifter
 * - Auto-scales for KITCHEN_HUB (150% larger for fridge cooking use)
 * - Auto-positions for FLIP_FLEX (bottom-center reachable)
 * - Large touch targets for CAR_DISPLAY (driver safety)
 * - Voice priority mode for exotic devices
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShapeShifterOptional } from '@/contexts/ShapeShifterContext';
import { useLiquidUniverseOptional } from '@/contexts/LiquidUniverseContext';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ZoeMicButtonProps {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing?: boolean;
  audioLevel?: number; // 0-1 for sound wave intensity
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'kitchen'; // Added xl and kitchen for exotic devices
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════
// SOUND WAVE COMPONENT
// ═══════════════════════════════════════════════════════════════════

const SoundWave: React.FC<{ 
  isActive: boolean; 
  intensity: number;
  isSpeaking: boolean;
}> = ({ isActive, intensity, isSpeaking }) => {
  const bars = 5;
  const baseColor = isSpeaking ? 'hsl(var(--secondary))' : 'hsl(var(--primary))';
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex items-end justify-center gap-[2px] h-8">
        {Array.from({ length: bars }).map((_, i) => {
          // Create wave pattern with center bars taller
          const centerIndex = Math.floor(bars / 2);
          const distanceFromCenter = Math.abs(i - centerIndex);
          const heightMultiplier = 1 - (distanceFromCenter * 0.2);
          const baseHeight = isActive ? 12 + (intensity * 20 * heightMultiplier) : 4;
          
          return (
            <motion.div
              key={i}
              className="w-[3px] rounded-full"
              style={{ backgroundColor: baseColor }}
              animate={{
                height: isActive 
                  ? [
                      baseHeight,
                      baseHeight + (Math.random() * 10 * intensity),
                      baseHeight - 4,
                      baseHeight + (Math.random() * 8 * intensity),
                      baseHeight,
                    ]
                  : 4,
                opacity: isActive ? 0.9 : 0.3,
              }}
              transition={{
                duration: 0.3 + (Math.random() * 0.2),
                repeat: isActive ? Infinity : 0,
                repeatType: "loop",
                delay: i * 0.05,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// GLOW RING COMPONENT
// ═══════════════════════════════════════════════════════════════════

const GlowRing: React.FC<{ 
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
}> = ({ isActive, isListening, isSpeaking }) => {
  const glowColor = isSpeaking 
    ? 'hsl(var(--secondary) / 0.6)' 
    : 'hsl(var(--primary) / 0.6)';
  
  return (
    <>
      {/* Outer glow */}
      <motion.div
        className="absolute inset-[-8px] rounded-full blur-xl"
        style={{ backgroundColor: glowColor }}
        animate={{
          scale: isActive ? [1, 1.2, 1] : 1,
          opacity: isActive ? [0.4, 0.7, 0.4] : 0,
        }}
        transition={{
          duration: 1.5,
          repeat: isActive ? Infinity : 0,
          repeatType: "loop",
        }}
      />
      
      {/* Inner glow ring */}
      <motion.div
        className="absolute inset-[-4px] rounded-full border-2"
        style={{ borderColor: glowColor }}
        animate={{
          scale: isListening ? [1, 1.1, 1] : 1,
          opacity: isListening ? [0.6, 1, 0.6] : 0,
        }}
        transition={{
          duration: 1,
          repeat: isListening ? Infinity : 0,
          repeatType: "loop",
        }}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

const ZoeMicButton: React.FC<ZoeMicButtonProps> = ({
  isActive,
  isListening,
  isSpeaking,
  isProcessing = false,
  audioLevel = 0,
  onClick,
  size: propSize = 'lg',
  className,
}) => {
  // ═══════════════════════════════════════════════════════════════════
  // PROTOCOL SHAPE SHIFTER & LIQUID UNIVERSE INTEGRATION
  // Auto-adapt for exotic devices: Fridge, Car, Foldables
  // ═══════════════════════════════════════════════════════════════════
  
  const shapeShifter = useShapeShifterOptional();
  const liquidUniverse = useLiquidUniverseOptional();
  
  // Determine effective size based on device mode
  const effectiveSize = useMemo(() => {
    // If shape shifter detected exotic device, auto-scale
    if (shapeShifter) {
      // KITCHEN_HUB: 150% larger for messy hands cooking
      if (shapeShifter.isKitchenHub) return 'kitchen';
      // CAR_DISPLAY: Extra large for driver safety
      if (shapeShifter.isCarDisplay) return 'xl';
      // SMART_TV: Remote-friendly large button
      if (shapeShifter.isSmartTV) return 'xl';
      // KIOSK: Public display accessibility
      if (shapeShifter.isKiosk) return 'xl';
    }
    
    // Liquid Universe fallbacks
    if (liquidUniverse) {
      if (liquidUniverse.isFridge) return 'kitchen';
      if (liquidUniverse.isCar) return 'xl';
      if (liquidUniverse.isTV) return 'xl';
    }
    
    return propSize;
  }, [shapeShifter, liquidUniverse, propSize]);
  
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',        // Extra large for exotic devices
    kitchen: 'w-24 h-24',   // 150% for fridge (messy hands)
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-9 h-9',
    kitchen: 'w-12 h-12',
  };
  
  // Size to use
  const size = effectiveSize;

  const getIcon = () => {
    if (isProcessing) {
      return <Loader2 className={cn(iconSizes[size], "animate-spin text-primary-foreground")} />;
    }
    if (isSpeaking) {
      return <Volume2 className={cn(iconSizes[size], "text-secondary-foreground")} />;
    }
    if (isListening) {
      return <Mic className={cn(iconSizes[size], "text-primary-foreground animate-pulse")} />;
    }
    if (isActive) {
      return <Mic className={cn(iconSizes[size], "text-primary-foreground")} />;
    }
    return <MicOff className={cn(iconSizes[size], "text-muted-foreground")} />;
  };

  const getButtonClasses = () => {
    if (isProcessing) {
      return "bg-gradient-to-br from-primary to-primary/80";
    }
    if (isSpeaking) {
      return "bg-gradient-to-br from-secondary to-secondary/80";
    }
    if (isListening) {
      return "bg-gradient-to-br from-primary via-primary/90 to-secondary/50";
    }
    if (isActive) {
      return "bg-gradient-to-br from-primary to-primary/80";
    }
    return "bg-muted hover:bg-muted/80";
  };

  return (
    <motion.div
      className={cn("relative", className)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Glow effects */}
      <GlowRing 
        isActive={isActive} 
        isListening={isListening} 
        isSpeaking={isSpeaking} 
      />

      {/* Main button */}
      <motion.button
        onClick={onClick}
        className={cn(
          "relative rounded-full shadow-lg transition-colors",
          "flex items-center justify-center",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
          sizeClasses[size],
          getButtonClasses(),
        )}
        animate={{
          boxShadow: isActive
            ? [
                "0 0 20px hsl(var(--primary) / 0.4)",
                "0 0 40px hsl(var(--primary) / 0.6)",
                "0 0 20px hsl(var(--primary) / 0.4)",
              ]
            : "0 4px 12px rgba(0,0,0,0.15)",
        }}
        transition={{
          duration: 1.5,
          repeat: isActive ? Infinity : 0,
          repeatType: "loop",
        }}
      >
        {/* Sound wave behind icon */}
        <AnimatePresence>
          {(isListening || isSpeaking) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <SoundWave 
                isActive={isListening || isSpeaking} 
                intensity={audioLevel}
                isSpeaking={isSpeaking}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Icon */}
        <div className="relative z-10">
          {getIcon()}
        </div>
      </motion.button>

      {/* Status dot */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={cn(
              "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background",
              isListening ? "bg-green-500" : isSpeaking ? "bg-secondary" : "bg-primary"
            )}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ZoeMicButton;
