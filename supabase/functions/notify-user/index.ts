/**
 * NOTIFY-USER — the only path by which a signed-in member may place a
 * notification in *someone else's* inbox.
 *
 * Direct cross-user inserts are blocked by RLS (members may only write
 * notifications addressed to themselves), so anything that must reach another
 * member is attributed, rate limited and authorised here.
 *
 *   message  — any signed-in member, to one recipient. 10 per hour.
 *   warning  — administrators only.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { guardRequest, wafCorsHeaders } from '../_shared/waf.ts';
import { resolveClaims } from '../_shared/auth-claims.ts';
import { clientErrorResponse } from '../_shared/client-error.ts';

const corsHeaders = wafCorsHeaders;
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const admin = () =>
  createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

const ALLOWED_TYPES = new Set(['message', 'warning', 'moderation_alert']);
const HOURLY_LIMIT = 10;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const guard = await guardRequest(req, {
    name: 'notify-user',
    limit: 30,
    windowSeconds: 60,
    maxBodyBytes: 8 * 1024,
  });
  if (guard.response) return guard.response;

  try {
    const db = admin();
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: claims } = token ? await resolveClaims(db, token) : { data: null };
    const senderId: string | null = claims?.claims?.sub ?? null;
    if (!senderId) return json({ ok: false, error: 'sign in required' }, 401);

    const type = String(guard.body.type ?? 'message').trim();
    const recipientId = String(guard.body.userId ?? '').trim();
    if (!ALLOWED_TYPES.has(type)) return json({ ok: false, error: 'unsupported type' }, 400);
    if (!/^[0-9a-f-]{36}$/i.test(recipientId)) return json({ ok: false, error: 'recipient required' }, 400);

    if (type === 'warning' || type === 'moderation_alert') {
      const { data: isAdmin } = await db.rpc('has_role', { _user_id: senderId, _role: 'admin' });
      if (!isAdmin) return json({ ok: false, error: 'administrators only' }, 403);
    }

    const since = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('from_user_id', senderId)
      .neq('user_id', senderId)
      .gte('created_at', since);
    if ((count ?? 0) >= HOURLY_LIMIT) return json({ ok: false, error: 'rate limited' }, 429);

    const context = typeof guard.body.context === 'object' && guard.body.context !== null
      ? guard.body.context as Record<string, unknown>
      : {};

    const { error } = await db.from('notifications').insert({
      user_id: recipientId,
      from_user_id: senderId,
      type,
      priority: Number(guard.body.priority ?? 3) || 3,
      post_id: guard.body.postId ? String(guard.body.postId) : null,
      context_data: context,
    });
    if (error) return json({ ok: false, error: 'send failed' }, 500);

    return json({ ok: true });
  } catch (error) {
    const clientError = clientErrorResponse(error, corsHeaders);
    if (clientError) return clientError;
    return json({ ok: false, error: 'unexpected error' }, 500);
  }
});
