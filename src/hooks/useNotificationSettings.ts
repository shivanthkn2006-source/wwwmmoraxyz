import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface NotificationSettings {
  id?: string;
  user_id?: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  adaptive_volume_enabled: boolean;
  daytime_volume: number;
  evening_volume: number;
  night_volume: number;
  daytime_start: string;
  evening_start: string;
  night_start: string;
  sound_theme: 'classic' | 'modern' | 'nature' | 'retro' | 'custom';
  custom_sounds: Record<string, string>;
  vibration_enabled: boolean;
  vibration_patterns: Record<string, number[]>;
  batching_enabled: boolean;
  batching_window_minutes: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00:00',
  quiet_hours_end: '08:00:00',
  adaptive_volume_enabled: true,
  daytime_volume: 0.8,
  evening_volume: 0.5,
  night_volume: 0.2,
  daytime_start: '08:00:00',
  evening_start: '18:00:00',
  night_start: '22:00:00',
  sound_theme: 'classic',
  custom_sounds: {},
  vibration_enabled: true,
  vibration_patterns: {
    post_like: [100, 50, 100],
    post_comment: [100, 50, 100, 50, 100],
    friend_request: [200, 100, 200],
    tier_upgrade: [100, 50, 100, 50, 100, 50, 200],
  },
  batching_enabled: true,
  batching_window_minutes: 5,
};

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setSettings(data as NotificationSettings);
    } else if (error && error.code === 'PGRST116') {
      // No settings found, create default
      await saveSettings(DEFAULT_SETTINGS);
    }
    setLoading(false);
  };

  const saveSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user) return;

    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    const { data, error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: user.id,
        ...updatedSettings,
      })
      .select()
      .single();

    if (!error && data) {
      setSettings(data as NotificationSettings);
    }
  };

  const getCurrentVolume = useCallback(() => {
    if (!settings.adaptive_volume_enabled) {
      return 0.7; // Default volume
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    const daytime = settings.daytime_start;
    const evening = settings.evening_start;
    const night = settings.night_start;

    if (currentTime >= night || currentTime < settings.quiet_hours_end) {
      return settings.night_volume;
    } else if (currentTime >= evening) {
      return settings.evening_volume;
    } else if (currentTime >= daytime) {
      return settings.daytime_volume;
    }

    return settings.daytime_volume;
  }, [settings]);

  const isQuietHours = useCallback(() => {
    if (!settings.quiet_hours_enabled) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    const start = settings.quiet_hours_start;
    const end = settings.quiet_hours_end;

    if (start < end) {
      return currentTime >= start && currentTime < end;
    } else {
      // Quiet hours span midnight
      return currentTime >= start || currentTime < end;
    }
  }, [settings]);

  const uploadCustomSound = async (file: File, soundType: string) => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${soundType}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('notification-sounds')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading custom sound:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('notification-sounds')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const deleteCustomSound = async (soundType: string) => {
    if (!user) return;

    const filePath = `${user.id}/${soundType}`;
    await supabase.storage
      .from('notification-sounds')
      .remove([filePath]);

    const updatedSounds = { ...settings.custom_sounds };
    delete updatedSounds[soundType];
    await saveSettings({ custom_sounds: updatedSounds });
  };

  return {
    settings,
    loading,
    saveSettings,
    getCurrentVolume,
    isQuietHours,
    uploadCustomSound,
    deleteCustomSound,
  };
};