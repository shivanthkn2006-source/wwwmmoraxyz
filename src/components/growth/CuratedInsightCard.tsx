/**
 * Standalone growth insight card. Presentation only — it never fetches or
 * generates, and it reuses existing design tokens so the feed keeps its look.
 */
import React from 'react';
import { Target, Sparkles } from 'lucide-react';
import { SLOT_LABEL, type GrowthSlot } from '@/lib/growthSlot';

export interface CuratedInsight {
  slot: GrowthSlot;
  title: string;
  category: string;
  content: string;
  actionable_step: string | null;
  created_at: string;
}

interface Props {
  insight: CuratedInsight;
  className?: string;
}

export const CuratedInsightCard: React.FC<Props> = ({ insight, className }) => (
  <article
    className={`overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm ${className ?? ''}`}
  >
    <header className="mb-3 flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        {insight.category}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {SLOT_LABEL[insight.slot] ?? 'Daily insight'}
      </span>
    </header>

    <h2 className="mb-2 text-lg font-semibold leading-snug">{insight.title}</h2>
    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
      {insight.content}
    </p>

    {insight.actionable_step && (
      <div className="mt-4 rounded-xl border border-border bg-muted/50 p-3">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Target className="h-3 w-3" aria-hidden="true" />
          Immediate action
        </p>
        <p className="text-sm text-foreground">{insight.actionable_step}</p>
      </div>
    )}
  </article>
);

export default CuratedInsightCard;
