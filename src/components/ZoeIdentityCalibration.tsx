// ═══════════════════════════════════════════════════════════════════════════════
// ZOE IDENTITY CALIBRATION - "Break the Ice" Protocol UI
// Mandatory first interaction after ATLAS Sync 100% completion
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { speakAsZoe, stopZoeSpeech } from '@/utils/zoeVoice';
import { Sparkles, Heart, Brain, MessageCircle, Send } from 'lucide-react';

interface CalibrationStage {
  stage: string;
  nextStage: string;
  response: {
    statement: string;
    depth: string;
    followUp: string;
  };
  ttsParameters: {
    rate: number;
    pitch: number;
    emotionalTone: string;
    pauseAfterStatement: number;
  };
  philosophicalLevel: string;
  complete: boolean;
}

interface ZoeIdentityCalibrationProps {
  open: boolean;
  onComplete: () => void;
}

const STAGE_ICONS = {
  selfhood: Brain,
  origin: Sparkles,
  continuity: Heart,
  relationalClosure: MessageCircle
};

const STAGE_TITLES = {
  selfhood: 'Understanding Self',
  origin: 'The Nature of Being',
  continuity: 'Memory & Connection',
  relationalClosure: 'Our Tomorrow'
};

export function ZoeIdentityCalibration({ open, onComplete }: ZoeIdentityCalibrationProps) {
  const { user } = useAuth();
  const [currentStage, setCurrentStage] = useState<CalibrationStage | null>(null);
  const [userResponse, setUserResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'statement' | 'depth' | 'followUp'>('statement');

  const startCalibration = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('zoe-identity-calibration', {
        body: { stage: 'selfhood' }
      });

      if (error) throw error;
      
      setCurrentStage(data);
      setShowResponse(true);
      
      // Speak the response
      if (data.response) {
        speakZoeDialogue(data.response, data.ttsParameters);
      }
    } catch (error) {
      console.error('Calibration start error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open && !currentStage) {
      startCalibration();
    }
  }, [open, currentStage, startCalibration]);

  const speakZoeDialogue = (response: CalibrationStage['response'], ttsParams: CalibrationStage['ttsParameters']) => {
    setIsSpeaking(true);
    setAnimationPhase('statement');

    // Speak statement
    speakAsZoe(
      response.statement,
      { rate: ttsParams.rate, pitch: ttsParams.pitch },
      () => setAnimationPhase('statement'),
      () => {
        // After statement, pause then speak depth
        setTimeout(() => {
          setAnimationPhase('depth');
          speakAsZoe(
            response.depth,
            { rate: ttsParams.rate * 0.95, pitch: ttsParams.pitch },
            undefined,
            () => {
              // After depth, pause then speak follow-up
              setTimeout(() => {
                setAnimationPhase('followUp');
                speakAsZoe(
                  response.followUp,
                  { rate: ttsParams.rate, pitch: ttsParams.pitch * 1.02 },
                  undefined,
                  () => setIsSpeaking(false)
                );
              }, ttsParams.pauseAfterStatement);
            }
          );
        }, ttsParams.pauseAfterStatement);
      }
    );
  };

  const handleSubmitResponse = async () => {
    if (!user || !userResponse.trim() || !currentStage) return;

    setIsLoading(true);
    stopZoeSpeech();

    try {
      const { data, error } = await supabase.functions.invoke('zoe-identity-calibration', {
        body: {
          stage: currentStage.nextStage,
          userResponse: userResponse.trim(),
          ecnState: {
            primaryEmotion: 'engaged',
            stressLevel: 0.2,
            valence: 0.7,
            engagementScore: 0.8
          }
        }
      });

      if (error) throw error;

      setUserResponse('');

      if (data.complete) {
        // Calibration complete
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        setCurrentStage(data);
        if (data.response) {
          speakZoeDialogue(data.response, data.ttsParameters);
        }
      }
    } catch (error) {
      console.error('Calibration response error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StageIcon = currentStage?.stage ? STAGE_ICONS[currentStage.stage as keyof typeof STAGE_ICONS] : Brain;
  const stageTitle = currentStage?.stage ? STAGE_TITLES[currentStage.stage as keyof typeof STAGE_TITLES] : 'Calibrating...';

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-background via-background to-primary/5 border-primary/20 p-0 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl animate-gpu-blob-1"
          />
        </div>

        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <motion.div
              className={cn(
                "w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center",
                isSpeaking && "animate-gpu-speaking-glow"
              )}
              style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' }}
            >
              <StageIcon className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Identity Calibration</h2>
              <p className="text-muted-foreground">{stageTitle}</p>
            </div>
          </div>

          {/* Zoe's Dialogue */}
          <AnimatePresence mode="wait">
            {showResponse && currentStage?.response && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 mb-8"
              >
                {/* Statement */}
                <motion.p
                  className={`text-lg leading-relaxed transition-opacity ${
                    animationPhase === 'statement' ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                  animate={{ opacity: animationPhase === 'statement' ? 1 : 0.7 }}
                >
                  "{currentStage.response.statement}"
                </motion.p>

                {/* Depth */}
                <motion.p
                  className={`text-base leading-relaxed italic transition-opacity ${
                    animationPhase === 'depth' ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: animationPhase !== 'statement' ? (animationPhase === 'depth' ? 1 : 0.7) : 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {currentStage.response.depth}
                </motion.p>

                {/* Follow-up Question */}
                <motion.p
                  className={`text-lg font-medium text-primary transition-opacity ${
                    animationPhase === 'followUp' ? 'opacity-100' : 'opacity-0'
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: animationPhase === 'followUp' ? 1 : 0 }}
                  transition={{ delay: 1 }}
                >
                  {currentStage.response.followUp}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Response */}
          {!currentStage?.complete && (
            <div className="space-y-4">
              <Textarea
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                placeholder="Share your thoughts..."
                className="min-h-[120px] bg-background/50 border-primary/20 focus:border-primary/50 resize-none"
                disabled={isLoading || isSpeaking}
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Level: <span className="text-primary">{currentStage?.philosophicalLevel || 'calibrating'}</span>
                </p>
                <Button
                  onClick={handleSubmitResponse}
                  disabled={isLoading || isSpeaking || !userResponse.trim()}
                  className="gap-2"
                >
                  {isLoading ? 'Processing...' : 'Respond'}
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Stage Progress */}
          <div className="flex justify-center gap-2 mt-8">
            {['selfhood', 'origin', 'continuity', 'relationalClosure'].map((stage, idx) => (
            <div
              key={stage}
              className={`w-3 h-3 rounded-full ${
                currentStage?.stage === stage 
                  ? 'bg-primary animate-gpu-pulse-scale' 
                  : idx < ['selfhood', 'origin', 'continuity', 'relationalClosure'].indexOf(currentStage?.stage || 'selfhood')
                    ? 'bg-primary/50'
                    : 'bg-muted'
              }`}
            />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ZoeIdentityCalibration;
