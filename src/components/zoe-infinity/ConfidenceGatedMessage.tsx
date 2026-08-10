import { useState } from 'react';
import { AlertTriangle, HelpCircle, ChevronDown, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  applyConfidenceGate,
  markUncertainSpans,
  type Metacognition,
} from '@/utils/confidenceGate';
import { useClarificationCycle } from '@/hooks/useClarificationCycle';

interface ConfidenceGatedMessageProps {
  message: string;
  metacognition?: Metacognition | null;
  className?: string;
  /** Message id of this assistant turn (used for drift logging). */
  messageId?: string | null;
  /**
   * Called with a ready-to-send re-ask prompt once the user answers the
   * clarifying question. Wire this to your chat send function.
   */
  onClarify?: (reAskPrompt: string) => void;
  /** Show thumbs up/down calibration feedback on delivered answers. */
  showFeedback?: boolean;
}

/**
 * Renders a Zoe response through the confidence gate:
 * - low confidence + clarifying question -> the question is shown instead of the answer,
 *   with an inline answer box that closes the clarification cycle
 * - uncertain claims are visually marked inside the text
 */
export const ConfidenceGatedMessage = ({
  message,
  metacognition,
  className,
  messageId,
  onClarify,
  showFeedback = false,
}: ConfidenceGatedMessageProps) => {
  const [showDraft, setShowDraft] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sent, setSent] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const { submitClarification, reportDrift, confirmAnswer, isSubmitting } = useClarificationCycle();

  const gated = applyConfidenceGate(message, metacognition);

  const handleSubmit = async () => {
    if (!answer.trim() || !gated.clarifyingQuestion) return;
    const prompt = await submitClarification({
      question: gated.clarifyingQuestion,
      answer,
      originalResponse: gated.draftAnswer ?? message,
      reportedConfidence: gated.confidence,
      messageId: messageId ?? null,
    });
    setSent(true);
    if (prompt) onClarify?.(prompt);
  };

  if (gated.withheld) {
    return (
      <div className={cn('space-y-2', className)} data-testid="confidence-gate-withheld">
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{gated.clarifyingQuestion}</p>
            <p className="text-xs text-muted-foreground">
              I'm not confident enough to answer this yet
              {gated.confidence !== null && ` (${Math.round(gated.confidence * 100)}% sure)`}.
            </p>
          </div>
        </div>

        {gated.uncertainClaims.length > 0 && (
          <ul className="space-y-1 pl-1" data-testid="uncertain-claims">
            {gated.uncertainClaims.map((claim, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                <span>{claim}</span>
              </li>
            ))}
          </ul>
        )}

        {!sent ? (
          <div className="flex items-end gap-2" data-testid="clarify-form">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              rows={1}
              placeholder="Answer so Zoe can continue…"
              aria-label="Answer Zoe's clarifying question"
              className="min-h-[38px] flex-1 resize-y rounded-md border border-border/60 bg-background/70 px-2.5 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
            />
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!answer.trim() || isSubmitting}
              aria-label="Send clarification"
              data-testid="clarify-submit"
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-emerald-500" data-testid="clarify-sent">
            Got it — recalibrating with your answer.
          </p>
        )}

        {gated.draftAnswer && (
          <button
            type="button"
            onClick={() => setShowDraft((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            data-testid="toggle-draft"
          >
            <ChevronDown className={cn('h-3 w-3 transition-transform', showDraft && 'rotate-180')} />
            {showDraft ? 'Hide' : 'Show'} unverified draft
          </button>
        )}

        {showDraft && gated.draftAnswer && (
          <p
            className="rounded-md border border-border/60 bg-muted/40 p-2 text-xs italic text-muted-foreground"
            data-testid="draft-answer"
          >
            {gated.draftAnswer}
          </p>
        )}
      </div>
    );
  }

  const segments = markUncertainSpans(gated.spokenText, gated.uncertainClaims);

  return (
    <div className={cn('space-y-1', className)} data-testid="confidence-gate-answer">
      <p className="text-sm leading-relaxed text-foreground">
        {gated.uncertainClaims.length === 0 ? (
          <SpokenTranscript messageId={messageId ?? undefined} text={gated.spokenText} />
        ) : (
          segments.map((seg, i) =>
            seg.uncertain ? (
              <mark
                key={i}
                data-testid="uncertain-span"
                title="Zoe is not fully confident about this"
                className="rounded bg-amber-500/20 px-0.5 text-foreground decoration-amber-500/70 decoration-dotted underline-offset-2 [text-decoration-line:underline]"
              >
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )
        )}
      </p>


      {showFeedback && (
        <div className="flex items-center gap-2 pt-0.5" data-testid="calibration-feedback">
          <button
            type="button"
            aria-label="Answer was correct"
            disabled={feedback !== null}
            onClick={() => {
              setFeedback('up');
              void confirmAnswer(gated.spokenText);
            }}
            className={cn(
              'rounded p-1 text-muted-foreground hover:text-emerald-500 disabled:opacity-60',
              feedback === 'up' && 'text-emerald-500',
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Answer was wrong"
            disabled={feedback !== null}
            onClick={() => {
              setFeedback('down');
              void reportDrift(gated.spokenText);
            }}
            className={cn(
              'rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-60',
              feedback === 'down' && 'text-destructive',
            )}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ConfidenceGatedMessage;
