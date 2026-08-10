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

export interface UnseenSnapshotResult extends NewArrivalResult {
  unseenIds: Set<string>;
}

const keyFor = (tab: string) => `mmora.home.seenPosts.${tab}`;
const unseenKeyFor = (tab: string) => `mmora.home.unseenPosts.${tab}`;

// In-memory mirror so unseen IDs survive storage failures (Safari private mode,
// quota errors, disabled cookies). The badge must never vanish because a write threw.
const memoryStore = new Map<string, string[]>();

const sanitize = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && !!v) : [];

const readIds = (key: string): Set<string> => {
  let fromStorage: string[] | null = null;
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (raw) fromStorage = sanitize(JSON.parse(raw));
  } catch {
    fromStorage = null;
  }
  const fromMemory = memoryStore.get(key) ?? [];
  // Union both sources: storage may be stale/unavailable, memory may be empty after reload.
  return new Set([...(fromStorage ?? []), ...fromMemory]);
};

const writeIds = (key: string, ids: Iterable<string>): void => {
  const list = Array.from(new Set(ids)).slice(0, MAX_IDS);
  memoryStore.set(key, list);
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage unavailable — memory mirror keeps state valid for this session */
  }
};

/** Test/util hook: clears the in-memory fallback mirror. */
export const __resetUnseenMemoryStore = (): void => { memoryStore.clear(); };

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
  const existing = readUnseenPostIds(tab);
  // Race guard: an empty snapshot (feed still loading / fetch failed) must never
  // wipe pending unseen IDs, otherwise the "New" badge disappears incorrectly.
  if (feedIds.length === 0) return existing;
  const available = new Set(feedIds);
  const reconciled = new Set([...existing].filter((id) => available.has(id)));
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

/**
 * Atomically resolves a feed snapshot against the persisted unseen-ID store.
 * Badge rendering and auto-scroll must both consume `unseenIds` from this result
 * rather than independently deriving "new" state from rendered posts.
 */
export const syncUnseenPostSnapshot = (
  tab: string,
  previousIds: string[],
  nextIds: string[],
  source: FeedUpdateSource,
): UnseenSnapshotResult => {
  const arrivals = detectNewArrivals(previousIds, nextIds, source);
  const unseenIds = source === 'realtime'
    ? registerUnseenPosts(tab, arrivals.newIds)
    : reconcileUnseenPosts(tab, arrivals.knownIds);

  return { ...arrivals, unseenIds };
};

export const createOnePassQueue = (ids: string[]): string[] =>
  Array.from(new Set(ids.filter(Boolean)));

export const advanceOnePass = (queue: string[], index: number) => {
  const nextIndex = index + 1;
  return nextIndex >= queue.length
    ? { completed: true, nextIndex: 0 }
    : { completed: false, nextIndex };
};
