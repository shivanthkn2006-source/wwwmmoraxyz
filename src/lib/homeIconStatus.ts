/**
 * Home icon integration status registry.
 *
 * Tracks, per Home Screen dock icon:
 *  - whether an action handler is wired (integration status)
 *  - the last successful invocation / test timestamp (persisted)
 *  - a rolling client-side error log so failures are visible in preview
 *
 * Purely a diagnostics layer — it does not change any Home UI/UX.
 */

export type HomeIconId =
  | 'zoe-ai'
  | 'camera'
  | 'chat'
  | 'notifications'
  | 'search'
  | 'likes'
  | 'saved'
  | 'profile'
  | 'settings';

export type HomeIconState = 'unknown' | 'wired' | 'ok' | 'failed';

export interface HomeIconErrorEntry {
  id: HomeIconId | string;
  message: string;
  stack?: string;
  at: number;
}

export interface HomeIconStatus {
  id: HomeIconId | string;
  label: string;
  /** Kind of integration: in-page surface, route navigation, or event bus. */
  kind: 'surface' | 'route' | 'event';
  state: HomeIconState;
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  lastError: string | null;
  /** Set once HomePage registers a handler for this icon. */
  registered: boolean;
}

type Probe = () => void | boolean | Promise<void | boolean>;

interface Registration {
  label: string;
  kind: HomeIconStatus['kind'];
  /** Non-destructive check used by the preview checklist. */
  probe: Probe;
}

const STORAGE_KEY = 'mmora.home.iconStatus.v1';
const MAX_ERRORS = 50;

const registrations = new Map<string, Registration>();
const statuses = new Map<string, HomeIconStatus>();
let errors: HomeIconErrorEntry[] = [];
const listeners = new Set<() => void>();

const readPersisted = (): Record<string, { lastSuccessAt?: number }> => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    return raw ? (JSON.parse(raw) as Record<string, { lastSuccessAt?: number }>) : {};
  } catch {
    return {};
  }
};

const persist = () => {
  try {
    const payload: Record<string, { lastSuccessAt?: number }> = {};
    statuses.forEach((status, id) => {
      if (status.lastSuccessAt) payload[id] = { lastSuccessAt: status.lastSuccessAt };
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* storage unavailable — status stays in-memory only */
  }
};

const emit = () => listeners.forEach((fn) => fn());

const ensure = (id: string, label: string, kind: HomeIconStatus['kind']): HomeIconStatus => {
  const existing = statuses.get(id);
  if (existing) {
    existing.label = label;
    existing.kind = kind;
    return existing;
  }
  const persisted = readPersisted()[id];
  const created: HomeIconStatus = {
    id,
    label,
    kind,
    state: 'unknown',
    lastSuccessAt: persisted?.lastSuccessAt ?? null,
    lastErrorAt: null,
    lastError: null,
    registered: false,
  };
  statuses.set(id, created);
  return created;
};

/** Called by HomePage for every dock icon it mounts. */
export const registerHomeIcon = (
  id: string,
  label: string,
  kind: HomeIconStatus['kind'],
  probe: Probe,
) => {
  registrations.set(id, { label, kind, probe });
  const status = ensure(id, label, kind);
  status.registered = true;
  if (status.state === 'unknown') status.state = 'wired';
  emit();
  return () => {
    registrations.delete(id);
  };
};

export const recordHomeIconSuccess = (id: string) => {
  const status = statuses.get(id);
  if (!status) return;
  status.lastSuccessAt = Date.now();
  status.state = 'ok';
  status.lastError = null;
  persist();
  emit();
};

export const recordHomeIconError = (id: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const status = statuses.get(id);
  if (status) {
    status.state = 'failed';
    status.lastError = message;
    status.lastErrorAt = Date.now();
  }
  errors = [{ id, message, stack, at: Date.now() }, ...errors].slice(0, MAX_ERRORS);
  // Always surface in the preview console too.
  console.error(`[home-icon:${id}]`, error);
  emit();
};

/**
 * Wraps a dock icon handler so every invocation is logged.
 * Returns a handler with the exact same signature/behaviour.
 */
export const runHomeIconAction = (id: string, action: () => void | Promise<void>) => () => {
  try {
    const result = action();
    if (result && typeof (result as Promise<void>).then === 'function') {
      void (result as Promise<void>).then(
        () => recordHomeIconSuccess(id),
        (error) => recordHomeIconError(id, error),
      );
      return;
    }
    recordHomeIconSuccess(id);
  } catch (error) {
    recordHomeIconError(id, error);
  }
};

export const getHomeIconStatuses = (): HomeIconStatus[] =>
  Array.from(statuses.values()).map((status) => ({ ...status }));

export const getHomeIconErrors = (): HomeIconErrorEntry[] => errors.map((entry) => ({ ...entry }));

export const clearHomeIconErrors = () => {
  errors = [];
  emit();
};

export const subscribeHomeIconStatus = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export interface ChecklistResult {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  durationMs: number;
}

/** Programmatically probes every registered icon and reports pass/fail. */
export const runHomeIconChecklist = async (): Promise<ChecklistResult[]> => {
  const results: ChecklistResult[] = [];
  for (const [id, registration] of registrations) {
    const startedAt = performance.now();
    try {
      const outcome = await registration.probe();
      const pass = outcome !== false;
      if (pass) recordHomeIconSuccess(id);
      else recordHomeIconError(id, new Error('Probe returned false'));
      results.push({
        id,
        label: registration.label,
        pass,
        detail: pass ? 'Handler reachable' : 'Probe returned false',
        durationMs: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      recordHomeIconError(id, error);
      results.push({
        id,
        label: registration.label,
        pass: false,
        detail: error instanceof Error ? error.message : String(error),
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
  }
  emit();
  return results;
};
