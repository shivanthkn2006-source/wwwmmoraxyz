/**
 * DAILY ALIGNMENT RITUAL
 * The velvet rope - locks screen on first daily visit
 * Deep prompts for intention setting with dopamine payoff
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Mic, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isSoundSuppressed } from '@/lib/platformPurge';

interface DailyAlignmentRitualProps {
  onComplete: () => void;
}

const DEEP_PROMPTS = [
  "What is your prime directive today?",
  "Who do you want to become?",
  "What truth will you embrace today?",
  "What fear will you transform into power?",
  "What connection will you nurture today?",
  "What legacy will you build today?",
  "What impossible thing will you attempt?",
  "What version of yourself will emerge today?",
  "What wisdom will guide your actions?",
  "What dream takes one step closer today?"
];

export const DailyAlignmentRitual: React.FC<DailyAlignmentRitualProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<'orb' | 'question' | 'input' | 'payoff'>('orb');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [userResponse, setUserResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  // Select random prompt on mount
  useEffect(() => {
    const randomPrompt = DEEP_PROMPTS[Math.floor(Math.random() * DEEP_PROMPTS.length)];
    setSelectedPrompt(randomPrompt);
    
    // Transition from orb to question after delay
    const timer = setTimeout(() => setPhase('question'), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Play activation sound
  const playSound = useCallback((type: 'sync' | 'complete') => {
    // Check sound suppression first (after platform purge)
    if (isSoundSuppressed()) {
      console.debug('[DailyAlignment] Sounds suppressed after platform purge');
      return;
    }
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'sync') {
        // "Thx" server sync sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
      } else {
        // Completion chord
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, audioContext.currentTime + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + i * 0.08 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.08 + 0.5);
          osc.start(audioContext.currentTime + i * 0.08);
          osc.stop(audioContext.currentTime + i * 0.08 + 0.6);
        });
      }
    } catch (e) {
      console.warn('Audio not available');
    }
  }, []);

  const handleSubmit = async () => {
    if (!userResponse.trim() || !user) return;

    // Play sync sound
    playSound('sync');
    
    // Show particle explosion
    setShowParticles(true);
    setPhase('payoff');

    // Save to contextual memory with robust upsert
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // First try to get existing record
      const { data: memory } = await supabase
        .from('zoe_contextual_memory')
        .select('key_decisions')
        .eq('user_id', user.id)
        .maybeSingle();

      const keyDecisions = (memory?.key_decisions as Record<string, any>) || {};
      
      keyDecisions[`daily_alignment_${today}`] = {
        prompt: selectedPrompt,
        response: userResponse,
        timestamp: new Date().toISOString()
      };

      if (memory) {
        // Update existing record
        await supabase
          .from('zoe_contextual_memory')
          .update({ key_decisions: keyDecisions })
          .eq('user_id', user.id);
      } else {
        // Insert new record
        await supabase
          .from('zoe_contextual_memory')
          .insert({ 
            user_id: user.id, 
            key_decisions: keyDecisions,
            conversation_topics: [],
            unresolved_topics: [],
            successful_interactions: [],
            failed_interactions: []
          });
      }
    } catch (error) {
      console.error('Failed to save alignment:', error);
    }

    // Play completion sound after delay
    setTimeout(() => playSound('complete'), 500);

    // Complete after animation
    setTimeout(() => {
      onComplete();
    }, 3000);
  };

  const handleVoiceInput = () => {
    setIsListening(true);
    
    // Pause wake-word detection while voice input is active
    window.dispatchEvent(new CustomEvent('zoe-voice-input-start'));
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsListening(false);
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setUserResponse(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
    };
    
    recognition.onend = () => {
      setIsListening(false);
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
    };

    recognition.start();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
    >
      <AnimatePresence mode="wait">
        {/* Phase 1: Pulsing Orb */}
        {phase === 'orb' && (
          <motion.div
            key="orb"
            className="relative"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Outer glow rings - GPU accelerated */}
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full border border-amber-400/30 animate-gpu-ring-expand"
                style={{
                  '--ring-delay': `${i * 0.3}s`,
                  transform: `scale(${1.5 + i * 0.5})`,
                } as React.CSSProperties}
              />
            ))}
            
            {/* Core orb - GPU accelerated */}
            <div
              className="w-40 h-40 rounded-full animate-gpu-orb-scale-pulse"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #FFD700, #DAA520, #B8860B)',
                boxShadow: '0 0 60px rgba(255, 215, 0, 0.5), 0 0 120px rgba(255, 215, 0, 0.3), inset 0 0 40px rgba(255, 255, 255, 0.3)'
              }}
            />
          </motion.div>
        )}

        {/* Phase 2: Question Display */}
        {phase === 'question' && (
          <motion.div
            key="question"
            className="text-center max-w-2xl px-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
          >
            {/* Small orb - GPU accelerated */}
            <div
              className="w-20 h-20 mx-auto mb-8 rounded-full animate-gpu-orb-scale-pulse"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #FFD700, #DAA520)',
                boxShadow: '0 0 40px rgba(255, 215, 0, 0.4)'
              }}
            />

            {/* The Question */}
            <motion.h1
              className="text-3xl md:text-4xl font-light mb-12"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                color: '#FFD700',
                textShadow: '0 0 20px rgba(255, 215, 0, 0.5)'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {selectedPrompt}
            </motion.h1>

            {/* Proceed button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={() => setPhase('input')}
                className="bg-transparent border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 px-8 py-3"
              >
                Align My Consciousness
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Phase 3: Input */}
        {phase === 'input' && (
          <motion.div
            key="input"
            className="w-full max-w-xl px-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* Question reminder */}
            <p
              className="text-center text-amber-400/70 mb-6 text-lg"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              {selectedPrompt}
            </p>

            {/* Glass input field */}
            <div className="relative mb-6">
              <textarea
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                placeholder="Speak your truth..."
                className={cn(
                  "w-full h-32 p-4 rounded-lg resize-none",
                  "bg-white/5 backdrop-blur-sm border border-amber-500/30",
                  "text-white placeholder-white/40",
                  "focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30",
                  "transition-all duration-300"
                )}
                style={{ fontFamily: "'Share Tech Mono', monospace" }}
              />
              
              {/* Glow effect */}
              <div 
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  boxShadow: 'inset 0 0 20px rgba(255, 215, 0, 0.1)'
                }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={handleVoiceInput}
                disabled={isListening}
                className={cn(
                  "bg-transparent border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10",
                  isListening && "animate-pulse bg-cyan-500/20"
                )}
              >
                <Mic className="w-5 h-5 mr-2" />
                {isListening ? 'Listening...' : 'Voice'}
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!userResponse.trim()}
                className="bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500 hover:to-amber-400 disabled:opacity-50"
              >
                <Send className="w-5 h-5 mr-2" />
                Align
              </Button>
            </div>
          </motion.div>
        )}

        {/* Phase 4: Payoff - Particle Explosion */}
        {phase === 'payoff' && (
          <motion.div
            key="payoff"
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Particle explosion */}
            <div className="relative w-60 h-60 mx-auto">
              {showParticles && [...Array(40)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-amber-400"
                  style={{
                    left: '50%',
                    top: '50%',
                    boxShadow: '0 0 10px rgba(255, 215, 0, 0.8)'
                  }}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    scale: 0,
                    opacity: 0
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.02,
                    ease: 'easeOut'
                  }}
                />
              ))}
            </div>

            {/* Success message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <Sparkles className="w-12 h-12 mx-auto text-amber-400 mb-4" />
              <h2
                className="text-2xl font-light text-amber-400 mb-2"
                style={{ 
                  fontFamily: "'Orbitron', sans-serif",
                  textShadow: '0 0 20px rgba(255, 215, 0, 0.5)'
                }}
              >
                System Aligned
              </h2>
              <p className="text-white/60" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                I am with you.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DailyAlignmentRitual;
