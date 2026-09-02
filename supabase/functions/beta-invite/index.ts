/**
 * BETA INVITE — the single server-side authority for gated-beta invite codes.
 *
 * Invite codes are never readable by anonymous clients (RLS forbids it), so
 * every operation runs here behind the edge WAF:
 *
 *   validate  — public. Answers only "usable / not usable" for one code, with
 *               a tight rate limit so the code space cannot be brute forced.
 *   redeem    — signed-in caller binds a code to their account (idempotent).
 *   issue     — sovereign/admin only. Mints a code with uses + expiry.
 *   list      — sovereign/admin only. Returns issued codes and their state.
 *   revoke    — sovereign/admin only. Deactivates a code with a reason.
 *
 * The public answer is deliberately thin: a caller learns whether a code works,
 * never who issued it, how many uses remain or whether it merely expired.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { guardRequest, wafCorsHeaders } from '../_shared/waf.ts';
import { resolveClaims } from '../_shared/auth-claims.ts';
import { clientErrorResponse } from '../_shared/client-error.ts';

const corsHeaders = wafCorsHeaders;
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike glyphs

const mintCode = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const raw = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `MMORA-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
};

const normalise = (value: unknown): string =>
  String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');

const admin = () =>
  createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

interface InviteRow {
  id: string;
  code: string;
  is_active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number | null;
  used_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
}

/** Pure usability check, shared by validate and redeem so they cannot drift. */
function inviteUsable(row: InviteRow | null, now = Date.now()): { usable: boolean; reason: string } {
  if (!row) return { usable: false, reason: 'unknown' };
  if (!row.is_active || row.revoked_at) return { usable: false, reason: 'revoked' };
  if (row.expires_at && new Date(row.expires_at).getTime() <= now) return { usable: false, reason: 'expired' };
  if (row.max_uses !== null && (row.current_uses ?? 0) >= row.max_uses) {
    return { usable: false, reason: 'exhausted' };
  }
  return { usable: true, reason: 'ok' };
}

/** Resolves the caller and whether they hold the admin role. */
async function callerContext(req: Request): Promise<{ userId: string | null; isAdmin: boolean }> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return { userId: null, isAdmin: false };
  const db = admin();
  const { data } = await resolveClaims(db, token);
  const userId = data?.claims?.sub ?? null;
  if (!userId) return { userId: null, isAdmin: false };
  const { data: role } = await db.rpc('has_role', { _user_id: userId, _role: 'admin' });
  return { userId, isAdmin: Boolean(role) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const guard = await guardRequest(req, {
    name: 'beta-invite',
    limit: 30,
    windowSeconds: 60,
    maxBodyBytes: 8 * 1024,
  });
  if (guard.response) return guard.response;

  try {
    const action = String(guard.body.action ?? '').trim();
    const db = admin();

    if (action === 'validate') {
      const code = normalise(guard.body.code);
      if (!code) throw new Error('code is required');
      const { data } = await db
        .from('invite_codes')
        .select('id, code, is_active, expires_at, max_uses, current_uses, used_by, metadata, created_at, revoked_at, revoked_reason')
        .eq('code', code)
        .maybeSingle();
      const verdict = inviteUsable(data as InviteRow | null);
      return json({ ok: true, valid: verdict.usable, reason: verdict.reason });
    }

    const { userId, isAdmin } = await callerContext(req);

    if (action === 'redeem') {
      if (!userId) return json({ ok: false, error: 'sign in required' }, 401);
      const code = normalise(guard.body.code);
      if (!code) throw new Error('code is required');
      const { data } = await db
        .from('invite_codes')
        .select('id, code, is_active, expires_at, max_uses, current_uses, used_by, metadata, created_at, revoked_at, revoked_reason')
        .eq('code', code)
        .maybeSingle();
      const row = data as InviteRow | null;
      const verdict = inviteUsable(row);
      if (!row || !verdict.usable) return json({ ok: false, error: verdict.reason }, 400);
      if (row.used_by === userId) return json({ ok: true, alreadyRedeemed: true, code: row.code });

      const { error } = await db
        .from('invite_codes')
        .update({
          current_uses: (row.current_uses ?? 0) + 1,
          used_by: row.used_by ?? userId,
          used_at: row.used_at ?? new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) return json({ ok: false, error: 'redeem failed' }, 500);
      return json({ ok: true, code: row.code });
    }

    if (!isAdmin) return json({ ok: false, error: 'sovereign administrator only' }, 403);

    if (action === 'issue') {
      const count = Math.min(Math.max(Number(guard.body.count ?? 1) || 1, 1), 25);
      const maxUses = guard.body.maxUses === null ? null : Math.min(Math.max(Number(guard.body.maxUses ?? 1) || 1, 1), 500);
      const days = Number(guard.body.expiresInDays ?? 30);
      const expiresAt = days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
      const label = String(guard.body.label ?? '').slice(0, 120);

      const rows = Array.from({ length: count }, () => ({
        code: mintCode(),
        created_by: userId,
        is_active: true,
        max_uses: maxUses,
        current_uses: 0,
        expires_at: expiresAt,
        metadata: { label, cohort: 'gated-beta' },
      }));
      const { data, error } = await db.from('invite_codes').insert(rows).select('id, code, expires_at, max_uses');
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, issued: data ?? [] });
    }

    if (action === 'list') {
      const { data, error } = await db
        .from('invite_codes')
        .select('id, code, is_active, expires_at, max_uses, current_uses, used_by, used_at, metadata, created_at, revoked_at, revoked_reason')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, codes: data ?? [] });
    }

    if (action === 'revoke') {
      const id = String(guard.body.id ?? '');
      if (!id) throw new Error('id is required');
      const { error } = await db
        .from('invite_codes')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: userId,
          revoked_reason: String(guard.body.reason ?? 'revoked by sovereign administrator').slice(0, 200),
        })
        .eq('id', id);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true });
    }

    throw new Error('unknown action');
  } catch (error) {
    const clientError = clientErrorResponse(error, corsHeaders);
    if (clientError) return clientError;
    return json({ ok: false, error: error instanceof Error ? error.message : 'invite service failure' }, 500);
  }
});
