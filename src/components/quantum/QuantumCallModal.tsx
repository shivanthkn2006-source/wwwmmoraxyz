// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM CALL MODAL - PROJECT CLAIRVOYANCE
// Full-screen modal wrapper for the Quantum Video UI
// Handles incoming call notifications and call state transitions
// Now accepts hook state from parent to avoid dual-instance issues
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, User, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantumVideoUI } from './QuantumVideoUI';
import { 
  CallParticipant, 
  CallEndReason, 
  CallState, 
  VideoState, 
  GodEyeAnalysis,
  CallSession,
} from '@/hooks/useZoeQuantumCall';
import { useToast } from '@/hooks/use-toast';
import type { CallNetworkDiagnostics } from '@/features/calls/callTransport';
import type { CallWordsEntry } from '@/features/calls/wordsOnlyMode';
import type { ZoeCallWhisper } from '@/features/calls/zoeCallThinking';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

// Hook state passed from parent
export interface QuantumCallHookState {
  callState: CallState;
  currentCall: CallSession | null;
  incomingCall: CallParticipant | null;
  isMuted: boolean;
  isSpeaking: boolean;
  remoteIsSpeaking: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  video: VideoState;
  godEyeEnabled: boolean;
  lastGodEyeAnalysis: GodEyeAnalysis | null;
  isInCall: boolean;
  hasIncomingCall: boolean;
  callDuration: number;
  error: string | null;
  networkDiagnostics: CallNetworkDiagnostics;
  dataChannelState: RTCDataChannelState | 'unavailable';
  wordsOnlyMode: boolean;
  wordsTranscript: CallWordsEntry[];
  zoeWhisper: ZoeCallWhisper | null;
  // Actions
  initiateCall: (receiver: CallParticipant, withVideo?: boolean) => Promise<void>;
  acceptCall: (withVideo?: boolean) => Promise<void>;
  rejectCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  setLowDataMode: (enabled: boolean) => Promise<void>;
  setWordsOnlyMode: (enabled: boolean) => Promise<void>;
  sendCallWords: (text: string) => boolean;
  setLocalVideoRef: (el: HTMLVideoElement | null) => void;
  setRemoteVideoRef: (el: HTMLVideoElement | null) => void;
  startGodEye: () => void;
  stopGodEye: () => void;
  endCall: (reason?: CallEndReason) => Promise<void>;
  cleanupAllMedia?: () => void; // Master cleanup function
}

