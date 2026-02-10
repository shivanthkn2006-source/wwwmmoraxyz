// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ORB SONIC MODE - Quantum Call Visual Integration
// Holographic phone trigger, real-time audio waveform, deep amber call state
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import type { CallState, CallParticipant } from '@/hooks/useZoeQuantumCall';

interface ZoeOrbSonicModeProps {
  // Base orb props
  isActive: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  
  // Quantum Call props
  callState: CallState;
  incomingCall: CallParticipant | null;
  isMuted: boolean;
  isSpeaking: boolean;
  remoteIsSpeaking: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  onInitiateCall?: () => void;
  onAcceptCall?: () => void;
  onRejectCall?: () => void;
  onEndCall?: () => void;
  onToggleMute?: () => void;
}

const SIZE_CONFIG = {
  sm: { size: 48, iconSize: 14, waveCount: 4 },
  md: { size: 64, iconSize: 16, waveCount: 5 },
  lg: { size: 96, iconSize: 20, waveCount: 7 },
};

// Deep Amber color for active calls
const ACTIVE_CALL_COLOR = 'hsl(35, 100%, 50%)';
const INCOMING_CALL_COLOR = 'hsl(280, 80%, 60%)';
const IDLE_COLOR = 'hsl(var(--primary))';

// ═══════════════════════════════════════════════════════════════════════════════
// INCOMING CALL SOUND EFFECT
// ═══════════════════════════════════════════════════════════════════════════════

