/**
 * UNIVERSAL TIMELINE NOTIFICATION SOUNDS
 * Ultra-rich, cosmic-themed notification sounds for timeline activities
 * Respects sound suppression after platform purge
 */

import { isSoundSuppressed } from '@/lib/platformPurge';
export type TimelineActivityType = 
  | 'content_added'
  | 'content_edited'
  | 'content_removed'
  | 'threshold_explored'
  | 'future_proposal_analyzed'
  | 'content_shared';

interface CosmicSoundConfig {
  frequencies: number[];
  durations: number[];
  type: OscillatorType;
  volume: number;
  delay?: number;
}

const timelineSoundConfigs: Record<TimelineActivityType, CosmicSoundConfig> = {
  content_added: {
    frequencies: [523.25, 659.25, 783.99, 1046.50], // C5, E5, G5, C6 - ascending celestial
    durations: [100, 100, 100, 200],
    type: 'sine',
    volume: 0.4,
  },
  content_edited: {
    frequencies: [880, 987.77, 880], // A5, B5, A5 - editing pulse
    durations: [80, 120, 100],
    type: 'triangle',
    volume: 0.35,
  },
  content_removed: {
    frequencies: [1046.50, 783.99, 523.25], // C6, G5, C5 - descending fade
    durations: [100, 100, 150],
    type: 'sine',
    volume: 0.3,
  },
  threshold_explored: {
    frequencies: [261.63, 329.63, 392.00, 523.25, 659.25], // C4 to E5 - discovery ascension
    durations: [120, 120, 120, 120, 250],
    type: 'sine',
    volume: 0.45,
  },
  future_proposal_analyzed: {
    frequencies: [1046.50, 1318.51, 1567.98, 2093.00], // C6 to C7 - AI thinking high tones
    durations: [150, 150, 150, 300],
    type: 'square',
    volume: 0.35,
  },
  content_shared: {
    frequencies: [523.25, 698.46, 880, 1174.66], // C5, F5, A5, D6 - sharing spread
    durations: [100, 100, 100, 200],
    type: 'triangle',
    volume: 0.4,
  },
};

let audioContext: AudioContext | null = null;

const initializeAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

export const playTimelineNotificationSound = async (activityType: TimelineActivityType) => {
  // Check sound suppression first (after platform purge)
  if (isSoundSuppressed()) {
    console.debug('[TimelineSounds] Sounds suppressed after platform purge');
    return;
  }
  
  try {
    const context = initializeAudioContext();
    const config = timelineSoundConfigs[activityType];
    
    let currentTime = context.currentTime;
    
    config.frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(frequency, currentTime);
      
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(config.volume, currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + config.durations[index] / 1000);
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start(currentTime);
      oscillator.stop(currentTime + config.durations[index] / 1000);
      
      currentTime += (config.durations[index] / 1000) + (config.delay || 0);
    });
    
  } catch (error) {
    console.error('Timeline notification sound error:', error);
  }
};

export const getActivityDescription = (activityType: TimelineActivityType): string => {
  const descriptions: Record<TimelineActivityType, string> = {
    content_added: 'New cosmic content added',
    content_edited: 'Timeline content updated',
    content_removed: 'Content removed from timeline',
    threshold_explored: 'New threshold discovered',
    future_proposal_analyzed: 'Future proposal analyzed by Zoe',
    content_shared: 'Timeline content shared',
  };
  return descriptions[activityType];
};
