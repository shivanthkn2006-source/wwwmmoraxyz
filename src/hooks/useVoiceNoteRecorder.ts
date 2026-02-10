/**
 * Voice Note Recorder Hook
 * Record audio voice notes for attachments in Zoe and other chats
 * Uses centralized mic permission manager for reliability
 */

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { requestMicPermission } from '@/utils/micPermissionManager';

interface VoiceNoteResult {
  blob: Blob;
  duration: number;
  file: File;
  preview: string;
}

export const useVoiceNoteRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      // Use centralized mic permission first
      const hasPermission = await requestMicPermission();
      if (!hasPermission) {
        toast.error('Microphone access required for voice notes');
        return false;
      }

      // Now get a fresh stream for recording
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;

      // Clear previous chunks
      audioChunksRef.current = [];
      setRecordingDuration(0);
      startTimeRef.current = Date.now();

      // Create MediaRecorder with best available format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      // Start duration timer
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      console.log('[VoiceNote] Recording started');
      return true;
    } catch (error) {
      console.error('[VoiceNote] Recording error:', error);
      toast.error('Could not access microphone. Please grant permission.');
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<VoiceNoteResult | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }

      setIsProcessing(true);

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const mediaRecorder = mediaRecorderRef.current;
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      mediaRecorder.onstop = () => {
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());

        // Create blob
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Create file
        const extension = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'm4a' : 'audio';
        const fileName = `voice-note-${Date.now()}.${extension}`;
        const file = new File([blob], fileName, { type: mimeType });

        // Create preview URL
        const preview = URL.createObjectURL(blob);

        console.log('[VoiceNote] Recording stopped, duration:', duration, 's, size:', blob.size);

        setIsRecording(false);
        setIsProcessing(false);
        audioChunksRef.current = [];

        resolve({
          blob,
          duration,
          file,
          preview,
        });
      };

      mediaRecorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop the stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);
    setIsProcessing(false);
    console.log('[VoiceNote] Recording cancelled');
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    recordingDuration,
    isProcessing,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  };
};
