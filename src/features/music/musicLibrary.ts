/**
 * Personal music library — saved songs and playlists for the signed-in device.
 *
 * Stored locally so saving never depends on a network round trip. Every mutation
 * notifies subscribers so the Music page updates instantly. Only real provider
 * metadata is stored; nothing is invented.
 */
import type { MusicTrack } from '@/features/music/musicProviders';

const STORAGE_KEY = 'mmora.music.library.v1';

export interface MusicLibrary {
  saved: MusicTrack[];
  /** Playlist name -> track ids, in the order they were added. */
  playlists: Record<string, string[]>;
}

const EMPTY: MusicLibrary = { saved: [], playlists: {} };

type Listener = (library: MusicLibrary) => void;
const listeners = new Set<Listener>();

function read(): MusicLibrary {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!parsed || !Array.isArray(parsed.saved)) return EMPTY;
    return { saved: parsed.saved, playlists: parsed.playlists ?? {} };
  } catch {
    return EMPTY;
  }
}

let cache: MusicLibrary = read();

function write(next: MusicLibrary) {
  cache = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage may be unavailable */ }
  listeners.forEach((listener) => listener(next));
}

export function getLibrary(): MusicLibrary {
  return cache;
}

export function subscribeLibrary(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isSaved(trackId: string): boolean {
  return cache.saved.some((track) => track.id === trackId);
}

/** Saves a track, or removes it when it is already saved. Returns the new state. */
export function toggleSaved(track: MusicTrack): boolean {
  if (isSaved(track.id)) {
    write({
      saved: cache.saved.filter((item) => item.id !== track.id),
      playlists: Object.fromEntries(
        Object.entries(cache.playlists).map(([name, ids]) => [name, ids.filter((id) => id !== track.id)]),
      ),
    });
    return false;
  }
  write({ ...cache, saved: [track, ...cache.saved] });
  return true;
}

export function addToPlaylist(name: string, track: MusicTrack): void {
  const playlist = name.trim();
  if (!playlist) return;
  const existing = cache.playlists[playlist] ?? [];
  if (existing.includes(track.id)) return;
  const saved = isSaved(track.id) ? cache.saved : [track, ...cache.saved];
  write({ saved, playlists: { ...cache.playlists, [playlist]: [...existing, track.id] } });
}

export function removePlaylist(name: string): void {
  const { [name]: _removed, ...rest } = cache.playlists;
  write({ ...cache, playlists: rest });
}

export function playlistTracks(name: string): MusicTrack[] {
  const ids = cache.playlists[name] ?? [];
  return ids
    .map((id) => cache.saved.find((track) => track.id === id))
    .filter((track): track is MusicTrack => Boolean(track));
}

/** Test-only reset. */
export function resetLibrary(): void {
  write(EMPTY);
}
