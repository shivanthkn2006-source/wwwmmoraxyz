import { supabase } from '@/integrations/supabase/client';

/**
 * True only when the browser holds an access token the backend will accept.
 *
 * Session-only edge functions (search indexer, motivation) answer 401 for
 * anonymous or expired tokens, which surfaces as a runtime error banner. This
 * guard refreshes a nearly expired token and then confirms it server-side, so
 * callers can skip the request instead of provoking an error.
 */
export async function ensureLiveSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    let session = data.session;
    if (!session) return false;

    const expiresAt = (session.expires_at ?? 0) * 1000;
    if (expiresAt && expiresAt - Date.now() < 60_000) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed.session;
      if (!session) return false;
    }

    const { data: userData, error } = await supabase.auth.getUser();
    return !error && Boolean(userData.user);
  } catch {
    return false;
  }
}

export default ensureLiveSession;
