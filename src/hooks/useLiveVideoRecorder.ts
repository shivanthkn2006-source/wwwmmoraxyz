// ═══════════════════════════════════════════════════════════════════════════════
// LIVE VIDEO RECORDER HOOK - 1-minute max video capture for Zoe Orb
// Quick capture with optimized settings for fast processing
// FIXED: Improved video preview and error handling
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface VideoRecordingResult {
  file: File;
  preview: string;
  duration: number;
}

export const useLiveVideoRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const maxDurationRef = useRef<number>(60); // 60 seconds max
  const autoStopTriggeredRef = useRef<boolean>(false);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[LiveVideo] Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [stopStream]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      setIsInitializing(true);
      autoStopTriggeredRef.current = false;
      
      console.log('[LiveVideo] Requesting camera + audio permissions...');
      
      // Request camera + audio permissions with fallbacks
      let stream: MediaStream;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
      } catch (firstError) {
        console.warn('[LiveVideo] HD video failed, trying lower resolution:', firstError);
        // Fallback to lower resolution
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user'
            },
            audio: true
          });
        } catch (secondError) {
          console.warn('[LiveVideo] Video with audio failed, trying video only:', secondError);
          // Try video only
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
          });
        }
      }
      
      streamRef.current = stream;
      chunksRef.current = [];
      setHasPermission(true);
      
      console.log('[LiveVideo] Stream obtained:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      
      // Determine best supported format for fast processing
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];
      
      let selectedMimeType = 'video/webm';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      console.log('[LiveVideo] Using MIME type:', selectedMimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('[LiveVideo] Chunk received:', event.data.size, 'bytes');
        }
      };
      
      mediaRecorder.onerror = (error) => {
        console.error('[LiveVideo] MediaRecorder error:', error);
        toast.error('Recording error occurred');
        stopStream();
        setIsRecording(false);
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);
      setIsInitializing(false);
      
      // Update duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
        
        // Auto-stop at max duration
        if (elapsed >= maxDurationRef.current && !autoStopTriggeredRef.current) {
          autoStopTriggeredRef.current = true;
          toast.info('Maximum recording time reached (1 minute)');
          // Let the component handle stopping
        }
      }, 100);
      
      console.log('[LiveVideo] Recording started successfully');
      return true;
      
    } catch (error) {
      console.error('[LiveVideo] Failed to start:', error);
      setIsInitializing(false);
      setHasPermission(false);
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          toast.error('Camera permission denied. Please enable camera access in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          toast.error('No camera found on this device.');
        } else if (error.name === 'NotReadableError') {
          toast.error('Camera is being used by another application.');
        } else {
          toast.error('Failed to access camera: ' + error.message);
        }
      } else {
        toast.error('Failed to start video recording');
      }
      
      return false;
    }
  }, [stopStream]);

  const stopRecording = useCallback(async (): Promise<VideoRecordingResult | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        console.log('[LiveVideo] No active recording to stop');
        stopStream();
        setIsRecording(false);
        setRecordingDuration(0);
        resolve(null);
        return;
      }
      
      mediaRecorder.onstop = () => {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        if (chunksRef.current.length === 0) {
          console.error('[LiveVideo] No data chunks recorded');
          stopStream();
          setIsRecording(false);
          setRecordingDuration(0);
          toast.error('No video data recorded');
          resolve(null);
          return;
        }
        
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `zoe-video-${Date.now()}.webm`, { type: 'video/webm' });
        const preview = URL.createObjectURL(blob);
        
        stopStream();
        setIsRecording(false);
        setRecordingDuration(0);
        
        console.log('[LiveVideo] Recording stopped, duration:', duration, 'seconds, size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        
        resolve({
          file,
          preview,
          duration
        });
      };
      
      try {
        mediaRecorder.stop();
      } catch (e) {
        console.error('[LiveVideo] Error stopping recorder:', e);
        stopStream();
        setIsRecording(false);
        setRecordingDuration(0);
        resolve(null);
      }
    });
  }, [stopStream]);

  const cancelRecording = useCallback(() => {
    console.log('[LiveVideo] Cancelling recording...');
    const mediaRecorder = mediaRecorderRef.current;
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
      } catch (e) {
        // Ignore stop errors during cancel
      }
    }
    
    stopStream();
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
    
    toast.info('Video recording cancelled');
  }, [stopStream]);

  const getVideoStream = useCallback((): MediaStream | null => {
    return streamRef.current;
  }, []);

  // Check if max duration reached
  const isMaxDurationReached = recordingDuration >= maxDurationRef.current;

  return {
    isRecording,
    isInitializing,
    recordingDuration,
    maxDuration: maxDurationRef.current,
    hasPermission,
    isMaxDurationReached,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
    getVideoStream
  };
};
