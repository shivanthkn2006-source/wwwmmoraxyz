/**
 * ZOE SHARED CACHE
 * ================
 * One tiny, dependency-free key/value cache backed by `public.zoe_cache`.
 * Every expensive or paid call (live news, VR status, generated media, model
 * answers) goes through here so 500+ users share a single upstream request
 * instead of each paying for their own.
 *
 * Design rules that keep this unbreakable as new integrations land:
 *  - Never throws. A cache failure degrades to a live call, never to an error.
 *  - Stale-while-error: if the upstream fails we happily serve an expired copy
 *    rather than showing the user nothing.
 *  - Namespaced keys (`scope`) so a future integration can add its own space
 *    without colliding or needing a schema change.
 */
// Deliberately no SDK import: this module is also pulled into browser-side
// typechecking through the shared grounding code, so it talks to PostgREST over
// plain fetch and stays free of Deno-only module specifiers.

const restUrl = () => `${Deno.env.get('SUPABASE_URL') ?? ''}/rest/v1/zoe_cache`;
const restHeaders = () => {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
};

export interface CacheEntry<T> {
  value: T;
  fresh: boolean;
  cachedAt: string | null;
}

export interface CacheOptions {
  /** Seconds the value is considered fresh. */
  ttlSeconds: number;
  /** Logical namespace, e.g. 'news', 'vr', 'image'. */
  scope?: string;
  /** Skip the read and force a refresh (the write still happens). */
  force?: boolean;
}

/** Reads a cached value. Returns null when nothing is stored at all. */
export async function cacheRead<T>(key: string): Promise<{ value: T; expired: boolean; cachedAt: string } | null> {
  try {
    const url = `${restUrl()}?cache_key=eq.${encodeURIComponent(key)}&select=payload,expires_at,updated_at&limit=1`;
    const res = await fetch(url, { headers: restHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ payload: { v: T }; expires_at: string; updated_at: string }>;
    const row = rows?.[0];
    if (!row) return null;
    return {
      value: row.payload?.v as T,
      expired: new Date(row.expires_at).getTime() <= Date.now(),
      cachedAt: row.updated_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Writes a value. Silent on failure — caching is never load-bearing. */
export async function cacheWrite<T>(key: string, value: T, ttlSeconds: number, scope = 'global'): Promise<void> {
  try {
    await fetch(`${restUrl()}?on_conflict=cache_key`, {
      method: 'POST',
      headers: { ...restHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        cache_key: key,
        scope,
        payload: { v: value },
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  } catch {
    /* cache is best-effort */
  }
}

/**
 * The one function callers should use: serve fresh, else refresh, else serve
 * stale. `producer` is only invoked when a refresh is actually needed.
 */
export async function cached<T>(key: string, options: CacheOptions, producer: () => Promise<T>): Promise<CacheEntry<T>> {
  const { ttlSeconds, scope = 'global', force = false } = options;
  const existing = force ? null : await cacheRead<T>(key);
  if (existing && !existing.expired) {
    return { value: existing.value, fresh: false, cachedAt: existing.cachedAt };
  }
  try {
    const value = await producer();
    await cacheWrite(key, value, ttlSeconds, scope);
    return { value, fresh: true, cachedAt: new Date().toISOString() };
  } catch (err) {
    const stale = existing ?? (await cacheRead<T>(key));
    if (stale) return { value: stale.value, fresh: false, cachedAt: stale.cachedAt };
    throw err;
  }
}

/** Removes rows that expired over a day ago. Safe to call from any cron job. */
export async function cacheSweep(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - 86_400_000).toISOString();
    const res = await fetch(`${restUrl()}?expires_at=lt.${encodeURIComponent(cutoff)}&select=cache_key`, {
      method: 'DELETE',
      headers: { ...restHeaders(), Prefer: 'return=representation' },
    });
    if (!res.ok) return 0;
    const rows = (await res.json()) as unknown[];
    return rows?.length ?? 0;
  } catch {
    return 0;
  }
}
