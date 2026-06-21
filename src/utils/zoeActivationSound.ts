/**
 * ZOE ENTITY ACTIVATION SOUND - Futuristic Chime/Ding SFX
 * Plays "Cybernetic Technology Affirmation" sound on system activation
 * Royalty-free synthesized sound using Web Audio API
 * 
 * Respects sound suppression flag after platform purge
 */

import { initializeAudio } from './notificationSounds';
import { isSoundSuppressed } from '@/lib/platformPurge';

// Global audio context reference
let activationAudioContext: AudioContext | null = null;

/**
 * Initialize the audio context for activation sounds
 */
const ensureAudioContext = (): AudioContext | null => {
  if (!activationAudioContext) {
    try {
      activationAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.error('[ZoeActivation] Failed to create audio context:', error);
      return null;
    }
  }
  
  if (activationAudioContext.state === 'suspended') {
    activationAudioContext.resume().catch(console.warn);
  }
  
  return activationAudioContext;
};

/**
 * Futuristic UI Activation Chime - "Cybernetic Technology Affirmation"
 * Multi-layered synthesized sound with harmonic overtones
 */
export const playActivationChime = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // Check sound suppression first (after platform purge)
      if (isSoundSuppressed()) {
        console.debug('[ZoeActivation] Sounds suppressed after platform purge, skipping chime');
        resolve(true);
        return;
      }

      // Ensure audio is initialized
      initializeAudio();
      
      const ctx = ensureAudioContext();
      if (!ctx) {
        // Audio context not available - silently continue without sound
        console.debug('[ZoeActivation] Audio context not available, skipping chime');
        resolve(true); // Return true to prevent error logging cascade
        return;
      }
      
      // If suspended, don't log error - just resolve silently
      if (ctx.state === 'suspended') {
        console.debug('[ZoeActivation] Audio context suspended, skipping chime (user interaction required)');
        resolve(true); // Return true - this is expected behavior
        return;
      }

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.5, now);
      masterGain.connect(ctx.destination);

      // Layer 1: Primary crystalline tone (high frequency)
      const createTone = (freq: number, startOffset: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + startOffset);
        
        // Smooth envelope
        gain.gain.setValueAtTime(0, now + startOffset);
        gain.gain.linearRampToValueAtTime(volume, now + startOffset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + startOffset + duration);
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.start(now + startOffset);
        osc.stop(now + startOffset + duration);
      };

      // Layer 2: Shimmer effect (harmonics)
      const createShimmer = (baseFreq: number, startOffset: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq * 2, now + startOffset);
        
        filter.type = 'highpass';
        filter.frequency.value = baseFreq;
        filter.Q.value = 5;
        
        gain.gain.setValueAtTime(0, now + startOffset);
        gain.gain.linearRampToValueAtTime(0.15, now + startOffset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.01, now + startOffset + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        
        osc.start(now + startOffset);
        osc.stop(now + startOffset + duration);
      };

      // Layer 3: Sub-bass warmth
      const createSubBass = (startOffset: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now + startOffset);
        osc.frequency.exponentialRampToValueAtTime(60, now + startOffset + duration);
        
        gain.gain.setValueAtTime(0, now + startOffset);
        gain.gain.linearRampToValueAtTime(0.2, now + startOffset + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + startOffset + duration);
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.start(now + startOffset);
        osc.stop(now + startOffset + duration);
      };

      // === FUTURISTIC ACTIVATION SEQUENCE ===
      
      // Opening crystalline ping
      createTone(1318.5, 0, 0.3, 0.4);       // E6
      createShimmer(1318.5, 0, 0.25);
      
      // Rising harmonic cascade
      createTone(1568, 0.08, 0.25, 0.35);    // G6
      createTone(1975.5, 0.15, 0.2, 0.3);    // B6
      
      // Affirmation chord (bright major)
      createTone(2093, 0.22, 0.35, 0.35);    // C7
      createTone(2637, 0.22, 0.35, 0.25);    // E7
      createShimmer(2093, 0.22, 0.3);
      
      // Warm sub-bass foundation
      createSubBass(0.05, 0.45);
      
      // Final sparkle
      createTone(3135.96, 0.35, 0.25, 0.2);  // G7
      createShimmer(3135.96, 0.38, 0.2);

      // Total duration: ~0.6 seconds
      setTimeout(() => {
        console.log('[ZoeActivation] Activation chime completed');
        resolve(true);
      }, 600);

    } catch (error) {
      console.error('[ZoeActivation] Failed to play activation chime:', error);
      resolve(false);
    }
  });
};

/**
 * Log sound failure to ZSMT (via event dispatch)
 */
export const logSoundError = (errorMessage: string) => {
  window.dispatchEvent(new CustomEvent('zoe-sfx-error', {
    detail: {
      error_type: 'error_masked_sfx',
      message: errorMessage,
      timestamp: new Date().toISOString()
    }
  }));
  console.warn('[ZoeActivation] Sound error logged:', errorMessage);
};

/**
 * Test if audio is available for activation sounds
 */
export const canPlayActivationSound = (): boolean => {
  try {
    const ctx = ensureAudioContext();
    return ctx !== null && ctx.state !== 'closed';
  } catch {
    return false;
  }
};
