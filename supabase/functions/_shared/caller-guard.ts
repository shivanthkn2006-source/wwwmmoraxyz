/**
 * Shared caller guard for edge functions.
 *
 *   const caller = await requireCaller(req, 'member');   // any signed-in user
 *   const caller = await requireCaller(req, 'admin');    // root admin or server
 *   if (caller instanceof Response) return caller;       // 401 / 403 already built
 *
 * Server-to-server calls using the service role key are always accepted.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

export type Caller =
  | { kind: 'service' }
  | { kind: 'member'; userId: string; isAdmin: boolean };

const URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function deny(status: number, error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function requireCaller(
  req: Request,
  level: 'member' | 'admin',
): Promise<Caller | Response> {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return deny(401, 'Authentication required');
  if (SERVICE && token === SERVICE) return { kind: 'service' };

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  const userId = data?.user?.id;
  if (error || !userId) return deny(401, 'Invalid session');

  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
  if (level === 'admin' && !isAdmin) return deny(403, 'Admin only');
  return { kind: 'member', userId, isAdmin: !!isAdmin };
}