const playIncomingCallSound = (): (() => void) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  let isPlaying = true;

  const playTone = (startTime: number, frequency: number, duration: number) => {
    if (!isPlaying) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);
    
    // Low-frequency hum with fade in/out
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
    gainNode.gain.setValueAtTime(0.15, startTime + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  // Futuristic incoming call pattern - low frequency hum with harmonics
  const playPattern = () => {
    if (!isPlaying) return;
    
    const now = audioContext.currentTime;
    
    // Base low hum (80Hz)
    playTone(now, 80, 0.4);
    playTone(now + 0.5, 80, 0.4);
    
    // Harmonic overtones
    playTone(now, 160, 0.3);
    playTone(now + 0.5, 160, 0.3);
    
    // High accent
    playTone(now + 0.1, 440, 0.15);
    playTone(now + 0.6, 523, 0.15);
    
    // Repeat pattern
    setTimeout(playPattern, 1500);
  };

  playPattern();

  // Return stop function
  return () => {
    isPlaying = false;
    audioContext.close();
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO WAVEFORM VISUALIZER
// ═══════════════════════════════════════════════════════════════════════════════

const AudioWaveformVisualizer: React.FC<{
  isActive: boolean;
  isSpeaking: boolean;
  remoteIsSpeaking: boolean;
  waveCount: number;
}> = ({ isActive, isSpeaking, remoteIsSpeaking, waveCount }) => {
  const [levels, setLevels] = useState<number[]>(Array(waveCount).fill(0.2));
  
  useEffect(() => {
    if (!isActive) {
      setLevels(Array(waveCount).fill(0.2));
      return;
    }

    const interval = setInterval(() => {
      setLevels(prev => 
        prev.map(() => {
          const base = isSpeaking ? 0.4 : remoteIsSpeaking ? 0.5 : 0.2;
          const variance = isSpeaking || remoteIsSpeaking ? 0.5 : 0.1;
          return base + Math.random() * variance;
        })
      );
    }, 80);

    return () => clearInterval(interval);
  }, [isActive, isSpeaking, remoteIsSpeaking, waveCount]);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center gap-0.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {levels.map((level, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: 3,
            backgroundColor: isSpeaking ? 'rgba(255, 180, 0, 0.9)' : 'rgba(255, 255, 255, 0.8)',
            boxShadow: isSpeaking ? '0 0 8px rgba(255, 180, 0, 0.6)' : 'none',
          }}
          animate={{
            height: 8 + level * 24,
          }}
          transition={{
            duration: 0.08,
            ease: 'easeOut',
          }}
        />
      ))}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING CALL BUTTON (4 O'CLOCK POSITION)
// ═══════════════════════════════════════════════════════════════════════════════

const FloatingCallButton: React.FC<{
  callState: CallState;
  size: number;
  onInitiateCall?: () => void;
}> = ({ callState, size, onInitiateCall }) => {
  const isInCall = callState === 'connected' || callState === 'connecting';
  
  if (isInCall || callState === 'incoming') return null;

  // Position at 4 o'clock (45 degrees from right)
  const angle = Math.PI / 6; // 30 degrees below horizontal
  const distance = size * 0.6;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;

  return (
    <motion.button
      className={cn("absolute flex items-center justify-center rounded-full cursor-pointer z-10 animate-gpu-pulse-scale")}
      style={{
        width: size * 0.3,
        height: size * 0.3,
        right: -x,
        bottom: -y,
        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)',
        boxShadow: '0 2px 12px rgba(0, 200, 255, 0.4), 0 0 20px rgba(0, 200, 255, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ opacity: { duration: 0.3 } }}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        e.stopPropagation();
        onInitiateCall?.();
      }}
      title="Start Quantum Call"
    >
      <Phone size={size * 0.12} className="text-primary-foreground" />
    </motion.button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOVER CONTROLS (GLASSMORPHISM)
// ═══════════════════════════════════════════════════════════════════════════════

const HoverControls: React.FC<{
  isVisible: boolean;
  isMuted: boolean;
  onToggleMute?: () => void;
  onEndCall?: () => void;
  size: number;
}> = ({ isVisible, isMuted, onToggleMute, onEndCall, size }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center gap-2 rounded-full z-20"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            className="flex items-center justify-center rounded-full"
            style={{
              width: size * 0.28,
              height: size * 0.28,
              background: isMuted 
                ? 'rgba(255, 100, 100, 0.6)' 
                : 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute?.();
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff size={size * 0.12} className="text-white" />
            ) : (
              <Mic size={size * 0.12} className="text-white" />
            )}
          </motion.button>

          <motion.button
            className="flex items-center justify-center rounded-full"
            style={{
              width: size * 0.28,
              height: size * 0.28,
              background: 'rgba(255, 60, 60, 0.8)',
              border: '1px solid rgba(255, 100, 100, 0.5)',
              boxShadow: '0 0 15px rgba(255, 60, 60, 0.4)',
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onEndCall?.();
            }}
            title="End Call"
          >
            <PhoneOff size={size * 0.12} className="text-white" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const ZoeOrbSonicMode: React.FC<ZoeOrbSonicModeProps> = ({
  isActive,
  size = 'md',
  className,
  onClick,
  callState,
  incomingCall,
  isMuted,
  isSpeaking,
  remoteIsSpeaking,
  connectionQuality,
  onInitiateCall,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  onToggleMute,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const stopSoundRef = useRef<(() => void) | null>(null);
  const config = SIZE_CONFIG[size];

  const isInCall = callState === 'connected' || callState === 'connecting';
  const isIncoming = callState === 'incoming';

  // Get current orb color based on call state
  const getOrbColor = useCallback(() => {
    if (isInCall) return ACTIVE_CALL_COLOR;
    if (isIncoming) return INCOMING_CALL_COLOR;
    return IDLE_COLOR;
  }, [isInCall, isIncoming]);

  // Play incoming call sound
  useEffect(() => {
    if (isIncoming && !stopSoundRef.current) {
      stopSoundRef.current = playIncomingCallSound();
    } else if (!isIncoming && stopSoundRef.current) {
      stopSoundRef.current();
      stopSoundRef.current = null;
    }

    return () => {
      if (stopSoundRef.current) {
        stopSoundRef.current();
        stopSoundRef.current = null;
      }
    };
  }, [isIncoming]);

  // Connection quality indicator color
  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'hsl(120, 70%, 50%)';
      case 'good': return 'hsl(80, 70%, 50%)';
      case 'fair': return 'hsl(45, 80%, 50%)';
      case 'poor': return 'hsl(0, 70%, 50%)';
      default: return 'hsl(var(--muted))';
    }
  };

  return (
    <motion.div
      className={cn('relative cursor-pointer', className)}
      style={{ width: config.size, height: config.size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Outer Glow Ring - Pulses during call states */}
      <div
        className={cn(
          "absolute inset-0 rounded-full",
          isInCall && "animate-gpu-pulse-scale-slow",
          isIncoming && "animate-gpu-pulse-scale-fast"
        )}
        style={{
          background: `radial-gradient(circle, ${getOrbColor()} 0%, transparent 70%)`,
          opacity: isInCall || isIncoming ? undefined : 0,
        }}
      />

      {/* Main Orb Body */}
      <motion.div
        className="absolute inset-1 rounded-full overflow-hidden"
        animate={{
          scale: isSpeaking || remoteIsSpeaking ? [1, 1.03, 1] : 1,
        }}
        transition={{
          duration: 0.15,
          repeat: isSpeaking || remoteIsSpeaking ? Infinity : 0,
        }}
        style={{
          background: `radial-gradient(circle at 30% 30%, ${getOrbColor()}, ${getOrbColor()}88)`,
          boxShadow: `
            0 0 ${isInCall ? 40 : 20}px ${getOrbColor()}60,
            inset 0 0 20px ${getOrbColor()}40
          `,
        }}
      >
        {/* Audio Waveform Visualizer (replaces inner content during call) */}
        <AnimatePresence>
          {isInCall && (
            <AudioWaveformVisualizer
              isActive={isInCall}
              isSpeaking={isSpeaking}
              remoteIsSpeaking={remoteIsSpeaking}
              waveCount={config.waveCount}
            />
          )}
        </AnimatePresence>

        {/* Incoming Call Pulse Effect */}
        <AnimatePresence>
          {isIncoming && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="animate-gpu-incoming-pulse"
                style={{
                  width: '60%',
                  height: '60%',
                  borderRadius: '50%',
                  border: `2px solid ${INCOMING_CALL_COLOR}`,
                }}
              />
              <Phone 
                size={config.iconSize} 
                className="absolute text-white" 
                style={{ filter: 'drop-shadow(0 0 4px white)' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Status Ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2"
        style={{
          borderColor: getOrbColor(),
        }}
        animate={{
          opacity: isInCall ? [0.6, 1, 0.6] : 1,
        }}
        transition={{
          duration: 1,
          repeat: isInCall ? Infinity : 0,
        }}
      />

      {/* Connection Quality Indicator (tiny dot) */}
      {isInCall && (
        <div
          className="absolute rounded-full animate-gpu-pulse-opacity"
          style={{
            width: 6,
            height: 6,
            bottom: 2,
            right: 2,
            backgroundColor: getQualityColor(),
            boxShadow: `0 0 6px ${getQualityColor()}`,
          }}
        />
      )}

      {/* Floating Call Button (4 o'clock position) */}
      <FloatingCallButton
        callState={callState}
        size={config.size}
        onInitiateCall={onInitiateCall}
      />

      {/* Hover Controls (Glassmorphism - shown during active call) */}
      {isInCall && (
        <HoverControls
          isVisible={isHovered}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onEndCall={onEndCall}
          size={config.size}
        />
      )}

      {/* Incoming Call Accept/Reject Buttons */}
      <AnimatePresence>
        {isIncoming && (
          <motion.div
            className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.button
              className="flex items-center justify-center rounded-full"
              style={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, hsl(120, 70%, 45%) 0%, hsl(120, 70%, 35%) 100%)',
                boxShadow: '0 2px 12px rgba(0, 200, 100, 0.5)',
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onAcceptCall?.();
              }}
            >
              <Phone size={16} className="text-white" />
            </motion.button>

            <motion.button
              className="flex items-center justify-center rounded-full"
              style={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, hsl(0, 70%, 50%) 0%, hsl(0, 70%, 40%) 100%)',
                boxShadow: '0 2px 12px rgba(255, 60, 60, 0.5)',
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onRejectCall?.();
              }}
            >
              <PhoneOff size={16} className="text-white" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen reader label */}
      <span className="sr-only">
        Zoe AI - {isInCall ? 'On Call' : isIncoming ? `Incoming call from ${incomingCall?.displayName || 'Unknown'}` : 'Ready'}
      </span>
    </motion.div>
  );
};

export default ZoeOrbSonicMode;
