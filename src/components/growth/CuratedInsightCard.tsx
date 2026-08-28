/**
 * Standalone growth insight card. Presentation only — it never fetches or
 * generates, and it reuses existing design tokens so the feed keeps its look.
 * The optional save control is a pure callback; the card owns no data logic.
 */
import React from 'react';
import { Target, Sparkles, Bookmark, BookmarkCheck } from 'lucide-react';
import { SLOT_LABEL, type GrowthSlot } from '@/lib/growthSlot';

export interface CuratedInsight {
  id?: string;
  slot: GrowthSlot;
  local_date?: string;
  title: string;
  category: string;
  content: string;
  actionable_step: string | null;
  created_at: string;
}

interface Props {
  insight: CuratedInsight;
  className?: string;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
  /** Shown when the card is a bookmarked one from an earlier day. */
  savedBadge?: boolean;
}

export const CuratedInsightCard: React.FC<Props> = ({
  insight, className, saved, onToggleSave, savedBadge,
}) => (
  <article
    className={`overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm ${className ?? ''}`}
    data-growth-card
    data-growth-slot={insight.slot}
  >
    <header className="mb-3 flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        {insight.category}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">
          {savedBadge ? 'Saved' : SLOT_LABEL[insight.slot] ?? 'Daily insight'}
        </span>
        {onToggleSave && insight.id && (
          <button
            type="button"
            aria-label={saved ? 'Remove from saved insights' : 'Save this insight'}
            aria-pressed={Boolean(saved)}
            onClick={() => onToggleSave(insight.id as string)}
            className="rounded-full border border-border bg-muted/60 p-1.5 text-muted-foreground transition hover:text-foreground"
          >
            {saved
              ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              : <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        )}
      </div>
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
