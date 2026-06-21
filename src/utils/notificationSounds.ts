// Enhanced notification sound system with theme support
import { NotificationThemes, ThemeName, NotificationType } from './notificationThemes';
import { triggerVibration } from './vibrationPatterns';
import { isSoundSuppressed } from '@/lib/platformPurge';

export const NotificationSoundType = {
  POST_LIKE: 'post_like',
  POST_COMMENT: 'post_comment',
  COMMENT_LIKE: 'comment_like',
  COMMENT_REPLY: 'comment_reply',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_request_accepted',
  USER_ONLINE: 'user_online',
  TIER_UPGRADE: 'tier_upgrade',
} as const;

export type NotificationSoundTypeValue = typeof NotificationSoundType[keyof typeof NotificationSoundType];

interface SoundConfig {
  frequencies: number[];
  durations: number[];
  type: OscillatorType;
  volume: number;
}

const soundConfigs: Record<string, SoundConfig> = {
  [NotificationSoundType.POST_LIKE]: {
    frequencies: [800, 1000],
    durations: [0.1, 0.15],
    type: 'sine',
    volume: 0.3,
  },
  [NotificationSoundType.POST_COMMENT]: {
    frequencies: [600, 800, 1000],
    durations: [0.1, 0.1, 0.15],
    type: 'sine',
    volume: 0.35,
  },
  [NotificationSoundType.COMMENT_LIKE]: {
    frequencies: [900, 1100],
    durations: [0.08, 0.12],
    type: 'sine',
    volume: 0.28,
  },
  [NotificationSoundType.COMMENT_REPLY]: {
    frequencies: [700, 900, 1100],
    durations: [0.09, 0.09, 0.14],
    type: 'sine',
    volume: 0.32,
  },
  [NotificationSoundType.FRIEND_REQUEST]: {
    frequencies: [523, 659, 784],
    durations: [0.15, 0.15, 0.2],
    type: 'sine',
    volume: 0.4,
  },
  [NotificationSoundType.FRIEND_ACCEPTED]: {
    frequencies: [523, 659, 784, 1047],
    durations: [0.12, 0.12, 0.12, 0.25],
    type: 'sine',
    volume: 0.42,
  },
  [NotificationSoundType.USER_ONLINE]: {
    frequencies: [440, 554],
    durations: [0.1, 0.15],
    type: 'triangle',
    volume: 0.3,
  },
  [NotificationSoundType.TIER_UPGRADE]: {
    frequencies: [523, 659, 784, 1047, 1319],
    durations: [0.1, 0.1, 0.1, 0.1, 0.3],
    type: 'sine',
    volume: 0.45,
  },
};

export const playNotificationSound = async (
  notificationType: string,
  customVolume?: number,
  customUrl?: string
) => {
  // Check if sounds are suppressed (after platform purge)
  if (isSoundSuppressed()) {
    console.debug('[NotificationSounds] Sounds suppressed after platform purge');
    return;
  }

  // Initialize audio context on first interaction
  initializeAudio();
  
  // Check preferences (default to enabled if not set)
  const prefs = localStorage.getItem('notification_preferences');
  if (prefs) {
    try {
      const preferences = JSON.parse(prefs);
      
      // Check master sound toggle (only disable if explicitly set to false)
      if (preferences.sound_enabled === false) {
        console.log('[NotificationSounds] Master sound disabled');
        return;
      }
      
      // Check individual sound preference based on notification type
      const soundKey = `sound_${notificationType}`;
      if (notificationType && preferences[soundKey] === false) {
        console.log(`[NotificationSounds] Sound disabled for type: ${notificationType}`);
        return;
      }
    } catch (error) {
      console.warn('[NotificationSounds] Error parsing preferences, continuing with sound:', error);
    }
  }

  // Check for custom sound URL
  if (customUrl) {
    try {
      const audio = new Audio(customUrl);
      audio.volume = customVolume ?? 0.7;
      await audio.play();
      return;
    } catch (error) {
      console.warn('Failed to play custom sound, falling back to generated sound:', error);
    }
  }

  // Get notification settings for theme and volume
  const settings = localStorage.getItem('notification_settings');
  let theme: ThemeName = 'classic';
  let volume = customVolume ?? 0.7;

  if (settings) {
    const parsedSettings = JSON.parse(settings);
    theme = parsedSettings.sound_theme || 'classic';
    
    // Apply adaptive volume if enabled
    if (parsedSettings.adaptive_volume_enabled && !customVolume) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
      
      const daytime = parsedSettings.daytime_start || '08:00:00';
      const evening = parsedSettings.evening_start || '18:00:00';
      const night = parsedSettings.night_start || '22:00:00';
      
      if (currentTime >= night || currentTime < parsedSettings.quiet_hours_end) {
        volume = parsedSettings.night_volume || 0.2;
      } else if (currentTime >= evening) {
        volume = parsedSettings.evening_volume || 0.5;
      } else if (currentTime >= daytime) {
        volume = parsedSettings.daytime_volume || 0.8;
      }
    }

    // Check quiet hours
    if (parsedSettings.quiet_hours_enabled) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
      const start = parsedSettings.quiet_hours_start;
      const end = parsedSettings.quiet_hours_end;
      
      const isQuietHours = start < end 
        ? (currentTime >= start && currentTime < end)
        : (currentTime >= start || currentTime < end);
      
      if (isQuietHours) return; // Don't play sound during quiet hours
    }

    // Trigger vibration if enabled
    if (parsedSettings.vibration_enabled) {
      const patterns = parsedSettings.vibration_patterns || {};
      triggerVibration(patterns[notificationType] || notificationType);
    }
  }

  // Get the sound config from theme
  const themeConfig = NotificationThemes[theme];
  const soundConfig = themeConfig?.sounds[notificationType as NotificationType];
  
  if (!soundConfig) {
    // Fallback to classic theme
    const fallbackConfig = NotificationThemes.classic.sounds[notificationType as NotificationType];
    if (fallbackConfig) {
      generateSound({ ...fallbackConfig, volume: 0.3 }, volume);
    }
    return;
  }

  generateSound({ ...soundConfig, volume: 0.3 }, volume);
};

