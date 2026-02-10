// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA ACTIVE INDICATOR - "Eye" visual for camera/mic state
// Shows permanent visual feedback when camera/mic is active across all browsers
// Cross-browser support: Chrome, Safari (desktop + iOS), Firefox, Edge
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaState {
  camera: boolean;
  microphone: boolean;
  cameraLabel?: string;
  micLabel?: string;
}

interface CameraActiveIndicatorProps {
  className?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  minimal?: boolean;
  forceShow?: boolean;
}

// Global media state tracking
let globalMediaState: MediaState = {
  camera: false,
  microphone: false,
};

const mediaStateListeners = new Set<(state: MediaState) => void>();

// Cross-browser track active media devices
export const trackMediaDevices = () => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;

  // Safari-compatible approach using enumerateDevices polling
  const checkActiveMedia = async () => {
    try {
      // Method 1: Check active tracks (modern approach)
      const devices = await navigator.mediaDevices.enumerateDevices();
      let hasActiveCamera = false;
      let hasActiveMic = false;
      let cameraLabel = '';
      let micLabel = '';

      // Check for active streams in the document
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        const stream = (video as HTMLVideoElement).srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => {
            if (track.kind === 'video' && track.readyState === 'live') {
              hasActiveCamera = true;
              cameraLabel = track.label || 'Camera';
            }
            if (track.kind === 'audio' && track.readyState === 'live') {
              hasActiveMic = true;
              micLabel = track.label || 'Microphone';
            }
          });
        }
      });

      // Update global state
      const newState: MediaState = {
        camera: hasActiveCamera,
        microphone: hasActiveMic,
        cameraLabel,
        micLabel,
      };

      if (
        newState.camera !== globalMediaState.camera ||
        newState.microphone !== globalMediaState.microphone
      ) {
        globalMediaState = newState;
        mediaStateListeners.forEach(listener => listener(newState));
      }
    } catch (err) {
      console.warn('[CameraIndicator] Track check failed:', err);
    }
  };

  // Poll every 500ms for Safari compatibility
  const interval = setInterval(checkActiveMedia, 500);

  // Also listen for device changes
  navigator.mediaDevices.addEventListener('devicechange', checkActiveMedia);

  return () => {
    clearInterval(interval);
    navigator.mediaDevices.removeEventListener('devicechange', checkActiveMedia);
  };
};

// Listen for manual state updates from Zoe components
export const setMediaActive = (type: 'camera' | 'microphone', active: boolean, label?: string) => {
  const newState = { ...globalMediaState };
  newState[type] = active;
  if (label) {
    if (type === 'camera') newState.cameraLabel = label;
    if (type === 'microphone') newState.micLabel = label;
  }
  globalMediaState = newState;
  mediaStateListeners.forEach(listener => listener(newState));
};

// Hook for components to use
export const useMediaActiveState = () => {
  const [state, setState] = useState<MediaState>(globalMediaState);

  useEffect(() => {
    const listener = (newState: MediaState) => setState(newState);
    mediaStateListeners.add(listener);
    
    // Start tracking on first use
    const cleanup = trackMediaDevices();
    
    return () => {
      mediaStateListeners.delete(listener);
      cleanup?.();
    };
  }, []);

  return state;
};

export const CameraActiveIndicator: React.FC<CameraActiveIndicatorProps> = ({
  className,
  position = 'top-right',
  minimal = false,
  forceShow = false,
}) => {
  const mediaState = useMediaActiveState();
  const isActive = mediaState.camera || mediaState.microphone || forceShow;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={cn(
            'fixed z-[9999] pointer-events-none',
            positionClasses[position],
            className
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-xl',
              'bg-background/80 border shadow-lg',
              mediaState.camera && 'border-red-500/50',
              !mediaState.camera && mediaState.microphone && 'border-amber-500/50'
            )}
          >
            {/* Camera Eye Indicator */}
            {mediaState.camera && (
              <motion.div
                className="relative"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {/* Pulsing glow */}
                <div className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
                
                {/* Eye icon */}
                <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-red-500">
                  <Eye className="w-4 h-4 text-white" />
                </div>
              </motion.div>
            )}

            {/* Microphone Indicator */}
            {mediaState.microphone && (
              <motion.div
                className="relative"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <div className="absolute inset-0 rounded-full bg-amber-500/40 animate-pulse" />
                <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-amber-500">
                  <Mic className="w-4 h-4 text-white" />
                </div>
              </motion.div>
            )}

            {/* Labels (non-minimal mode) */}
            {!minimal && (
              <div className="flex flex-col text-xs">
                {mediaState.camera && (
                  <span className="text-red-400 font-medium">
                    {mediaState.cameraLabel || 'Camera ON'}
                  </span>
                )}
                {mediaState.microphone && (
                  <span className="text-amber-400 font-medium">
                    {mediaState.micLabel || 'Mic ON'}
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Standalone minimal eye for inline use
export const CameraEyeIcon: React.FC<{ isActive: boolean; size?: 'sm' | 'md' | 'lg' }> = ({
  isActive,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('relative inline-flex', sizeClasses[size])}>
      {isActive ? (
        <motion.div
          className="relative w-full h-full"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
          <div className="relative flex items-center justify-center w-full h-full rounded-full bg-red-500">
            <Eye className="w-3/4 h-3/4 text-white" />
          </div>
        </motion.div>
      ) : (
        <div className="flex items-center justify-center w-full h-full rounded-full bg-muted">
          <EyeOff className="w-3/4 h-3/4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default CameraActiveIndicator;
