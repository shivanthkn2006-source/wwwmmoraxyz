/**
 * VoiceSystemActivator - Handles first-time audio/voice system activation
 * Browsers require user interaction before AudioContext can be resumed
 * This component shows a one-time prompt to enable hands-free voice
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Mic, MicOff, Volume2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { initializeZoeVoices, speakAsZoe } from '@/utils/zoeVoice';
import { activateZoeMedia, isSpeechRecognitionSupported } from '@/utils/zoeMediaAccess';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

interface VoiceSystemActivatorProps {
  onActivated?: () => void;
}

const STORAGE_KEY = 'zoe-voice-system-activated';

const isAuthRoute = (pathname: string) => {
  return (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/password-recovery')
  );
};

// Detect PWA mode (installed to home screen)
const isPWAMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// PWA uses localStorage for persistence across launches; browser uses sessionStorage
const getVoiceStorage = () => isPWAMode() ? localStorage : sessionStorage;

export const VoiceSystemActivator: React.FC<VoiceSystemActivatorProps> = ({ onActivated }) => {
  const location = useLocation();
  const pathname = location.pathname;

  const [showPrompt, setShowPrompt] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationComplete, setActivationComplete] = useState(false);

  const onAuthPage = useMemo(() => isAuthRoute(pathname), [pathname]);

  // NOTE: We do NOT auto-show the prompt on any page.
  // This avoids intrusive overlays during initial load / redirects.
  useEffect(() => {
    const storage = getVoiceStorage();
    const alreadyActivated = storage.getItem(STORAGE_KEY);
    if (alreadyActivated) {
      setActivationComplete(true);
      setShowPrompt(false);
      // Notify orchestrator that voice was previously activated (for deferred probe)
      window.dispatchEvent(new CustomEvent('zoe-voice-system-activated'));
      return;
    }

    // Ensure auth pages never show the dialog (even if a redirect happens after mount)
    if (onAuthPage) {
      setShowPrompt(false);
      return;
    }
  }, [onAuthPage]);

  // Activate all voice systems with user interaction
  const activateVoiceSystems = useCallback(async () => {
    setIsActivating(true);
    console.log('[VoiceActivator] Starting voice system activation...');

    try {
      // 1. Use unified Zoe media access (handles AudioContext + microphone)
      const mediaResult = await activateZoeMedia({ microphone: true, camera: false });
      
      if (!mediaResult.audio) {
        console.warn('[VoiceActivator] Audio warm-up failed, continuing...');
      }
      
      if (!mediaResult.microphone) {
        toast.error('Microphone permission required', {
          description: 'Please allow microphone access to enable wake word detection.',
          duration: 5000,
        });
        return;
      }
      
      console.log('[VoiceActivator] Media access granted:', mediaResult);

      // 2. Initialize Zoe voices (speech synthesis)
      await initializeZoeVoices();
      console.log('[VoiceActivator] Zoe voices initialized');

      // 3. Check speech recognition support
      if (!isSpeechRecognitionSupported()) {
        toast.error('Wake word not supported', {
          description: 'Your browser does not support speech recognition for wake word detection.',
          duration: 6000,
        });
        // Still allow TTS activation below.
      }

      // 4. Dispatch global event to notify all voice components
      window.dispatchEvent(new CustomEvent('zoe-voice-system-activated'));

      // 5. Mark as activated (use appropriate storage for PWA vs browser)
      getVoiceStorage().setItem(STORAGE_KEY, 'true');
      setActivationComplete(true);
      setShowPrompt(false);

      // 6. Speak a greeting to confirm voice is working
      speakAsZoe(
        "Voice system activated. You can now speak to me hands-free by saying Hey Zoe.",
        undefined,
        undefined,
        () => {
          console.log('[VoiceActivator] Activation complete');
          onActivated?.();
        }
      );

      toast.success('🎙️ Voice system activated!', {
        description: 'Say "Hey Zoe" to start hands-free conversation',
        duration: 4000,
      });

    } catch (error) {
      console.error('[VoiceActivator] Activation failed:', error);
      toast.error('Voice activation failed', {
        description: 'Please try again or check microphone permissions',
      });
    } finally {
      setIsActivating(false);
    }
  }, [onActivated]);

  // Skip activation (user can still use later)
  const skipActivation = useCallback(() => {
    setShowPrompt(false);
    // Don't mark as activated - will prompt again on next session
    toast.info('Voice activation skipped', {
      description: 'Click the orb to activate voice later',
      duration: 3000,
    });
  }, []);

  // Listen for manual activation requests (e.g., from wake-word failure)
  useEffect(() => {
    const handleManualActivation = () => {
      if (activationComplete) return;
      if (onAuthPage) return;

      // User gesture is required for mic + AudioContext; open the prompt instead of auto-activating.
      setShowPrompt(true);
    };

    window.addEventListener('zoe-request-voice-activation', handleManualActivation);
    return () => window.removeEventListener('zoe-request-voice-activation', handleManualActivation);
  }, [activationComplete, onAuthPage]);

  if (activationComplete) {
    return null;
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Enable Hands-Free Voice
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Activate Zoe's voice system for a natural, hands-free conversation experience.
            You'll be able to say "Hey Zoe" to start talking.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Mic className="h-5 w-5 text-primary" />
            <div className="text-sm">
              <p className="font-medium">Wake Word Detection</p>
              <p className="text-muted-foreground text-xs">Say "Hey Zoe" anytime to activate</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Volume2 className="h-5 w-5 text-primary" />
            <div className="text-sm">
              <p className="font-medium">Voice Responses</p>
              <p className="text-muted-foreground text-xs">Zoe speaks naturally to you</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={skipActivation}
            disabled={isActivating}
            className="w-full sm:w-auto"
          >
            <MicOff className="h-4 w-4 mr-2" />
            Skip for Now
          </Button>
          <Button
            onClick={activateVoiceSystems}
            disabled={isActivating}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            {isActivating ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Activating...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Enable Voice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceSystemActivator;
