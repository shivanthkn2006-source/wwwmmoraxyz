/**
 * Last-actions audit log for Zoe persistent memory.
 *
 * Records every memory save, recall, gateway write-back attempt and fallback
 * reason with timestamps. Kept in a bounded ring buffer that is mirrored to
 * localStorage so the trail survives reloads.
 */

export type MemoryAuditAction =
  | 'save'
  | 'recall'
  | 'gateway-write'
  | 'health'
  | 'fallback';

export type MemoryAuditOutcome = 'ok' | 'fallback' | 'error';

export interface MemoryAuditEntry {
  id: string;
  at: string;
  action: MemoryAuditAction;
  outcome: MemoryAuditOutcome;
  /** Which store actually served/accepted the operation. */
  target?: 'gateway' | 'sovereign' | 'both' | 'none';
  detail?: string;
  attempts?: number;
}

const STORAGE_KEY = 'mmora_zoe_memory_audit';
const MAX_ENTRIES = 50;

let entries: MemoryAuditEntry[] = load();
const listeners = new Set<(rows: MemoryAuditEntry[]) => void>();

function load(): MemoryAuditEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as MemoryAuditEntry[]) : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota — ignore */
  }
}

export function logMemoryAudit(
  entry: Omit<MemoryAuditEntry, 'id' | 'at'> & { at?: string }
): MemoryAuditEntry {
  const row: MemoryAuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: entry.at ?? new Date().toISOString(),
    ...entry,
  };
  entries = [row, ...entries].slice(0, MAX_ENTRIES);
  persist();
  listeners.forEach((fn) => fn(entries));
  return row;
}

export const getMemoryAudit = (): MemoryAuditEntry[] => entries;

export function clearMemoryAudit() {
  entries = [];
  persist();
  listeners.forEach((fn) => fn(entries));
}

export function subscribeMemoryAudit(
  fn: (rows: MemoryAuditEntry[]) => void
): () => void {
  listeners.add(fn);
  fn(entries);
  return () => listeners.delete(fn);
}
