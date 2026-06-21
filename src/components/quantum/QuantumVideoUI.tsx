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
  onToggleVideo: () => Promise<void>;
  onSetLowDataMode: (enabled: boolean) => void;
  
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

const getQualityColor = (quality: string) => {
  switch (quality) {
    case 'excellent': return 'text-green-400';
    case 'good': return 'text-emerald-400';
    case 'fair': return 'text-amber-400';
    case 'poor': return 'text-red-400';
    default: return 'text-muted-foreground';
  }
};

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
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-md border border-border/30"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <QualityIcon className={cn('w-4 h-4', getQualityColor(quality))} />
      <span className="text-xs font-medium text-foreground/80">
        {Math.round(bitrate / 1000)}kbps
      </span>
      {isLowDataMode && (
        <motion.span
          className="text-xs text-amber-400 flex items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Zap className="w-3 h-3" />
          Low Data
        </motion.span>
      )}
      <span className="text-xs text-muted-foreground">{codec}</span>
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
        <div className="bg-background/80 backdrop-blur-lg rounded-xl border border-primary/30 p-4 shadow-lg shadow-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary">Zoe's Vision</span>
            <Sparkles className="w-3 h-3 text-primary animate-pulse" />
          </div>
          
          <p className="text-sm text-foreground/90 mb-2">{analysis.scene}</p>
          
          {analysis.objects.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {analysis.objects.slice(0, 5).map((obj, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full"
                >
                  {obj}
                </span>
              ))}
            </div>
          )}
          
          {analysis.zoe_response && (
            <motion.p
              className="text-sm text-muted-foreground italic border-t border-border/30 pt-2 mt-2"
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
      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/40"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-0.5 h-3 bg-primary rounded-full ${isActive ? `animate-gpu-audio-bar-${i}` : ''}`}
          />
        ))}
      </div>
      {label && <span className="text-xs text-primary font-medium">{label}</span>}
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
  
  return (
    <motion.div
      className={cn(
        "absolute w-32 h-24 md:w-40 md:h-30 rounded-xl overflow-hidden",
        "border-2 border-primary/40 shadow-lg shadow-primary/20",
        "bg-background/80 backdrop-blur-sm",
        isDragging ? "cursor-grabbing z-50" : "cursor-grab z-40"
      )}
      style={{ top: position.y, right: position.x }}
      drag
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        setPosition(prev => ({
          x: Math.max(16, prev.x - info.offset.x),
          y: Math.max(16, prev.y + info.offset.y),
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
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <VideoOff className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      
      {/* Quality badge */}
      <div className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] bg-background/60 backdrop-blur-sm rounded">
        {quality}
      </div>
      
      {/* Muted indicator */}
      {isMuted && (
        <div className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full">
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
}) => {
  const responsiveSize = useResponsiveCallSize();
  const dragControls = useDragControls();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

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
      className="absolute bottom-4 sm:bottom-6 left-1/2 z-30"
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
        x: position.x - (typeof window !== 'undefined' ? window.innerWidth / 2 : 0) + position.x,
        y: position.y,
      }}
      style={{ x: '-50%' }}
    >
      <motion.div
        className={cn(
          "flex items-center rounded-full bg-background/80 backdrop-blur-lg border border-border/50 shadow-xl",
          "touch-none select-none",
          getGap(),
          getPadding(),
          isDragging && "ring-2 ring-primary/50"
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Drag handle */}
        <div 
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-foreground/10 rounded-full transition-colors"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripHorizontal className="w-3 h-3 text-foreground/40" />
        </div>

        {/* Mute toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              className={cn("rounded-full", btnSize)}
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
              variant={videoEnabled ? "secondary" : "outline"}
              size="icon"
              className={cn("rounded-full", btnSize)}
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
                variant={godEyeEnabled ? "default" : "outline"}
                size="icon"
                className={cn(
                  "rounded-full",
                  btnSize,
                  godEyeEnabled && "bg-primary text-primary-foreground"
                )}
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
                variant="outline"
                size="icon"
                className={cn("rounded-full", btnSize)}
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
              variant={isLowDataMode ? "default" : "outline"}
              size="icon"
              className={cn(
                "rounded-full",
                btnSize,
                isLowDataMode && "bg-amber-500 text-white hover:bg-amber-600"
              )}
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

        {/* End call button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className={cn("rounded-full", endBtnSize)}
              onClick={() => onEndCall('user_hangup')}
            >
              <PhoneOff className={endIconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>End Call</TooltipContent>
        </Tooltip>
      </motion.div>
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
  onToggleVideo,
  onSetLowDataMode,
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

  return (
    <TooltipProvider>
      <motion.div
        className={cn(
          "relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden",
          "bg-gradient-to-br from-background via-background/95 to-background",
          "border border-border/50 shadow-2xl",
          isFullscreen && "fixed inset-0 z-50 rounded-none",
          className
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        {/* Holographic background effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5" />
          {isConnected && (
            <div
              className={`absolute inset-0 ${remoteIsSpeaking ? 'animate-gpu-pulse-opacity-slow' : 'opacity-20'}`}
              style={{
                background: 'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
              }}
            />
          )}
        </div>

        {/* Remote Video / Avatar Area */}
        <div
          ref={remoteVideoContainerRef}
          className="relative w-full h-full flex items-center justify-center"
        >
          {videoEnabled && isConnected ? (
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
                  "bg-gradient-to-br from-primary/30 to-cyan-500/30",
                  "border-2 border-primary/40 shadow-lg shadow-primary/20",
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
                  <div className="w-full h-full bg-gradient-to-br from-primary via-cyan-500 to-purple-500 animate-pulse" />
                ) : (
                  <span className="text-4xl font-bold text-foreground/80">
                    {participantName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              
              <p className="text-lg font-medium text-foreground/90">
                {participantName || (isAICall ? 'Zoe AI' : 'Unknown')}
              </p>
              
              {isConnecting && (
                <p className="text-sm text-muted-foreground animate-gpu-status-primary">
                  Establishing quantum link...
                </p>
              )}
            </div>
          )}

          {/* Speaking indicator on remote */}
          <SpeakingIndicator isActive={remoteIsSpeaking} label="Speaking" />
        </div>

        {/* Local video PiP */}
        {isConnected && (
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

        {/* Top bar - Quality & Duration */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-30">
          <QualityIndicator
            quality={connectionQuality}
            bitrate={currentBitrate}
            codec={codec}
            isLowDataMode={isLowDataMode}
          />
          
          <div className="flex items-center gap-2">
            {isConnected && (
              <motion.div
                className="px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-md border border-border/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="text-sm font-mono text-foreground/80">
                  {formatDuration(durationTimer)}
                </span>
              </motion.div>
            )}
            
            {onToggleFullscreen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-full bg-background/60 backdrop-blur-md"
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
        />

        {/* Speaking self-indicator */}
        {isSpeaking && !isMuted && (
          <motion.div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-green-500/20 backdrop-blur-sm border border-green-500/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-xs text-green-400">You are speaking</span>
          </motion.div>
        )}
      </motion.div>
    </TooltipProvider>
  );
};

export default QuantumVideoUI;
