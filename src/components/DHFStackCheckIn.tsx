// ═══════════════════════════════════════════════════════════════════════════════
// DHF STACK CHECK-IN - Periodic TTS check-in during autonomous operations
// Maintains hands-free mode while providing full control to user
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { speakAsZoe, stopZoeSpeech, isZoeSpeaking } from '@/utils/zoeVoice';
import { toast } from 'sonner';

interface DHFStackCheckInProps {
  sessionId: string;
  onPause: () => void;
  onContinue: () => void;
  checkInIntervalMinutes?: number;
}

export const DHFStackCheckIn: React.FC<DHFStackCheckInProps> = ({
  sessionId,
  onPause,
  onContinue,
  checkInIntervalMinutes = 5,
}) => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(true);
  const [actionCount, setActionCount] = useState(0);
  const [lastCheckIn, setLastCheckIn] = useState<Date>(new Date());
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const performCheckIn = useCallback(async () => {
    if (!user || !isActive || isMuted) return;

    setAwaitingResponse(true);

    // Speak the check-in message
    const message = actionCount > 3
      ? `I am currently running the DHF Stack and have completed ${actionCount} autonomous actions. Would you like me to pause, or continue autonomously?`
      : 'I am currently running the DHF Stack. Would you like me to pause, or continue autonomously?';

    speakAsZoe(
      message,
      { rate: 0.95, pitch: 1.0, volume: 0.8 },
      undefined,
      () => {
        // After speaking, wait for response
        setTimeout(() => {
          if (awaitingResponse) {
            // User didn't respond, continue
            setAwaitingResponse(false);
            handleContinue();
          }
        }, 10000); // Wait 10 seconds for response
      }
    );

    // Update last check-in
    setLastCheckIn(new Date());

    try {
      await supabase
        .from('dhf_stack_sessions')
        .update({
          last_checkin_at: new Date().toISOString(),
          autonomy_actions_count: actionCount,
        })
        .eq('id', sessionId);
    } catch (err) {
      console.error('Failed to update check-in:', err);
    }
  }, [user, isActive, actionCount, isMuted, sessionId, awaitingResponse]);

  // Periodic check-in
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const now = new Date();
      const minutesSinceLastCheckIn = (now.getTime() - lastCheckIn.getTime()) / (1000 * 60);
      
      if (minutesSinceLastCheckIn >= checkInIntervalMinutes) {
        performCheckIn();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isActive, lastCheckIn, checkInIntervalMinutes, performCheckIn]);

  const handlePause = async () => {
    setAwaitingResponse(false);
    setIsActive(false);
    stopZoeSpeech();

    try {
      await supabase
        .from('dhf_stack_sessions')
        .update({
          paused_at: new Date().toISOString(),
          pause_reason: 'user_requested',
          is_active: false,
        })
        .eq('id', sessionId);
    } catch (err) {
      console.error('Failed to pause session:', err);
    }

    if (!isMuted) {
      speakAsZoe('DHF Stack paused. Say "continue" or click resume when ready.');
    }

    toast.info('DHF Stack Paused', {
      description: 'Autonomous operations have been paused.',
    });

    onPause();
  };

  const handleContinue = async () => {
    setAwaitingResponse(false);
    setIsActive(true);

    try {
      await supabase
        .from('dhf_stack_sessions')
        .update({
          paused_at: null,
          is_active: true,
          user_confirmed_continue: true,
        })
        .eq('id', sessionId);
    } catch (err) {
      console.error('Failed to continue session:', err);
    }

    if (!isMuted) {
      speakAsZoe('Continuing autonomous operations.');
    }

    onContinue();
  };

  const incrementActionCount = () => {
    setActionCount(prev => prev + 1);
  };

  // Expose increment function
  useEffect(() => {
    (window as any).dhfIncrementAction = incrementActionCount;
    return () => {
      delete (window as any).dhfIncrementAction;
    };
  }, []);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed top-20 right-4 z-50"
        >
          <div className="bg-background/95 backdrop-blur-md rounded-lg shadow-lg border border-primary/20 p-3 min-w-[200px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 bg-primary/20 rounded-full ${awaitingResponse ? 'animate-gpu-ring-scale-pulse' : 'animate-gpu-pulse-scale-slow'}`}>
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="text-xs">
                  <p className="font-medium">DHF Stack Active</p>
                  <p className="text-muted-foreground">{actionCount} actions</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handlePause}
                >
                  <Pause className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {awaitingResponse && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-2 pt-2 border-t border-border/50"
              >
                <p className="text-xs text-muted-foreground mb-2">
                  Awaiting your response...
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={handlePause}
                  >
                    Pause
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={handleContinue}
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {!isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-20 right-4 z-50"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleContinue}
            className="gap-2"
          >
            <Play className="h-3.5 w-3.5" />
            Resume DHF Stack
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DHFStackCheckIn;
