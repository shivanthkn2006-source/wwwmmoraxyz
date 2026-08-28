const memory = new Set<string>();

const keyFor = (userId: string | undefined, postId: string) =>
  `mmora.feed.playedOnce.${userId || 'anonymous'}.${postId}`;

export function hasPlayedFeedMedia(userId: string | undefined, postId: string): boolean {
  const key = keyFor(userId, postId);
  if (memory.has(key)) return true;
  try { return window.localStorage.getItem(key) === '1'; } catch { return false; }
}

export function markFeedMediaPlayed(userId: string | undefined, postId: string): void {
  const key = keyFor(userId, postId);
  memory.add(key);
  try { window.localStorage.setItem(key, '1'); } catch { /* memory keeps this session safe */ }
}

export function allowFeedMediaReplay(userId: string | undefined, postId: string): void {
  const key = keyFor(userId, postId);
  memory.delete(key);
  try { window.localStorage.removeItem(key); } catch { /* no-op */ }
}

export const __resetFeedPlaybackMemory = () => memory.clear();