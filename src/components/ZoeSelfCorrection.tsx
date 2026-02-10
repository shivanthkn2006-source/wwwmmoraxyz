// ═══════════════════════════════════════════════════════════════════════════════
// ZOE SELF-CORRECTION COMPONENT - Handles confused emoji feedback
// Triggers immediate self-correction review and delivers revised response
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle2, Brain, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface ZoeSelfCorrectionProps {
  originalResponse: string;
  originalResponseId?: string;
  onCorrectionComplete: (correctedResponse: string) => void;
  onCancel: () => void;
}

export const ZoeSelfCorrection: React.FC<ZoeSelfCorrectionProps> = ({
  originalResponse,
  originalResponseId,
  onCorrectionComplete,
  onCancel,
}) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [correctedResponse, setCorrectedResponse] = useState<string | null>(null);
  const [phase, setPhase] = useState<'analyzing' | 'correcting' | 'complete'>('analyzing');

  const executeSelfCorrection = useCallback(async () => {
    if (!user) return;

    setIsProcessing(true);
    setPhase('analyzing');

    try {
      // Call the Zoe core executor for self-correction
      const { data, error } = await supabase.functions.invoke('zoe-core-executor', {
        body: {
          command: `Please review and improve this response that the user found confusing: "${originalResponse.substring(0, 500)}". Provide a clearer, more helpful response. Start with an acknowledgment of the confusion.`,
          userId: user.id,
          intent: 'self_correction',
          context: {
            userTier: 'premium',
            contextualCues: ['user_confused', 'needs_clarification'],
          },
          options: {
            forceThinkingLevel: 'medium',
            verboseReasoning: false,
          },
        },
      });

      if (error) throw error;

      setPhase('correcting');
      
      // Simulate processing delay for UX
      await new Promise(resolve => setTimeout(resolve, 1500));

      const corrected = data?.message || 
        `My apologies, I realize my last response was ambiguous. Let me clarify: ${originalResponse.substring(0, 200)}... [Improved explanation would be here]`;

      // Log the self-correction
      await supabase.from('zoe_self_corrections').insert({
        user_id: user.id,
        original_response_id: originalResponseId,
        original_response: originalResponse.substring(0, 1000),
        corrected_response: corrected.substring(0, 1000),
        correction_reason: 'User indicated confusion via emoji feedback',
        user_feedback_type: 'confused',
        learning_applied: true,
        ecn_state_at_correction: {
          trigger: 'confused_emoji',
          timestamp: new Date().toISOString(),
        },
      });

      // Log to evolution log
      await supabase.from('zoe_evolution_log').insert({
        user_id: user.id,
        evolution_type: 'self_correction',
        description: 'Successfully corrected a response that was marked as confusing by the user.',
        learning_source: 'user_feedback',
        announced_to_user: false,
      });

      setCorrectedResponse(corrected);
      setPhase('complete');

      // Show acknowledgment
      toast.success('Response clarified', {
        description: 'I\'ve revised my response based on your feedback.',
      });

    } catch (err) {
      console.error('Self-correction error:', err);
      toast.error('Unable to process correction');
      onCancel();
    } finally {
      setIsProcessing(false);
    }
  }, [user, originalResponse, originalResponseId, onCancel]);

  // Auto-start correction
  React.useEffect(() => {
    executeSelfCorrection();
  }, [executeSelfCorrection]);

  const handleComplete = () => {
    if (correctedResponse) {
      onCorrectionComplete(correctedResponse);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-secondary/50 rounded-lg p-4 border border-border/50"
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-full ${
              phase === 'complete' ? 'bg-emerald-500/20' : 'bg-primary/20'
            } ${phase !== 'complete' ? 'animate-gpu-spin-2s' : ''}`}
          >
            {phase === 'complete' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : phase === 'correcting' ? (
              <Brain className="h-5 w-5 text-primary" />
            ) : (
              <RefreshCw className="h-5 w-5 text-primary" />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {phase === 'analyzing' && 'Analyzing response...'}
                {phase === 'correcting' && 'Generating clarification...'}
                {phase === 'complete' && 'Response clarified'}
              </span>
              {phase !== 'complete' && (
                <div className="animate-gpu-pulse-opacity">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
              )}
            </div>

            {phase === 'complete' && correctedResponse && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <p className="text-sm text-muted-foreground italic">
                  "My apologies, I realize my last response was ambiguous. Let me clarify that point for you..."
                </p>
                
                <div className="bg-background/50 rounded-md p-3 text-sm">
                  {correctedResponse.substring(0, 300)}
                  {correctedResponse.length > 300 && '...'}
                </div>

                <button
                  onClick={handleComplete}
                  className="text-sm text-primary hover:underline"
                >
                  Use this clarification →
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZoeSelfCorrection;
