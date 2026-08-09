// Tracks which feed posts a user has already been auto-scrolled through, so the
// homepage auto-scroll only activates when genuinely NEW posts appear.
//
// Storage shape: mmora.home.seenPosts.<tab> => JSON string[] of post ids (capped).

const MAX_IDS = 500;

export type FeedUpdateSource = 'initial' | 'manual' | 'realtime';

export interface NewArrivalResult {
  knownIds: string[];
  newIds: string[];
  shouldAutoScroll: boolean;
}

const keyFor = (tab: string) => `mmora.home.seenPosts.${tab}`;

export const readSeenPostIds = (tab: string): Set<string> => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(keyFor(tab)) : null;
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((v) => typeof v === 'string')) : new Set();
  } catch {
    return new Set();
  }
};

export const markPostsSeen = (tab: string, ids: string[]): void => {
  try {
    if (typeof window === 'undefined') return;
    const merged = Array.from(new Set([...ids, ...readSeenPostIds(tab)])).slice(0, MAX_IDS);
    window.localStorage.setItem(keyFor(tab), JSON.stringify(merged));
  } catch {
    /* storage unavailable — gate degrades to "no new posts" only in-memory */
  }
};

/** Returns the ids present in `ids` that have never been seen before on this tab. */
export const getUnseenPostIds = (tab: string, ids: string[]): string[] => {
  const seen = readSeenPostIds(tab);
  return ids.filter((id) => id && !seen.has(id));
};

/** True when the first load on a device has no history at all (nothing seen yet). */
export const hasNoSeenHistory = (tab: string): boolean => readSeenPostIds(tab).size === 0;

/**
 * Compares two feed snapshots. Initial loads and manual refreshes always become
 * a quiet baseline; only a realtime update is allowed to arm auto-scroll.
 */
export const detectNewArrivals = (
  previousIds: string[],
  nextIds: string[],
  source: FeedUpdateSource,
): NewArrivalResult => {
  const knownIds = Array.from(new Set(nextIds.filter(Boolean)));
  const previous = new Set(previousIds.filter(Boolean));
  const newIds = source === 'realtime' ? knownIds.filter((id) => !previous.has(id)) : [];
  return { knownIds, newIds, shouldAutoScroll: newIds.length > 0 };
};

export const createOnePassQueue = (ids: string[]): string[] =>
  Array.from(new Set(ids.filter(Boolean)));

export const advanceOnePass = (queue: string[], index: number) => {
  const nextIndex = index + 1;
  return nextIndex >= queue.length
    ? { completed: true, nextIndex: 0 }
    : { completed: false, nextIndex };
};
