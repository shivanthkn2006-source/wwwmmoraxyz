// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HANDS-FREE DEBUG BUS
// Lightweight ring-buffer log for wake word / voice / error events.
// Any module can push; the debug panel subscribes.
// ═══════════════════════════════════════════════════════════════════════════════

export type ZoeDebugLevel = 'info' | 'wake' | 'voice' | 'error';

export type ZoeMicPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface ZoeHandsFreeDebugState {
  hfState: 'off' | 'awaiting-wake' | 'wake-detected' | 'listening' | 'processing' | 'speaking' | 'paused' | 'starting' | 'error';
  micPermission: ZoeMicPermissionState;
  activeRecognizer: string | null;
  lastStartReason: string | null;
  lastStopReason: string | null;
  lastError: string | null;
  updatedAt: number;
}

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
const stateListeners = new Set<(state: ZoeHandsFreeDebugState) => void>();

let debugState: ZoeHandsFreeDebugState = {
  hfState: 'off',
  micPermission: 'unknown',
  activeRecognizer: null,
  lastStartReason: null,
  lastStopReason: null,
  lastError: null,
  updatedAt: Date.now(),
};

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

export function zoeDebugSetState(patch: Partial<Omit<ZoeHandsFreeDebugState, 'updatedAt'>>) {
  debugState = { ...debugState, ...patch, updatedAt: Date.now() };
  const snapshot = { ...debugState };
  stateListeners.forEach((fn) => { try { fn(snapshot); } catch { /* noop */ } });
}

export function zoeDebugSpeechStart(owner: string, reason: string) {
  zoeDebugSetState({ activeRecognizer: owner, lastStartReason: reason, lastError: null });
  zoeDebugLog(owner === 'wake-word' ? 'wake' : 'voice', `SpeechRecognition start · ${owner} · ${reason}`);
}

export function zoeDebugSpeechStop(owner: string, reason: string) {
  zoeDebugSetState({ activeRecognizer: null, lastStopReason: reason });
  zoeDebugLog(owner === 'wake-word' ? 'wake' : 'voice', `SpeechRecognition stop · ${owner} · ${reason}`);
}

export function zoeDebugSpeechError(owner: string, error: string, reason?: string) {
  const message = reason ? `${error} · ${reason}` : error;
  zoeDebugSetState({ lastError: message, hfState: error === 'no-speech' ? debugState.hfState : 'error' });
  zoeDebugLog(error === 'no-speech' || error === 'aborted' ? 'voice' : 'error', `SpeechRecognition error · ${owner} · ${message}`);
}

export function subscribeZoeDebug(fn: (entries: ZoeDebugEntry[]) => void): () => void {
  listeners.add(fn);
  fn(buffer.slice());
  return () => { listeners.delete(fn); };
}

export function subscribeZoeDebugState(fn: (state: ZoeHandsFreeDebugState) => void): () => void {
  stateListeners.add(fn);
  fn({ ...debugState });
  return () => { stateListeners.delete(fn); };
}

export function clearZoeDebug() {
  buffer.length = 0;
  listeners.forEach((fn) => fn([]));
}
