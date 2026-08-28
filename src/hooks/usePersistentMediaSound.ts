import { useCallback, useEffect, useState } from 'react';

const MEDIA_SOUND_KEY = 'mmora_media_sound_enabled';
const MEDIA_SOUND_EVENT = 'mmora:media-sound-preference';

const readSoundPreference = (fallback = false) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(MEDIA_SOUND_KEY);
    if (stored === 'on') return true;
    if (stored === 'off') return false;
  } catch {
    // ignore storage failures
  }
  return fallback;
};

const writeSoundPreference = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MEDIA_SOUND_KEY, enabled ? 'on' : 'off');
    window.dispatchEvent(new CustomEvent(MEDIA_SOUND_EVENT, { detail: enabled }));
  } catch {
    // ignore storage failures
  }
};

// Media starts MUTED by default everywhere (feed, loops, fullscreen player).
// Only an explicit unmute persists, and it survives reloads via localStorage.
export const usePersistentMediaSound = (fallback = false) => {
  const [soundEnabled, setSoundEnabledState] = useState(() => readSoundPreference(fallback));

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === MEDIA_SOUND_KEY) setSoundEnabledState(readSoundPreference(fallback));
    };
    const onPreference = (event: Event) => {
      setSoundEnabledState(Boolean((event as CustomEvent<boolean>).detail));
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(MEDIA_SOUND_EVENT, onPreference);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(MEDIA_SOUND_EVENT, onPreference);
    };
  }, [fallback]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    writeSoundPreference(enabled);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabledState((current) => {
      const next = !current;
      writeSoundPreference(next);
      return next;
    });
  }, []);

  return { soundEnabled, setSoundEnabled, toggleSound };
};
