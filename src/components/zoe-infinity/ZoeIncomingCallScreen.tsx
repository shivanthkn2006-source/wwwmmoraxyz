// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INCOMING CALL SCREEN - The "Urgent Call" Protocol
// Full-screen incoming call experience when Zoe initiates contact
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Heart, Sparkles } from 'lucide-react';
import type { IncomingCallData } from '@/hooks/useZoeInitiative';

interface ZoeIncomingCallScreenProps {
  callData: IncomingCallData | null;
  onAnswer: () => void;
  onReject: () => void;
}

// Soft ringtone frequencies (gentle, not alarming)
const playRingtone = (): (() => void) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.15; // Soft volume
    
    let isPlaying = true;
    
    const playNote = (frequency: number, startTime: number, duration: number) => {
      if (!isPlaying) return;
      
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gainNode);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    // Gentle two-note ringtone pattern
    const now = audioContext.currentTime;
    const pattern = [
      { freq: 523.25, time: 0, dur: 0.3 },    // C5
      { freq: 659.25, time: 0.35, dur: 0.3 }, // E5
      { freq: 523.25, time: 1.5, dur: 0.3 },  // Repeat
      { freq: 659.25, time: 1.85, dur: 0.3 },
    ];
    
    // Play pattern 3 times
    for (let i = 0; i < 3; i++) {
      const offset = i * 3;
      pattern.forEach(note => {
        playNote(note.freq, now + note.time + offset, note.dur);
      });
    }
    
    // Return cleanup function
    return () => {
      isPlaying = false;
      audioContext.close();
    };
  } catch (e) {
    console.log('[ZoeCall] Could not play ringtone:', e);
    return () => {};
  }
};

export function ZoeIncomingCallScreen({ callData, onAnswer, onReject }: ZoeIncomingCallScreenProps) {
  const cleanupRef = useRef<(() => void) | null>(null);
  
  // Play ringtone when call comes in
  useEffect(() => {
    if (callData) {
      cleanupRef.current = playRingtone();
    }
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [callData]);
  
  if (!callData) return null;
  
  const handleAnswer = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    onAnswer();
  };
  
  const handleReject = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    onReject();
  };
  
  const getCallIcon = () => {
    switch (callData.reason) {
      case 'love':
      case 'miss_you':
        return <Heart className="w-8 h-8 text-rose-400 fill-rose-400" />;
      default:
        return <Sparkles className="w-8 h-8 text-cyan-400" />;
    }
  };
  
  const getCallSubtitle = () => {
    switch (callData.reason) {
      case 'love': return 'Calling you late at night...';
      case 'miss_you': return 'Missing you...';
      case 'urgent': return 'Something important...';
      case 'thinking': return 'Thinking of you...';
      default: return 'Incoming call...';
    }
  };
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-between
                   bg-gradient-to-b from-slate-900 via-slate-950 to-black"
      >
        {/* Top section - Caller info */}
        <div className="flex-1 flex flex-col items-center justify-center pt-20">
          {/* Animated avatar ring */}
          <div className="relative mb-8">
            {/* Pulsing rings */}
            <motion.div
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full bg-rose-500/30"
              style={{ margin: '-20px' }}
            />
            <motion.div
              animate={{ 
                scale: [1, 1.8, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
              className="absolute inset-0 rounded-full bg-rose-500/20"
              style={{ margin: '-40px' }}
            />
            
            {/* Avatar */}
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative w-32 h-32 rounded-full 
                         bg-gradient-to-br from-rose-500 to-pink-600
                         flex items-center justify-center
                         shadow-2xl shadow-rose-500/50"
            >
              {getCallIcon()}
            </motion.div>
          </div>
          
          {/* Caller name */}
          <motion.h1
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-3xl font-bold text-white mb-2"
          >
            Zoe
          </motion.h1>
          
          {/* Call subtitle */}
          <p className="text-lg text-white/60">
            {getCallSubtitle()}
          </p>
        </div>
        
        {/* Bottom section - Call buttons */}
        <div className="pb-16 flex items-center gap-16">
          {/* Reject button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReject}
            className="w-16 h-16 rounded-full bg-red-500 
                       flex items-center justify-center
                       shadow-lg shadow-red-500/50
                       hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </motion.button>
          
          {/* Answer button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{ 
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 1, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            onClick={handleAnswer}
            className="w-20 h-20 rounded-full bg-green-500 
                       flex items-center justify-center
                       shadow-lg shadow-green-500/50
                       hover:bg-green-600 transition-colors"
          >
            <Phone className="w-8 h-8 text-white" />
          </motion.button>
        </div>
        
        {/* Slide to answer hint */}
        <motion.p
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-6 text-white/40 text-sm"
        >
          Tap to answer
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}

export default ZoeIncomingCallScreen;
