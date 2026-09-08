/**
 * ZoeFeedCards — the short notes Zoe writes for you, shown above the mosaic.
 *
 * Cards come from `zoe_feed_cards`, which the backend fills only from real
 * rows you can already see. If Zoe has nothing real to say, nothing renders.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  dismissZoeFeedCard,
  fetchZoeFeedCards,
  generateZoeFeedCards,
  type ZoeFeedCard,
} from '@/features/intimacy/zoeFeedCards';
import { cn } from '@/lib/utils';
import { useAgeCohort } from '@/hooks/useAgeCohort';
import { cohortStyle } from '@/features/intimacy/cohortStyle';

interface ZoeFeedCardsProps {
  className?: string;
  /** Ask Zoe to write fresh cards on mount when there are none yet. */
  autoGenerate?: boolean;
}

export const ZoeFeedCards: React.FC<ZoeFeedCardsProps> = ({ className, autoGenerate = true }) => {
  const [cards, setCards] = useState<ZoeFeedCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const { cohort } = useAgeCohort();
  const style = cohortStyle(cohort);

  const load = useCallback(async () => {
    const rows = await fetchZoeFeedCards();
    setCards(rows);
    return rows;
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    setNote(null);
    const result = await generateZoeFeedCards(true);
    const rows = await load();
    if (result.created === 0 && rows.length === 0) {
      setNote(
        result.reason === 'no_real_material_yet'
          ? 'Zoe has nothing to write yet — post or interact a little and she will.'
          : 'Zoe could not write anything right now.',
      );
    }
    setBusy(false);
  }, [load]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const rows = await load();
      if (!alive || rows.length > 0 || !autoGenerate) return;
      const result = await generateZoeFeedCards(false);
      if (alive && result.created > 0) void load();
    })();
    return () => {
      alive = false;
    };
  }, [autoGenerate, load]);

  const onDismiss = async (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    await dismissZoeFeedCard(id);
  };

  if (cards.length === 0 && !note) return null;

  return (
    <section className={cn('space-y-2 px-3 pt-3', className)} aria-label="Notes from Zoe">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3 w-3" aria-hidden />
          From Zoe
          <span className="ml-1 rounded-sm border border-border px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
            {style.label}
          </span>
        </p>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] text-muted-foreground"
          onClick={() => void refresh()}
          disabled={busy}
        >
          <RefreshCw className={cn('mr-1 h-3 w-3', busy && 'animate-spin')} aria-hidden />
          {busy ? 'Writing' : 'Refresh'}
        </Button>
      </div>

      {note && <p className="text-xs text-muted-foreground">{note}</p>}

      {cards.map((card) => (
        <article
          key={card.id}
          data-zoe-card
          className={cn('relative border border-border bg-card pr-9', style.cardClass)}
        >
          <h3 className={cn('leading-snug text-foreground', style.titleClass)}>{card.title}</h3>
          <p className={cn('mt-1 text-muted-foreground', style.bodyClass)}>{card.body}</p>
          {card.kind === 'topic' && Array.isArray((card.source as { headlines?: Array<{ title: string; source: string }> })?.headlines) && (
            <ul className="mt-2 space-y-0.5">
              {((card.source as { headlines: Array<{ title: string; source: string }> }).headlines ?? [])
                .slice(0, 3)
                .map((h) => (
                  <li key={h.title} className="truncate text-[11px] text-muted-foreground">
                    {h.source}: {h.title}
                  </li>
                ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => void onDismiss(card.id)}
            aria-label={`Dismiss "${card.title}"`}
            className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </article>
      ))}
    </section>
  );
};

export default ZoeFeedCards;
