// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM VIDEO UI - PROJECT CLAIRVOYANCE PHASE 2
// Holographic video call interface with liquid stream visualization
// Adaptive quality indicators, Picture-in-Picture, and God Eye analysis display
// Responsive: 4.1" mobile to 16K displays | Draggable controls
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Sparkles,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Zap,
  Camera,
  SwitchCamera,
  PictureInPicture2,
  Volume2,
  VolumeX,
  Settings,
  X,
  GripHorizontal,
  MoreHorizontal,
  MessageSquareText,
  MessagesSquare,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CallState, VideoQuality, GodEyeAnalysis } from '@/hooks/useZoeQuantumCall';
import { LowPowerCallWarning } from './LowPowerCallWarning';
import type { CallNetworkDiagnostics } from '@/features/calls/callTransport';
import type { CallWordsEntry } from '@/features/calls/wordsOnlyMode';
import type { ZoeCallWhisper } from '@/features/calls/zoeCallThinking';
import CallActivityStatusPanel from './CallActivityStatusPanel';

// Responsive sizing hook for call controls
const useResponsiveCallSize = () => {
  const [size, setSize] = useState<'xs' | 'sm' | 'md' | 'lg'>('md');
  
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width < 360) setSize('xs');       // 4.1" - 5" phones
      else if (width < 640) setSize('sm');  // 5" - 7.7" tablets
      else if (width < 1024) setSize('md'); // Tablets/small laptops
      else setSize('lg');                    // Large displays up to 16K
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  return size;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface QuantumVideoUIProps {
  // Call state
  callState: CallState;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  callDuration: number;
  
  // Participant info
  participantName?: string;
  participantAvatar?: string;
  currentUserId: string;
  participantId?: string;
  isAICall?: boolean;
  
  // Audio controls
  isMuted: boolean;
  isSpeaking: boolean;
  remoteIsSpeaking: boolean;
  onToggleMute: () => void;
  
  // Video controls
  videoEnabled: boolean;
  videoQuality: VideoQuality;
  isLowDataMode: boolean;
  currentBitrate: number;
  codec: string;
  networkDiagnostics: CallNetworkDiagnostics;
  dataChannelState: RTCDataChannelState | 'unavailable';
  wordsOnlyMode: boolean;
  wordsTranscript: CallWordsEntry[];
  zoeWhisper: ZoeCallWhisper | null;
  onToggleVideo: () => Promise<void>;
  onSetLowDataMode: (enabled: boolean) => void;
  onSetWordsOnlyMode: (enabled: boolean) => void;
  onToggleChat?: () => void;
  chatOpen?: boolean;
  onSendCallWords: (text: string) => boolean;
  
  // Video refs
  onSetLocalVideoRef: (el: HTMLVideoElement | null) => void;
  onSetRemoteVideoRef: (el: HTMLVideoElement | null) => void;
  
  // God Eye
  godEyeEnabled: boolean;
  lastGodEyeAnalysis: GodEyeAnalysis | null;
  onStartGodEye: () => void;
  onStopGodEye: () => void;
  
  // Actions
  onEndCall: (reason?: string) => Promise<void>;
  
  // Layout
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getQualityIcon = (quality: string) => {
  switch (quality) {
    case 'excellent': return SignalHigh;
    case 'good': return SignalMedium;
    case 'fair': return SignalLow;
    case 'poor': return Signal;
    default: return Signal;
  }
};

const getQualityColor = () => 'text-white';

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// Connection quality indicator with liquid animation
const QualityIndicator: React.FC<{
  quality: string;
  bitrate: number;
  codec: string;
  isLowDataMode: boolean;
}> = ({ quality, bitrate, codec, isLowDataMode }) => {
  const QualityIcon = getQualityIcon(quality);
  
  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] text-white backdrop-blur-2xl"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <QualityIcon className={cn('w-4 h-4', getQualityColor())} />
      <span className="text-xs font-medium text-white/90">
        {Math.round(bitrate / 1000)}kbps
      </span>
      {isLowDataMode && (
        <motion.span
          className="text-xs text-white/80 flex items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Zap className="w-3 h-3" />
          Low Data
        </motion.span>
      )}
      <span className="text-xs text-white/60">{codec}</span>
    </motion.div>
  );
};

