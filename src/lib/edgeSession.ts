/**
 * Session gate for edge-function calls.
 *
 * Several background workers (behavioural streaming, the DHF daily feed) fired
 * while the browser held no session — or an access token that had already
 * expired — which the functions correctly answered with 401. Those 401s then
 * surfaced as runtime errors. The fix is to never make the call unless a live,
 * non-expired token exists, refreshing once when it is about to lapse.
 */
import { supabase } from '@/integrations/supabase/client';

const SKEW_SECONDS = 30;

/** Returns a valid access token, or null when the user is not signed in. */
export async function liveAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session?.access_token) return null;

    const expiresAt = session.expires_at ?? 0;
    if (expiresAt && expiresAt - SKEW_SECONDS <= Math.floor(Date.now() / 1000)) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      return refreshed?.session?.access_token ?? null;
    }
    return session.access_token;
  } catch {
    return null;
  }
}

/** Convenience guard: true when an edge call may safely be made. */
export async function hasLiveSession(): Promise<boolean> {
  return (await liveAccessToken()) !== null;
}

export default hasLiveSession;

/**
 * Invoke an edge function with a live token; if the server still says the
 * session is invalid (token rotated mid-flight in another tab), force one
 * refresh and retry once so signed-in members never see a 401.
 */
export async function invokeWithFreshSession<T = any>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: any }> {
  const call = (token: string) =>
    supabase.functions.invoke(name, { body, headers: { Authorization: `Bearer ${token}` } });
  const token = await liveAccessToken();
  if (!token) return { data: null, error: null };
  let res = await call(token);
  const status = (res.error as any)?.context?.status;
  if (res.error && status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    const next = refreshed?.session?.access_token;
    if (next) res = await call(next);
  }
  return res as { data: T | null; error: any };
}
