// Tracks which feed posts a user has already been auto-scrolled through, so the
// homepage auto-scroll only activates when genuinely NEW posts appear.
//
// Storage shapes:
// mmora.home.seenPosts.<tab> => viewed post ids
// mmora.home.unseenPosts.<tab> => realtime arrivals still carrying a "New" badge

const MAX_IDS = 500;

export type FeedUpdateSource = 'initial' | 'manual' | 'realtime';

export interface NewArrivalResult {
  knownIds: string[];
  newIds: string[];
  shouldAutoScroll: boolean;
}

const keyFor = (tab: string) => `mmora.home.seenPosts.${tab}`;
const unseenKeyFor = (tab: string) => `mmora.home.unseenPosts.${tab}`;

const readIds = (key: string): Set<string> => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((value) => typeof value === 'string' && value)) : new Set();
  } catch {
    return new Set();
  }
};

const writeIds = (key: string, ids: Iterable<string>): void => {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(Array.from(new Set(ids)).slice(0, MAX_IDS)));
  } catch {
    /* storage unavailable — state remains valid for the current render */
  }
};

export const readSeenPostIds = (tab: string): Set<string> => readIds(keyFor(tab));

export const readUnseenPostIds = (tab: string): Set<string> => readIds(unseenKeyFor(tab));

/** Registers realtime arrivals as the sole source used by badges and auto-scroll. */
export const registerUnseenPosts = (tab: string, ids: string[]): Set<string> => {
  const seen = readSeenPostIds(tab);
  const unseen = readUnseenPostIds(tab);
  ids.forEach((id) => { if (id && !seen.has(id)) unseen.add(id); });
  writeIds(unseenKeyFor(tab), unseen);
  return unseen;
};

/** Restores pending arrivals on reload, while dropping IDs no longer in this feed. */
export const reconcileUnseenPosts = (tab: string, feedIds: string[]): Set<string> => {
  const available = new Set(feedIds);
  const reconciled = new Set([...readUnseenPostIds(tab)].filter((id) => available.has(id)));
  writeIds(unseenKeyFor(tab), reconciled);
  return reconciled;
};

export const markPostsSeen = (tab: string, ids: string[]): void => {
  writeIds(keyFor(tab), [...ids, ...readSeenPostIds(tab)]);
  const unseen = readUnseenPostIds(tab);
  ids.forEach((id) => unseen.delete(id));
  writeIds(unseenKeyFor(tab), unseen);
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
