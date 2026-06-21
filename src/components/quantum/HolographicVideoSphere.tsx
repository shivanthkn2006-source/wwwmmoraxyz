// ═══════════════════════════════════════════════════════════════════════════════
// HOLOGRAPHIC VIDEO SPHERE - PROJECT CLAIRVOYANCE PHASE 2
// Floating glass sphere video surface with quantum filter effects
// PiP mode, gesture controls (double-tap flip, pinch mute)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  SwitchCamera,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GodEyeAnalysis, VideoQuality } from '@/hooks/useZoeQuantumCall';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface HolographicVideoSphereProps {
  // Video refs
  localVideoRef: (el: HTMLVideoElement | null) => void;
  remoteVideoRef: (el: HTMLVideoElement | null) => void;
  
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
  videoEnabled: boolean; // local video enabled
  remoteVideoEnabled?: boolean; // remote video available
  videoQuality: VideoQuality;
  onToggleVideo: () => Promise<void>;
  onFlipCamera?: () => Promise<void>;
  
  // God Eye
  godEyeEnabled?: boolean;
  lastGodEyeAnalysis?: GodEyeAnalysis | null;
  onToggleGodEye?: () => void;
  
  // Call controls
  onEndCall: () => void;
  callDuration: number;
  
  // Mode
  isPiPMode?: boolean;
  onTogglePiP?: () => void;
  
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Quantum speaking wave animation inside the sphere
const QuantumSpeakingWaves: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  if (!isActive) return null;
  
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-1 bg-cyan-400/80 rounded-full animate-gpu-audio-wave-${i}`}
          />
        ))}
      </div>
    </motion.div>
  );
};

// God Eye overlay inside sphere
const SphereGodEyeOverlay: React.FC<{
  analysis: GodEyeAnalysis | null;
  isEnabled: boolean;
}> = ({ analysis, isEnabled }) => {
  if (!isEnabled || !analysis) return null;
  
  return (
    <motion.div
      className="absolute bottom-2 left-2 right-2 z-20"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <div className="bg-background/70 backdrop-blur-lg rounded-lg p-2 border border-primary/30">
        <div className="flex items-center gap-1 mb-1">
          <Eye className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-semibold text-primary">Zoe's Vision</span>
          <Sparkles className="w-2 h-2 text-primary animate-pulse" />
        </div>
        <p className="text-[10px] text-foreground/90 line-clamp-2">{analysis.scene}</p>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const HolographicVideoSphere: React.FC<HolographicVideoSphereProps> = ({
  localVideoRef,
  remoteVideoRef,
  participantName,
  participantAvatar,
  isAICall,
  isMuted,
  isSpeaking,
  remoteIsSpeaking,
  onToggleMute,
  videoEnabled,
  remoteVideoEnabled = false,
  videoQuality,
  onToggleVideo,
  onFlipCamera,
  godEyeEnabled,
  lastGodEyeAnalysis,
  onToggleGodEye,
  onEndCall,
  callDuration,
  isPiPMode = false,
  onTogglePiP,
  className,
}) => {
  // ═══════════════════════════════════════════════════════════════════════════════
  // STATE & REFS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const sphereRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);
  const [pinchDistance, setPinchDistance] = useState<number | null>(null);
  
  // Motion values for smooth animations
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  
  // Glow intensity based on speaking
  const glowIntensity = useTransform(
    scale,
    [0.95, 1, 1.05],
    [0.3, 0.5, 0.8]
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // GESTURE HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Double-tap to flip camera
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap detected - flip camera
      if (onFlipCamera) {
        onFlipCamera();
        // Visual feedback
        animate(scale, [1, 0.95, 1.05, 1], { duration: 0.3 });
      }
    }
    setLastTap(now);
  }, [lastTap, onFlipCamera, scale]);
  
  // Pinch to mute (touch devices)
  const handlePinchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setPinchDistance(Math.hypot(dx, dy));
    }
  }, []);
  
  const handlePinchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && pinchDistance !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.hypot(dx, dy);
      
      // Pinch in = mute, pinch out = unmute
      if (Math.abs(newDistance - pinchDistance) > 50) {
        if (newDistance < pinchDistance && !isMuted) {
          onToggleMute();
        } else if (newDistance > pinchDistance && isMuted) {
          onToggleMute();
        }
        setPinchDistance(newDistance);
      }
    }
  }, [pinchDistance, isMuted, onToggleMute]);
  
  const handlePinchEnd = useCallback(() => {
    setPinchDistance(null);
  }, []);
  
  // Attach touch listeners for pinch
  useEffect(() => {
    const sphere = sphereRef.current;
    if (!sphere) return;
    
    sphere.addEventListener('touchstart', handlePinchStart, { passive: true });
    sphere.addEventListener('touchmove', handlePinchMove, { passive: true });
    sphere.addEventListener('touchend', handlePinchEnd, { passive: true });
    
    return () => {
      sphere.removeEventListener('touchstart', handlePinchStart);
      sphere.removeEventListener('touchmove', handlePinchMove);
      sphere.removeEventListener('touchend', handlePinchEnd);
    };
  }, [handlePinchStart, handlePinchMove, handlePinchEnd]);
  
  // Handle flick to corner (PiP mode)
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    setIsDragging(false);
    
    if (!isPiPMode) return;
    
    const { velocity, offset } = info;
    const flickThreshold = 500;
    
    // Check if it's a flick gesture
    if (Math.abs(velocity.x) > flickThreshold || Math.abs(velocity.y) > flickThreshold) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      // Determine which corner to snap to
      let targetX = 0;
      let targetY = 0;
      
      if (velocity.x > 0) {
        targetX = vw - 200; // Right side
      } else {
        targetX = 20; // Left side
      }
      
      if (velocity.y > 0) {
        targetY = vh - 200; // Bottom
      } else {
        targetY = 80; // Top (below nav)
      }
      
      animate(x, targetX, { type: 'spring', stiffness: 300, damping: 30 });
      animate(y, targetY, { type: 'spring', stiffness: 300, damping: 30 });
      
      setPosition({ x: targetX, y: targetY });
    } else {
      // Not a flick, update position normally
      setPosition(prev => ({
        x: prev.x + offset.x,
        y: prev.y + offset.y,
      }));
    }
  }, [isPiPMode, x, y]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // DYNAMIC STYLES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Quantum filter for that Blade Runner look
  const quantumFilter = 'contrast(1.1) saturate(1.2) drop-shadow(0 0 15px cyan)';
  
  // Dynamic glow based on speaking state
  const sphereGlow = remoteIsSpeaking
    ? '0 0 60px rgba(0, 255, 255, 0.6), 0 0 100px rgba(0, 255, 255, 0.3), inset 0 0 30px rgba(0, 255, 255, 0.2)'
    : '0 0 30px rgba(0, 255, 255, 0.3), 0 0 60px rgba(0, 255, 255, 0.15)';
  
  // Sphere size based on PiP mode - constrained to avoid filling entire window
  const sphereSize = isPiPMode 
    ? 'w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40' 
    : 'w-48 h-48 xs:w-56 xs:h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 max-w-[70vmin] max-h-[70vmin]';
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  
  return (
    <AnimatePresence>
      <motion.div
        ref={sphereRef}
        className={cn(
          "relative flex flex-col items-center justify-center",
          isPiPMode ? "fixed z-50" : "relative w-full h-full max-w-lg mx-auto",
          className
        )}
        style={isPiPMode ? { x, y } : undefined}
        drag={isPiPMode}
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* HOLOGRAPHIC GLASS SPHERE - Main Video Surface */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <motion.div
          className={cn(
            "relative rounded-full overflow-hidden cursor-pointer",
            sphereSize,
            "border-2 border-cyan-400/60",
            "bg-gradient-to-br from-cyan-950/90 via-slate-900/95 to-purple-950/90",
            "backdrop-blur-xl",
            isDragging && "cursor-grabbing"
          )}
          style={{
            boxShadow: sphereGlow,
            filter: videoEnabled ? quantumFilter : undefined,
          }}
          onClick={handleTap}
          animate={remoteIsSpeaking ? {
            scale: [1, 1.02, 1],
          } : {}}
          transition={{
            duration: 0.8,
            repeat: remoteIsSpeaking ? Infinity : 0,
            repeatType: 'reverse',
          }}
          whileHover={{ scale: isPiPMode ? 1.05 : 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Glass shine effect */}
          <div className="absolute inset-0 rounded-full pointer-events-none z-30">
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 40%, rgba(0,0,0,0.15) 100%)',
              }}
            />
            <div 
              className="absolute top-3 left-6 w-1/3 h-1/5 rounded-full opacity-50"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)',
                filter: 'blur(10px)',
              }}
            />
          </div>
          
          {/* Animated outer ring pulse when connected - GPU Accelerated */}
          <div className="absolute -inset-1 rounded-full border border-cyan-400/40 pointer-events-none animate-gpu-ring-scale-pulse" />
          
          {/* Inner glow ring - GPU Accelerated */}
          <div className="absolute inset-2 rounded-full border border-cyan-400/20 pointer-events-none animate-gpu-pulse-opacity" />
          
          {/* Remote video or avatar */}
          {remoteVideoEnabled ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover rounded-full"
              style={{
                filter: quantumFilter,
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-900/50 via-slate-900/80 to-purple-900/50">
              {participantAvatar ? (
                <img
                  src={participantAvatar}
                  alt={participantName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : isAICall ? (
                <div className="w-full h-full bg-gradient-to-br from-cyan-600/40 via-primary/30 to-purple-600/40 flex items-center justify-center relative">
                  {/* Animated AI presence - GPU accelerated */}
                  <div className="absolute inset-0 bg-gradient-radial from-cyan-500/20 via-transparent to-transparent animate-gpu-ai-presence" />
                  <Sparkles className="w-16 h-16 md:w-20 md:h-20 text-cyan-400 drop-shadow-lg z-10" />
                  {/* Floating particles - GPU accelerated */}
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-gpu-float-particle"
                      style={{
                        left: `${20 + i * 12}%`,
                        top: `${30 + (i % 3) * 15}%`,
                        '--float-duration': `${2 + i * 0.3}s`,
                        '--float-delay': `${i * 0.2}s`
                      } as React.CSSProperties}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-5xl md:text-6xl font-bold text-foreground/60">
                  {participantName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
          )}
          
          {/* Speaking waves overlay */}
          <QuantumSpeakingWaves isActive={remoteIsSpeaking} />
          
          {/* God Eye overlay */}
          <SphereGodEyeOverlay 
            analysis={lastGodEyeAnalysis || null} 
            isEnabled={godEyeEnabled || false} 
          />
          
          {/* Muted indicator - fixed position */}
          <AnimatePresence>
            {isMuted && (
              <motion.div
                className="absolute top-3 right-3 p-2 bg-red-500/90 rounded-full z-30 shadow-lg shadow-red-500/30"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <MicOff className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Duration badge - fixed position top left */}
          <motion.div
            className="absolute top-3 left-3 px-3 py-1.5 bg-background/80 backdrop-blur-md rounded-full z-30 shadow-lg border border-foreground/10"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-sm font-mono font-medium text-foreground">
              {formatDuration(callDuration)}
            </span>
          </motion.div>
          
          {/* Quality badge - fixed position bottom right */}
          {videoEnabled && (
            <motion.div
              className="absolute bottom-3 right-3 px-2.5 py-1 bg-background/80 backdrop-blur-md rounded-full z-30 shadow-lg border border-cyan-400/30"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-xs text-cyan-400 font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                {videoQuality}
              </span>
            </motion.div>
          )}
        </motion.div>
        
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* LOCAL VIDEO PiP (Small sphere showing self) */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* User's local video PiP - Compact fixed position */}
        {!isPiPMode && (
          <motion.div
            className="absolute -bottom-4 -right-4 sm:-bottom-5 sm:-right-5 w-16 h-16 xs:w-18 xs:h-18 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden z-40"
            initial={{ opacity: 0, scale: 0.5, x: 15, y: 15 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
            style={{ 
              filter: quantumFilter,
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)',
            }}
          >
            {/* Border ring with glow */}
            <div className="absolute inset-0 rounded-full border-3 border-primary/70 z-10" />
            <div className="absolute -inset-1 rounded-full border border-primary/40 animate-gpu-pulse-opacity" />
            
            {videoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1] rounded-full"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center rounded-full">
                <VideoOff className="w-7 h-7 text-muted-foreground" />
              </div>
            )}
            
            {/* Self speaking indicator - GPU accelerated */}
            <AnimatePresence>
              {isSpeaking && !isMuted && (
                <motion.div
                  className="absolute inset-0 rounded-full border-3 border-green-400 z-20 animate-gpu-speaking-ring"
                  initial={{ opacity: 0, scale: 0.9 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{
                    boxShadow: '0 0 15px rgba(74, 222, 128, 0.6)',
                  }}
                />
              )}
            </AnimatePresence>
            
            {/* "You" label */}
            <motion.div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary/90 rounded-full z-30"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-[10px] font-medium text-primary-foreground">You</span>
            </motion.div>
          </motion.div>
        )}
        
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* PARTICIPANT NAME */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {!isPiPMode && (
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-lg font-semibold text-foreground">
              {participantName || (isAICall ? 'Zoe AI' : 'Unknown')}
            </h3>
            {isAICall && (
              <p className="text-xs text-cyan-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                Quantum Link Active
              </p>
            )}
          </motion.div>
        )}
        
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* FLOATING CONTROLS - Compact draggable bar */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <motion.div
          className={cn(
            "flex items-center justify-center gap-2 mt-6 px-3 py-2 rounded-full",
            "bg-background/70 backdrop-blur-xl border border-foreground/10 shadow-xl",
            isPiPMode && "absolute -bottom-12 left-1/2 -translate-x-1/2 px-2 py-1.5 gap-1.5"
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          drag
          dragMomentum={false}
          dragElastic={0.1}
        >
          {/* Mute button - compact */}
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className={cn(
              "w-10 h-10 rounded-full transition-all shadow-md",
              isMuted 
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/30" 
                : "bg-secondary hover:bg-secondary/80 shadow-foreground/10",
              isPiPMode && "w-8 h-8"
            )}
            onClick={onToggleMute}
          >
            {isMuted ? (
              <MicOff className={cn("w-4 h-4", isPiPMode && "w-3.5 h-3.5")} />
            ) : (
              <Mic className={cn("w-4 h-4", isPiPMode && "w-3.5 h-3.5")} />
            )}
          </Button>
          
          {/* Video button - compact */}
          <Button
            variant={videoEnabled ? "secondary" : "outline"}
            size="icon"
            className={cn(
              "w-10 h-10 rounded-full transition-all shadow-md",
              videoEnabled 
                ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-400 hover:bg-cyan-500/30 shadow-cyan-500/20" 
                : "shadow-foreground/10",
              isPiPMode && "w-8 h-8"
            )}
            onClick={onToggleVideo}
          >
            {videoEnabled ? (
              <Video className={cn("w-4 h-4", isPiPMode && "w-3.5 h-3.5")} />
            ) : (
              <VideoOff className={cn("w-4 h-4", isPiPMode && "w-3.5 h-3.5")} />
            )}
          </Button>
          
          {/* God Eye button (AI calls only) - compact */}
          {isAICall && onToggleGodEye && (
            <Button
              variant={godEyeEnabled ? "default" : "outline"}
              size="icon"
              className={cn(
                "w-10 h-10 rounded-full transition-all shadow-md",
                godEyeEnabled 
                  ? "bg-primary text-primary-foreground shadow-primary/30" 
                  : "shadow-foreground/10",
                isPiPMode && "w-8 h-8"
              )}
              onClick={onToggleGodEye}
            >
              {godEyeEnabled ? (
                <Eye className={cn("w-4 h-4", isPiPMode && "w-3.5 h-3.5")} />
              ) : (
                <EyeOff className={cn("w-4 h-4", isPiPMode && "w-3.5 h-3.5")} />
              )}
            </Button>
          )}
          
          {/* PiP toggle - compact */}
          {onTogglePiP && (
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "w-10 h-10 rounded-full transition-all shadow-md shadow-foreground/10",
                isPiPMode && "w-8 h-8"
              )}
              onClick={onTogglePiP}
            >
              {isPiPMode ? (
                <Maximize2 className={cn("w-4 h-4", isPiPMode && "w-3.5 h-3.5")} />
              ) : (
                <Minimize2 className={cn("w-4 h-4", isPiPMode && "w-3.5 h-3.5")} />
              )}
            </Button>
          )}
          
          {/* End call button - prominent but compact */}
          <Button
            variant="destructive"
            size="icon"
            className={cn(
              "w-11 h-11 rounded-full transition-all shadow-lg shadow-red-500/40",
              "bg-red-500 hover:bg-red-600",
              isPiPMode && "w-9 h-9"
            )}
            onClick={onEndCall}
          >
            <PhoneOff className={cn("w-5 h-5", isPiPMode && "w-4 h-4")} />
          </Button>
        </motion.div>
        
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* GESTURE HINTS (shown briefly on first use) */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {!isPiPMode && (
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p className="text-xs text-muted-foreground">
              Double-tap to flip camera • Pinch to mute
            </p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default HolographicVideoSphere;
