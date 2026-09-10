/**
 * MicPermissionInitializer — ONE-TIME microphone permission for the platform.
 *
 * We never ask on page load (browsers treat that as intrusive). Instead the
 * first real user gesture that needs voice — orb activation, headset button,
 * voice search — triggers a single request through AudioRouterService, which
 * caches the grant so no other Zoe surface ever asks again.
 */

import { useEffect } from 'react';
import { initializeMicPermission } from '@/utils/micPermissionManager';
import { audioRouter } from '@/services/AudioRouterService';

const VOICE_EVENTS = [
  'zoe-voice-system-activated',
  'zoe-request-mic-permission',
  'zoe-headset-talk',
] as const;

export const MicPermissionInitializer: React.FC = () => {
  useEffect(() => {
    let done = false;

    const onVoiceActivated = async () => {
      if (done) return;
      done = true;
      try {
        const granted = await audioRouter.ensureMicPermission();
        if (granted) await initializeMicPermission();
      } catch {
        done = false; // allow a retry on the next explicit activation
      }
    };

    VOICE_EVENTS.forEach((evt) => window.addEventListener(evt, onVoiceActivated));
    return () => VOICE_EVENTS.forEach((evt) => window.removeEventListener(evt, onVoiceActivated));
  }, []);

  return null;
};

export default MicPermissionInitializer;
