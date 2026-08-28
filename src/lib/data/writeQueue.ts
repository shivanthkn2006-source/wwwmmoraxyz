// ═══════════════════════════════════════════════════════════════════════════════
// DURABLE WRITE QUEUE
// Any write that cannot reach the backend is buffered locally (localStorage, so
// it survives reloads and crashes) and replayed with exponential backoff + jitter
// once connectivity returns. Nothing a user says to an agent is lost to an outage.
// ═══════════════════════════════════════════════════════════════════════════════

import { reportPlatformError } from '@/lib/enterpriseTelemetry';
import {
  checkBackendHealth,
  isBackendUsable,
  isBrowserOffline,
  isTransportFailure,
  recordBackendOutcome,
  subscribeBackendHealth,
} from '@/lib/data/backendHealth';

export type QueuedOperation = 'insert' | 'update' | 'delete';

export interface QueuedWrite {
  id: string;
  table: string;
  op: QueuedOperation;
  /** Row values for insert, patch for update. */
  payload: Record<string, unknown>;
  /** Match filter for update/delete. */
  match?: Record<string, string | number>;
  /** Logical grouping (e.g. agent_id) used for local optimistic reads. */
  groupKey?: string;
  attempts: number;
  createdAt: number;
  nextAttemptAt: number;
  lastError?: string;
}

export type WriteExecutor = (item: QueuedWrite) => Promise<{ ok: boolean; error?: string; code?: string }>;

const STORAGE_KEY = 'mmora.writeQueue.v1';
const MAX_ITEMS = 500;
const MAX_ATTEMPTS = 12;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 5 * 60 * 1000;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

let queue: QueuedWrite[] = [];
let loaded = false;
let flushing = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const executors = new Map<string, WriteExecutor>();
const listeners = new Set<(items: QueuedWrite[]) => void>();

// ───────────────────────────── persistence ─────────────────────────────

const storage = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as QueuedWrite[];
    const cutoff = Date.now() - TTL_MS;
    queue = Array.isArray(parsed) ? parsed.filter((i) => i && i.createdAt > cutoff) : [];
  } catch {
    queue = [];
  }
}

function persist() {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(queue.slice(0, MAX_ITEMS)));
  } catch {
    // Quota exceeded: drop the oldest half rather than lose the newest writes.
    queue = queue.slice(Math.floor(queue.length / 2));
    try {
      storage()?.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch {
      /* give up on persistence, keep the in-memory queue */
    }
  }
  emit();
}

function emit() {
  const snap = [...queue];
  for (const l of listeners) {
    try {
      l(snap);
    } catch {
      /* ignore bad subscribers */
    }
  }
}

// ───────────────────────────── backoff ─────────────────────────────

