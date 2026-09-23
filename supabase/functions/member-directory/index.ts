/**
 * MEMBER DIRECTORY — find people to add, without exposing their details.
 *
 * The caller must be signed in. Only the account id, name, handle and photo of
 * matching members are returned, so strangers' personal profile fields stay private.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const BodySchema = z.object({
  query: z.string().trim().min(2).max(80),
  excludeUserId: z.string().uuid().nullish(),
  limit: z.number().int().min(1).max(20).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!url || !anonKey || !serviceKey || !token) return json({ error: 'Sign in required.' }, 401);

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: authData, error: authError } = await caller.auth.getUser(token);
  if (authError || !authData?.user) return json({ error: 'Sign in required.' }, 401);

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Enter at least two characters.' }, 400);

  const needle = parsed.data.query.replace(/[\\%_,()]/g, '');
  if (needle.length < 2) return json({ profiles: [] });

  const admin = createClient(url, serviceKey);
  const { data, error } = await admin
    .from('public_profiles')
    .select('user_id, username, display_name, profile_photo_url')
    .or(`display_name.ilike.%${needle}%,username.ilike.%${needle}%`)
    .neq('user_id', parsed.data.excludeUserId || authData.user.id)
    .limit(parsed.data.limit ?? 10);

  if (error) return json({ error: 'Search is temporarily unavailable.' }, 500);
  return json({ profiles: data || [] });
});
