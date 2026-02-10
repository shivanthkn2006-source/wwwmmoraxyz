/**
 * ZOE INFINITY VOICE SETTINGS STORE
 * ==================================
 * Internal settings store for voice playback parameters.
 * Provides "cinematic" voice feel through playbackRate adjustment.
 * 
 * NOTE: Deepgram Aura-2 doesn't support SSML, so pitch/speed adjustments
 * happen at PLAYBACK time via audio.playbackRate.
 * 
 * playbackRate < 1.0 = slower + slightly lower pitch (cinematic feel)
 * playbackRate > 1.0 = faster + slightly higher pitch
 * 
 * @version 1.0.1
 */

const SETTINGS_KEY = 'zoe_infinity_voice_settings_v1';

export interface ZoeInfinityVoiceSettings {
  /**
   * Playback rate: 0.5 - 2.0
   * Default: 0.9 for soothing cinematic feel
   * Lower values = slower + lower pitch
   */
  playbackRate: number;
  
  /**
   * Volume: 0.0 - 1.0
   * Default: 1.0
   */
  volume: number;
  
  /**
   * Whether to preserve pitch when changing speed
   * (requires AudioContext pitch correction - more CPU intensive)
   * Default: false (natural pitch shift with speed)
   */
  preservePitch: boolean;
}

const DEFAULT_SETTINGS: ZoeInfinityVoiceSettings = {
  playbackRate: 0.9, // Slightly slower for soothing cinematic feel
  volume: 1.0,
  preservePitch: false, // Natural pitch lowering with slower speed
};

/**
 * Read voice settings from localStorage
 */
export const getZoeInfinityVoiceSettings = (): ZoeInfinityVoiceSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    
    const parsed = JSON.parse(raw) as Partial<ZoeInfinityVoiceSettings>;
    return {
      playbackRate: typeof parsed.playbackRate === 'number' 
        ? Math.max(0.5, Math.min(2.0, parsed.playbackRate)) 
        : DEFAULT_SETTINGS.playbackRate,
      volume: typeof parsed.volume === 'number'
        ? Math.max(0.0, Math.min(1.0, parsed.volume))
        : DEFAULT_SETTINGS.volume,
      preservePitch: typeof parsed.preservePitch === 'boolean'
        ? parsed.preservePitch
        : DEFAULT_SETTINGS.preservePitch,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

/**
 * Save voice settings to localStorage
 */
export const setZoeInfinityVoiceSettings = (settings: Partial<ZoeInfinityVoiceSettings>): void => {
  try {
    const current = getZoeInfinityVoiceSettings();
    const merged: ZoeInfinityVoiceSettings = {
      ...current,
      ...settings,
    };
    
    // Clamp values
    merged.playbackRate = Math.max(0.5, Math.min(2.0, merged.playbackRate));
    merged.volume = Math.max(0.0, Math.min(1.0, merged.volume));
    
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    
    // Dispatch event for live updates
    window.dispatchEvent(new CustomEvent('zoe-voice-settings-changed', { 
      detail: merged 
    }));
    
    console.log('[ZoeInfinityVoiceSettings] Updated:', merged);
  } catch {
    // ignore
  }
};

/**
 * Reset to default cinematic settings
 */
export const resetZoeInfinityVoiceSettings = (): void => {
  try {
    localStorage.removeItem(SETTINGS_KEY);
    window.dispatchEvent(new CustomEvent('zoe-voice-settings-changed', { 
      detail: DEFAULT_SETTINGS 
    }));
  } catch {
    // ignore
  }
};

/**
 * Apply settings to an Audio element
 * Call this before audio.play()
 */
export const applyVoiceSettingsToAudio = (audio: HTMLAudioElement): void => {
  const settings = getZoeInfinityVoiceSettings();
  
  console.log('[ZoeInfinityVoice] 🎧 Applying cinematic settings:', {
    playbackRate: settings.playbackRate,
    volume: settings.volume,
    preservePitch: settings.preservePitch
  });
  
  audio.playbackRate = settings.playbackRate;
  audio.volume = settings.volume;
  
  // preservesPitch is a newer API, check support
  if ('preservesPitch' in audio) {
    (audio as any).preservesPitch = settings.preservePitch;
  }
  // Webkit prefix for older Safari
  if ('webkitPreservesPitch' in audio) {
    (audio as any).webkitPreservesPitch = settings.preservePitch;
  }
};

// Export defaults for reference
export { DEFAULT_SETTINGS as ZOE_INFINITY_VOICE_DEFAULTS };
