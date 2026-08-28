/**
 * GROWTH CARD ALERT STORE
 *
 * A tiny external store (useSyncExternalStore compatible) shared by the alert
 * host, the home dock badge and the archive page. Kept outside React so the
 * detection loop survives route changes and remounts, and so a card can only
 * ever be announced once per member per device.
 *
 * Seen ids are persisted per user in localStorage; storage failures degrade to
 * an in-memory set instead of throwing.
 */
export interface GrowthAlert {
  id: string;
  slot: string;
  title: string;
  category: string;
  content: string;
  actionable_step: string | null;
  created_at: string;
  /** Milliseconds the alert stays on screen (normal reading speed). */
  durationMs: number;
}

interface AlertState {
  queue: GrowthAlert[];
  unread: number;
  userId: string | null;
}

const MAX_QUEUE = 3;
const MAX_SEEN = 200;

let state: AlertState = { queue: [], unread: 0, userId: null };
let seen = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => {
    try { l(); } catch { /* a bad listener must not stop the rest */ }
  });
}

function storageKey(userId: string) {
  return `growth_seen_cards_${userId}`;
}

function persistSeen() {
  if (!state.userId || typeof localStorage === 'undefined') return;
  try {
    const trimmed = Array.from(seen).slice(-MAX_SEEN);
    seen = new Set(trimmed);
    localStorage.setItem(storageKey(state.userId), JSON.stringify(trimmed));
  } catch { /* private mode / quota — in-memory set still works */ }
}

export function subscribeGrowthAlerts(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getGrowthAlertState(): AlertState {
  return state;
}

/** Called when the signed-in member changes. Resets the queue and loads seen ids. */
export function bindGrowthAlertUser(userId: string | null) {
  if (state.userId === userId) return;
  state = { queue: [], unread: 0, userId };
  seen = new Set();
  if (userId && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (Array.isArray(parsed)) seen = new Set(parsed.filter((v): v is string => typeof v === 'string'));
    } catch { /* corrupt entry — start clean */ }
  }
  emit();
}

export function hasSeenGrowthCard(id: string) {
  return seen.has(id);
}
/** Marks ids as already announced without touching the badge (first sync). */
export function markGrowthSeen(ids: string[]) {
  let changed = false;
  ids.forEach((id) => { if (id && !seen.has(id)) { seen.add(id); changed = true; } });
  if (changed) persistSeen();
}

/** True once this device has a persisted seen-ledger for the current member. */
export function hasGrowthSeenLedger(): boolean {
  return seen.size > 0;
}


/**
 * Announces cards the member has not seen yet. Returns the ones actually
 * queued so the caller can fire push/analytics exactly once.
 */
export function pushGrowthAlerts(alerts: GrowthAlert[]): GrowthAlert[] {
  const fresh = alerts.filter((a) => a.id && !seen.has(a.id) && !state.queue.some((q) => q.id === a.id));
  if (fresh.length === 0) return [];
  state = {
    ...state,
    queue: [...state.queue, ...fresh].slice(-MAX_QUEUE),
    unread: state.unread + fresh.length,
  };
  emit();
  return fresh;
}

/** Dismisses one alert and remembers it, so it never re-announces. */
export function dismissGrowthAlert(id: string) {
  seen.add(id);
  persistSeen();
  const before = state.queue.length;
  state = { ...state, queue: state.queue.filter((a) => a.id !== id) };
  if (before !== state.queue.length) emit();
}

/** Marks the whole badge as read (member opened the archive / the cards). */
export function clearGrowthUnread(ids: string[] = []) {
  ids.forEach((id) => id && seen.add(id));
  if (ids.length) persistSeen();
  if (state.unread === 0 && state.queue.length === 0) return;
  state = { ...state, unread: 0, queue: [] };
  emit();
}

/** Test helper. */
export function __resetGrowthAlertStore() {
  state = { queue: [], unread: 0, userId: null };
  seen = new Set();
  listeners.clear();
}