export const previewNotificationSound = (notificationType: string) => {
  const config = soundConfigs[notificationType] || soundConfigs[NotificationSoundType.POST_LIKE];
  generateSound(config);
};

// Global audio context to handle browser autoplay policies
let globalAudioContext: AudioContext | null = null;
let audioEnabled = false;

// Initialize audio context on user interaction
export const initializeAudio = () => {
  if (!globalAudioContext) {
    try {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioEnabled = true;
      console.log('[NotificationSounds] Audio context initialized');
    } catch (error) {
      console.warn('[NotificationSounds] Failed to initialize audio context:', error);
    }
  }
  
  // Resume if suspended (required by some browsers)
  if (globalAudioContext?.state === 'suspended') {
    globalAudioContext.resume().then(() => {
      audioEnabled = true;
      console.log('[NotificationSounds] Audio context resumed');
    });
  }
  
  return audioEnabled;
};

const generateSound = (config: SoundConfig, masterVolume: number = 0.7) => {
  try {
    // Initialize audio if not already done
    if (!globalAudioContext) {
      initializeAudio();
    }
    
    if (!globalAudioContext || globalAudioContext.state === 'suspended') {
      console.warn('[NotificationSounds] Audio context not ready, skipping sound');
      return;
    }
    
    const audioContext = globalAudioContext;
    const masterGain = audioContext.createGain();
    masterGain.gain.value = config.volume * masterVolume;
    masterGain.connect(audioContext.destination);

    let startTime = audioContext.currentTime;

    config.frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = config.type;
      oscillator.frequency.value = freq;

      // Envelope for smooth attack and release
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(1, startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(1, startTime + config.durations[index] - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + config.durations[index]);

      oscillator.connect(gainNode);
      gainNode.connect(masterGain);

      oscillator.start(startTime);
      oscillator.stop(startTime + config.durations[index]);

      startTime += config.durations[index];
    });
  } catch (error) {
    console.warn('[NotificationSounds] Failed to play notification sound:', error);
  }
};

export const getSoundDescription = (notificationType: string): string => {
  const descriptions: Record<string, string> = {
    [NotificationSoundType.POST_LIKE]: 'Gentle chime - Double note',
    [NotificationSoundType.POST_COMMENT]: 'Soft bell - Triple note',
    [NotificationSoundType.COMMENT_LIKE]: 'Light ding - Quick double',
    [NotificationSoundType.COMMENT_REPLY]: 'Reply tone - Triple note',
    [NotificationSoundType.FRIEND_REQUEST]: 'Friendly alert - Rising chord',
    [NotificationSoundType.FRIEND_ACCEPTED]: 'Success chime - Four notes',
    [NotificationSoundType.USER_ONLINE]: 'Presence tone - Warm double',
    [NotificationSoundType.TIER_UPGRADE]: 'Achievement fanfare - Five notes',
  };
  
  return descriptions[notificationType] || 'Default notification sound';
};
