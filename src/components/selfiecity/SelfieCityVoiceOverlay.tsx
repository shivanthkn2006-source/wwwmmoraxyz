/**
 * SELFIE CITY VOICE OVERLAY - Phase 1
 * 
 * Visual feedback layer that sits on top of the 3D Canvas.
 * Shows: listening state, live transcript, Zoe's response, voice waveform.
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceOverlayProps {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript: string;
  lastResponse?: string;
  onToggle: () => void;
  onClose: () => void;
  className?: string;
}

// Audio visualizer component
const AudioVisualizer: React.FC<{ isActive: boolean; isSpeaking: boolean }> = ({ isActive, isSpeaking }) => {
  const bars = 5;
  
  return (
    <div className="flex items-center justify-center gap-0.5 h-6">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-1 rounded-full",
            isSpeaking ? "bg-secondary" : "bg-primary"
          )}
          animate={{
            height: isActive 
              ? [8, 16 + Math.random() * 8, 8, 20 + Math.random() * 4, 8]
              : 4,
            opacity: isActive ? 1 : 0.3,
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.3,
            repeat: isActive ? Infinity : 0,
            repeatType: "loop",
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
};

// Floating orb that shows Zoe's presence
const ZoePresenceOrb: React.FC<{ isActive: boolean; isListening: boolean; isSpeaking: boolean }> = ({
  isActive,
  isListening,
  isSpeaking,
}) => {
  return (
    <motion.div
      className="relative w-16 h-16"
      animate={{
        scale: isActive ? [1, 1.1, 1] : 1,
      }}
      transition={{
        duration: 2,
        repeat: isActive ? Infinity : 0,
        repeatType: "loop",
      }}
    >
      {/* Outer glow */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full blur-xl",
          isSpeaking ? "bg-secondary/50" : "bg-primary/50"
        )}
        animate={{
          scale: isActive ? [1, 1.3, 1] : 1,
          opacity: isActive ? [0.5, 0.8, 0.5] : 0.2,
        }}
        transition={{
          duration: 1.5,
          repeat: isActive ? Infinity : 0,
          repeatType: "loop",
        }}
      />
      
      {/* Inner orb */}
      <motion.div
        className={cn(
          "absolute inset-2 rounded-full",
          "bg-gradient-to-br",
          isSpeaking 
            ? "from-secondary via-secondary/80 to-primary" 
            : isListening 
              ? "from-primary via-primary/80 to-secondary"
              : "from-muted-foreground/50 via-muted/30 to-muted"
        )}
        animate={{
          rotate: isActive ? 360 : 0,
        }}
        transition={{
          duration: 8,
          repeat: isActive ? Infinity : 0,
          ease: "linear",
        }}
      />
      
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isSpeaking ? (
          <Volume2 className="w-6 h-6 text-secondary-foreground" />
        ) : isListening ? (
          <Mic className="w-6 h-6 text-primary-foreground animate-pulse" />
        ) : (
          <Sparkles className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
    </motion.div>
  );
};

const SelfieCityVoiceOverlay: React.FC<VoiceOverlayProps> = ({
  isActive,
  isListening,
  isSpeaking,
  isProcessing,
  transcript,
  lastResponse,
  onToggle,
  onClose,
  className,
}) => {
  const [showHint, setShowHint] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Hide hint after first interaction
  useEffect(() => {
    if (transcript) {
      setShowHint(false);
    }
  }, [transcript]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript, lastResponse]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={cn(
            "fixed bottom-20 left-4 right-4 z-50",
            "max-w-md mx-auto",
            className
          )}
        >
          {/* Main voice panel */}
          <div className="glass-panel-2120 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border/30">
              <div className="flex items-center gap-3">
                <ZoePresenceOrb 
                  isActive={isActive} 
                  isListening={isListening} 
                  isSpeaking={isSpeaking} 
                />
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {isSpeaking ? 'Zoe is speaking...' : isProcessing ? 'Thinking...' : isListening ? 'Listening...' : 'Voice Mode'}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Selfie City Voice Layer
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <AudioVisualizer isActive={isListening || isSpeaking} isSpeaking={isSpeaking} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Transcript area */}
            <div 
              ref={transcriptRef}
              className="p-4 min-h-[80px] max-h-[200px] overflow-y-auto"
            >
              {/* User transcript */}
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-3"
                >
                  <p className="text-xs text-muted-foreground mb-1">You:</p>
                  <p className="text-sm text-foreground bg-muted/50 rounded-lg p-2">
                    {transcript}
                  </p>
                </motion.div>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Zoe is thinking...</span>
                </motion.div>
              )}

              {/* Zoe's response */}
              {lastResponse && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <p className="text-xs text-secondary mb-1">Zoe:</p>
                  <p className="text-sm text-foreground bg-secondary/10 rounded-lg p-2 border border-secondary/20">
                    {lastResponse}
                  </p>
                </motion.div>
              )}

              {/* Hint for new users */}
              {showHint && !transcript && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-muted-foreground"
                >
                  <p className="text-sm mb-2">Try saying:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      '"Fly to Paris"',
                      '"Show deals"',
                      '"Open camera"',
                      '"Find Nike"',
                    ].map((hint) => (
                      <span
                        key={hint}
                        className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                      >
                        {hint}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer with mic toggle */}
            <div className="flex items-center justify-center p-3 border-t border-border/30">
              <Button
                variant={isListening ? "destructive" : "default"}
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={onToggle}
              >
                {isListening ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>
            </div>
          </div>

          {/* Keyboard shortcut hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center text-[10px] text-muted-foreground mt-2"
          >
            Press <kbd className="px-1 py-0.5 rounded bg-muted">Space</kbd> to toggle mic
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Compact floating button to activate voice mode
export const VoiceActivationButton: React.FC<{
  isActive: boolean;
  isListening: boolean;
  onClick: () => void;
  className?: string;
}> = ({ isActive, isListening, onClick, className }) => {
  return (
    <motion.div
      className={cn("fixed bottom-24 right-4 z-40", className)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant={isActive ? "secondary" : "outline"}
        size="icon"
        className={cn(
          "w-14 h-14 rounded-full shadow-lg",
          isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          isListening && "animate-pulse"
        )}
        onClick={onClick}
      >
        {isActive ? (
          isListening ? (
            <Mic className="w-6 h-6 text-primary animate-pulse" />
          ) : (
            <Volume2 className="w-6 h-6" />
          )
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </Button>
      
      {!isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
        >
          <Sparkles className="w-2 h-2 text-primary-foreground" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default SelfieCityVoiceOverlay;
