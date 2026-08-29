/**
 * Growth card image validation support: tunable config, a persistent result
 * cache and a structured mismatch log.
 *
 * Standalone by design — no imports from feed, growth or Supabase modules, so
 * it can never break card rendering. Every storage access is defensive.
 */

const CONFIG_KEY = 'mmora.growth.imageValidation.config';
const CACHE_KEY = 'mmora.growth.imageValidation.cache';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CACHE_LIMIT = 300;
const LOG_LIMIT = 50;

export type PromptStrictness = 'lenient' | 'balanced' | 'strict';

export interface GrowthImageValidationConfig {
  /** Extra generation attempts after the first image fails validation. */
  retries: number;
  /** How harshly the validator judges a face / subject mismatch. */
  strictness: PromptStrictness;
  /** Master switch — off means the first image is always kept. */
  enabled: boolean;
}

export const DEFAULT_VALIDATION_CONFIG: GrowthImageValidationConfig = {
  retries: 1,
  strictness: 'balanced',
  enabled: true,
};

const clampRetries = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_VALIDATION_CONFIG.retries;
  return Math.max(0, Math.min(3, Math.round(n)));
};

const isStrictness = (value: unknown): value is PromptStrictness =>
  value === 'lenient' || value === 'balanced' || value === 'strict';

const safeStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

/** Reads the runtime-tunable config. Never throws. */
export const getValidationConfig = (): GrowthImageValidationConfig => {
  const store = safeStorage();
  if (!store) return { ...DEFAULT_VALIDATION_CONFIG };
  try {
    const raw = store.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_VALIDATION_CONFIG };
    const parsed = JSON.parse(raw) as Partial<GrowthImageValidationConfig>;
    return {
      retries: clampRetries(parsed.retries ?? DEFAULT_VALIDATION_CONFIG.retries),
      strictness: isStrictness(parsed.strictness) ? parsed.strictness : DEFAULT_VALIDATION_CONFIG.strictness,
      enabled: parsed.enabled !== false,
    };
  } catch {
    return { ...DEFAULT_VALIDATION_CONFIG };
  }
};

/** Persists a partial config change and returns the merged result. */
export const setValidationConfig = (
  patch: Partial<GrowthImageValidationConfig>,
): GrowthImageValidationConfig => {
  const next: GrowthImageValidationConfig = {
    ...getValidationConfig(),
    ...patch,
    retries: clampRetries(patch.retries ?? getValidationConfig().retries),
  };
  if (!isStrictness(next.strictness)) next.strictness = DEFAULT_VALIDATION_CONFIG.strictness;
  const store = safeStorage();
  try {
    store?.setItem(CONFIG_KEY, JSON.stringify(next));
  } catch {
    /* config stays in-memory only */
  }
  return next;
};

/* ------------------------------------------------------------------ cache */

export interface CachedValidation {
  match: boolean;
  reason: string;
  at: number;
}

type CacheShape = Record<string, CachedValidation>;

const memoryCache: CacheShape = {};

const readCache = (): CacheShape => {
  const store = safeStorage();
  if (!store) return memoryCache;
  try {
    const raw = store.getItem(CACHE_KEY);
    if (!raw) return { ...memoryCache };
    const parsed = JSON.parse(raw) as CacheShape;
    return typeof parsed === 'object' && parsed ? { ...memoryCache, ...parsed } : { ...memoryCache };
  } catch {
    return { ...memoryCache };
  }
};

const writeCache = (cache: CacheShape) => {
  const entries = Object.entries(cache)
    .filter(([, v]) => v && Date.now() - v.at < CACHE_TTL_MS)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, CACHE_LIMIT);
  const trimmed = Object.fromEntries(entries);
  for (const key of Object.keys(memoryCache)) delete memoryCache[key];
  Object.assign(memoryCache, trimmed);
  try {
    safeStorage()?.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    /* memory cache still serves this session */
  }
};

/** Stable cache key for one card/image pair. */
export const validationCacheKey = (imageUrl: string, strictness: PromptStrictness): string => {
  let hash = 0;
  const value = `${strictness}|${imageUrl}`;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return `v1:${hash}`;
};

/** Returns a still-fresh cached verdict, or null. */
export const getCachedValidation = (key: string): CachedValidation | null => {
  const entry = readCache()[key];
  if (!entry) return null;
  if (Date.now() - entry.at >= CACHE_TTL_MS) return null;
  return entry;
};

export const setCachedValidation = (key: string, match: boolean, reason = ''): CachedValidation => {
  const entry: CachedValidation = { match, reason: String(reason).slice(0, 240), at: Date.now() };
  const cache = readCache();
  cache[key] = entry;
  writeCache(cache);
  return entry;
};

export const clearValidationCache = () => {
  for (const key of Object.keys(memoryCache)) delete memoryCache[key];
  try {
    safeStorage()?.removeItem(CACHE_KEY);
  } catch {
    /* nothing to clear */
  }
};

/* -------------------------------------------------------------- logging */

export interface ValidationLogEntry {
  id: string;
  at: number;
  cardKey: string;
  title: string;
  category: string;
  person: string | null;
  attempt: number;
  outcome: 'match' | 'mismatch' | 'cached' | 'fallback' | 'error';
  reason: string;
  imageUrl: string;
  strictness: PromptStrictness;
  cached: boolean;
}

const logBuffer: ValidationLogEntry[] = [];
const listeners = new Set<(entries: ValidationLogEntry[]) => void>();

export const logValidation = (entry: Omit<ValidationLogEntry, 'id' | 'at'>): ValidationLogEntry => {
  const full: ValidationLogEntry = {
    ...entry,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
  };
  logBuffer.unshift(full);
  if (logBuffer.length > LOG_LIMIT) logBuffer.length = LOG_LIMIT;
  if (full.outcome === 'mismatch' || full.outcome === 'error') {
    console.warn('[growth-image-validate]', JSON.stringify({
      cardKey: full.cardKey,
      title: full.title,
      person: full.person,
      attempt: full.attempt,
      outcome: full.outcome,
      reason: full.reason,
      strictness: full.strictness,
    }));
  }
  listeners.forEach((fn) => {
    try {
      fn([...logBuffer]);
    } catch {
      /* a broken listener never breaks validation */
    }
  });
  return full;
};

export const getValidationLog = (): ValidationLogEntry[] => [...logBuffer];

export const clearValidationLog = () => {
  logBuffer.length = 0;
  listeners.forEach((fn) => fn([]));
};

export const subscribeValidationLog = (fn: (entries: ValidationLogEntry[]) => void) => {
  listeners.add(fn);
  fn([...logBuffer]);
  return () => {
    listeners.delete(fn);
  };
};
