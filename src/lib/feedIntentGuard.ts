/**
 * Decides whether a search term is a real content interest that may seed the
 * personal video feed. People lookups (@handles, names typed into member
 * search) and section/navigation words ("friends", "music", "calls") are NOT
 * interests — injecting YouTube results for them is what filled Home with the
 * "Friends" TV series and random albums.
 */
const NAV_WORDS = new Set([
  'friends', 'friend', 'music', 'song', 'songs', 'album', 'albums', 'home', 'feed', 'global',
  'calls', 'call', 'chat', 'messages', 'message', 'profile', 'settings', 'planner', 'calendar',
  'diary', 'reminders', 'reminder', 'selfie', 'selfie city', 'loops', 'loop', 'vr', 'members',
  'member', 'search', 'zoe', 'dhf', 'motivation', 'notifications', 'admin', 'people', 'user', 'users',
]);

export function isFeedWorthyQuery(raw: string | null | undefined): boolean {
  const term = (raw || '').trim().toLowerCase();
  if (term.length < 3) return false;
  if (term.includes('@')) return false;
  if (NAV_WORDS.has(term)) return false;
  // Single handle-like tokens (e.g. "moksh50") are people lookups.
  if (!/\s/.test(term) && /\d/.test(term)) return false;
  return true;
}
