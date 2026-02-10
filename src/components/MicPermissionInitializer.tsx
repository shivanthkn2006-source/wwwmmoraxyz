/**
 * MicPermissionInitializer - defers mic permission initialization.
 *
 * IMPORTANT: Do NOT request mic permission automatically on page load.
 * Browsers treat it as intrusive and it can trigger the VoiceSystemActivator dialog.
 * We only initialize mic permission after the user explicitly activates voice.
 */

import { useEffect } from 'react';
import { initializeMicPermission } from '@/utils/micPermissionManager';

export const MicPermissionInitializer: React.FC = () => {
  useEffect(() => {
    const onVoiceActivated = async () => {
      try {
        await initializeMicPermission();
      } catch {
        // ignore
      }
    };

    window.addEventListener('zoe-voice-system-activated', onVoiceActivated);
    return () => window.removeEventListener('zoe-voice-system-activated', onVoiceActivated);
  }, []);

  return null;
};

export default MicPermissionInitializer;
