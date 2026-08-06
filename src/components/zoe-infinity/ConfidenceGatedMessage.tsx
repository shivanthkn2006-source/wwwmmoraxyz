import { useState } from 'react';
import { AlertTriangle, HelpCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  applyConfidenceGate,
  markUncertainSpans,
  type Metacognition,
} from '@/utils/confidenceGate';

interface ConfidenceGatedMessageProps {
  message: string;
  metacognition?: Metacognition | null;
  className?: string;
  /** Called when the user answers/acknowledges the clarifying question. */
  onClarify?: (question: string) => void;
}

/**
 * Renders a Zoe response through the confidence gate:
 * - low confidence + clarifying question -> the question is shown instead of the answer
 * - uncertain claims are visually marked inside the text
 */
export const ConfidenceGatedMessage = ({
  message,
  metacognition,
  className,
  onClarify,
}: ConfidenceGatedMessageProps) => {
  const [showDraft, setShowDraft] = useState(false);
  const gated = applyConfidenceGate(message, metacognition);

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

        <div className="flex items-center gap-3">
          {onClarify && gated.clarifyingQuestion && (
            <button
              type="button"
              onClick={() => onClarify(gated.clarifyingQuestion!)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Answer this
            </button>
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
        </div>

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
        {segments.map((seg, i) =>
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
        )}
      </p>
    </div>
  );
};

export default ConfidenceGatedMessage;