interface QuantumCallModalProps {
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  // Hook state passed from parent - REQUIRED
  quantumCallState: QuantumCallHookState;
  // For outgoing calls
  targetParticipant?: CallParticipant;
  autoStart?: boolean;
  startWithVideo?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INCOMING CALL UI
// ═══════════════════════════════════════════════════════════════════════════════

const IncomingCallUI: React.FC<{
  caller: CallParticipant | null;
  onAccept: (withVideo: boolean) => void;
  onReject: () => void;
}> = ({ caller, onAccept, onReject }) => {
  if (!caller) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/70 text-white backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Animated rings - CSS only */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="absolute rounded-full border border-white/20 animate-gpu-ring-expand-fade"
            style={{ 
              width: 150, 
              height: 150,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Caller avatar - CSS animation */}
        <div className="relative animate-gpu-pulse-scale-sm">
          <div className="w-32 h-32 rounded-full bg-white/[0.08] flex items-center justify-center overflow-hidden shadow-2xl shadow-black/20 backdrop-blur-2xl">
            {caller.avatarUrl ? (
              <img
                src={caller.avatarUrl}
                alt={caller.displayName}
                className="w-full h-full object-cover"
              />
            ) : caller.isAI ? (
              <div className="w-full h-full bg-white/10">
                <Sparkles className="w-12 h-12 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            ) : (
              <User className="w-16 h-16 text-white/60" />
            )}
          </div>

          {/* Pulsing ring - CSS animation */}
          <div className="absolute inset-0 rounded-full border border-white/40 animate-gpu-ring-pulse" />
        </div>

        {/* Caller info */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-1">
            {caller.displayName || (caller.isAI ? 'Zoe AI' : 'Unknown Caller')}
          </h2>
          <p className="text-white/60 animate-gpu-pulse-opacity">
            Incoming quantum call...
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-6">
          {/* Reject */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="lg"
              className="w-16 h-16 rounded-full bg-white/[0.08] text-white backdrop-blur-2xl hover:bg-white/15 hover:text-white"
              aria-label="Reject call"
              onClick={onReject}
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
          </motion.div>

          {/* Accept with video */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="lg"
              className="w-20 h-20 rounded-full bg-white/[0.12] text-white backdrop-blur-2xl hover:bg-white/20 hover:text-white"
              aria-label="Accept video call"
              onClick={() => onAccept(true)}
            >
              <Video className="w-8 h-8" />
            </Button>
          </motion.div>

          {/* Accept audio only */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="lg"
              className="w-16 h-16 rounded-full bg-white/[0.08] text-white backdrop-blur-2xl hover:bg-white/15 hover:text-white"
              aria-label="Accept audio call"
              onClick={() => onAccept(false)}
            >
              <Phone className="w-7 h-7" />
            </Button>
          </motion.div>
        </div>

        {/* Instructions */}
        <p className="text-sm text-white/60 text-center max-w-xs">
          Accept with <Video className="w-4 h-4 inline mx-1" /> for video or{' '}
          <Phone className="w-4 h-4 inline mx-1" /> for audio only
        </p>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const QuantumCallModal: React.FC<QuantumCallModalProps> = ({
  currentUserId,
  isOpen,
  onClose,
  quantumCallState,
  targetParticipant,
  autoStart = false,
  startWithVideo = false,
}) => {
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Destructure from parent-provided hook state (no duplicate hook instance!)
  const {
    callState,
    currentCall,
    incomingCall,
    isMuted,
    isSpeaking,
    remoteIsSpeaking,
    connectionQuality,
    video,
    godEyeEnabled,
    lastGodEyeAnalysis,
    isInCall,
    hasIncomingCall,
    callDuration,
    initiateCall,
    acceptCall,
    rejectCall,
    toggleMute,
    toggleVideo,
    setLowDataMode,
    setLocalVideoRef,
    setRemoteVideoRef,
    startGodEye,
    stopGodEye,
    endCall,
    error,
    networkDiagnostics,
    dataChannelState,
    wordsOnlyMode,
    wordsTranscript,
    zoeWhisper,
    setWordsOnlyMode,
    sendCallWords,
  } = quantumCallState;

  // Auto-start call if configured
  useEffect(() => {
    if (autoStart && targetParticipant && isOpen && callState === 'idle') {
      initiateCall(targetParticipant, startWithVideo);
    }
  }, [autoStart, targetParticipant, isOpen, callState, initiateCall, startWithVideo]);

  // Show error toasts
  useEffect(() => {
    if (error) {
      toast({
        title: 'Call Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Close modal when call ends
  useEffect(() => {
    if (callState === 'ended' && !hasIncomingCall) {
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [callState, hasIncomingCall, onClose]);

  // Handle accept with video option
  const handleAcceptCall = useCallback(async (withVideo: boolean) => {
    await acceptCall(withVideo);
  }, [acceptCall]);

  // Handle reject
  const handleRejectCall = useCallback(async () => {
    await rejectCall();
    onClose();
  }, [rejectCall, onClose]);

  // Handle end call
  const handleEndCall = useCallback(async (reason?: CallEndReason) => {
    await endCall(reason);
  }, [endCall]);

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // iOS Safari may not expose the Fullscreen API; the call remains viewport-filling.
    }
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  // Get participant info
  const participant = currentCall?.receiver || incomingCall || targetParticipant;

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {/* Incoming call screen */}
      {hasIncomingCall && (
        <IncomingCallUI
          caller={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Active call / Outgoing call screen */}
      {(isInCall || callState === 'requesting') && (
        <>
          {/* Close button - Fixed top right (visible in all views) */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="End call"
            className="fixed top-[max(.75rem,env(safe-area-inset-top))] right-3 z-[10110] w-11 h-11 rounded-full bg-white/[0.08] text-white backdrop-blur-2xl shadow-xl hover:bg-white/15 hover:text-white"
            onClick={() => {
              handleEndCall('user_hangup');
              onClose();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
          
          <motion.div
              className="fixed inset-0 z-[10100] bg-transparent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <QuantumVideoUI
                callState={callState}
                connectionQuality={connectionQuality}
                callDuration={callDuration}
                participantName={participant?.displayName}
                participantAvatar={participant?.avatarUrl}
                isAICall={participant?.isAI}
                isMuted={isMuted}
                isSpeaking={isSpeaking}
                remoteIsSpeaking={remoteIsSpeaking}
                onToggleMute={toggleMute}
                videoEnabled={video.isEnabled}
                videoQuality={video.localQuality}
                isLowDataMode={video.isLowDataMode}
                currentBitrate={video.currentBitrate}
                codec={video.codec}
                networkDiagnostics={networkDiagnostics}
                dataChannelState={dataChannelState}
                wordsOnlyMode={wordsOnlyMode}
                wordsTranscript={wordsTranscript}
                zoeWhisper={zoeWhisper}
                onToggleVideo={toggleVideo}
                onSetLowDataMode={setLowDataMode}
                onSetWordsOnlyMode={setWordsOnlyMode}
                onSendCallWords={sendCallWords}
                onSetLocalVideoRef={setLocalVideoRef}
                onSetRemoteVideoRef={setRemoteVideoRef}
                godEyeEnabled={godEyeEnabled}
                lastGodEyeAnalysis={lastGodEyeAnalysis}
                onStartGodEye={startGodEye}
                onStopGodEye={stopGodEye}
                onEndCall={handleEndCall}
                isFullscreen={isFullscreen}
                onToggleFullscreen={handleToggleFullscreen}
              />
          </motion.div>
        </>
      )}

      {/* Call ended screen */}
      {callState === 'ended' && !hasIncomingCall && (
        <motion.div
          className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/70 text-white backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="text-center">
            <motion.div
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/[0.08] flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <PhoneOff className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-xl font-semibold text-white mb-2">Call Ended</h2>
            <p className="text-white/60">
              Duration: {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuantumCallModal;
