/**
 * ZOE INFINITY VOICE SETTINGS STORE
 * ==================================
 * Internal settings store for voice playback parameters.
 * Provides "cinematic" voice feel through Browser TTS rate/pitch adjustment.
 * 
 * @version 1.0.2
 */

const SETTINGS_KEY = 'zoe_infinity_voice_settings_v1';

export interface ZoeInfinityVoiceSettings {
  playbackRate: number;
  volume: number;
  preservePitch: boolean;
}

const DEFAULT_SETTINGS: ZoeInfinityVoiceSettings = {
  playbackRate: 0.9,
  volume: 1.0,
  preservePitch: false,
};

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

export const setZoeInfinityVoiceSettings = (settings: Partial<ZoeInfinityVoiceSettings>): void => {
  try {
    const current = getZoeInfinityVoiceSettings();
    const merged: ZoeInfinityVoiceSettings = { ...current, ...settings };
    merged.playbackRate = Math.max(0.5, Math.min(2.0, merged.playbackRate));
    merged.volume = Math.max(0.0, Math.min(1.0, merged.volume));
    
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('zoe-voice-settings-changed', { detail: merged }));
    console.log('[ZoeInfinityVoiceSettings] Updated:', merged);
  } catch {
    // ignore
  }
};

export const resetZoeInfinityVoiceSettings = (): void => {
  try {
    localStorage.removeItem(SETTINGS_KEY);
    window.dispatchEvent(new CustomEvent('zoe-voice-settings-changed', { detail: DEFAULT_SETTINGS }));
  } catch {
    // ignore
  }
};

export const applyVoiceSettingsToAudio = (audio: HTMLAudioElement): void => {
  const settings = getZoeInfinityVoiceSettings();
  
  console.log('[ZoeInfinityVoice] 🎧 Applying cinematic settings:', {
    playbackRate: settings.playbackRate,
    volume: settings.volume,
    preservePitch: settings.preservePitch
  });
  
  audio.playbackRate = settings.playbackRate;
  audio.volume = settings.volume;
  
  if ('preservesPitch' in audio) {
    (audio as any).preservesPitch = settings.preservePitch;
  }
  if ('webkitPreservesPitch' in audio) {
    (audio as any).webkitPreservesPitch = settings.preservePitch;
  }
};

export { DEFAULT_SETTINGS as ZOE_INFINITY_VOICE_DEFAULTS };
