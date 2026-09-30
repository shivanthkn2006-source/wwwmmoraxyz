/**
 * Single entry point for every call into the `growth-dispatch` edge function.
 *
 * The worker answers 401 "sign in required" when the token is missing, expired,
 * or was revoked by a sign-out that raced the call (e.g. switching accounts).
 * We only call with a live token, and on a 401 we refresh once and retry;
 * a second 401 is reported as a soft signed-out result, never a thrown error.
 */
import { supabase } from '@/integrations/supabase/client';
import { liveAccessToken } from '@/lib/edgeSession';

export interface GrowthDispatchResult<T = any> {
  data: T | null;
  error: Error | null;
  /** True when the call was skipped because nobody is signed in. */
  signedOut: boolean;
}

function authMessage(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value.toLowerCase();
  if (value instanceof Error) return value.message.toLowerCase();
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [record.error, record.message, record.error_description]
      .filter((entry): entry is string => typeof entry === 'string')
      .join(' ')
      .toLowerCase();
  }
  return '';
}

function isAuthDenied(error: unknown, data?: unknown): boolean {
  const candidate = error as { context?: { status?: number }; status?: number } | null;
  const status = candidate?.context?.status ?? candidate?.status;
  const message = `${authMessage(error)} ${authMessage(data)}`;
  return status === 401
    || message.includes('sign in required')
    || message.includes('invalid session')
    || message.includes('invalid jwt')
    || message.includes('jwt expired');
}

function isSignedOutPayload(data: unknown): boolean {
  return Boolean(data && typeof data === 'object' && (data as { signedOut?: boolean }).signedOut === true);
}

async function callOnce<T>(body: Record<string, unknown>, token: string) {
  const { data, error } = await supabase.functions.invoke('growth-dispatch', {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  return { data: (data ?? null) as T | null, error: error ?? null };
}

export async function invokeGrowthDispatch<T = any>(
  body: Record<string, unknown>,
): Promise<GrowthDispatchResult<T>> {
  const signedOut = { data: null, error: null, signedOut: true };
  const token = await liveAccessToken();
  if (!token) return signedOut;

  try {
    let res = await callOnce<T>(body, token);
    if (isSignedOutPayload(res.data)) return signedOut;
    if (isAuthDenied(res.error, res.data)) {
      const { data: refreshed } = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } } as any));
      const fresh = refreshed?.session?.access_token;
      if (!fresh) return signedOut;
      res = await callOnce<T>(body, fresh);
      if (isSignedOutPayload(res.data) || isAuthDenied(res.error, res.data)) return signedOut;
    }
    return { ...res, signedOut: false };
  } catch (e) {
    if (isAuthDenied(e)) return signedOut;
    return { data: null, error: e as Error, signedOut: false };
  }
}

export default invokeGrowthDispatch;
