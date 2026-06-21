/**
 * useZoeMediaAccess - React hook for Zoe voice/camera/audio access
 * Provides one-click activation for all Zoe Orb media features
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  activateZoeMedia,
  requestMicrophone,
  requestCamera,
  releaseMicrophone,
  releaseCamera,
  releaseAllMedia,
  warmUpAudio,
  resumeAudio,
  wasMediaActivated,
  getMediaState,
  createZoeSpeechRecognition,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  type ZoeMediaActivationResult,
  type SpeechRecognitionConfig,
} from '@/utils/zoeMediaAccess';
import { toast } from 'sonner';

export interface UseZoeMediaAccessOptions {
  autoActivate?: boolean;
  requestCamera?: boolean;
  showToasts?: boolean;
}

export interface ZoeMediaAccessState {
  isActivated: boolean;
  isActivating: boolean;
  microphoneGranted: boolean;
  cameraGranted: boolean;
  audioReady: boolean;
  errors: string[];
  speechRecognitionSupported: boolean;
  speechSynthesisSupported: boolean;
}

export interface ZoeMediaAccessActions {
  activate: (options?: { microphone?: boolean; camera?: boolean }) => Promise<ZoeMediaActivationResult>;
  requestMic: () => Promise<boolean>;
  requestCam: () => Promise<boolean>;
  releaseMic: () => void;
  releaseCam: () => void;
  releaseAll: () => void;
  warmUp: () => Promise<boolean>;
  createSpeechRecognition: (config?: SpeechRecognitionConfig) => any | null;
}

/**
 * React hook for Zoe voice/audio/camera access
 */
export const useZoeMediaAccess = (
  options: UseZoeMediaAccessOptions = {}
): ZoeMediaAccessState & ZoeMediaAccessActions => {
  const { autoActivate = false, requestCamera: reqCam = false, showToasts = true } = options;
  
  const [state, setState] = useState<ZoeMediaAccessState>({
    isActivated: wasMediaActivated(),
    isActivating: false,
    microphoneGranted: false,
    cameraGranted: false,
    audioReady: false,
    errors: [],
    speechRecognitionSupported: isSpeechRecognitionSupported(),
    speechSynthesisSupported: isSpeechSynthesisSupported(),
  });
  
  const activationRef = useRef(false);
  
  // Check current state on mount
  useEffect(() => {
    const mediaState = getMediaState();
    setState(prev => ({
      ...prev,
      microphoneGranted: mediaState.microphone === 'granted',
      cameraGranted: mediaState.camera === 'granted',
      audioReady: mediaState.isWarmedUp,
    }));
  }, []);
  
  // Listen for media activation events
  useEffect(() => {
    const handleMediaActivated = (event: CustomEvent<ZoeMediaActivationResult>) => {
      const result = event.detail;
      setState(prev => ({
        ...prev,
        isActivated: result.allGranted || result.microphone || result.camera,
        isActivating: false,
        microphoneGranted: result.microphone,
        cameraGranted: result.camera,
        audioReady: result.audio,
        errors: result.errors,
      }));
    };
    
    window.addEventListener('zoe-media-activated', handleMediaActivated as EventListener);
    return () => window.removeEventListener('zoe-media-activated', handleMediaActivated as EventListener);
  }, []);
  
  // Auto-activate if requested
  useEffect(() => {
    if (autoActivate && !activationRef.current && !state.isActivated) {
      activationRef.current = true;
      activate({ microphone: true, camera: reqCam });
    }
  }, [autoActivate, reqCam]);
  
  /**
   * Activate Zoe media (one-click)
   */
  const activate = useCallback(async (
    opts: { microphone?: boolean; camera?: boolean } = { microphone: true, camera: false }
  ): Promise<ZoeMediaActivationResult> => {
    setState(prev => ({ ...prev, isActivating: true, errors: [] }));
    
    const result = await activateZoeMedia(opts);
    
    setState(prev => ({
      ...prev,
      isActivated: result.allGranted || result.microphone || result.camera,
      isActivating: false,
      microphoneGranted: result.microphone,
      cameraGranted: result.camera,
      audioReady: result.audio,
      errors: result.errors,
    }));
    
    if (showToasts) {
      if (result.allGranted) {
        toast.success('Voice ready', { description: 'Zoe is listening', duration: 2000 });
      } else if (result.errors.length > 0) {
        toast.error('Permission needed', { description: result.errors[0], duration: 3000 });
      }
    }
    
    return result;
  }, [showToasts]);
  
  /**
   * Request microphone only
   */
  const requestMic = useCallback(async (): Promise<boolean> => {
    const result = await requestMicrophone();
    setState(prev => ({ 
      ...prev, 
      microphoneGranted: result.granted,
      errors: result.error ? [...prev.errors, result.error] : prev.errors,
    }));
    return result.granted;
  }, []);
  
  /**
   * Request camera only
   */
  const requestCam = useCallback(async (): Promise<boolean> => {
    const result = await requestCamera();
    setState(prev => ({ 
      ...prev, 
      cameraGranted: result.granted,
      errors: result.error ? [...prev.errors, result.error] : prev.errors,
    }));
    return result.granted;
  }, []);
  
  /**
   * Release microphone
   */
  const releaseMic = useCallback(() => {
    releaseMicrophone();
    setState(prev => ({ ...prev, microphoneGranted: false }));
  }, []);
  
  /**
   * Release camera
   */
  const releaseCam = useCallback(() => {
    releaseCamera();
    setState(prev => ({ ...prev, cameraGranted: false }));
  }, []);
  
  /**
   * Release all media
   */
  const releaseAll = useCallback(() => {
    releaseAllMedia();
    setState(prev => ({
      ...prev,
      isActivated: false,
      microphoneGranted: false,
      cameraGranted: false,
      audioReady: false,
    }));
  }, []);
  
  /**
   * Warm up audio engine
   */
  const warmUp = useCallback(async (): Promise<boolean> => {
    const ready = await warmUpAudio();
    setState(prev => ({ ...prev, audioReady: ready }));
    return ready;
  }, []);
  
  /**
   * Create speech recognition instance
   */
  const createSpeechRecognitionInstance = useCallback((config?: SpeechRecognitionConfig) => {
    return createZoeSpeechRecognition(config);
  }, []);
  
  return {
    ...state,
    activate,
    requestMic,
    requestCam,
    releaseMic,
    releaseCam,
    releaseAll,
    warmUp,
    createSpeechRecognition: createSpeechRecognitionInstance,
  };
};

export default useZoeMediaAccess;
