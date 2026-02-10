// ═══════════════════════════════════════════════════════════════════════════════
// ZOE CHAT VISION - Continuous Camera Analysis for Chat
// "God Eye" for regular chat - Zoe can see through your camera while chatting
// Analyzes frames every 5 seconds when enabled, passes context to zoe-chat
// 
// INTEGRATES WITH: GlobalMediaContext (ONE EAR PROTOCOL)
// Uses global video stream when available to avoid duplicate permission requests
// 
// SUPPORTS: Front/Back camera flip for all devices
// MacBook Pro/Air, Samsung M05, Samsung Tab A7, iPhone 11, etc.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalMediaSafe } from '@/contexts/GlobalMediaContext';
import { toast } from 'sonner';
import { useCameraDevices, type CameraDevice } from '@/hooks/useCameraDevices';

export interface VisionAnalysis {
  timestamp: number;
  objects: string[];
  scene: string;
  emotional_sentiment: string;
  summary: string;
  zoe_response?: string;
}

export interface ChatVisionState {
  isEnabled: boolean;
  isAnalyzing: boolean;
  hasPermission: boolean | null;
  lastAnalysis: VisionAnalysis | null;
  analysisCount: number;
  error: string | null;
  currentCameraFacing: 'front' | 'back' | 'unknown';
}

const ANALYSIS_INTERVAL_MS = 5000; // Analyze every 5 seconds

