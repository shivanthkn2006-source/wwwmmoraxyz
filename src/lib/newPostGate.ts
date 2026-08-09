// Tracks which feed posts a user has already been auto-scrolled through, so the
// homepage auto-scroll only activates when genuinely NEW posts appear.
//
// Storage shape: mmora.home.seenPosts.<tab> => JSON string[] of post ids (capped).

const MAX_IDS = 500;

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
