/**
 * Small staging tray so songs found in Music search or on the Home shelf can be
 * carried to the Playlists page and dragged into any playlist there.
 * Stored on the device only; nothing is sent anywhere.
 */
import type { MusicTrack } from '@/features/music/musicProviders';

const KEY = 'mmora.music.tray.v1';
const listeners = new Set<(tracks: MusicTrack[]) => void>();

function read(): MusicTrack[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is MusicTrack => Boolean(item) && typeof item?.id === 'string' && typeof item?.title === 'string');
  } catch {
    return [];
  }
}

function write(tracks: MusicTrack[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(tracks.slice(0, 60))); } catch { /* storage full or blocked */ }
  listeners.forEach((listener) => listener(tracks));
}

export function getTray(): MusicTrack[] {
  return read();
}

export function subscribeTray(listener: (tracks: MusicTrack[]) => void): () => void {
  listeners.add(listener);
  listener(read());
  return () => { listeners.delete(listener); };
}

/** Adds a song once; returns the tray after the change. */
export function addToTray(track: MusicTrack): MusicTrack[] {
  const current = read();
  if (current.some((item) => item.id === track.id)) return current;
  const next = [...current, track];
  write(next);
  return next;
}

export function removeFromTray(trackId: string): MusicTrack[] {
  const next = read().filter((track) => track.id !== trackId);
  write(next);
  return next;
}

export function clearTray(): void {
  write([]);
}
