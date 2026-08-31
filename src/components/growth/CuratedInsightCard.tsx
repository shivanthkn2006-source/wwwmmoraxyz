/**
 * Standalone growth insight card. Presentation only — it never fetches or
 * generates, and it reuses existing design tokens so the feed keeps its look.
 * The optional save control is a pure callback; the card owns no data logic.
 *
 * Instrumentation is opt-in: when `onImpression` is supplied the card reports
 * once, the first time it is at least half visible. Analytics failures are
 * handled by the caller and can never break rendering.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Target, Sparkles, Bookmark, BookmarkCheck, Info, ImageOff } from 'lucide-react';
import { SLOT_LABEL, type GrowthSlot } from '@/lib/growthSlot';
import { SLOT_LOCAL_TIME } from '@/lib/growthSlot';
import { useValidatedGrowthImage } from '@/hooks/useValidatedGrowthImage';
import ZoeCardNarrationControls from '@/components/voice/ZoeCardNarrationControls';



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
  /** Fired once when the card first becomes visible. */
  onImpression?: (insight: CuratedInsight) => void;
  /** Fired when the member interacts with the card body. */
  onCardClick?: (insight: CuratedInsight) => void;
  /** Opens the "how this was made" modal. */
  onOpenDetails?: (insight: CuratedInsight) => void;
  focusAreas?: string[];
  deliveryFrequency?: number;
}

/**
 * Standalone illustrative image for a growth card. The picture is generated
 * from the card's own text and then validated against it (see
 * `useValidatedGrowthImage`): a mismatched face or a stranger where the card
 * names nobody is re-rolled and finally replaced by a faceless illustration.
 * If it fails to load the block disappears and the card renders as before.
 */
const GrowthInsightImage: React.FC<{ insight: CuratedInsight }> = ({ insight }) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  const { src, person } = useValidatedGrowthImage({
    key: insight.id ?? insight.slot,
    title: insight.title,
    content: insight.content,
    category: insight.category,
  });

  useEffect(() => { setStatus('loading'); }, [src]);

  if (status === 'failed') return null;

  return (
    <div className="relative mb-3 overflow-hidden rounded-xl bg-muted/40 aspect-[16/9]" data-growth-image-person={person ?? ''}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-muted">
          <ImageOff className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
        </div>
      )}
      <img
        src={src}
        alt={person ? `Illustration of ${person} for ${insight.title}` : `Illustration for ${insight.title}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('failed')}
        className={`h-full w-full object-cover transition-opacity duration-500 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};



export const CuratedInsightCard: React.FC<Props> = ({
  insight, className, saved, onToggleSave, savedBadge, onImpression, onCardClick, onOpenDetails,
  focusAreas, deliveryFrequency,
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const reported = useRef(false);

  useEffect(() => {
    if (!onImpression || reported.current) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !reported.current) {
            reported.current = true;
            onImpression(insight);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onImpression, insight]);

  return (
    <article
      ref={ref}
      className={`overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm ${className ?? ''}`}
      data-growth-card
      data-growth-slot={insight.slot}
      onClick={onCardClick ? () => onCardClick(insight) : undefined}
    >
      <header className="mb-3 grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{insight.category}</span>
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {savedBadge ? 'Saved' : SLOT_LABEL[insight.slot] ?? 'Daily insight'}
          </span>
        </div>
        <div className="relative z-20 flex shrink-0 items-center gap-1">
          <ZoeCardNarrationControls
            id={`growth:${insight.id ?? `${insight.local_date ?? 'today'}:${insight.slot}`}`}
            text={`${insight.title}. ${insight.content}${insight.actionable_step ? ` Immediate action: ${insight.actionable_step}` : ''}`}
            kind="growth"
            order={Object.keys(SLOT_LOCAL_TIME).indexOf(insight.slot)}
          />
          {onOpenDetails && (
            <button
              type="button"
              aria-label="How this insight was made"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onOpenDetails(insight); }}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-muted-foreground transition hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
            >
              <Info className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          {onToggleSave && insight.id && (
            <button
              type="button"
              aria-label={saved ? 'Remove from saved insights' : 'Save this insight'}
              aria-pressed={Boolean(saved)}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleSave(insight.id as string); }}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-muted-foreground transition hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
            >
              {saved
                ? <BookmarkCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                : <Bookmark className="h-5 w-5" aria-hidden="true" />}
            </button>
          )}
        </div>
      </header>

      <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Insight plan details">
        <span className="rounded-full border border-border bg-muted/60 px-2 py-1 text-[10px] text-muted-foreground">
          {SLOT_LABEL[insight.slot]} · {String(SLOT_LOCAL_TIME[insight.slot].hour).padStart(2, '0')}:{String(SLOT_LOCAL_TIME[insight.slot].minute).padStart(2, '0')}
        </span>
        {typeof deliveryFrequency === 'number' && (
          <span className="rounded-full border border-border bg-muted/60 px-2 py-1 text-[10px] text-muted-foreground">
            {deliveryFrequency} per day
          </span>
        )}
        {(focusAreas ?? []).slice(0, 2).map((area) => (
          <span key={area} className="rounded-full border border-border bg-muted/60 px-2 py-1 text-[10px] text-muted-foreground">
            {area}
          </span>
        ))}
        {(focusAreas?.length ?? 0) > 2 && (
          <span className="rounded-full border border-border bg-muted/60 px-2 py-1 text-[10px] text-muted-foreground">
            +{(focusAreas?.length ?? 0) - 2} more
          </span>
        )}
      </div>

      <GrowthInsightImage insight={insight} />

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
};

/** Loading placeholder — keeps the feed layout stable while data is fetching. */
export const CuratedInsightSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div
    data-growth-card-skeleton
    aria-hidden="true"
    className={`animate-pulse overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm ${className ?? ''}`}
  >
    <div className="mb-4 h-5 w-28 rounded-full bg-muted" />
    <div className="mb-3 h-5 w-3/4 rounded bg-muted" />
    <div className="space-y-2">
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-11/12 rounded bg-muted" />
      <div className="h-3 w-2/3 rounded bg-muted" />
    </div>
  </div>
);

export default CuratedInsightCard;
