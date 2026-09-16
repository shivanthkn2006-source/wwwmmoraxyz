/**
 * Music diagnostics — a small in-memory trail of upload conversion, artwork and
 * playback problems so network / offline issues can be explained clearly instead
 * of failing silently.
 */

export type MusicDiagnosticStage =
  | 'upload:convert'
  | 'upload:store'
  | 'upload:history'
  | 'artwork:load'
  | 'artwork:resign'
  | 'playback:error'
  | 'playback:retry';

export interface MusicDiagnosticEntry {
  at: string;
  stage: MusicDiagnosticStage;
  message: string;
  online: boolean;
  detail?: Record<string, unknown>;
}

const MAX_ENTRIES = 60;
const entries: MusicDiagnosticEntry[] = [];
const listeners = new Set<(list: MusicDiagnosticEntry[]) => void>();

function online(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

export function describeMusicError(error: unknown): string {
  if (!online()) return 'You are offline right now.';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Unknown problem.';
}

export function logMusicEvent(stage: MusicDiagnosticStage, error: unknown, detail?: Record<string, unknown>): MusicDiagnosticEntry {
  const entry: MusicDiagnosticEntry = {
    at: new Date().toISOString(),
    stage,
    message: describeMusicError(error),
    online: online(),
    ...(detail ? { detail } : {}),
  };
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  try {
    console.warn(`[music:${stage}] ${entry.message}`, { online: entry.online, ...(detail ?? {}) });
  } catch { /* logging must never break playback */ }
  for (const listener of listeners) listener([...entries]);
  return entry;
}

export function getMusicDiagnostics(): MusicDiagnosticEntry[] {
  return [...entries];
}

export function subscribeMusicDiagnostics(listener: (list: MusicDiagnosticEntry[]) => void): () => void {
  listeners.add(listener);
  listener([...entries]);
  return () => { listeners.delete(listener); };
}

export function clearMusicDiagnostics(): void {
  entries.length = 0;
  for (const listener of listeners) listener([]);
}
