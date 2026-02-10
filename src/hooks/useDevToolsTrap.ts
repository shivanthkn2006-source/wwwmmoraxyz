// ═══════════════════════════════════════════════════════════════════════════════
// DEVTOOLS TRAP - Black Box Protocol Layer 2
// Active defense against Developer Tools inspection
// Scorched Earth Response with logging and alerts
// Integrated with DHF Core via centralized security config
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useDevMode } from '@/components/security/DevModeContext';
import { 
  logSecurityEvent, 
  notifyAdmins,
  SECURITY_EVENTS,
  SECURITY_CATEGORIES,
  ADMIN_PHONES 
} from '@/components/security/securityConfig';

interface DevToolsTrapConfig {
  enabled?: boolean;
  onDetection?: () => void;
  alertAdmins?: boolean;
}

interface DevToolsTrapState {
  isDevToolsOpen: boolean;
  detectionCount: number;
  isBreached: boolean;
  lastDetectionTime: number | null;
  isAdmin: boolean;
}

export const useDevToolsTrap = (config: DevToolsTrapConfig = {}) => {
  const { enabled = true, onDetection, alertAdmins = true } = config;
  const { user } = useAuth();
  const { isAdmin, isDevMode, securityEnabled, simulateUserView } = useDevMode();
  
  // Determine if trap should be bypassed
  const shouldBypass = isAdmin && (isDevMode || !securityEnabled) && !simulateUserView;
  
  const [state, setState] = useState<DevToolsTrapState>({
    isDevToolsOpen: false,
    detectionCount: 0,
    isBreached: false,
    lastDetectionTime: null,
    isAdmin: false
  });
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertSentRef = useRef(false);

  // Sync admin state from DevMode context
  useEffect(() => {
    setState(prev => ({ ...prev, isAdmin }));
    if (isAdmin && isDevMode) {
      console.log('[DevToolsTrap] 👑 Admin with Dev Mode - DevTools trap DISABLED');
    }
  }, [isAdmin, isDevMode]);

  // Log intrusion to database
  const logIntrusion = useCallback(async (details: string) => {
    if (!user) return;
    
    await logSecurityEvent(
      user.id,
      SECURITY_EVENTS.DEVTOOLS_INTRUSION,
      SECURITY_CATEGORIES.VIOLATION,
      details,
      {
        detection_count: state.detectionCount,
        screen_size: `${window.screen.width}x${window.screen.height}`,
        sentiment_score: -1 // Negative sentiment for security violations
      }
    );
    
    console.log('[DevToolsTrap] Intrusion logged to DHF');
  }, [user, state.detectionCount]);

  // Send admin notifications
  const notifyAdminsHandler = useCallback(async () => {
    if (!alertAdmins || alertSentRef.current || !user) return;
    alertSentRef.current = true;
    
    await notifyAdmins(user.id, 'devtools_intrusion', 'critical');
    
    // Log the alert event
    await logSecurityEvent(
      user.id,
      SECURITY_EVENTS.ADMIN_ALERT_SENT,
      SECURITY_CATEGORIES.NOTIFICATION,
      `DevTools intrusion alert sent to admins`,
      { admin_phones: ADMIN_PHONES }
    );
  }, [alertAdmins, user]);

  // Speak warning using TTS
  const speakWarning = useCallback(() => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        'Unauthorized Access Detected. Your IP has been flagged.'
      );
      utterance.rate = 0.9;
      utterance.pitch = 0.8;
      utterance.volume = 0.8;
      
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Scorched Earth Response
  const triggerScorchedEarth = useCallback(() => {
    // Never trigger for admins with dev mode
    if (shouldBypass) {
      console.log('[DevToolsTrap] 👑 Admin bypass - Scorched Earth NOT triggered');
      return;
    }
    
    console.log('[DevToolsTrap] 🔥 SCORCHED EARTH PROTOCOL ACTIVATED');
    
    setState(prev => ({ ...prev, isBreached: true }));
    
    // Log the breach
    logIntrusion('DevTools detected - Scorched Earth activated');
    
    // Notify admins
    notifyAdminsHandler();
    
    // Speak warning
    speakWarning();
    
    // Call custom detection handler
    onDetection?.();
    
  }, [shouldBypass, logIntrusion, notifyAdminsHandler, speakWarning, onDetection]);

  // DevTools detection using multiple methods
  const checkDevTools = useCallback(() => {
    if (!enabled || shouldBypass) return false;
    
    let isOpen = false;
    
    // Method 1: Window size difference
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    
    if (widthThreshold || heightThreshold) {
      isOpen = true;
    }
    
    // Method 2: Check for devtools property
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: function() {
        isOpen = true;
        return 'devtools-trap';
      }
    });
    
    return isOpen;
  }, [enabled, shouldBypass]);

  // Main detection loop
  useEffect(() => {
    // Don't run detection for admins with dev mode
    if (!enabled || shouldBypass) return;
    
    const runDetection = () => {
      const devToolsOpen = checkDevTools();
      
      if (devToolsOpen && !state.isDevToolsOpen) {
        // DevTools just opened
        setState(prev => ({
          ...prev,
          isDevToolsOpen: true,
          detectionCount: prev.detectionCount + 1,
          lastDetectionTime: Date.now()
        }));
        
        console.warn('[DevToolsTrap] ⚠️ DevTools DETECTED');
        
        // Trigger scorched earth if detected multiple times
        if (state.detectionCount >= 2) {
          triggerScorchedEarth();
        } else {
          // First warning
          logIntrusion('DevTools opened - Warning issued');
        }
      } else if (!devToolsOpen && state.isDevToolsOpen) {
        // DevTools closed
        setState(prev => ({ ...prev, isDevToolsOpen: false }));
      }
    };
    
    // Run detection every 500ms
    checkIntervalRef.current = setInterval(runDetection, 500);
    
    // Initial check
    runDetection();
    
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [enabled, checkDevTools, state.isDevToolsOpen, shouldBypass, state.detectionCount, triggerScorchedEarth, logIntrusion]);

  // Reset breach state
  const resetBreach = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDevToolsOpen: false,
      detectionCount: 0,
      isBreached: false,
      lastDetectionTime: null
    }));
    alertSentRef.current = false;
  }, []);

  return {
    ...state,
    resetBreach,
    triggerScorchedEarth,
  };
};

export default useDevToolsTrap;
