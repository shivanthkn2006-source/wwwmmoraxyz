// ═══════════════════════════════════════════════════════════════════════════════
// WEBXR NATIVE SUPPORT - VR Headset Integration
// Enables immersive VR experience with headsets (Quest, PSVR, Vision Pro, etc.)
// Cross-browser compatible with automatic fallbacks
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface WebXRSupportProps {
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
}

// WebXR Session Manager - Handles VR headset connection
export const useWebXRSession = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionMode, setSessionMode] = useState<'immersive-vr' | 'immersive-ar' | null>(null);
  const [isSecureContext, setIsSecureContext] = useState(true);
  const [detectedHeadset, setDetectedHeadset] = useState<string | null>(null);

  useEffect(() => {
    // Check secure context first
    const secure = window.isSecureContext;
    setIsSecureContext(secure);
    
    if (!secure) {
      console.warn('[WebXR] Not in secure context - WebXR requires HTTPS');
      return;
    }

    const checkXRSupport = async () => {
      if ('xr' in navigator) {
        try {
          const xr = navigator.xr as XRSystem;
          const [vrSupported, arSupported] = await Promise.all([
            xr.isSessionSupported('immersive-vr').catch(() => false),
            xr.isSessionSupported('immersive-ar').catch(() => false)
          ]);
          
          setIsSupported(vrSupported || arSupported);
          
          // Detect headset type from user agent
          const ua = navigator.userAgent.toLowerCase();
          if (ua.includes('quest 3')) setDetectedHeadset('Meta Quest 3');
          else if (ua.includes('quest pro')) setDetectedHeadset('Meta Quest Pro');
          else if (ua.includes('quest')) setDetectedHeadset('Meta Quest');
          else if (ua.includes('vision')) setDetectedHeadset('Apple Vision Pro');
          else if (ua.includes('pico')) setDetectedHeadset('Pico');
          else if (ua.includes('vive')) setDetectedHeadset('HTC Vive');
          else if (vrSupported) setDetectedHeadset('VR Headset');
          
          console.log('[WebXR] VR:', vrSupported, 'AR:', arSupported, 'Headset:', detectedHeadset);
        } catch (e) {
          console.error('[WebXR] Support check failed:', e);
          setIsSupported(false);
        }
      }
    };

    checkXRSupport();
  }, []);

  const requestSession = useCallback(async (mode: 'immersive-vr' | 'immersive-ar' = 'immersive-vr') => {
    if (!isSupported) {
      toast.error('VR not supported', { description: 'Your device does not support WebXR' });
      return null;
    }

    if (!isSecureContext) {
      toast.error('HTTPS required', { description: 'WebXR requires a secure connection' });
      return null;
    }

    try {
      const xr = navigator.xr as XRSystem;
      const session = await xr.requestSession(mode, {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
      });
      
      setIsSessionActive(true);
      setSessionMode(mode);
      
      session.addEventListener('end', () => {
        setIsSessionActive(false);
        setSessionMode(null);
        toast.info('VR session ended');
      });

      toast.success('VR Session Started', { 
        description: detectedHeadset ? `Connected to ${detectedHeadset}` : 'Put on your headset' 
      });
      return session;
    } catch (error) {
      console.error('[WebXR] Session request failed:', error);
      toast.error('Failed to start VR', { description: 'Could not initialize VR session' });
      return null;
    }
  }, [isSupported, isSecureContext, detectedHeadset]);

  return {
    isSupported,
    isSessionActive,
    sessionMode,
    isSecureContext,
    detectedHeadset,
    requestSession
  };
};

// WebXR Button Component - Shows "Enter VR" button when supported
export const WebXRButton: React.FC<{ onEnterVR?: () => void }> = ({ onEnterVR }) => {
  const { isSupported, requestSession, isSessionActive, isSecureContext, detectedHeadset } = useWebXRSession();

  // Don't show if no VR support and not in insecure context warning mode
  if (!isSupported && isSecureContext) return null;

  // Show warning if not secure context
  if (!isSecureContext) {
    return (
      <button
        className="fixed bottom-4 left-4 z-50 px-4 py-2 rounded-lg font-medium
          bg-amber-600 text-white shadow-lg flex items-center gap-2 opacity-80"
        onClick={() => toast.warning('VR requires HTTPS', { 
          description: 'Please access this site via HTTPS for VR features' 
        })}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        HTTPS Required
      </button>
    );
  }

  const buttonText = isSessionActive 
    ? 'VR Active' 
    : detectedHeadset 
      ? `Enter ${detectedHeadset}` 
      : 'Enter VR';

  return (
    <button
      onClick={async () => {
        const session = await requestSession('immersive-vr');
        if (session && onEnterVR) {
          onEnterVR();
        }
      }}
      className={`
        fixed bottom-4 left-4 z-50
        px-4 py-2 rounded-lg font-medium
        transition-all duration-300
        ${isSessionActive 
          ? 'bg-green-600 text-white' 
          : 'bg-purple-600 hover:bg-purple-700 text-white'
        }
        shadow-lg shadow-purple-500/30
        flex items-center gap-2
      `}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      {buttonText}
    </button>
  );
};

export default WebXRButton;
