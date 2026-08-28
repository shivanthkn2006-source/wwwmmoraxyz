import { slotOrder, type GrowthSlot } from '@/lib/growthSlot';

export interface TimestampedFeedItem<T> {
  id: string;
  timestamp: string | number | Date;
  value: T;
}

/** Merge heterogeneous feed sources into one stable newest-first timeline. */
export function composeChronologicalFeed<T>(items: readonly TimestampedFeedItem<T>[]): T[] {
  return items
    .map((item, index) => ({ ...item, index, time: new Date(item.timestamp).getTime() }))
    .sort((a, b) => {
      const aTime = Number.isFinite(a.time) ? a.time : 0;
      const bTime = Number.isFinite(b.time) ? b.time : 0;
      return bTime - aTime || a.index - b.index || a.id.localeCompare(b.id);
    })
    .map((item) => item.value);
}

/**
 * Inserts Growth cards throughout a feed instead of appending them after every
 * post/video. Order is stable, every Growth card is included exactly once, and
 * sparse feeds surface the first card immediately.
 */
export function interleaveGrowthCards<T>(
  content: readonly T[],
  growth: readonly T[],
  interval = 3,
): T[] {
  if (growth.length === 0) return [...content];
  if (content.length === 0) return [...growth];

  const step = Math.max(1, Math.floor(interval));
  const result: T[] = [];
  let growthIndex = 0;

  for (let index = 0; index < content.length; index += 1) {
    result.push(content[index]);
    if ((index + 1) % step === 0 && growthIndex < growth.length) {
      result.push(growth[growthIndex]);
      growthIndex += 1;
    }
  }

  while (growthIndex < growth.length) {
    result.push(growth[growthIndex]);
    growthIndex += 1;
  }

  return result;
}
/**
 * Orders today's Growth cards by the wall clock instead of by calendar order.
 *
 * The window a member is living in right now comes first, then the earlier
 * windows they already passed (most recent first), and finally anything that
 * belongs to a window still ahead of them. This keeps the feed's first Growth
 * card relevant to the current time of day.
 */
export function orderGrowthByTime<T extends { slot: GrowthSlot }>(
  cards: readonly T[],
  current: GrowthSlot | null,
): T[] {
  const currentRank = current ? slotOrder(current) : Number.POSITIVE_INFINITY;
  const due = cards
    .filter((c) => slotOrder(c.slot) <= currentRank)
    .sort((a, b) => slotOrder(b.slot) - slotOrder(a.slot));
  const ahead = cards
    .filter((c) => slotOrder(c.slot) > currentRank)
    .sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot));
  return [...due, ...ahead];
}
