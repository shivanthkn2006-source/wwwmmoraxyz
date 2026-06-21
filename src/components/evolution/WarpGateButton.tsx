/**
 * WARP GATE BUTTON
 * Hyperspace transition from VR World to Evolution Layer
 * Creates dimensional separation between Game and Soul
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WarpGateButtonProps {
  className?: string;
  compact?: boolean;
}

export const WarpGateButton: React.FC<WarpGateButtonProps> = ({ className, compact = false }) => {
  const navigate = useNavigate();
  const [isWarping, setIsWarping] = useState(false);

  // Play warp sound
  const playWarpSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create ascending frequency sweep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(2000, audioContext.currentTime + 0.8);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.8);
      
      // Add white noise burst
      const bufferSize = audioContext.sampleRate * 0.3;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      
      const noiseSource = audioContext.createBufferSource();
      const noiseGain = audioContext.createGain();
      
      noiseSource.buffer = noiseBuffer;
      noiseSource.connect(noiseGain);
      noiseGain.connect(audioContext.destination);
      
      noiseGain.gain.setValueAtTime(0.1, audioContext.currentTime + 0.6);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.9);
      
      noiseSource.start(audioContext.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio not available');
    }
  }, []);

  const handleWarp = () => {
    if (isWarping) return;
    
    setIsWarping(true);
    playWarpSound();
    
    // Navigate after animation
    setTimeout(() => {
      navigate('/omega-evolution');
    }, 800);
  };

  return (
    <>
      {/* Warp Button */}
      <motion.button
        onClick={handleWarp}
        disabled={isWarping}
        className={cn(
          "relative overflow-hidden",
          "bg-transparent border border-amber-500/50",
          "text-amber-400 font-semibold",
          "transition-all duration-300",
          "hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20",
          "disabled:opacity-50",
          compact ? "px-3 py-1.5 rounded-md text-xs" : "px-6 py-3 rounded-lg",
          className
        )}
        style={{ fontFamily: "'Orbitron', sans-serif" }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-amber-600/10 animate-gpu-bg-slide" />
        
        {/* Content */}
        <span className="relative z-10 flex items-center gap-1.5">
          <Sparkles className={compact ? "w-3 h-3" : "w-5 h-5"} />
          {compact ? "EVOLUTION" : "ENTER EVOLUTION LAYER"}
          <Zap className={compact ? "w-3 h-3" : "w-5 h-5"} />
        </span>

        {/* Glow effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 10px rgba(255, 180, 0, 0.15)'
          }}
        />
      </motion.button>

      {/* Hyperspace Jump Overlay */}
      <AnimatePresence>
        {isWarping && (
          <motion.div
            className="fixed inset-0 z-[100] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Radial zoom effect */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at center, transparent 0%, rgba(255, 200, 0, 0.3) 30%, rgba(255, 150, 0, 0.5) 60%, #000 100%)'
              }}
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{ 
                scale: [0.1, 3, 10],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 0.8,
                ease: 'easeIn'
              }}
            />

            {/* Star streaks */}
            {[...Array(30)].map((_, i) => {
              const angle = (i / 30) * Math.PI * 2;
              const startX = 50 + Math.cos(angle) * 5;
              const startY = 50 + Math.sin(angle) * 5;
              const endX = 50 + Math.cos(angle) * 80;
              const endY = 50 + Math.sin(angle) * 80;
              
              return (
                <motion.div
                  key={i}
                  className="absolute w-1 bg-white rounded-full"
                  style={{
                    left: `${startX}%`,
                    top: `${startY}%`,
                    height: '2px',
                    transform: `rotate(${angle * 180 / Math.PI}deg)`,
                    transformOrigin: 'left center',
                    boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
                  }}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{
                    width: ['0%', '30%', '0%'],
                    opacity: [0, 1, 0],
                    left: [`${startX}%`, `${endX}%`],
                    top: [`${startY}%`, `${endY}%`]
                  }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.01,
                    ease: 'easeIn'
                  }}
                />
              );
            })}

            {/* White flash */}
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: 0.3,
                delay: 0.5,
                times: [0, 0.5, 1]
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WarpGateButton;
