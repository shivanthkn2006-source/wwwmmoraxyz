/**
 * Single entry point for every call into the `growth-dispatch` edge function.
 *
 * Why this exists: `supabase.functions.invoke` falls back to the anon key for
 * the Authorization header when there is no session (or the cached session has
 * expired). The worker then rejects the call with 401 "sign in required",
 * which surfaced as a runtime error on the home feed. Here we resolve the real
 * session first, attach its access token explicitly, and return a soft
 * signed-out result instead of firing a doomed request.
 */
import { supabase } from '@/integrations/supabase/client';

export interface GrowthDispatchResult<T = any> {
  data: T | null;
  error: Error | null;
  /** True when the call was skipped because nobody is signed in. */
  signedOut: boolean;
}

export async function invokeGrowthDispatch<T = any>(
  body: Record<string, unknown>,
): Promise<GrowthDispatchResult<T>> {
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch { /* treated as signed out below */ }

  if (!token) {
    return { data: null, error: new Error('sign in required'), signedOut: true };
  }

  try {
    const { data, error } = await supabase.functions.invoke('growth-dispatch', {
      body,
      headers: { Authorization: `Bearer ${token}` },
    });
    return { data: (data ?? null) as T | null, error: error ?? null, signedOut: false };
  } catch (e) {
    return { data: null, error: e as Error, signedOut: false };
  }
}

export default invokeGrowthDispatch;