// God Eye analysis overlay
const GodEyeOverlay: React.FC<{
  analysis: GodEyeAnalysis | null;
  isEnabled: boolean;
}> = ({ analysis, isEnabled }) => {
  if (!isEnabled || !analysis) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-4 left-4 right-4 max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <div className="bg-white/[0.08] text-white backdrop-blur-2xl rounded-2xl p-4 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-white" />
            <span className="text-xs font-semibold text-white">Zoe's Vision</span>
            <Sparkles className="w-3 h-3 text-white animate-pulse" />
          </div>
          
          <p className="text-sm text-white/90 mb-2">{analysis.scene}</p>
          
          {analysis.objects.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {analysis.objects.slice(0, 5).map((obj, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-white/10 text-white rounded-full"
                >
                  {obj}
                </span>
              ))}
            </div>
          )}
          
          {analysis.zoe_response && (
            <motion.p
              className="text-sm text-white/70 italic border-t border-white/10 pt-2 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              "{analysis.zoe_response}"
            </motion.p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Holographic speaking indicator
const SpeakingIndicator: React.FC<{ isActive: boolean; label?: string }> = ({ 
  isActive, 
  label 
}) => {
  if (!isActive) return null;
  
  return (
    <motion.div
      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white backdrop-blur-xl"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-0.5 h-3 bg-white rounded-full ${isActive ? `animate-gpu-audio-bar-${i}` : ''}`}
          />
        ))}
      </div>
      {label && <span className="text-xs text-white font-medium">{label}</span>}
    </motion.div>
  );
};

