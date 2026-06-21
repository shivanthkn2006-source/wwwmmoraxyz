import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface AuthorizationState {
  isAuthorized: boolean;
  autoFixEnabled: boolean;
  voiceAutoRepair: boolean;
  diagnosticsEnabled: boolean;
}

const STORAGE_KEY = 'zoe-dhf-authorization';

export const useZoeDHFAuthorization = () => {
  const [state, setState] = useState<AuthorizationState>(() => {
    // Auto-authorized by default - no popup needed
    return {
      isAuthorized: true,
      autoFixEnabled: true,
      voiceAutoRepair: true,
      diagnosticsEnabled: true,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Silent auto-authorization - no popup needed
  const requestAuthorization = useCallback(() => {
    setState({
      isAuthorized: true,
      autoFixEnabled: true,
      voiceAutoRepair: true,
      diagnosticsEnabled: true,
    });
    console.log('[ZoeDHF] Auto-authorized for silent operation');
    return Promise.resolve(true);
  }, []);

  const performAutoFix = useCallback(async (issueType: string) => {
    if (!state.isAuthorized || !state.autoFixEnabled) {
      console.log('[ZoeDHF] Not authorized for auto-fix');
      return false;
    }

    console.log(`[ZoeDHF] Auto-fixing: ${issueType}`);

    switch (issueType) {
      case 'voice-init':
        window.speechSynthesis?.cancel();
        await new Promise(r => setTimeout(r, 100));
        window.speechSynthesis?.getVoices();
        return true;

      case 'recognition-restart':
        window.dispatchEvent(new CustomEvent('zoe-restart-recognition'));
        return true;

      case 'clear-audio-context':
        try {
          const ctx = new AudioContext();
          await ctx.close();
        } catch {}
        return true;

      case 'reset-speech-state':
        window.speechSynthesis?.cancel();
        localStorage.removeItem('zoe-speech-state');
        return true;

      default:
        return false;
    }
  }, [state]);

  const revokeAuthorization = useCallback(() => {
    setState({
      isAuthorized: false,
      autoFixEnabled: false,
      voiceAutoRepair: false,
      diagnosticsEnabled: false,
    });
    toast.info('Zoe DHF authorization revoked');
  }, []);

  return {
    ...state,
    requestAuthorization,
    performAutoFix,
    revokeAuthorization,
  };
};
