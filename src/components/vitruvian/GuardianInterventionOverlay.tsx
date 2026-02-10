/**
 * GUARDIAN INTERVENTION OVERLAY
 * "System Overheat. Initiating cooldown. Close your eyes."
 * Full-screen calming intervention when stress is critical
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Heart, Wind, Moon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { guardianAngel, type HealthPrediction } from '@/services/ZoeGuardianAngel';

interface InterventionData {
  level: 'suggest' | 'notify' | 'gentle' | 'override';
  prediction: HealthPrediction;
  bio: any;
  timestamp: number;
}

export const GuardianInterventionOverlay: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [intervention, setIntervention] = useState<InterventionData | null>(null);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathCount, setBreathCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Listen for intervention events
  useEffect(() => {
    const handleIntervention = (event: CustomEvent<InterventionData>) => {
      const data = event.detail;
      if (data.level === 'override' || data.level === 'gentle') {
        setIntervention(data);
        setIsActive(true);
        startBreathingCycle();
        playBinauralBeats();
      }
    };

    const handleInterventionEnd = () => {
      setIsActive(false);
      setIntervention(null);
      stopBinauralBeats();
    };

    window.addEventListener('guardian-intervention', handleIntervention as EventListener);
    window.addEventListener('guardian-intervention-end', handleInterventionEnd);

    return () => {
      window.removeEventListener('guardian-intervention', handleIntervention as EventListener);
      window.removeEventListener('guardian-intervention-end', handleInterventionEnd);
    };
  }, []);

  // 4-7-8 Breathing cycle
  const startBreathingCycle = () => {
    let cycle = 0;
    const maxCycles = 5;

    const runCycle = () => {
      if (cycle >= maxCycles) return;

      // Inhale (4 seconds)
      setBreathPhase('inhale');
      setTimeout(() => {
        // Hold (7 seconds)
        setBreathPhase('hold');
        setTimeout(() => {
          // Exhale (8 seconds)
          setBreathPhase('exhale');
          setTimeout(() => {
            cycle++;
            setBreathCount(cycle);
            if (cycle < maxCycles) {
              runCycle();
            }
          }, 8000);
        }, 7000);
      }, 4000);
    };

    runCycle();
  };

  // Binaural beats audio (simulated with Web Audio API)
  const playBinauralBeats = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      
      // Create binaural beat effect (theta waves: 4-8 Hz for relaxation)
      const leftOscillator = audioContext.createOscillator();
      const rightOscillator = audioContext.createOscillator();
      const leftGain = audioContext.createGain();
      const rightGain = audioContext.createGain();
      const merger = audioContext.createChannelMerger(2);

      leftOscillator.frequency.value = 200; // Base frequency
      rightOscillator.frequency.value = 206; // 6Hz difference = theta waves

      leftGain.gain.value = 0.1;
      rightGain.gain.value = 0.1;

      leftOscillator.connect(leftGain);
      rightOscillator.connect(rightGain);
      leftGain.connect(merger, 0, 0);
      rightGain.connect(merger, 0, 1);
      merger.connect(audioContext.destination);

      leftOscillator.start();
      rightOscillator.start();

      // Store for cleanup
      (audioRef as any).current = {
        context: audioContext,
        oscillators: [leftOscillator, rightOscillator],
      };
    } catch (error) {
      console.log('[GuardianIntervention] Audio not available:', error);
    }
  };

  const stopBinauralBeats = () => {
    try {
      const audio = (audioRef as any).current;
      if (audio) {
        audio.oscillators.forEach((osc: OscillatorNode) => osc.stop());
        audio.context.close();
        (audioRef as any).current = null;
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  const handleDismiss = () => {
    guardianAngel.endIntervention();
    setIsActive(false);
    stopBinauralBeats();
  };

  const getBreathInstruction = () => {
    switch (breathPhase) {
      case 'inhale': return 'Breathe in...';
      case 'hold': return 'Hold...';
      case 'exhale': return 'Breathe out slowly...';
    }
  };

  const getBreathDuration = () => {
    switch (breathPhase) {
      case 'inhale': return 4;
      case 'hold': return 7;
      case 'exhale': return 8;
    }
  };

  if (!isActive || !intervention) return null;

  const isOverride = intervention.level === 'override';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 2 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          background: isOverride 
            ? 'linear-gradient(180deg, #0a1628 0%, #1a3a5c 50%, #0d2137 100%)'
            : 'linear-gradient(180deg, rgba(10, 22, 40, 0.95) 0%, rgba(26, 58, 92, 0.9) 100%)',
        }}
      >
        {/* Ambient particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-gpu-float-particle-1"
              style={{ 
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${8 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>

        {/* Central breathing guide */}
        <div className="relative flex flex-col items-center">
          {/* Breathing circle */}
          <motion.div
            className="relative w-64 h-64 rounded-full flex items-center justify-center"
            animate={{
              scale: breathPhase === 'inhale' ? 1.3 : breathPhase === 'hold' ? 1.3 : 1,
              boxShadow: breathPhase === 'inhale' 
                ? '0 0 60px rgba(0, 200, 255, 0.4), inset 0 0 40px rgba(0, 200, 255, 0.2)'
                : breathPhase === 'hold'
                ? '0 0 80px rgba(0, 200, 255, 0.5), inset 0 0 50px rgba(0, 200, 255, 0.3)'
                : '0 0 30px rgba(0, 200, 255, 0.2), inset 0 0 20px rgba(0, 200, 255, 0.1)',
            }}
            transition={{ 
              duration: getBreathDuration(),
              ease: 'easeInOut'
            }}
            style={{
              background: 'radial-gradient(circle, rgba(0, 100, 150, 0.3) 0%, transparent 70%)',
              border: '2px solid rgba(0, 200, 255, 0.3)',
            }}
          >
            {/* Inner glow */}
            <motion.div
              className="absolute inset-8 rounded-full"
              animate={{
                opacity: breathPhase === 'hold' ? 0.8 : 0.4,
              }}
              style={{
                background: 'radial-gradient(circle, rgba(0, 200, 255, 0.3) 0%, transparent 70%)',
              }}
            />
            
            {/* Center icon */}
            <motion.div
              animate={{ 
                scale: breathPhase === 'inhale' ? 1.2 : 1,
                rotate: breathPhase === 'exhale' ? 180 : 0,
              }}
              transition={{ duration: getBreathDuration() }}
            >
              {breathPhase === 'inhale' && <Wind className="w-16 h-16 text-cyan-400" />}
              {breathPhase === 'hold' && <Moon className="w-16 h-16 text-cyan-300" />}
              {breathPhase === 'exhale' && <Heart className="w-16 h-16 text-cyan-400" />}
            </motion.div>
          </motion.div>

          {/* Zoe's voice message */}
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-400/80 text-sm font-medium tracking-widest uppercase">
                Zoe Guardian Protocol
              </span>
            </div>
            
            <motion.h2
              key={breathPhase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-3xl font-light text-white mb-2"
            >
              {getBreathInstruction()}
            </motion.h2>
            
            <p className="text-cyan-300/60 text-lg">
              {intervention.prediction.message}
            </p>

            <div className="mt-6 text-cyan-400/40 text-sm">
              Cycle {breathCount + 1} of 5
            </div>
          </motion.div>

          {/* Audio indicator */}
          <motion.div
            className="mt-8 flex items-center gap-2 text-cyan-400/50 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 bg-cyan-400/50 rounded-full animate-gpu-audio-bar-${(i % 4) + 1}`}
                  style={{ height: 12 }}
                />
              ))}
            </div>
            <span>Binaural Theta Waves Active</span>
          </motion.div>

          {/* Dismiss button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 5 }}
            className="mt-12"
          >
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-400/10 border border-cyan-400/20"
            >
              <X className="w-4 h-4 mr-2" />
              I'm feeling better
            </Button>
          </motion.div>
        </div>

        {/* Bottom status */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
        >
          <p className="text-cyan-400/40 text-xs">
            Low-priority notifications paused • Guardian Angel active
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuardianInterventionOverlay;
