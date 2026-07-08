// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HANDS-FREE DEBUG BUS
// Lightweight ring-buffer log for wake word / voice / error events.
// Any module can push; the debug panel subscribes.
// ═══════════════════════════════════════════════════════════════════════════════

export type ZoeDebugLevel = 'info' | 'wake' | 'voice' | 'error';

export interface ZoeDebugEntry {
  id: number;
  ts: number;
  level: ZoeDebugLevel;
  message: string;
}

const MAX = 60;
let counter = 0;
const buffer: ZoeDebugEntry[] = [];
const listeners = new Set<(entries: ZoeDebugEntry[]) => void>();

export function zoeDebugLog(level: ZoeDebugLevel, message: string) {
  const entry: ZoeDebugEntry = { id: ++counter, ts: Date.now(), level, message };
  buffer.push(entry);
  if (buffer.length > MAX) buffer.shift();
  const snapshot = buffer.slice();
  listeners.forEach((fn) => { try { fn(snapshot); } catch { /* noop */ } });
  // Also mirror to console for external inspection
  const tag = `[Zoe:${level}]`;
  if (level === 'error') console.error(tag, message);
  else console.log(tag, message);
}

export function subscribeZoeDebug(fn: (entries: ZoeDebugEntry[]) => void): () => void {
  listeners.add(fn);
  fn(buffer.slice());
  return () => { listeners.delete(fn); };
}

export function clearZoeDebug() {
  buffer.length = 0;
  listeners.forEach((fn) => fn([]));
}
