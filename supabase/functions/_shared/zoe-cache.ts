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
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) client = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  return client;
}

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
    const { data } = await db()
      .from('zoe_cache')
      .select('payload, expires_at, updated_at')
      .eq('cache_key', key)
      .maybeSingle();
    if (!data) return null;
    return {
      value: (data.payload as { v: T }).v,
      expired: new Date(data.expires_at as string).getTime() <= Date.now(),
      cachedAt: (data.updated_at as string) ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Writes a value. Silent on failure — caching is never load-bearing. */
export async function cacheWrite<T>(key: string, value: T, ttlSeconds: number, scope = 'global'): Promise<void> {
  try {
    await db()
      .from('zoe_cache')
      .upsert(
        {
          cache_key: key,
          scope,
          payload: { v: value },
          expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'cache_key' },
      );
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

/** Removes expired rows. Safe to call from any cron-driven function. */
export async function cacheSweep(): Promise<number> {
  try {
    const { data } = await db()
      .from('zoe_cache')
      .delete()
      .lt('expires_at', new Date(Date.now() - 86_400_000).toISOString())
      .select('cache_key');
    return data?.length ?? 0;
  } catch {
    return 0;
  }
}
