/**
 * Persistent per-integration failure history.
 *
 * `fetchApiStatus` feeds every probe result in here, so the brain health page
 * can answer "when did this last break?" across reloads — the live probe alone
 * only knows about right now.
 */
import type { ApiStatusEntry, ApiStatusReport } from './apiStatus';
import { apiHealthWord } from './apiStatus';

const KEY = 'mmora.zoe.api-failures.v1';
const MAX_PER_API = 20;

export interface FailureEvent {
  at: string;
  kind: 'failing' | 'missing';
  detail: string;
  status: number | null;
}

export interface FailureRecord {
  apiId: string;
  label: string;
  events: FailureEvent[];
  /** Last time the probe succeeded, if we ever saw it healthy. */
  lastOkAt: string | null;
  totalFailures: number;
}

type Store = Record<string, FailureRecord>;

const read = (): Store => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Store;
  } catch {
    return {};
  }
};

const write = (store: Store) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage full / private mode — history is best effort */
  }
};

/** Merge one probe report into the persistent history. */
export function recordApiReport(report: ApiStatusReport): Store {
  const store = read();
  for (const api of report.apis) {
    const health = apiHealthWord(api);
    const rec: FailureRecord = store[api.id] ?? {
      apiId: api.id,
      label: api.label,
      events: [],
      lastOkAt: null,
      totalFailures: 0,
    };
    rec.label = api.label;

    if (health === 'live' || health === 'configured') {
      rec.lastOkAt = report.checkedAt;
    } else {
      const last = rec.events[0];
      const detail = api.probe.detail || (health === 'missing' ? 'secret not configured' : 'probe failed');
      // Collapse an unchanged, still-broken state instead of spamming one row per refresh.
      if (last && last.kind === health && last.detail === detail) {
        last.at = report.checkedAt;
      } else {
        rec.events.unshift({ at: report.checkedAt, kind: health, detail, status: api.probe.status });
        rec.events = rec.events.slice(0, MAX_PER_API);
      }
      rec.totalFailures += 1;
    }
    store[api.id] = rec;
  }
  write(store);
  return store;
}

export function getFailureHistory(): Store {
  return read();
}

export function getFailureRecord(apiId: string): FailureRecord | null {
  return read()[apiId] ?? null;
}

export function clearFailureHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function lastFailureAt(apiId: string): string | null {
  return read()[apiId]?.events[0]?.at ?? null;
}

/** "3 min ago" style label for the health page. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export type ApiEntryWithHistory = ApiStatusEntry & { history: FailureRecord | null };
