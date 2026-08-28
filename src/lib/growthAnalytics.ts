/**
 * Growth card analytics — first impression and first tap per card, per user.
 *
 * Deliberately deduped: the unique index on (user_id, item_id, event_type)
 * makes repeated writes a no-op, so scrolling a card past the viewport a
 * hundred times still costs one row. Every failure is swallowed — analytics
 * must never break the feed.
 */
import { supabase } from '@/integrations/supabase/client';

export type GrowthEventType = 'impression' | 'click';

const sent = new Set<string>();

export interface GrowthEventInput {
  userId: string | undefined;
  itemId: string | undefined;
  slot: string;
  category?: string | null;
  focusAreas?: string[];
  surface?: string;
}

export async function recordGrowthEvent(
  type: GrowthEventType,
  input: GrowthEventInput,
): Promise<void> {
  const { userId, itemId } = input;
  if (!userId || !itemId) return;
  const key = `${userId}:${itemId}:${type}`;
  if (sent.has(key)) return;
  sent.add(key);
  try {
    await supabase.from('growth_card_events').upsert(
      {
        user_id: userId,
        item_id: itemId,
        slot: input.slot,
        category: input.category ?? null,
        focus_areas: input.focusAreas ?? [],
        event_type: type,
        surface: input.surface ?? 'home',
      },
      { onConflict: 'user_id,item_id,event_type', ignoreDuplicates: true },
    );
  } catch {
    // Never surface analytics failures to the member.
  }
}

/** Test helper — clears the in-memory dedupe cache. */
export function __resetGrowthAnalytics() {
  sent.clear();
}
