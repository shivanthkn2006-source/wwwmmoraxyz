/**
 * GROWTH ALERTS PANEL
 *
 * Opened from the light-bulb icon in the home dock. Shows the live alert queue
 * plus the most recent published insights so a member who missed (or dismissed)
 * a banner can still read every card. Opening the panel clears the unread badge.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, ChevronRight, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useGrowthAlertQueue, clearGrowthUnread } from '@/hooks/useGrowthUnread';
import { SLOT_LABEL } from '@/lib/growthSlot';

interface RecentItem {
  id: string;
  slot: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GrowthAlertsPanel: React.FC<Props> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { queue } = useGrowthAlertQueue();
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('growth_feed_items')
          .select('id, slot, title, content, category, created_at')
          .eq('user_id', user.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(10);
        if (active) setRecent((data as RecentItem[] | null) ?? []);
      } catch {
        if (active) setRecent([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open, user?.id]);

  // Opening the panel counts as reading the alerts.
  useEffect(() => {
    if (open) clearGrowthUnread(queue.map((a) => a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const items: RecentItem[] = recent.length
    ? recent
    : queue.map((a) => ({
        id: a.id, slot: a.slot, title: a.title, content: a.content,
        category: a.category, created_at: a.created_at,
      }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,24rem)] overflow-y-auto" data-growth-alerts-panel>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" />
            Growth alerts
          </SheetTitle>
          <SheetDescription className="text-xs">
            Every insight generated for you, newest first.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {loading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Loading your alerts…
            </p>
          )}

          {!loading && items.length === 0 && (
            <p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
              No insights yet. Once your engine is on, new cards appear here the moment they are
              generated.
            </p>
          )}

          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onOpenChange(false); navigate('/growth-insights'); }}
              className="w-full rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/50"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {SLOT_LABEL[item.slot as keyof typeof SLOT_LABEL] ?? item.category} ·{' '}
                {new Date(item.created_at).toLocaleString()}
              </p>
              <p className="mt-0.5 text-sm font-semibold">{item.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.content}</p>
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-4 w-full"
          onClick={() => { onOpenChange(false); navigate('/growth-insights'); }}
        >
          Open the full archive <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default GrowthAlertsPanel;
