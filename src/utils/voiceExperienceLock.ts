// A tiny, explicit "one voice at a time" lock.
// Purpose: prevent MMORA/Orb voice and Zoe Infinity voice from speaking over each other.

import { stopZoeSpeech } from '@/utils/zoeVoice';
import { stopSpeaking } from '@/utils/assistantVoice';

export type VoiceExperience = 'mmora' | 'zoe-infinity' | 'unknown';

declare global {
  interface Window {
    __activeVoiceExperience?: VoiceExperience;
  }
}

export const setActiveVoiceExperience = (exp: VoiceExperience) => {
  if (typeof window === 'undefined') return;
  window.__activeVoiceExperience = exp;
  window.dispatchEvent(new CustomEvent('zoe-voice-experience-changed', { detail: { exp } }));
};

export const getActiveVoiceExperience = (): VoiceExperience => {
  if (typeof window === 'undefined') return 'unknown';
  return window.__activeVoiceExperience || 'unknown';
};

export const getEffectiveVoiceExperience = (): VoiceExperience => {
  if (typeof window === 'undefined') return 'unknown';

  const explicit = window.__activeVoiceExperience;
  if (explicit && explicit !== 'unknown') return explicit;

  const path = window.location?.pathname || '';
  if (path.startsWith('/zoe-infinity')) return 'zoe-infinity';
  return 'unknown';
};

export const stopAllVoices = () => {
  try {
    stopZoeSpeech();
  } catch {
    // ignore
  }
  try {
    stopSpeaking();
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent('zoe-stop-all-voices'));
    window.dispatchEvent(new CustomEvent('zoe-speak-end'));
  } catch {
    // ignore
  }
};
