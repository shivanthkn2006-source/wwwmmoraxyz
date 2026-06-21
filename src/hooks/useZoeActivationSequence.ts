/**
 * ZOE ENTITY ACTIVATION PROTOCOL (EAP)
 * Orchestrates the activation sequence: Sound Cue → Voice Welcome → Orb Animation
 * Default Voice: Zoe (Zoe Infinity standalone voice)
 * Triggers 5 seconds after Time to Interactive (TTI)
 * Runs once per user session (except on hard reload)
 * NOTE: This is Zoe Infinity ONLY - NO connection to external platforms
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'react-router-dom';
import { playActivationChime, logSoundError, canPlayActivationSound } from '@/utils/zoeActivationSound';
import { speakAsZoe, initializeAssistantVoices, setCurrentAssistant } from '@/utils/assistantVoice';
import { supabase } from '@/integrations/supabase/client';
import { isSoundSuppressed } from '@/lib/platformPurge';

// Session key for tracking activation
const SESSION_KEY = 'zoe-entity-activated';
const ACTIVATION_DELAY_MS = 5000; // 5 seconds after TTI

interface ActivationState {
  isActivating: boolean;
  isActivated: boolean;
  soundPlayed: boolean;
  voiceSpoken: boolean;
  orbReady: boolean;
  error: string | null;
}

export const useZoeActivationSequence = () => {
  const { user } = useAuth();
  const location = useLocation();
  const hasActivatedRef = useRef(false);
  const activationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [state, setState] = useState<ActivationState>({
    isActivating: false,
    isActivated: false,
    soundPlayed: false,
    voiceSpoken: false,
    orbReady: false,
    error: null
  });

  // Check if activation already occurred this session
  const hasActivatedThisSession = useCallback(() => {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  }, []);

  // Mark activation as complete
  const markActivated = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, 'true');
  }, []);

  // Log activation event to ZSMT
  const logActivationToZSMT = useCallback(async (eventType: string, details: any) => {
    if (!user?.id) return;
    
    try {
      await (supabase.from('zoe_sovereign_memory') as any).insert({
        user_id: user.id,
        event_type: eventType,
        content_text: `Entity Activation: ${eventType}`,
        zoe_state_json: {
          ...details,
          timestamp: new Date().toISOString()
        },
        session_id: `activation_${Date.now()}`
      });
    } catch (e) {
      console.warn('[EAP] Failed to log to ZSMT:', e);
    }
  }, [user?.id]);

  // Step 1: Play activation sound (respects sound suppression)
  const playSound = useCallback(async (): Promise<boolean> => {
    console.log('[EAP] Step 1: Playing activation chime...');
    
    try {
      // Check if sounds are suppressed (after platform purge)
      if (isSoundSuppressed()) {
        console.debug('[EAP] Sounds suppressed after platform purge, skipping chime');
        setState(prev => ({ ...prev, soundPlayed: true }));
        return true;
      }

      // Check if audio is available - don't log error if not, it's expected behavior
      if (!canPlayActivationSound()) {
        console.debug('[EAP] Audio context not available - skipping sound (user interaction required)');
        setState(prev => ({ ...prev, soundPlayed: true })); // Mark as "played" to continue sequence
        return true; // Return true to not block the activation sequence
      }

      const success = await playActivationChime();
      
      // playActivationChime now returns true even if audio is suspended
      // so we don't need to log errors here
      
      setState(prev => ({ ...prev, soundPlayed: success }));
      return success;
    } catch (error) {
      // Only log actual unexpected errors, not expected browser audio restrictions
      const errorMsg = error instanceof Error ? error.message : 'Unknown sound error';
      console.debug('[EAP] Sound error (non-critical):', errorMsg);
      setState(prev => ({ ...prev, soundPlayed: true })); // Mark as played to continue sequence
      return true; // Don't block activation for sound issues
    }
  }, []);

  // Step 2: Speak activation message (Zoe voice - Zoe Infinity standalone voice)
  const speakWelcome = useCallback(async (): Promise<boolean> => {
    console.log('[EAP] Step 2: Speaking activation message (Zoe voice)...');
    
    return new Promise((resolve) => {
      // Zoe welcome greeting - warm, soothing, intelligent
      const welcomeMessage = "Hello. I'm Zoe, your Zone Operations Entity. All systems synchronized. I'm here to guide you through your journey. How can I help you today?";
      
      speakAsZoe(
        welcomeMessage,
        undefined, // Use default voice settings
        () => {
          console.log('[EAP] Zoe voice started');
          window.dispatchEvent(new CustomEvent('zoe-speak'));
        },
        () => {
          console.log('[EAP] Zoe voice completed');
          setState(prev => ({ ...prev, voiceSpoken: true }));
          window.dispatchEvent(new CustomEvent('zoe-speak-end'));
          resolve(true);
        },
        (error) => {
          console.error('[EAP] Zoe voice error:', error);
          logActivationToZSMT('error_masked_voice', {
            reason: error.message
          });
          // Still resolve true to continue sequence
          setState(prev => ({ ...prev, voiceSpoken: false }));
          resolve(false);
        }
      );
    });
  }, [logActivationToZSMT]);

  // Step 3: Trigger orb animation
  const activateOrb = useCallback(() => {
    console.log('[EAP] Step 3: Activating orb visualization...');
    
    // Dispatch event for orb to animate into ready state
    window.dispatchEvent(new CustomEvent('zoe-orb-activate', {
      detail: {
        animation: 'ready',
        emotion: 'joy',
        timestamp: Date.now()
      }
    }));
    
    setState(prev => ({ ...prev, orbReady: true }));
  }, []);

  // Main activation sequence orchestrator
  const runActivationSequence = useCallback(async () => {
    if (hasActivatedRef.current) return;
    hasActivatedRef.current = true;
    
    console.log('[EAP] === ZOE ENTITY ACTIVATION PROTOCOL INITIATED ===');
    setState(prev => ({ ...prev, isActivating: true, error: null }));
    
    try {
      // Initialize voice system and set Zoe as platform default
      await initializeAssistantVoices();
      setCurrentAssistant('Zoe');
      
      // Step 1: Sound cue
      const soundSuccess = await playSound();
      
      // Brief pause after sound (even if it failed, proceed)
      await new Promise(resolve => setTimeout(resolve, soundSuccess ? 200 : 50));
      
      // Step 2: Voice welcome (synchronized with orb)
      activateOrb(); // Start orb animation with speech
      const voiceSuccess = await speakWelcome();
      
      // Log successful activation
      await logActivationToZSMT('entity_activated', {
        soundSuccess,
        voiceSuccess,
        orbActivated: true
      });
      
      // Mark as complete
      markActivated();
      setState(prev => ({ 
        ...prev, 
        isActivating: false, 
        isActivated: true 
      }));
      
      console.log('[EAP] === ZOE ENTITY ACTIVATION PROTOCOL COMPLETE ===');
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown activation error';
      console.error('[EAP] Activation failed:', errorMsg);
      
      setState(prev => ({ 
        ...prev, 
        isActivating: false, 
        error: errorMsg 
      }));
      
      await logActivationToZSMT('activation_failed', {
        error: errorMsg
      });
      
      // Still mark as activated to prevent infinite loops
      markActivated();
    }
  }, [playSound, speakWelcome, activateOrb, logActivationToZSMT, markActivated]);

  // Main effect: trigger activation sequence
  useEffect(() => {
    // Skip on auth page
    if (location.pathname === '/auth') return;
    
    // Skip if no user
    if (!user) return;
    
    // Skip if already activated this session
    if (hasActivatedThisSession()) {
      console.log('[EAP] Already activated this session, skipping');
      setState(prev => ({ ...prev, isActivated: true }));
      return;
    }
    
    // Skip if already triggered
    if (hasActivatedRef.current) return;
    
    console.log('[EAP] Scheduling activation in', ACTIVATION_DELAY_MS, 'ms');
    
    // Wait for TTI + delay
    activationTimeoutRef.current = setTimeout(() => {
      // Use requestIdleCallback for non-blocking execution
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(
          () => runActivationSequence(),
          { timeout: 10000 }
        );
      } else {
        runActivationSequence();
      }
    }, ACTIVATION_DELAY_MS);
    
    return () => {
      if (activationTimeoutRef.current) {
        clearTimeout(activationTimeoutRef.current);
      }
    };
  }, [user, location.pathname, hasActivatedThisSession, runActivationSequence]);

  // Listen for SFX errors to handle self-healing
  useEffect(() => {
    const handleSfxError = async (event: CustomEvent) => {
      if (!user?.id) return;
      
      try {
        await (supabase.from('zoe_sovereign_memory') as any).insert({
          user_id: user.id,
          event_type: event.detail.error_type || 'error_masked_sfx',
          content_text: event.detail.message || 'Sound error',
          zoe_state_json: event.detail,
          session_id: `sfx_error_${Date.now()}`
        });
      } catch (e) {
        console.warn('[EAP] Failed to log SFX error:', e);
      }
    };
    
    window.addEventListener('zoe-sfx-error', handleSfxError as EventListener);
    return () => {
      window.removeEventListener('zoe-sfx-error', handleSfxError as EventListener);
    };
  }, [user?.id]);

  // Manual trigger (for testing)
  const triggerActivation = useCallback(() => {
    hasActivatedRef.current = false;
    sessionStorage.removeItem(SESSION_KEY);
    runActivationSequence();
  }, [runActivationSequence]);

  return {
    state,
    triggerActivation,
    isActivated: state.isActivated,
    isActivating: state.isActivating
  };
};

export default useZoeActivationSequence;
