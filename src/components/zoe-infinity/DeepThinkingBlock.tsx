import { useState } from 'react';
import { Brain, ChevronDown, Gauge, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfidenceGatedMessage } from './ConfidenceGatedMessage';
import type { Metacognition } from '@/utils/confidenceGate';

export interface DeepThinkingMeta extends Partial<Metacognition> {
  internalMonologue?: string[];
  monologueRegions?: string[];
  difficulty?: 'trivial' | 'moderate' | 'hard' | null;
  deepMode?: boolean;
  fastPass?: boolean;
  backtracked?: boolean;
  discardedAssumption?: string | null;
}

const REGION_STYLE: Record<string, string> = {
  PREFRONTAL_CORTEX: 'text-cyan-300 border-cyan-400/40',
  AMYGDALA: 'text-rose-300 border-rose-400/40',
  HIPPOCAMPUS: 'text-amber-300 border-amber-400/40',
  ACC: 'text-violet-300 border-violet-400/40',
};

const regionOf = (line: string, fallback?: string) => {
  const m = line.match(/^\s*\[([A-Z_]+)\]/);
  return m?.[1] ?? fallback ?? 'PREFRONTAL_CORTEX';
};

/**
 * Terminal-style "Deep Thinking" trace + confidence-gated final answer.
 * Renders Zoe's region-tagged internal monologue above her reply.
 */
export const DeepThinkingBlock = ({
  message,
  meta,
  messageId,
  onClarify,
  className,
}: {
  message: string;
  meta?: DeepThinkingMeta | null;
  messageId?: string | null;
  onClarify?: (prompt: string) => void;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const monologue = meta?.internalMonologue ?? [];
  const confidence = typeof meta?.confidence === 'number' ? meta.confidence : null;

  return (
    <div className={cn('space-y-1.5', className)}>
      {monologue.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-background/40 backdrop-blur-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center gap-1.5 px-2 py-1 text-[10px] md:text-xs text-primary/90 hover:bg-primary/10 transition-colors"
            aria-expanded={open}
          >
            <Brain className="h-3 w-3 shrink-0" />
            <span className="font-medium">Deep thinking</span>
            <span className="opacity-60">· {monologue.length} steps</span>
            {meta?.fastPass && (
              <span className="inline-flex items-center gap-0.5 opacity-70"><Zap className="h-2.5 w-2.5" />fast</span>
            )}
            {meta?.difficulty && <span className="opacity-60">· {meta.difficulty}</span>}
            {confidence !== null && (
              <span className="inline-flex items-center gap-0.5 opacity-70">
                <Gauge className="h-2.5 w-2.5" />{Math.round(confidence * 100)}%
              </span>
            )}
            <ChevronDown className={cn('h-3 w-3 ml-auto transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <ol className="px-2 pb-2 space-y-1 font-mono text-[10px] md:text-[11px] leading-relaxed">
              {monologue.map((line, i) => {
                const region = regionOf(line, meta?.monologueRegions?.[i]);
                const text = line.replace(/^\s*\[[A-Z_]+\]\s*/, '');
                return (
                  <li key={i} className={cn('border-l-2 pl-2', REGION_STYLE[region] ?? 'text-muted-foreground border-border')}>
                    <span className="opacity-60">{region.toLowerCase()}</span>
                    <span className="block text-foreground/80">{text}</span>
                  </li>
                );
              })}
              {meta?.backtracked && meta?.discardedAssumption && (
                <li className="border-l-2 border-orange-400/40 pl-2 text-orange-300">
                  <span className="opacity-60">backtracked</span>
                  <span className="block text-foreground/80">Discarded: {meta.discardedAssumption}</span>
                </li>
              )}
            </ol>
          )}
        </div>
      )}
      <ConfidenceGatedMessage
        message={message}
        metacognition={(meta as Metacognition) ?? null}
        messageId={messageId}
        onClarify={onClarify}
        showFeedback
      />
    </div>
  );
};

export default DeepThinkingBlock;
