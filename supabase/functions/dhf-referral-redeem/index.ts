import { requireCaller } from '../_shared/caller-guard.ts';
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DHF REFERRAL WEBHOOK — credits reward_points to BOTH sides of a referral.
 *
 * POST { code: "ZOE-XXXXXX", userId?: uuid }
 *   • Called with a member JWT  → the caller is the referred (new) member.
 *   • Called with the service key + `userId` → server-to-server webhook use
 *     (e.g. from the sign-up hook), crediting on the new member's behalf.
 *
 * Rules enforced server-side:
 *   • One referral per referred member — `dhf_referrals.referred_id` is UNIQUE,
 *     so a replay credits nothing and returns `already_redeemed`.
 *   • Self-referral is rejected.
 *   • Unknown code is rejected without touching any balance.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { db, ensureProfile } from '../_shared/dhf-compass-runner.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export const REFERRER_POINTS = 100;
export const REFERRED_POINTS = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveCaller(req: Request, bodyUserId: unknown): Promise<string | null> {
  const auth = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!auth) return null;
  if (auth === SERVICE_KEY) {
    return typeof bodyUserId === 'string' && UUID.test(bodyUserId) ? bodyUserId : null;
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${auth}` },
    });
    if (!r.ok) return null;
    const user = await r.json();
    return user?.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

async function addPoints(userId: string, amount: number) {
  const row = await db(`user_dhf_profiles?id=eq.${userId}&select=reward_points&limit=1`);
  const current = Array.isArray(row.data) && row.data.length ? Number(row.data[0].reward_points ?? 0) : 0;
  await db(`user_dhf_profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ reward_points: current + amount }),
  });
  return current + amount;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  { const __c = await requireCaller(req, 'member'); if (__c instanceof Response) return __c; }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    const referredId = await resolveCaller(req, body.userId);
    if (!referredId) return json({ error: 'unauthorized' }, 401);

    const code = String(body.code ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,24}$/.test(code)) return json({ error: 'invalid code' }, 400);

    // The referred member must own a DHF profile before points can land on it.
    await ensureProfile(referredId);

    const owner = await db(`user_dhf_profiles?referral_code=eq.${encodeURIComponent(code)}&select=id&limit=1`);
    const referrerId = Array.isArray(owner.data) && owner.data.length ? String(owner.data[0].id) : null;
    if (!referrerId) return json({ error: 'unknown code' }, 404);
    if (referrerId === referredId) return json({ error: 'self referral' }, 400);

    const existing = await db(`dhf_referrals?referred_id=eq.${referredId}&select=id&limit=1`);
    if (Array.isArray(existing.data) && existing.data.length) {
      return json({ ok: true, already_redeemed: true });
    }

    // UNIQUE(referred_id) is the real guard: a race loses here and credits nothing.
    const claim = await db('dhf_referrals', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        referrer_id: referrerId,
        referred_id: referredId,
        code,
        referrer_points: REFERRER_POINTS,
        referred_points: REFERRED_POINTS,
      }),
    });
    if (!claim.ok) {
      return json({ ok: true, already_redeemed: true });
    }

    const referrerBalance = await addPoints(referrerId, REFERRER_POINTS);
    const referredBalance = await addPoints(referredId, REFERRED_POINTS);

    return json({
      ok: true,
      credited: true,
      referrer: { id: referrerId, awarded: REFERRER_POINTS, balance: referrerBalance },
      referred: { id: referredId, awarded: REFERRED_POINTS, balance: referredBalance },
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
