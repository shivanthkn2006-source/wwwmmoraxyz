export const VR_AUDIO_UNLOCK_EVENT = 'vr-audio-unlock';
export const VR_AUDIO_LOCK_EVENT = 'vr-audio-lock';

declare global {
  interface Window {
    __vrAudioUnlocked?: boolean;
  }
}

export const markVRAudioUnlocked = (): void => {
  if (typeof window === 'undefined') return;
  window.__vrAudioUnlocked = true;
  window.dispatchEvent(new CustomEvent(VR_AUDIO_UNLOCK_EVENT));
};

export const markVRAudioLocked = (): void => {
  if (typeof window === 'undefined') return;
  window.__vrAudioUnlocked = false;
  window.dispatchEvent(new CustomEvent(VR_AUDIO_LOCK_EVENT));
};

export const isVRAudioUnlocked = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(window.__vrAudioUnlocked);
};
