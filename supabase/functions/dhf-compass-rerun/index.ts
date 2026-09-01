/**
 * ADMIN RE-RUN — regenerate a single member-day of DHF cards.
 *
 * Only reachable by an authenticated admin (verify_jwt = true plus an explicit
 * has_role check), so it can never be used to drain provider credits.
 * Work is bounded to exactly one member-day per call and `ensureDayForUser`
 * is idempotent, so repeated clicks cost nothing extra.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { ensureDayForUser } from '../_shared/dhf-compass-runner.ts';
import { localDateIn } from '../_shared/astro-engine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const callerId = userData?.user?.id;
    if (userErr || !callerId) return json({ error: 'Unauthorized' }, 401);

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: callerId, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Admin access required' }, 403);

    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId : null;
    if (!userId) return json({ error: 'userId is required' }, 400);

    const timezone = typeof body.timezone === 'string' ? body.timezone : 'UTC';
    let tz = 'UTC';
    try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); tz = timezone; } catch { tz = 'UTC'; }
    const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : localDateIn(new Date(), tz);

    const result = await ensureDayForUser({
      userId,
      date,
      trigger: 'admin',
      action: body.regenerate === true ? 'regenerate' : 'ensure',
      regenerate: body.regenerate === true,
      budgetMs: 100_000,
    });

    return json({ ok: result.ok, ...result });
  } catch (e) {
    console.error('[dhf-compass-rerun]', e);
    return json({ error: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
