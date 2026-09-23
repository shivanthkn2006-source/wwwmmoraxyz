/**
 * Client access layer for gated-beta invite codes.
 *
 * Invite rows are not readable by the browser (RLS blocks anonymous reads), so
 * every call goes through the `beta-invite` edge function. Admin actions send
 * the caller's access token explicitly, because the function is deployed with
 * `verify_jwt = false` so that pre-signup validation can work.
 */
import { supabase } from '@/integrations/supabase/client';

export interface InviteCodeRecord {
  id: string;
  code: string;
  is_active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number | null;
  used_by: string | null;
  used_at: string | null;
  metadata: { label?: string; cohort?: string } | null;
  created_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
}

export type InviteReason = 'ok' | 'unknown' | 'revoked' | 'expired' | 'exhausted';

/** Normalises what a tester types: case, spacing and stray separators. */
export function normaliseInviteCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export const INVITE_REASON_COPY: Record<InviteReason, string> = {
  ok: 'Invite accepted.',
  unknown: 'That invite code is not recognised.',
  revoked: 'That invite code has been withdrawn.',
  expired: 'That invite code has expired.',
  exhausted: 'That invite code has already been fully used.',
};

async function callInvite<T>(body: Record<string, unknown>, authed: boolean): Promise<T> {
  let headers: Record<string, string> | undefined;
  if (authed) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('sign in required');
    headers = { Authorization: `Bearer ${token}` };
  }
  const { data, error } = await supabase.functions.invoke('beta-invite', { body, headers });
  if (error) throw new Error(error.message);
  return data as T;
}

/** Public, rate-limited usability check for one code. */
export async function validateInviteCode(code: string): Promise<{ valid: boolean; reason: InviteReason }> {
  const result = await callInvite<{ valid: boolean; reason: InviteReason }>(
    { action: 'validate', code: normaliseInviteCode(code) },
    false,
  );
  return { valid: Boolean(result?.valid), reason: (result?.reason ?? 'unknown') as InviteReason };
}

/** Binds a code to the signed-in account. Safe to call twice. */
export async function redeemInviteCode(code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await callInvite<{ ok: boolean; error?: string }>(
      { action: 'redeem', code: normaliseInviteCode(code) },
      true,
    );
    return { ok: Boolean(result?.ok), error: result?.error };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'redeem failed' };
  }
}

/**
 * Creates the account for an invited friend on the server: the invite proves who
 * they are, so the account arrives ready to sign in, with a profile row and the
 * friendship to the person who invited them already in place.
 */
export async function signUpWithInvite(
  code: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await callInvite<{ ok: boolean; error?: string }>(
      { action: 'invite-signup', code: normaliseInviteCode(code), email, password },
      false,
    );
    return { ok: Boolean(result?.ok), error: result?.error };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'sign up failed' };
  }
}


export async function listInviteCodes(): Promise<InviteCodeRecord[]> {
  const result = await callInvite<{ codes?: InviteCodeRecord[] }>({ action: 'list' }, true);
  return result?.codes ?? [];
}

export async function issueInviteCodes(params: {
  count: number;
  maxUses: number | null;
  expiresInDays: number;
  label: string;
}): Promise<Array<Pick<InviteCodeRecord, 'id' | 'code' | 'expires_at' | 'max_uses'>>> {
  const result = await callInvite<{ issued?: Array<Pick<InviteCodeRecord, 'id' | 'code' | 'expires_at' | 'max_uses'>> }>(
    { action: 'issue', ...params },
    true,
  );
  return result?.issued ?? [];
}

export async function revokeInviteCode(id: string, reason: string): Promise<void> {
  await callInvite({ action: 'revoke', id, reason }, true);
}

/** Shareable beta link that pre-fills the code on the portal. */
export function inviteLink(code: string, origin = window.location.origin): string {
  return `${origin}/beta?code=${encodeURIComponent(code)}`;
}

/** Human status for one code row, used by the admin table. */
export function inviteStatus(row: InviteCodeRecord, now = Date.now()): 'active' | 'revoked' | 'expired' | 'used' {
  if (!row.is_active || row.revoked_at) return 'revoked';
  if (row.expires_at && new Date(row.expires_at).getTime() <= now) return 'expired';
  if (row.max_uses !== null && (row.current_uses ?? 0) >= row.max_uses) return 'used';
  return 'active';
}
