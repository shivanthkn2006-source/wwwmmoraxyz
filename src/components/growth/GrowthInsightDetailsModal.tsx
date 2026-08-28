/**
 * INSIGHT DETAILS
 *
 * Explains, in plain language, exactly which preference fields and which
 * date/time window produced a card. Read-only and self-contained.
 */
import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { SLOT_LABEL, SLOT_LOCAL_TIME, REFLECTION_STYLE_OPTIONS, type GrowthSlot, type ReflectionStyle } from '@/lib/growthSlot';

export interface InsightDetailsSubject {
  id?: string;
  slot: GrowthSlot;
  local_date?: string;
  title: string;
  category: string;
  created_at: string;
}

interface Props {
  insight: InsightDetailsSubject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusAreas?: string[];
  styles?: ReflectionStyle[];
  timezone?: string;
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="max-w-[60%] text-right text-xs font-medium">{value}</span>
  </div>
);

export const GrowthInsightDetailsModal: React.FC<Props> = ({
  insight, open, onOpenChange, focusAreas, styles, timezone,
}) => {
  if (!insight) return null;
  const time = SLOT_LOCAL_TIME[insight.slot];
  const styleTitles = (styles ?? []).map(
    (s) => REFLECTION_STYLE_OPTIONS.find((o) => o.id === s)?.title ?? s,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How this insight was made</DialogTitle>
          <DialogDescription>
            Only the preferences below and the delivery window were used. Nothing else about you
            is read to build a card.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-1">
          <Row label="Card" value={insight.title} />
          <Row label="Category" value={insight.category} />
          <Row
            label="Delivery window"
            value={`${SLOT_LABEL[insight.slot]} · ${String(time?.hour ?? 0).padStart(2, '0')}:${String(time?.minute ?? 0).padStart(2, '0')}`}
          />
          <Row label="Local date" value={insight.local_date ?? '—'} />
          <Row label="Time zone" value={timezone ?? '—'} />
          <Row
            label="Focus areas used"
            value={focusAreas?.length ? focusAreas.join(', ') : '—'}
          />
          <Row label="Delivery styles" value={styleTitles.length ? styleTitles.join(', ') : '—'} />
          <Row
            label="Generated at"
            value={new Date(insight.created_at).toLocaleString()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GrowthInsightDetailsModal;
