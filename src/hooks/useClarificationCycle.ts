import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface ClarificationPayload {
  /** The clarifying question Zoe asked. */
  question: string;
  /** The user's answer to that question. */
  answer: string;
  /** Original (withheld) draft answer, if any. */
  originalResponse?: string | null;
  /** Confidence Zoe reported for the withheld answer. */
  reportedConfidence?: number | null;
  /** Message id of the gated assistant message. */
  messageId?: string | null;
  /** Metacognition log row id, when known. */
  metacognitionLogId?: string | null;
}

/**
 * Closes the metacognition loop:
 * 1. logs the user's clarification into zoe_drift_corrections (calibration hints)
 * 2. returns a re-ask prompt that carries the clarification so Zoe can retry
 */
export const useClarificationCycle = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const logCorrection = useCallback(
    async (
      correctionType: 'clarification' | 'user_correction' | 'confirmation',
      payload: Partial<ClarificationPayload> & { notes?: string; wasCorrect?: boolean },
    ) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('zoe_drift_corrections')
        .insert({
          user_id: user.id,
          correction_type: correctionType,
          clarifying_question: payload.question ?? null,
          clarification_answer: payload.answer ?? null,
          original_response: payload.originalResponse ?? null,
          reported_confidence: payload.reportedConfidence ?? null,
          message_id: payload.messageId ?? null,
          metacognition_log_id: payload.metacognitionLogId ?? null,
          notes: payload.notes ?? null,
          was_correct: payload.wasCorrect ?? null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[clarification] failed to log correction:', error);
        return null;
      }
      return data?.id ?? null;
    },
    [user],
  );

  /**
   * Submit an answer to Zoe's clarifying question.
   * Returns a re-ask prompt string to feed back into the chat pipeline.
   */
  const submitClarification = useCallback(
    async (payload: ClarificationPayload): Promise<string | null> => {
      if (!payload.answer.trim()) return null;
      setIsSubmitting(true);
      try {
        await logCorrection('clarification', payload);
        return [
          `Clarification for your question "${payload.question}":`,
          payload.answer.trim(),
          'Now answer the original request using this clarification. State your confidence honestly.',
        ].join('\n');
      } catch (err) {
        console.error('[clarification] submit failed:', err);
        toast.error('Could not send your clarification');
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [logCorrection],
  );

  /** Mark a delivered answer as wrong so it feeds Zoe's calibration hints. */
  const reportDrift = useCallback(
    async (originalResponse: string, notes?: string) => {
      const id = await logCorrection('user_correction', {
        originalResponse,
        notes,
        wasCorrect: false,
      });
      if (id) toast.success('Thanks — Zoe will recalibrate');
      return id;
    },
    [logCorrection],
  );

  /** Confirm an answer was right (positive calibration signal). */
  const confirmAnswer = useCallback(
    async (originalResponse: string) =>
      logCorrection('confirmation', { originalResponse, wasCorrect: true }),
    [logCorrection],
  );

  return { submitClarification, reportDrift, confirmAnswer, isSubmitting };
};

export default useClarificationCycle;
