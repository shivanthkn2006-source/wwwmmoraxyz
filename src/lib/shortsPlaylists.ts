// Local-first playlists + watch-later store for M'mora shorts.
// Persists in localStorage so it survives reloads and works offline.

export interface ShortsEntry {
  postId: string;
  mediaUrl?: string | null;
  posterUrl?: string | null;
  mediaType?: string | null;
  content?: string | null;
  authorName?: string | null;
  addedAt: string;
}

export interface ShortsPlaylist {
  id: string;
  name: string;
  items: ShortsEntry[];
}

const STORAGE_KEY = 'mmora.shorts.playlists.v1';
export const WATCH_LATER_ID = 'watch-later';
export const SHORTS_PLAYLISTS_EVENT = 'mmora:shorts-playlists-changed';

const emptyState = (): ShortsPlaylist[] => [
  { id: WATCH_LATER_ID, name: 'Watch later', items: [] },
];

export function loadPlaylists(): ShortsPlaylist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as ShortsPlaylist[];
    if (!Array.isArray(parsed) || parsed.length === 0) return emptyState();
    if (!parsed.some((p) => p.id === WATCH_LATER_ID)) parsed.unshift(emptyState()[0]);
    return parsed.map((p) => ({ ...p, items: Array.isArray(p.items) ? p.items : [] }));
  } catch {
    return emptyState();
  }
}

function persist(playlists: ShortsPlaylist[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch {
    /* quota — ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(SHORTS_PLAYLISTS_EVENT, { detail: playlists }));
  } catch {
    /* SSR safety */
  }
}

export function createPlaylist(name: string): ShortsPlaylist[] {
  const playlists = loadPlaylists();
  const trimmed = name.trim();
  if (!trimmed) return playlists;
  playlists.push({ id: `pl-${Date.now()}`, name: trimmed, items: [] });
  persist(playlists);
  return playlists;
}

export function removePlaylist(playlistId: string): ShortsPlaylist[] {
  if (playlistId === WATCH_LATER_ID) return loadPlaylists();
  const playlists = loadPlaylists().filter((p) => p.id !== playlistId);
  persist(playlists);
  return playlists;
}

export function isInPlaylist(playlistId: string, postId: string): boolean {
  return loadPlaylists().some(
    (p) => p.id === playlistId && p.items.some((i) => i.postId === postId),
  );
}

export function togglePlaylistItem(
  playlistId: string,
  entry: Omit<ShortsEntry, 'addedAt'>,
): { playlists: ShortsPlaylist[]; added: boolean } {
  const playlists = loadPlaylists();
  let target = playlists.find((p) => p.id === playlistId);
  if (!target) {
    target = { id: playlistId, name: playlistId, items: [] };
    playlists.push(target);
  }
  const existing = target.items.findIndex((i) => i.postId === entry.postId);
  let added: boolean;
  if (existing >= 0) {
    target.items.splice(existing, 1);
    added = false;
  } else {
    target.items.unshift({ ...entry, addedAt: new Date().toISOString() });
    added = true;
  }
  persist(playlists);
  return { playlists, added };
}

export function toggleWatchLater(entry: Omit<ShortsEntry, 'addedAt'>) {
  return togglePlaylistItem(WATCH_LATER_ID, entry);
}

export function subscribeToPlaylists(cb: (playlists: ShortsPlaylist[]) => void): () => void {
  const handler = () => cb(loadPlaylists());
  window.addEventListener(SHORTS_PLAYLISTS_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(SHORTS_PLAYLISTS_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
