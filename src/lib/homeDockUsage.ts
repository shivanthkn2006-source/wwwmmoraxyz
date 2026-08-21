/**
 * Tracks how often each home dock icon is used so the most-used menus can be
 * surfaced closest to the home trigger. Persisted in localStorage, fully
 * failure-tolerant (private mode / quota errors are swallowed).
 */

const STORAGE_KEY = 'mmora:home-dock-usage:v1';
const MAX_ENTRIES = 40;

export type DockUsageMap = Record<string, { count: number; last: number }>;

const memoryFallback: { value: DockUsageMap } = { value: {} };

export function readDockUsage(): DockUsageMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...memoryFallback.value };
    const parsed = JSON.parse(raw) as DockUsageMap;
    if (!parsed || typeof parsed !== 'object') return { ...memoryFallback.value };
    return parsed;
  } catch {
    return { ...memoryFallback.value };
  }
}

export function recordDockUsage(id: string): DockUsageMap {
  const usage = readDockUsage();
  const previous = usage[id];
  usage[id] = { count: (previous?.count ?? 0) + 1, last: Date.now() };

  // Keep the map bounded.
  const entries = Object.entries(usage)
    .sort((a, b) => b[1].last - a[1].last)
    .slice(0, MAX_ENTRIES);
  const trimmed: DockUsageMap = Object.fromEntries(entries);

  memoryFallback.value = trimmed;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage unavailable — memory fallback still applies for this session */
  }
  try {
    window.dispatchEvent(new CustomEvent('mmora:home-dock-usage'));
  } catch {
    /* no-op */
  }
  return trimmed;
}

/**
 * Orders items so the most frequently used land at the END of the array —
 * i.e. rendered nearest the home trigger at the right edge of the tube.
 * Ties and never-used icons keep their original authored order.
 */
export function orderByFrequency<T extends { id: string }>(items: T[], usage: DockUsageMap): T[] {
  return items
    .map((item, index) => ({ item, index, score: usage[item.id]?.count ?? 0 }))
    .sort((a, b) => (a.score === b.score ? a.index - b.index : a.score - b.score))
    .map((entry) => entry.item);
}
