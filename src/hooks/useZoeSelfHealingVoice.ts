/**
 * ZOE SELF-HEALING VOICE ARCHITECTURE (TSE Resilience)
 * Implements fault detection, isolation, and automatic recovery
 * Monitors ZSMT for error patterns and executes repair actions
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { initializeZoeVoices } from '@/utils/zoeVoice';

// Error detection thresholds
const ERROR_THRESHOLD = 3; // errors in window
const ERROR_WINDOW_MS = 60000; // 60 seconds
const RECOVERY_COOLDOWN_MS = 30000; // 30 seconds between recovery attempts

interface ErrorEvent {
  type: 'network_timeout' | 'mic_dropout' | 'tts_failure' | 'vtt_error' | 'api_error' | 'unknown';
  timestamp: number;
  message: string;
  context?: any;
}

interface RecoveryAction {
  action: string;
  description: string;
  executed: boolean;
  success: boolean;
  timestamp: number;
}

interface SelfHealingState {
  isMonitoring: boolean;
  errorCount: number;
  lastRecoveryAttempt: number;
  recoveryActions: RecoveryAction[];
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

export const useZoeSelfHealingVoice = () => {
  const { user } = useAuth();
  const errorLogRef = useRef<ErrorEvent[]>([]);
  const lastRecoveryRef = useRef<number>(0);
  const isRecoveringRef = useRef(false);
  
  const [state, setState] = useState<SelfHealingState>({
    isMonitoring: true,
    errorCount: 0,
    lastRecoveryAttempt: 0,
    recoveryActions: [],
    systemHealth: 'healthy'
  });

  // Log error to ZSMT
  const logErrorToZSMT = useCallback(async (
    errorType: string,
    errorMessage: string,
    context?: any
  ) => {
    if (!user?.id) return;

    try {
      await (supabase.from('zoe_sovereign_memory') as any).insert({
        user_id: user.id,
        event_type: 'error_masked_voice',
        content_text: errorMessage,
        zoe_state_json: {
          error_type: errorType,
          error_context: context,
          recovery_pending: true
        },
        session_id: `session_${Date.now()}`
      });
    } catch (e) {
      console.error('[SelfHeal] Failed to log to ZSMT:', e);
    }
  }, [user?.id]);

  // Log recovery action to ZSMT
  const logRecoveryToZSMT = useCallback(async (
    action: string,
    success: boolean,
    details?: any
  ) => {
    if (!user?.id) return;

    try {
      await (supabase.from('zoe_sovereign_memory') as any).insert({
        user_id: user.id,
        event_type: 'system_self_healed',
        content_text: `Self-healing action: ${action}`,
        zoe_state_json: {
          action,
          success,
          details,
          timestamp: new Date().toISOString()
        },
        session_id: `session_${Date.now()}`
      });
    } catch (e) {
      console.error('[SelfHeal] Failed to log recovery:', e);
    }
  }, [user?.id]);

  // Detect error type from error object or message
  const classifyError = useCallback((error: any): ErrorEvent['type'] => {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
      return 'network_timeout';
    }
    if (message.includes('microphone') || message.includes('audio') || message.includes('permission')) {
      return 'mic_dropout';
    }
    if (message.includes('speech') || message.includes('synthesis') || message.includes('tts')) {
      return 'tts_failure';
    }
    if (message.includes('recognition') || message.includes('transcript')) {
      return 'vtt_error';
    }
    if (message.includes('api') || message.includes('edge') || message.includes('function')) {
      return 'api_error';
    }
    return 'unknown';
  }, []);

  // Execute recovery action based on error type
  const executeRecovery = useCallback(async (errorType: ErrorEvent['type']): Promise<RecoveryAction> => {
    const action: RecoveryAction = {
      action: '',
      description: '',
      executed: true,
      success: false,
      timestamp: Date.now()
    };

    try {
      switch (errorType) {
        case 'tts_failure':
          // Reset Web Speech API and clear audio buffer
          action.action = 'reset_tts';
          action.description = 'Resetting Text-to-Speech system';
          
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            // Reinitialize voices
            await initializeZoeVoices();
            action.success = true;
          }
          break;

        case 'vtt_error':
        case 'mic_dropout':
          // Reset speech recognition
          action.action = 'reset_vtt';
          action.description = 'Resetting Voice-to-Text recognition';
          
          // Dispatch event to signal recognition restart
          window.dispatchEvent(new CustomEvent('zoe-reset-recognition'));
          action.success = true;
          break;

        case 'network_timeout':
        case 'api_error':
          // Switch to fallback mode
          action.action = 'enable_fallback_mode';
          action.description = 'Enabling offline fallback mode';
          
          // Store preference for fallback
          localStorage.setItem('zoe-fallback-mode', 'true');
          action.success = true;
          break;

        default:
          // General reset
          action.action = 'general_reset';
          action.description = 'Performing general system reset';
          
          // Clear any stuck states
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          action.success = true;
      }

      // Log successful recovery
      await logRecoveryToZSMT(action.action, action.success, {
        errorType,
        description: action.description
      });

    } catch (e) {
      console.error('[SelfHeal] Recovery failed:', e);
      action.success = false;
    }

    return action;
  }, [logRecoveryToZSMT]);

  // Main monitoring function
  const monitorAndRecover = useCallback(async () => {
    if (isRecoveringRef.current) return;

    const now = Date.now();
    
    // Clean old errors outside the window
    errorLogRef.current = errorLogRef.current.filter(
      e => now - e.timestamp < ERROR_WINDOW_MS
    );

    const errorCount = errorLogRef.current.length;

    // Update state
    setState(prev => ({
      ...prev,
      errorCount,
      systemHealth: errorCount === 0 ? 'healthy' : errorCount < ERROR_THRESHOLD ? 'degraded' : 'critical'
    }));

    // Check if recovery is needed
    if (errorCount >= ERROR_THRESHOLD && now - lastRecoveryRef.current > RECOVERY_COOLDOWN_MS) {
      isRecoveringRef.current = true;
      lastRecoveryRef.current = now;

      console.log('[SelfHeal] Error threshold reached, initiating recovery...');

      // Find most common error type
      const typeCounts: Record<string, number> = {};
      errorLogRef.current.forEach(e => {
        typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
      });
      
      const dominantType = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] as ErrorEvent['type'] || 'unknown';

      // Execute recovery
      const recoveryResult = await executeRecovery(dominantType);

      setState(prev => ({
        ...prev,
        lastRecoveryAttempt: now,
        recoveryActions: [...prev.recoveryActions.slice(-9), recoveryResult]
      }));

      // Clear error log on successful recovery
      if (recoveryResult.success) {
        errorLogRef.current = [];
        console.log('[SelfHeal] Recovery successful:', recoveryResult.action);
      }

      isRecoveringRef.current = false;
    }
  }, [executeRecovery]);

  // Register an error (called by command handler)
  const registerError = useCallback(async (error: any, context?: any) => {
    const errorType = classifyError(error);
    const errorEvent: ErrorEvent = {
      type: errorType,
      timestamp: Date.now(),
      message: error?.message || 'Unknown error',
      context
    };

    errorLogRef.current.push(errorEvent);
    await logErrorToZSMT(errorType, errorEvent.message, context);
    
    // Check if immediate recovery is needed
    await monitorAndRecover();
  }, [classifyError, logErrorToZSMT, monitorAndRecover]);

  // Clear fallback mode (when network recovers)
  const clearFallbackMode = useCallback(() => {
    localStorage.removeItem('zoe-fallback-mode');
  }, []);

  // Check if in fallback mode
  const isInFallbackMode = useCallback(() => {
    return localStorage.getItem('zoe-fallback-mode') === 'true';
  }, []);

  // Set up periodic monitoring
  useEffect(() => {
    const interval = setInterval(monitorAndRecover, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [monitorAndRecover]);

  // Listen for online status to clear fallback mode
  useEffect(() => {
    const handleOnline = () => {
      clearFallbackMode();
      setState(prev => ({ ...prev, systemHealth: 'healthy' }));
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [clearFallbackMode]);

  return {
    state,
    registerError,
    isInFallbackMode,
    clearFallbackMode,
    triggerRecovery: () => executeRecovery('unknown')
  };
};

export default useZoeSelfHealingVoice;
