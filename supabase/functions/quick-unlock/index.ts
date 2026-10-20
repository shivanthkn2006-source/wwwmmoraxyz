/**
 * Quick Unlock: a 5-digit code that unlocks an already signed-in device.
 * Identity always comes from the verified session; the request body never
 * names a member. Codes, counts and waits live only on the server.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { resolveClaims } from '../_shared/auth-claims.ts';
import { CODE_PATTERN, constantTimeEqual, hashCode, isWeakCode, newSaltHex, PBKDF2_ITERATIONS } from '../_shared/quick-unlock-rules.ts';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status') }),
  z.object({ action: z.literal('remove') }),
  z.object({ action: z.literal('set'), code: z.string().regex(CODE_PATTERN) }),
  z.object({ action: z.literal('change'), current: z.string().regex(CODE_PATTERN), code: z.string().regex(CODE_PATTERN) }),
  z.object({ action: z.literal('verify'), code: z.string().regex(CODE_PATTERN) }),
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const log = (userId: string, event: string) =>
  admin.from('member_quick_unlock_events').insert({ user_id: userId, event });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const { data: claims } = await resolveClaims(admin, token);
  const userId = claims?.claims?.sub;
  if (!userId) return json({ error: 'Please sign in again.' }, 401);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: 'Enter exactly 5 digits.' }, 400);
  const body = parsed.data;

  const { data: row } = await admin
    .from('member_quick_unlock')
    .select('code_hash, salt, iterations, failed_attempts, locked_until')
    .eq('user_id', userId)
    .maybeSingle();

  const lockedMs = row?.locked_until ? Date.parse(row.locked_until) - Date.now() : 0;

  if (body.action === 'status') {
    return json({ enabled: !!row, lockedForSeconds: lockedMs > 0 ? Math.ceil(lockedMs / 1000) : 0 });
  }

  if (body.action === 'remove') {
    await admin.from('member_quick_unlock').delete().eq('user_id', userId);
    if (row) await log(userId, 'removed');
    return json({ ok: true, enabled: false });
  }

  const matches = async (code: string) =>
    !!row && constantTimeEqual(await hashCode(code, row.salt, row.iterations), row.code_hash);

  const failure = async () => {
    const { data } = await admin.rpc('quick_unlock_record_failure', { _uid: userId });
    const r = (data ?? {}) as { state?: string; attempts?: number };
    if (r.state === 'erased') return json({ ok: false, erased: true, error: 'Too many wrong tries. Please sign in again.' }, 403);
    if (r.state === 'locked') return json({ ok: false, error: 'Too many wrong tries. Please wait and try again.' }, 429);
    return json({ ok: false, error: 'That code is not right.', attemptsLeftBeforeWait: 5 - ((r.attempts ?? 0) % 5) }, 401);
  };

  if (body.action === 'set' || body.action === 'change') {
    if (body.action === 'set' && row) return json({ error: 'A code already exists. Change it instead.' }, 409);
    if (body.action === 'change') {
      if (!row) return json({ error: 'No code set yet.' }, 404);
      if (lockedMs > 0) return json({ ok: false, error: 'Too many wrong tries. Please wait and try again.' }, 429);
      if (!(await matches(body.current))) return failure();
    }
    if (isWeakCode(body.code)) return json({ error: 'That code is too easy to guess. Pick another.' }, 422);
    const salt = newSaltHex();
    const code_hash = await hashCode(body.code, salt);
    const { error } = await admin.from('member_quick_unlock').upsert({
      user_id: userId, code_hash, salt, iterations: PBKDF2_ITERATIONS,
      failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString(),
    });
    if (error) return json({ error: 'Could not save the code. Try again.' }, 500);
    await log(userId, body.action === 'set' ? 'set' : 'changed');
    return json({ ok: true, enabled: true });
  }

  // verify
  if (!row) return json({ ok: false, error: 'No code set.', enabled: false }, 404);
  if (lockedMs > 0) {
    return json({ ok: false, error: 'Too many wrong tries. Please wait and try again.', lockedForSeconds: Math.ceil(lockedMs / 1000) }, 429);
  }
  if (!(await matches(body.code))) return failure();
  await admin.from('member_quick_unlock').update({ failed_attempts: 0, locked_until: null }).eq('user_id', userId);
  return json({ ok: true });
});
