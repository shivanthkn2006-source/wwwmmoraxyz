// Enhanced notification sound system with theme support
import { NotificationThemes, ThemeName, NotificationType } from './notificationThemes';
import { triggerVibration } from './vibrationPatterns';
import { isSoundSuppressed } from '@/lib/platformPurge';
import { effectiveNotificationVolume, isNotificationMuted } from '@/lib/notificationVolume';

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
  // Default is FULL volume for every user unless they lowered / muted it.
  if (isNotificationMuted()) return;
  let volume = customVolume ?? effectiveNotificationVolume();

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
    const fallbackConfig = NotificationThemes.classic.sounds[notificationType as NotificationType]
      || soundConfigs[notificationType]
      || soundConfigs[NotificationSoundType.POST_LIKE];
    generateSound({ ...fallbackConfig, volume: fallbackConfig.volume ?? 0.3 }, volume);
    return;
  }

  generateSound({ ...soundConfig, volume: 0.3 }, volume);
};

export const previewNotificationSound = (notificationType: string) => {
  const config = soundConfigs[notificationType] || soundConfigs[NotificationSoundType.POST_LIKE];
  generateSound(config, effectiveNotificationVolume());
};

/** Milliseconds between the incoming cue and the notification itself. */
export const INCOMING_CUE_LEAD_MS = 700;

/**
 * Short rising "something is arriving" cue played BEFORE a notification is
 * shown, so the user learns the sound means an alert is about to appear.
 * Honours the same suppression / master-mute / quiet-hours rules as alerts.
 */
export const playIncomingCue = (customVolume?: number) => {
  if (isSoundSuppressed()) return false;
  if (isNotificationMuted()) return false;
  initializeAudio();

  try {
    const prefs = localStorage.getItem('notification_preferences');
    if (prefs && JSON.parse(prefs).sound_enabled === false) return false;

    const settings = localStorage.getItem('notification_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.quiet_hours_enabled) {
        const now = new Date();
        const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
        const start = parsed.quiet_hours_start;
        const end = parsed.quiet_hours_end;
        const quiet = start < end ? current >= start && current < end : current >= start || current < end;
        if (quiet) return false;
      }
    }
  } catch { /* malformed preferences must never mute the user */ }

  generateSound(
    { frequencies: [784, 1175], durations: [0.08, 0.12], type: 'sine', volume: 0.28 },
    customVolume ?? effectiveNotificationVolume()
  );
  return true;
};


// Global audio context to handle browser autoplay policies
let globalAudioContext: AudioContext | null = null;
let audioEnabled = false;
export const NOTIFICATION_AUDIO_STATE_EVENT = 'mmora:notification-audio-state';

const announceAudioState = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_AUDIO_STATE_EVENT, {
    detail: { unlocked: globalAudioContext?.state === 'running' },
  }));
};

// Initialize audio context on user interaction
export const initializeAudio = () => {
  if (typeof window === 'undefined') return false;
  if (!globalAudioContext) {
    try {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioEnabled = globalAudioContext.state === 'running';
      globalAudioContext.addEventListener?.('statechange', announceAudioState);
      announceAudioState();
      console.log('[NotificationSounds] Audio context initialized');
    } catch (error) {
      console.warn('[NotificationSounds] Failed to initialize audio context:', error);
    }
  }
  
  // Resume if suspended (required by some browsers)
  if (globalAudioContext?.state === 'suspended') {
    globalAudioContext.resume().then(() => {
      audioEnabled = true;
      announceAudioState();
      console.log('[NotificationSounds] Audio context resumed');
    }).catch(() => undefined);
  }
  
  audioEnabled = globalAudioContext?.state === 'running';
  return audioEnabled;
};

/** True once the browser has actually allowed audio output. */
export const isAudioUnlocked = () => globalAudioContext?.state === 'running';

/**
 * Keeps the shared AudioContext unlocked for the whole session.
 * Browsers re-suspend the context after tab switches / autoplay policy resets,
 * so we re-arm on every gesture instead of listening once.
 */
let gestureArmed = false;
export const armAudioUnlock = () => {
  if (gestureArmed || typeof document === 'undefined') return;
  gestureArmed = true;
  const unlock = () => { initializeAudio(); announceAudioState(); };
  ['pointerdown', 'touchstart', 'keydown', 'click'].forEach((evt) =>
    document.addEventListener(evt, unlock, { passive: true })
  );
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') initializeAudio();
  });
};

const generateSound = (config: SoundConfig, masterVolume: number = 0.7, retry = true) => {
  try {
    // Initialize audio if not already done
    if (!globalAudioContext) {
      initializeAudio();
    }
    
    if (!globalAudioContext) {
      console.warn('[NotificationSounds] No audio context available');
      return;
    }

    // Suspended contexts are recoverable: resume and replay once instead of
    // silently dropping the alert (this was why alerts were never audible).
    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume()
        .then(() => { if (retry) generateSound(config, masterVolume, false); })
        .catch(() => console.warn('[NotificationSounds] Audio blocked until user interacts'));
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
