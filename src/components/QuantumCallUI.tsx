// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM CALL UI - P2P Voice Call Interface
// Incoming call modal + Active call controls
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Wifi, WifiOff, User, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { CallParticipant, CallState } from '@/hooks/useZoeQuantumCall';

interface QuantumCallUIProps {
  callState: CallState;
  incomingCall: CallParticipant | null;
  currentParticipant?: CallParticipant | null;
  isMuted: boolean;
  isSpeaking: boolean;
  remoteIsSpeaking: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  callDuration: number;
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const QualityIndicator: React.FC<{ quality: string }> = ({ quality }) => {
  const bars = quality === 'excellent' ? 4 : quality === 'good' ? 3 : quality === 'fair' ? 2 : 1;
  const color = quality === 'excellent' ? 'bg-emerald-400' : quality === 'good' ? 'bg-green-400' : quality === 'fair' ? 'bg-amber-400' : 'bg-red-400';
  
  return (
    <div className="flex items-end gap-0.5 h-3">
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={cn(
            'w-1 rounded-full transition-all',
            bar <= bars ? color : 'bg-foreground/20',
            bar === 1 ? 'h-1' : bar === 2 ? 'h-1.5' : bar === 3 ? 'h-2' : 'h-2.5'
          )}
        />
      ))}
    </div>
  );
};

// Incoming Call Modal
const IncomingCallModal: React.FC<{
  caller: CallParticipant;
  onAccept: () => void;
  onReject: () => void;
}> = ({ caller, onAccept, onReject }) => {
  // Ringtone is handled centrally by useZoeQuantumCall via useMmoraAudio.
  // IMPORTANT: Do not create a second AudioContext here (causes persistent hum/leaks on some devices).
  useEffect(() => {
    return () => {
      // no-op
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 20 }}
        className="relative w-72 p-6 rounded-2xl bg-gradient-to-b from-background/95 to-background/80 border border-primary/30 shadow-2xl"
      >
        {/* Pulsing ring effect - CSS animation */}
        <div className="absolute inset-0 rounded-2xl">
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/40 animate-gpu-pulse-scale" />
        </div>
        
        <div className="relative flex flex-col items-center gap-4">
          {/* Caller Avatar - CSS animation */}
          <div className="animate-gpu-pulse-scale-slow">
            <Avatar className="h-20 w-20 ring-4 ring-primary/30">
              <AvatarImage src={caller.avatarUrl} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                {caller.displayName?.charAt(0)?.toUpperCase() || <User />}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Caller Name */}
          <div className="text-center">
            <p className="text-lg font-semibold">{caller.displayName || 'Unknown'}</p>
            <p className="text-sm text-foreground/60">Quantum Voice Call</p>
          </div>
          
          {/* Security Badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Post-Quantum Encrypted
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-6 mt-4">
            {/* Reject */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300"
                onClick={onReject}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </motion.div>
            
            {/* Accept */}
            <motion.div 
              whileHover={{ scale: 1.1 }} 
              whileTap={{ scale: 0.95 }}
              className="animate-gpu-pulse-scale-sm"
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-16 w-16 rounded-full bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-400 hover:text-emerald-300"
                onClick={onAccept}
              >
                <Phone className="h-7 w-7" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Active Call Overlay
const ActiveCallOverlay: React.FC<{
  participant: CallParticipant;
  isMuted: boolean;
  isSpeaking: boolean;
  remoteIsSpeaking: boolean;
  connectionQuality: string;
  callDuration: number;
  onEndCall: () => void;
  onToggleMute: () => void;
}> = ({ participant, isMuted, isSpeaking, remoteIsSpeaking, connectionQuality, callDuration, onEndCall, onToggleMute }) => {
  const [duration, setDuration] = useState(callDuration);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-background/95 via-background/90 to-background/95 border border-primary/30 shadow-2xl backdrop-blur-xl"
    >
      {/* Remote Avatar with speaking indicator */}
      <div className="relative">
        <Avatar className={cn(
          "h-10 w-10 transition-all",
          remoteIsSpeaking && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-background"
        )}>
          <AvatarImage src={participant.avatarUrl} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
            {participant.displayName?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        {remoteIsSpeaking && (
          <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background animate-gpu-pulse-scale" />
        )}
      </div>
      
      {/* Call Info */}
      <div className="flex flex-col">
        <span className="text-sm font-medium">{participant.displayName || 'Unknown'}</span>
        <div className="flex items-center gap-2 text-xs text-foreground/60">
          <span>{formatDuration(duration)}</span>
          <span>•</span>
          <QualityIndicator quality={connectionQuality} />
        </div>
      </div>
      
      {/* Speaking indicator (local) - CSS animation */}
      {isSpeaking && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 animate-gpu-pulse-scale">
          <Volume2 className="h-3 w-3 text-emerald-400" />
          <span className="text-[10px] text-emerald-400">Speaking</span>
        </div>
      )}
      
      {/* Controls */}
      <div className="flex items-center gap-2 ml-2">
        {/* Mute Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-full transition-colors",
            isMuted ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "hover:bg-foreground/10"
          )}
          onClick={onToggleMute}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        
        {/* End Call */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40"
          onClick={onEndCall}
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

// Main Export
export const QuantumCallUI: React.FC<QuantumCallUIProps> = ({
  callState,
  incomingCall,
  currentParticipant,
  isMuted,
  isSpeaking,
  remoteIsSpeaking,
  connectionQuality,
  callDuration,
  onAccept,
  onReject,
  onEndCall,
  onToggleMute,
}) => {
  return (
    <AnimatePresence>
      {/* Incoming Call Modal */}
      {callState === 'incoming' && incomingCall && (
        <IncomingCallModal
          caller={incomingCall}
          onAccept={onAccept}
          onReject={onReject}
        />
      )}
      
      {/* Active Call Overlay */}
      {(callState === 'connected' || callState === 'connecting') && currentParticipant && (
        <ActiveCallOverlay
          participant={currentParticipant}
          isMuted={isMuted}
          isSpeaking={isSpeaking}
          remoteIsSpeaking={remoteIsSpeaking}
          connectionQuality={connectionQuality}
          callDuration={callDuration}
          onEndCall={onEndCall}
          onToggleMute={onToggleMute}
        />
      )}
      
      {/* Connecting State */}
      {callState === 'connecting' && !currentParticipant && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-background/90 border border-primary/20">
            {/* CSS spinner instead of framer-motion */}
            <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-gpu-spin" />
            <p className="text-sm text-foreground/70">Establishing quantum-encrypted connection...</p>
          </div>
        </motion.div>
      )}
      
      {/* Requesting State */}
      {callState === 'requesting' && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 px-4 py-2 rounded-full bg-background/95 border border-primary/30 shadow-xl backdrop-blur-xl"
        >
          {/* CSS spinner instead of framer-motion */}
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-gpu-spin" />
          <span className="text-sm">Calling...</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40"
            onClick={onEndCall}
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Call Button Component - to be used in chat headers
export const QuantumCallButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  isInCall?: boolean;
}> = ({ onClick, disabled, isInCall }) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-4 w-4 rounded-full transition-colors",
        isInCall ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-primary/20"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Phone className={cn("h-2.5 w-2.5", isInCall && "animate-pulse")} />
    </Button>
  );
};

export default QuantumCallUI;