/** Exponential backoff with full jitter, clamped to MAX_DELAY_MS. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempt));
  return Math.round(exp / 2 + random() * (exp / 2));
}

// ───────────────────────────── public API ─────────────────────────────

export function registerWriteExecutor(table: string, executor: WriteExecutor) {
  executors.set(table, executor);
}

export function subscribeWriteQueue(listener: (items: QueuedWrite[]) => void): () => void {
  load();
  listeners.add(listener);
  listener([...queue]);
  return () => listeners.delete(listener);
}

export function pendingWrites(table?: string, groupKey?: string): QueuedWrite[] {
  load();
  return queue.filter(
    (i) => (!table || i.table === table) && (!groupKey || i.groupKey === groupKey),
  );
}

export const pendingWriteCount = (table?: string): number => pendingWrites(table).length;

/** Buffers a write for later replay. Returns the queued item. */
export function enqueueWrite(
  input: Omit<QueuedWrite, 'id' | 'attempts' | 'createdAt' | 'nextAttemptAt'>,
): QueuedWrite {
  load();
  const item: QueuedWrite = {
    ...input,
    id: `wq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    attempts: 0,
    createdAt: Date.now(),
    nextAttemptAt: Date.now(),
  };
  queue.push(item);
  if (queue.length > MAX_ITEMS) queue = queue.slice(queue.length - MAX_ITEMS);
  persist();
  scheduleFlush(0);
  return item;
}

function scheduleFlush(delay: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flushWriteQueue();
  }, Math.max(0, delay));
}

/**
 * Attempts every due item once. Items that fail on transport are rescheduled
 * with backoff; items rejected by the backend itself (RLS, constraint) are
 * dropped after being reported, because retrying them can never succeed.
 */
export async function flushWriteQueue(options: { force?: boolean } = {}): Promise<{
  sent: number;
  failed: number;
  remaining: number;
}> {
  load();
  if (flushing) return { sent: 0, failed: 0, remaining: queue.length };
  if (queue.length === 0) return { sent: 0, failed: 0, remaining: 0 };

  if (isBrowserOffline()) {
    scheduleFlush(backoffDelay(1));
    return { sent: 0, failed: 0, remaining: queue.length };
  }
  if (!options.force && !isBackendUsable()) {
    const health = await checkBackendHealth();
    if (health.status === 'offline') {
      scheduleFlush(backoffDelay(Math.min(4, health.failures)));
      return { sent: 0, failed: 0, remaining: queue.length };
    }
  }

  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    const now = Date.now();
    const due = queue.filter((i) => i.nextAttemptAt <= now);

    for (const item of due) {
      const executor = executors.get(item.table);
      if (!executor) {
        item.lastError = `no executor registered for ${item.table}`;
        item.nextAttemptAt = Date.now() + backoffDelay(item.attempts);
        item.attempts += 1;
        failed += 1;
        continue;
      }

      let result: { ok: boolean; error?: string; code?: string };
      try {
        result = await executor(item);
      } catch (e) {
        result = { ok: false, error: String((e as Error)?.message ?? e), code: 'TRANSPORT' };
      }

      if (result.ok) {
        queue = queue.filter((q) => q.id !== item.id);
        sent += 1;
        recordBackendOutcome({ ok: true });
        continue;
      }

      failed += 1;
      item.attempts += 1;
      item.lastError = result.error;
      const transport = isTransportFailure(result.code, result.error);
      recordBackendOutcome({ ok: false, code: result.code, message: result.error });

      if (!transport) {
        // Permanent rejection — drop it, but make it loud.
        queue = queue.filter((q) => q.id !== item.id);
        reportPlatformError({
          errorType: 'QueuedWriteRejected',
          message: `${item.table}/${item.op} permanently rejected: ${result.error ?? 'unknown'}`,
          severity: 'high',
          source: 'write-queue',
          metadata: { code: result.code, attempts: item.attempts, groupKey: item.groupKey },
        });
        continue;
      }

      if (item.attempts >= MAX_ATTEMPTS) {
        queue = queue.filter((q) => q.id !== item.id);
        reportPlatformError({
          errorType: 'QueuedWriteExhausted',
          message: `${item.table}/${item.op} dropped after ${item.attempts} attempts`,
          severity: 'critical',
          source: 'write-queue',
          metadata: { lastError: result.error, groupKey: item.groupKey },
        });
        continue;
      }

      item.nextAttemptAt = Date.now() + backoffDelay(item.attempts);
      // A transport failure means the rest of this pass will fail too — stop early.
      break;
    }

    persist();
    if (queue.length > 0) {
      const soonest = Math.min(...queue.map((i) => i.nextAttemptAt));
      scheduleFlush(Math.max(500, soonest - Date.now()));
    }
  } finally {
    flushing = false;
  }

  return { sent, failed, remaining: queue.length };
}

/** Test hook. */
export function __resetWriteQueue() {
  queue = [];
  loaded = true;
  flushing = false;
  if (timer) clearTimeout(timer);
  timer = null;
  executors.clear();
  listeners.clear();
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

// Auto-drain the moment health flips back to online.
if (typeof window !== 'undefined') {
  let wasUsable = true;
  subscribeBackendHealth((health) => {
    const usable = health.status === 'online';
    if (usable && !wasUsable) void flushWriteQueue({ force: true });
    wasUsable = usable;
  });
  window.addEventListener('online', () => void flushWriteQueue({ force: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushWriteQueue();
  });
}