// Picture-in-Picture local video
const LocalVideoPreview: React.FC<{
  videoRef: (el: HTMLVideoElement | null) => void;
  isEnabled: boolean;
  quality: VideoQuality;
  isMuted: boolean;
}> = ({ videoRef, isEnabled, quality, isMuted }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const previewRef = useRef<HTMLDivElement>(null);
  
  return (
    <motion.div
      className={cn(
        "absolute w-32 h-24 md:w-40 md:h-30 rounded-xl overflow-hidden",
        "shadow-2xl shadow-black/30",
        "bg-white/[0.08] backdrop-blur-xl",
        isDragging ? "cursor-grabbing z-50" : "cursor-grab z-40"
      )}
      ref={previewRef}
      style={{ top: position.y, right: position.x }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        const width = previewRef.current?.offsetWidth ?? 128;
        const height = previewRef.current?.offsetHeight ?? 96;
        setPosition(prev => ({
          x: Math.min(Math.max(16, prev.x - info.offset.x), Math.max(16, window.innerWidth - width - 16)),
          y: Math.min(Math.max(16, prev.y + info.offset.y), Math.max(16, window.innerHeight - height - 16)),
        }));
      }}
      whileDrag={{ scale: 1.05 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {isEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black/20">
          <VideoOff className="w-6 h-6 text-white/70" />
        </div>
      )}
      
      {/* Quality badge */}
      <div className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] text-white bg-black/20 backdrop-blur-sm rounded">
        {quality}
      </div>
      
      {/* Muted indicator */}
      {isMuted && (
        <div className="absolute top-1 right-1 p-1 bg-white/15 rounded-full">
          <MicOff className="w-3 h-3 text-white" />
        </div>
      )}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DRAGGABLE CONTROL BAR - Responsive & Draggable call controls
// ═══════════════════════════════════════════════════════════════════════════════

interface DraggableControlBarProps {
  isMuted: boolean;
  onToggleMute: () => void;
  videoEnabled: boolean;
  onToggleVideo: () => Promise<void>;
  isLowDataMode: boolean;
  onSetLowDataMode: (enabled: boolean) => void;
  godEyeEnabled: boolean;
  onStartGodEye: () => void;
  onStopGodEye: () => void;
  isAICall?: boolean;
  isConnected: boolean;
  onEndCall: (reason?: string) => Promise<void>;
  onPiP: () => void;
  wordsOnlyMode: boolean;
  onSetWordsOnlyMode: (enabled: boolean) => void;
  onToggleChat?: () => void;
  chatOpen?: boolean;
}

const DraggableControlBar: React.FC<DraggableControlBarProps> = ({
  isMuted,
  onToggleMute,
  videoEnabled,
  onToggleVideo,
  isLowDataMode,
  onSetLowDataMode,
  godEyeEnabled,
  onStartGodEye,
  onStopGodEye,
  isAICall,
  isConnected,
  onEndCall,
  onPiP,
  wordsOnlyMode,
  onSetWordsOnlyMode,
  onToggleChat,
  chatOpen,
}) => {
  const responsiveSize = useResponsiveCallSize();
  const dragControls = useDragControls();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Get button sizes based on screen size - MORE COMPACT
  const getButtonSize = () => {
    switch (responsiveSize) {
      case 'xs': return 'w-8 h-8';
      case 'sm': return 'w-9 h-9';
      case 'md': return 'w-10 h-10';
      case 'lg': return 'w-10 h-10';
    }
  };

  const getEndButtonSize = () => {
    switch (responsiveSize) {
      case 'xs': return 'w-9 h-9';
      case 'sm': return 'w-10 h-10';
      case 'md': return 'w-11 h-11';
      case 'lg': return 'w-11 h-11';
    }
  };

  const getIconSize = () => {
    switch (responsiveSize) {
      case 'xs': return 'w-3.5 h-3.5';
      case 'sm': return 'w-4 h-4';
      case 'md': return 'w-4 h-4';
      case 'lg': return 'w-4 h-4';
    }
  };

  const getEndIconSize = () => {
    switch (responsiveSize) {
      case 'xs': return 'w-4 h-4';
      case 'sm': return 'w-4 h-4';
      case 'md': return 'w-5 h-5';
      case 'lg': return 'w-5 h-5';
    }
  };

  const getGap = () => {
    switch (responsiveSize) {
      case 'xs': return 'gap-1';
      case 'sm': return 'gap-1.5';
      case 'md': return 'gap-2';
      case 'lg': return 'gap-2';
    }
  };

  const getPadding = () => {
    switch (responsiveSize) {
      case 'xs': return 'px-2 py-1.5';
      case 'sm': return 'px-3 py-2';
      case 'md': return 'px-4 py-2';
      case 'lg': return 'px-4 py-2';
    }
  };

  const btnSize = getButtonSize();
  const endBtnSize = getEndButtonSize();
  const iconSize = getIconSize();
  const endIconSize = getEndIconSize();

  return (
    <motion.div 
      className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex flex-col items-center gap-2"
      drag
      dragMomentum={false}
      dragElastic={0.1}
      dragControls={dragControls}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        setPosition(prev => ({
          x: prev.x + info.offset.x,
          y: prev.y + info.offset.y,
        }));
      }}
      animate={{
        x: position.x,
        y: position.y,
      }}
      style={{ translateX: '-50%', maxWidth: 'calc(100vw - 1.5rem)' }}
    >
      <AnimatePresence>
      {isOpen && <motion.div
        className={cn(
          "flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-center rounded-3xl bg-white/[0.08] text-white backdrop-blur-2xl shadow-2xl shadow-black/20",
          "touch-none select-none",
          getGap(),
          getPadding(),
          isDragging && "bg-white/[0.14]"
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Drag handle */}
        <div 
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-foreground/10 rounded-full transition-colors"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripHorizontal className="w-3 h-3 text-white/50" />
        </div>

        {/* Mute toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("rounded-full text-white hover:bg-white/15 hover:text-white", btnSize)}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              onClick={onToggleMute}
            >
              {isMuted ? (
                <MicOff className={iconSize} />
              ) : (
                <Mic className={iconSize} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
        </Tooltip>

        {/* Video toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("rounded-full text-white hover:bg-white/15 hover:text-white", btnSize)}
              aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
              onClick={onToggleVideo}
            >
              {videoEnabled ? (
                <Video className={iconSize} />
              ) : (
                <VideoOff className={iconSize} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{videoEnabled ? 'Turn off camera' : 'Turn on camera'}</TooltipContent>
        </Tooltip>

        {/* God Eye toggle (only for AI calls) */}
        {isAICall && videoEnabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full",
                  btnSize,
                  "text-white hover:bg-white/15 hover:text-white",
                  godEyeEnabled && "bg-white/15"
                )}
                aria-label={godEyeEnabled ? 'Disable Zoe Vision' : 'Enable Zoe Vision'}
                onClick={godEyeEnabled ? onStopGodEye : onStartGodEye}
              >
                {godEyeEnabled ? (
                  <Eye className={iconSize} />
                ) : (
                  <EyeOff className={iconSize} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {godEyeEnabled ? 'Disable Zoe Vision' : 'Enable Zoe Vision'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* PiP button - hide on very small screens */}
        {document.pictureInPictureEnabled && isConnected && responsiveSize !== 'xs' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("rounded-full text-white hover:bg-white/15 hover:text-white", btnSize)}
                aria-label="Picture in Picture"
                onClick={onPiP}
              >
                <PictureInPicture2 className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Picture in Picture</TooltipContent>
          </Tooltip>
        )}

        {/* Low data mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-full",
                btnSize,
                "text-white hover:bg-white/15 hover:text-white",
                isLowDataMode && "bg-white/15"
              )}
              aria-label={isLowDataMode ? 'Use normal data mode' : 'Use low data mode'}
              onClick={() => onSetLowDataMode(!isLowDataMode)}
            >
              {isLowDataMode ? (
                <WifiOff className={iconSize} />
              ) : (
                <Wifi className={iconSize} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isLowDataMode ? 'Normal Mode' : 'Low Data Mode'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("rounded-full text-white hover:bg-white/15 hover:text-white", btnSize, wordsOnlyMode && "bg-white/15")}
              aria-label={wordsOnlyMode ? 'Leave words only mode' : 'Use words only mode'}
              onClick={() => onSetWordsOnlyMode(!wordsOnlyMode)}
            >
              <MessageSquareText className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{wordsOnlyMode ? 'Resume media' : 'Words only'}</TooltipContent>
        </Tooltip>

        {onToggleChat && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("rounded-full text-white hover:bg-white/15 hover:text-white", btnSize, chatOpen && "bg-white/15")}
                aria-label={chatOpen ? 'Hide chat with Zoe and your friend' : 'Chat with Zoe and your friend'}
                onClick={onToggleChat}
              >
                <MessagesSquare className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{chatOpen ? 'Hide chat' : 'Chat'}</TooltipContent>
          </Tooltip>
        )}

        {/* End call button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("rounded-full text-white hover:bg-white/20 hover:text-white", endBtnSize)}
              aria-label="End call"
              onClick={() => onEndCall('user_hangup')}
            >
              <PhoneOff className={endIconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>End Call</TooltipContent>
        </Tooltip>
      </motion.div>}
      </AnimatePresence>
      <Button
        variant="ghost"
        size="icon"
        aria-label={isOpen ? 'Close call controls' : 'Open call controls'}
        aria-expanded={isOpen}
        className="h-11 w-11 rounded-full bg-white/[0.08] text-white backdrop-blur-2xl shadow-xl hover:bg-white/15 hover:text-white"
        onClick={() => setIsOpen(value => !value)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-5 w-5" />}
      </Button>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const QuantumVideoUI: React.FC<QuantumVideoUIProps> = ({
  callState,
  connectionQuality,
  callDuration,
  participantName,
  participantAvatar,
  currentUserId,
  participantId,
  isAICall,
  isMuted,
  isSpeaking,
  remoteIsSpeaking,
  onToggleMute,
  videoEnabled,
  videoQuality,
  isLowDataMode,
  currentBitrate,
  codec,
  networkDiagnostics,
  dataChannelState,
  wordsOnlyMode,
  wordsTranscript,
  zoeWhisper,
  onToggleVideo,
  onSetLowDataMode,
  onSetWordsOnlyMode,
  onSendCallWords,
  onSetLocalVideoRef,
  onSetRemoteVideoRef,
  godEyeEnabled,
  lastGodEyeAnalysis,
  onStartGodEye,
  onStopGodEye,
  onEndCall,
  isFullscreen = false,
  onToggleFullscreen,
  className,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [durationTimer, setDurationTimer] = useState(0);
  const [wordsDraft, setWordsDraft] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);
  
  // Update duration timer
  useEffect(() => {
    if (callState !== 'connected') {
      setDurationTimer(0);
      return;
    }
    
    const interval = setInterval(() => {
      setDurationTimer(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [callState]);
  
  // Handle Picture-in-Picture
  const handlePiP = useCallback(async () => {
    const video = remoteVideoContainerRef.current?.querySelector('video');
    if (video && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      } catch (err) {
        console.error('PiP failed:', err);
      }
    }
  }, []);
  
  // Toggle God Eye based on AI call
  useEffect(() => {
    if (isAICall && videoEnabled && callState === 'connected' && !godEyeEnabled) {
      onStartGodEye();
    }
    
    return () => {
      if (godEyeEnabled) {
        onStopGodEye();
      }
    };
  }, [isAICall, videoEnabled, callState, godEyeEnabled, onStartGodEye, onStopGodEye]);

  const isConnected = callState === 'connected';
  const isConnecting = callState === 'connecting';

  const submitWords = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    if (onSendCallWords(wordsDraft)) setWordsDraft('');
  }, [onSendCallWords, wordsDraft]);

  return (
    <TooltipProvider>
      <motion.div
        className={cn(
          "relative w-full h-full min-h-[400px] overflow-hidden bg-transparent text-white",
          isFullscreen && "fixed inset-0 z-50 rounded-none",
          className
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        {/* Remote Video / Avatar Area */}
        <div
          ref={remoteVideoContainerRef}
          className="relative w-full h-full flex items-center justify-center"
        >
          {videoEnabled && isConnected && !wordsOnlyMode ? (
            <video
              ref={onSetRemoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4">
              {/* Avatar or AI orb */}
              <div
                className={cn(
                  "relative w-32 h-32 md:w-40 md:h-40 rounded-full",
                  "bg-white/[0.08] backdrop-blur-2xl shadow-2xl shadow-black/20",
                  "flex items-center justify-center overflow-hidden",
                  remoteIsSpeaking && "animate-gpu-speaking-glow"
                )}
              >
                {participantAvatar ? (
                  <img
                    src={participantAvatar}
                    alt={participantName}
                    className="w-full h-full object-cover"
                  />
                ) : isAICall ? (
                  <div className="w-full h-full bg-white/10 animate-pulse" />
                ) : (
                  <span className="text-4xl font-bold text-white/90">
                    {participantName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              
              <p className="text-lg font-medium text-white/90">
                {participantName || (isAICall ? 'Zoe AI' : 'Unknown')}
              </p>
              
              {isConnecting && (
                <p className="text-sm text-white/60 animate-pulse">
                  Establishing quantum link...
                </p>
              )}
            </div>
          )}

          {/* Speaking indicator on remote */}
          <SpeakingIndicator isActive={remoteIsSpeaking} label="Speaking" />
        </div>

        {zoeWhisper && isConnected && (
          <div className="pointer-events-none absolute inset-x-0 bottom-40 z-20 flex flex-col items-center gap-1 px-6 text-center" aria-live="polite">
            <p className="max-w-md rounded-full bg-white/[0.08] px-4 py-1.5 text-sm text-white backdrop-blur-2xl">{zoeWhisper.headline}</p>
            {zoeWhisper.prompts.length > 0 && (
              <p className="max-w-md text-xs text-white/60">{zoeWhisper.prompts.join(' · ')}</p>
            )}
          </div>
        )}

        {(wordsOnlyMode || chatOpen) && (
          <section className="absolute inset-x-4 bottom-24 z-20 mx-auto flex max-h-[52dvh] max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.08] text-white shadow-2xl backdrop-blur-2xl" aria-label={wordsOnlyMode ? 'Words only conversation' : 'Call chat'}>
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm text-white/80">
              <MessageSquareText className="h-4 w-4" />
              <span>{wordsOnlyMode ? 'Words only' : 'Chat'}</span>
              {!wordsOnlyMode && (
                <button type="button" aria-label="Close chat" onClick={() => setChatOpen(false)} className="ml-auto rounded-full px-2 text-white/60 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3" aria-live="polite">
              {wordsTranscript.length === 0 ? (
                <p className="my-auto text-center text-sm text-white/50">{wordsOnlyMode ? 'Media paused. Messages use very little data.' : 'Type here to talk while the video keeps playing.'}</p>
              ) : wordsTranscript.map(entry => (
                <p key={entry.id} className={cn("max-w-[85%] rounded-xl bg-white/[0.08] px-3 py-2 text-sm text-white", entry.from === 'local' ? 'ml-auto' : 'mr-auto')}>
                  {entry.text}
                </p>
              ))}
            </div>
            <form className="flex gap-2 border-t border-white/10 p-3" onSubmit={submitWords}>
              <input
                value={wordsDraft}
                onChange={event => setWordsDraft(event.target.value)}
                maxLength={400}
                aria-label="Message"
                placeholder="Send words…"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/40"
              />
              <Button type="submit" variant="ghost" size="icon" aria-label="Send message" disabled={dataChannelState !== 'open' || !wordsDraft.trim()} className="h-10 w-10 rounded-full text-white hover:bg-white/15 hover:text-white">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </section>
        )}

        {/* Local video PiP — visible as soon as the call is live so the caller
            always sees their own camera while requesting/ringing/connecting. */}
        {callState !== 'idle' && callState !== 'ended' && !wordsOnlyMode && (
          <LocalVideoPreview
            videoRef={onSetLocalVideoRef}
            isEnabled={videoEnabled}
            quality={videoQuality}
            isMuted={isMuted}
          />
        )}


        {/* God Eye analysis overlay */}
        <GodEyeOverlay
          analysis={lastGodEyeAnalysis}
          isEnabled={godEyeEnabled}
        />

        {/* Top bar - Quality, activity & Duration */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-30">
          <div className="flex min-w-0 flex-col items-start gap-2">
            <QualityIndicator
              quality={connectionQuality}
              bitrate={currentBitrate}
              codec={codec}
              isLowDataMode={isLowDataMode}
            />
            <CallActivityStatusPanel
              currentUserId={currentUserId}
              participantId={participantId}
              participantName={participantName}
            />
          </div>
          <div className="sr-only" role="status" aria-live="polite">
            Network {networkDiagnostics.route}; {networkDiagnostics.roundTripTimeMs ?? 'unknown'} milliseconds latency;
            {networkDiagnostics.packetLossPercent.toFixed(1)} percent packet loss; Zoe channel {dataChannelState}.
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected && (
              <motion.div
                className="px-3 py-1.5 rounded-full bg-white/[0.08] text-white backdrop-blur-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="text-sm font-mono text-white/90">
                  {formatDuration(durationTimer)}
                </span>
              </motion.div>
            )}

            {isConnected && (
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] text-xs text-white/70 backdrop-blur-2xl"
                aria-label={`Network route ${networkDiagnostics.route}, ${networkDiagnostics.roundTripTimeMs ?? 'unknown'} milliseconds latency, ${networkDiagnostics.packetLossPercent.toFixed(1)} percent packet loss, Zoe channel ${dataChannelState}`}
              >
                <span>{networkDiagnostics.route}</span>
                <span>{networkDiagnostics.roundTripTimeMs ?? '—'}ms</span>
                <span>{networkDiagnostics.packetLossPercent.toFixed(1)}%</span>
              </div>
            )}
            
            {onToggleFullscreen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    className="w-10 h-10 rounded-full bg-white/[0.08] text-white backdrop-blur-2xl hover:bg-white/15 hover:text-white"
                    onClick={onToggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Low Power Warning - Slides from top */}
        <LowPowerCallWarning
          isLowDataMode={isLowDataMode}
          connectionQuality={connectionQuality}
        />

        {/* Bottom controls - Draggable & Responsive */}
        <DraggableControlBar
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          videoEnabled={videoEnabled}
          onToggleVideo={onToggleVideo}
          isLowDataMode={isLowDataMode}
          onSetLowDataMode={onSetLowDataMode}
          godEyeEnabled={godEyeEnabled}
          onStartGodEye={onStartGodEye}
          onStopGodEye={onStopGodEye}
          isAICall={isAICall}
          isConnected={isConnected}
          onEndCall={onEndCall}
          onPiP={handlePiP}
          wordsOnlyMode={wordsOnlyMode}
          onSetWordsOnlyMode={onSetWordsOnlyMode}
          onToggleChat={() => setChatOpen(open => !open)}
          chatOpen={chatOpen}
        />

        {/* Speaking self-indicator */}
        {isSpeaking && !isMuted && (
          <motion.div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-xs text-white">You are speaking</span>
          </motion.div>
        )}
      </motion.div>
    </TooltipProvider>
  );
};

export default QuantumVideoUI;