export const useZoeChatVision = () => {
  // Try to use global media context (ONE EAR PROTOCOL)
  const globalMedia = useGlobalMediaSafe();
  
  // Camera devices for front/back selection
  const cameraDevices = useCameraDevices();
  
  const [state, setState] = useState<ChatVisionState>({
    isEnabled: false,
    isAnalyzing: false,
    hasPermission: null,
    lastAnalysis: null,
    analysisCount: 0,
    error: null,
    currentCameraFacing: 'back', // Default to back camera for object recognition
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const usingGlobalStreamRef = useRef<boolean>(false);
  const preferredFacingRef = useRef<'front' | 'back'>('back'); // User preference

  // Create hidden canvas for frame capture
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 640;
      canvasRef.current.height = 480;
    }
  }, []);

  // Capture current frame as base64
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) {
      console.warn('[ChatVision] captureFrame: video or canvas ref not ready');
      return null;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Check if video is ready
    if (video.readyState < 2) {
      console.warn('[ChatVision] captureFrame: video not ready, readyState:', video.readyState);
      return null;
    }
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('[ChatVision] captureFrame: video dimensions are 0');
      return null;
    }
    
    // Keep enough resolution for object recognition, but avoid huge payloads
    const maxW = 1280;
    const maxH = 720;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const scale = Math.min(1, maxW / vw, maxH / vh);
    canvas.width = Math.max(1, Math.round(vw * scale));
    canvas.height = Math.max(1, Math.round(vh * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[ChatVision] captureFrame: failed to get canvas context');
      return null;
    }

    // Favor clarity over size (blurry frames kill recognition)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Higher JPEG quality to preserve edges for the model
    const frameData = canvas.toDataURL('image/jpeg', 0.92);
    console.log('[ChatVision] Frame captured, size:', Math.round(frameData.length / 1024), 'KB', '| dims:', canvas.width, 'x', canvas.height);
    return frameData;
  }, []);

  // Analyze frame with zoe-perception
  const analyzeFrame = useCallback(async (frameData: string): Promise<VisionAnalysis | null> => {
    try {
      console.log('[ChatVision] Analyzing frame with zoe-perception...');
      setState(prev => ({ ...prev, isAnalyzing: true }));

      const { data, error } = await supabase.functions.invoke('zoe-perception', {
        body: {
          media_type: 'image',
          media_data: frameData,
          context: 'Live camera chat vision - Zoe is observing through your camera during conversation',
          cross_reference: false,
        },
      });

      if (error) {
        console.error('[ChatVision] Analysis error:', error);
        setState(prev => ({ ...prev, isAnalyzing: false, error: error.message }));
        // Only show toast on first error
        if (!state.error) {
          toast.error('Vision analysis failed: ' + error.message);
        }
        return null;
      }

      if (!data?.success) {
        console.warn('[ChatVision] Analysis unsuccessful:', data?.error || 'No success flag');
        setState(prev => ({ ...prev, isAnalyzing: false, error: data?.error || 'Analysis failed' }));
        return null;
      }

      const analysis: VisionAnalysis = {
        timestamp: Date.now(),
        objects: data.analysis?.objects || [],
        scene: data.analysis?.scene || 'Unknown',
        emotional_sentiment: data.analysis?.emotional_sentiment || 'neutral',
        summary: data.analysis?.summary || '',
        zoe_response: data.zoe_response,
      };

      console.log('[ChatVision] ✓ Frame analyzed:', analysis.scene, '| Objects:', analysis.objects.slice(0, 3).join(', '));
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        lastAnalysis: analysis,
        analysisCount: prev.analysisCount + 1,
        error: null,
      }));

      // Dispatch event for other components to listen
      window.dispatchEvent(new CustomEvent('zoe-chat-vision-update', {
        detail: analysis,
      }));

      return analysis;
    } catch (err) {
      console.error('[ChatVision] Failed to analyze frame:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        error: errorMsg,
      }));
      return null;
    }
  }, [state.error]);

  // Start continuous vision - uses camera devices hook for front/back selection
  const startVision = useCallback(async (facing?: 'front' | 'back') => {
    if (state.isEnabled) {
      console.log('[ChatVision] Vision already enabled, skipping start');
      return;
    }

    const targetFacing = facing ?? preferredFacingRef.current;
    console.log(`[ChatVision] ═══ STARTING GOD EYE VISION (${targetFacing} camera) ═══`);

    try {
       let stream: MediaStream | null = null;
       let actualFacing: 'front' | 'back' | 'unknown' = 'unknown';

       // 1) Try to get stream using camera devices hook (hardware-aware)
       stream = await cameraDevices.getStream(targetFacing, { width: 1280, height: 720 });
       if (stream) {
         actualFacing = targetFacing;
         usingGlobalStreamRef.current = false;
         console.log(`[ChatVision] ✓ Got stream from cameraDevices (${targetFacing})`);
       }

       // 2) If that fails, fall back to global media context
       if (!stream && globalMedia) {
         console.log('[ChatVision] Falling back to GlobalMediaContext for video stream');
         try {
           stream = await globalMedia.getOrCreateVideoStream();
           if (stream && stream.active) {
             console.log('[ChatVision] ✓ Got stream from GlobalMediaContext');
             usingGlobalStreamRef.current = true;
             actualFacing = 'front'; // Global media typically uses front camera
           } else {
             console.warn('[ChatVision] GlobalMediaContext stream is null or inactive');
             stream = null;
           }
         } catch (globalErr) {
           console.warn('[ChatVision] GlobalMediaContext failed:', globalErr);
           stream = null;
         }
       }

       // 3) Final fallback: basic getUserMedia
       if (!stream) {
         try {
           console.log('[ChatVision] Trying basic getUserMedia fallback...');
           stream = await navigator.mediaDevices.getUserMedia({
             video: {
               width: { ideal: 1280 },
               height: { ideal: 720 },
               facingMode: targetFacing === 'back' ? 'environment' : 'user',
             },
             audio: false,
           });
           if (stream) {
             actualFacing = targetFacing;
             usingGlobalStreamRef.current = false;
             console.log('[ChatVision] ✓ Got stream from basic fallback');
           }
         } catch (fallbackErr) {
           console.warn('[ChatVision] Basic fallback failed:', fallbackErr);
         }
       }

       if (!stream) {
         toast.error('Camera access denied or no camera available');
         setState(prev => ({
           ...prev,
           isEnabled: false,
           hasPermission: false,
           error: 'No camera stream available',
         }));
         return;
       }

       // Update preference
       preferredFacingRef.current = actualFacing === 'unknown' ? targetFacing : actualFacing;

      // Best-effort: request continuous autofocus / disable aggressive exposure shifts when supported
      try {
        const track = stream.getVideoTracks()[0];
        if (track?.applyConstraints) {
          await track.applyConstraints({
            advanced: [
              // These are ignored by browsers/devices that don't support them.
              { focusMode: 'continuous' as any },
              { exposureMode: 'continuous' as any },
              { whiteBalanceMode: 'continuous' as any },
            ],
          } as any);
          console.log('[ChatVision] ✓ Applied advanced camera constraints (best-effort)');
        }
      } catch (e) {
        console.log('[ChatVision] Advanced camera constraints not supported on this device');
      }

      streamRef.current = stream;

      // Create hidden video element (MUST be in DOM for iOS/Safari reliability)
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        videoRef.current.style.position = 'fixed';
        videoRef.current.style.left = '-9999px';
        videoRef.current.style.top = '0';
        videoRef.current.style.width = '1px';
        videoRef.current.style.height = '1px';
        videoRef.current.style.opacity = '0';
        document.body.appendChild(videoRef.current);
      }

      videoRef.current.srcObject = stream;

      // Kick playback immediately (some browsers never fire loadedmetadata for offscreen video)
      try {
        await videoRef.current.play();
        console.log('[ChatVision] ✓ video.play() initiated');
      } catch (e) {
        console.warn('[ChatVision] video.play() blocked until user gesture');
      }

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current!;
        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout'));
        }, 10000);

        const finalize = () => {
          clearTimeout(timeout);
          console.log('[ChatVision] ✓ Video ready, dimensions:', video.videoWidth, 'x', video.videoHeight);
          resolve();
        };

        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch {
            // ignore
          }
          finalize();
        };

        video.onloadeddata = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) finalize();
        };

        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Video element error'));
        };
      });

      console.log('[ChatVision] ✓ Camera started successfully, beginning analysis loop');
      toast.success('👁️ God Eye activated - Zoe can see you now');
      
      // Log to Zoe core that God Eye is now active
      window.dispatchEvent(new CustomEvent('zoe-god-eye-activated', {
        detail: { timestamp: Date.now() }
      }));
      
      setState(prev => ({
        ...prev,
        isEnabled: true,
        hasPermission: true,
        error: null,
        currentCameraFacing: actualFacing,
      }));

      // Start analysis interval - runs every ANALYSIS_INTERVAL_MS
      intervalRef.current = setInterval(async () => {
        const frame = captureFrame();
        if (frame) {
          await analyzeFrame(frame);
        } else {
          console.warn('[ChatVision] Failed to capture frame in interval');
        }
      }, ANALYSIS_INTERVAL_MS);

      // Do an immediate first analysis after a short delay for video to stabilize
      // This is CRITICAL for the greeting system to work immediately
      setTimeout(async () => {
        console.log('[ChatVision] Performing INITIAL analysis for greeting...');
        const frame = captureFrame();
        if (frame) {
          const result = await analyzeFrame(frame);
          if (result) {
            console.log('[ChatVision] ✓ Initial analysis complete - greeting system should trigger');
            // Dispatch a specific event for first analysis (greeting hook listens for this)
            window.dispatchEvent(new CustomEvent('zoe-chat-vision-first-analysis', {
              detail: result,
            }));
          } else {
            console.warn('[ChatVision] Initial analysis returned null - will retry in interval');
          }
        } else {
          console.warn('[ChatVision] Failed to capture initial frame - retrying in 1s');
          // Retry once more after another second
          setTimeout(async () => {
            const retryFrame = captureFrame();
            if (retryFrame) {
              const retryResult = await analyzeFrame(retryFrame);
              if (retryResult) {
                window.dispatchEvent(new CustomEvent('zoe-chat-vision-first-analysis', {
                  detail: retryResult,
                }));
              }
            }
          }, 1000);
        }
      }, 1200);

    } catch (err) {
      console.error('[ChatVision] ✗ Failed to start camera:', err);
      const errorMsg = err instanceof Error ? err.message : 'Camera access denied';
      toast.error('Failed to start God Eye: ' + errorMsg);
      setState(prev => ({
        ...prev,
        isEnabled: false,
        hasPermission: false,
        error: errorMsg,
      }));
    }
  }, [state.isEnabled, captureFrame, analyzeFrame, globalMedia, cameraDevices]);

  // Stop vision - respects GlobalMediaContext (don't release global streams)
  const stopVision = useCallback(() => {
    console.log('[ChatVision] ═══ STOPPING GOD EYE VISION ═══');
    console.log('[ChatVision] Total analyses performed:', state.analysisCount);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('[ChatVision] ✓ Cleared analysis interval');
    }

    // Only release stream if we're NOT using the global context's stream
    // This prevents killing the shared video stream that other components may use
    if (streamRef.current && !usingGlobalStreamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[ChatVision] ✓ Stopped track:', track.kind);
      });
    }
    streamRef.current = null;
    usingGlobalStreamRef.current = false;

     if (videoRef.current) {
       videoRef.current.srcObject = null;
       // Remove hidden element from DOM (iOS/Safari reliability)
       if (videoRef.current.parentElement) {
         videoRef.current.parentElement.removeChild(videoRef.current);
       }
       videoRef.current = null;
     }
    
    // Log to Zoe core that God Eye is now deactivated
    window.dispatchEvent(new CustomEvent('zoe-god-eye-deactivated', {
      detail: { timestamp: Date.now(), analysisCount: state.analysisCount }
    }));

    toast.info('👁️ God Eye deactivated');

    setState(prev => ({
      ...prev,
      isEnabled: false,
      isAnalyzing: false,
    }));
  }, [state.analysisCount]);

  // Toggle vision
  const toggleVision = useCallback(async () => {
    if (state.isEnabled) {
      stopVision();
    } else {
      await startVision();
    }
  }, [state.isEnabled, startVision, stopVision]);

  // Flip between front and back cameras
  const flipCamera = useCallback(async () => {
    if (!state.isEnabled) {
      console.warn('[ChatVision] Cannot flip camera - vision not enabled');
      return;
    }

    const currentFacing = state.currentCameraFacing === 'unknown' ? preferredFacingRef.current : state.currentCameraFacing;
    const targetFacing = currentFacing === 'front' ? 'back' : 'front';

    console.log(`[ChatVision] Flipping camera: ${currentFacing} → ${targetFacing}`);
    toast.info(`Switching to ${targetFacing} camera...`);

    // Stop current stream
    if (streamRef.current && !usingGlobalStreamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    streamRef.current = null;

    // Update preference
    preferredFacingRef.current = targetFacing;

    // Get new stream with target facing
    const newStream = await cameraDevices.getStream(targetFacing, { width: 1280, height: 720 });
    
    if (!newStream) {
      // Fallback to basic getUserMedia
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: targetFacing === 'back' ? 'environment' : 'user',
          },
          audio: false,
        });
        streamRef.current = fallbackStream;
      } catch (err) {
        console.error('[ChatVision] Failed to flip camera:', err);
        toast.error('Failed to switch camera');
        return;
      }
    } else {
      streamRef.current = newStream;
      usingGlobalStreamRef.current = false;
    }

    // Apply autofocus constraints
    try {
      const track = streamRef.current?.getVideoTracks()[0];
      if (track?.applyConstraints) {
        await track.applyConstraints({
          advanced: [
            { focusMode: 'continuous' as any },
            { exposureMode: 'continuous' as any },
            { whiteBalanceMode: 'continuous' as any },
          ],
        } as any);
      }
    } catch (e) {
      console.log('[ChatVision] Advanced constraints not supported');
    }

    // Update video element
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      try {
        await videoRef.current.play();
      } catch (e) {
        console.warn('[ChatVision] video.play() blocked');
      }
    }

    setState(prev => ({
      ...prev,
      currentCameraFacing: targetFacing,
    }));

    toast.success(`Switched to ${targetFacing} camera`);
    console.log(`[ChatVision] ✓ Camera flipped to ${targetFacing}`);
  }, [state.isEnabled, state.currentCameraFacing, cameraDevices]);

  // Get context for zoe-chat soulMetrics
  // CRITICAL FIX: Return visionActive: true even if lastAnalysis is null, as long as camera is enabled
  // This ensures Zoe knows the camera is ON and can say "yes I can see" even before first analysis completes
  const getVisionContext = useCallback(() => {
    // If camera is enabled, vision is active - even before first analysis
    if (state.isEnabled) {
      return {
        visionActive: true,
        cameraEnabled: true,
        detectedEmotion: state.lastAnalysis?.emotional_sentiment || 'awaiting_analysis',
        visualContext: state.lastAnalysis ? {
          scene: state.lastAnalysis.scene,
          objects: state.lastAnalysis.objects,
          summary: state.lastAnalysis.summary,
        } : {
          scene: 'Camera active - analyzing...',
          objects: [],
          summary: 'Visual processing in progress. I can see through your camera.',
        },
        analysisCount: state.analysisCount,
        isAnalyzing: state.isAnalyzing,
      };
    }

    return {
      visionActive: false,
      cameraEnabled: false,
      detectedEmotion: undefined,
      visualContext: undefined,
    };
  }, [state.isEnabled, state.lastAnalysis, state.analysisCount, state.isAnalyzing]);

  // Manual frame capture for on-demand analysis
  const captureAndAnalyze = useCallback(async (): Promise<VisionAnalysis | null> => {
    if (!state.isEnabled) {
      console.warn('[ChatVision] Vision not enabled, starting temporarily...');
      await startVision();
      // Wait for camera to initialize
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const frame = captureFrame();
    if (!frame) {
      console.error('[ChatVision] Failed to capture frame');
      return null;
    }

    return analyzeFrame(frame);
  }, [state.isEnabled, startVision, captureFrame, analyzeFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    // State
    isEnabled: state.isEnabled,
    isAnalyzing: state.isAnalyzing,
    hasPermission: state.hasPermission,
    lastAnalysis: state.lastAnalysis,
    analysisCount: state.analysisCount,
    error: state.error,
    currentCameraFacing: state.currentCameraFacing,
    
    // Camera devices info
    availableCameras: cameraDevices.devices,
    hasMultipleCameras: cameraDevices.hasMultipleCameras,
    frontCamera: cameraDevices.frontCamera,
    backCamera: cameraDevices.backCamera,
    
    // Actions
    startVision,
    stopVision,
    toggleVision,
    flipCamera,
    captureAndAnalyze,
    
    // Context for zoe-chat
    getVisionContext,
  };
};
