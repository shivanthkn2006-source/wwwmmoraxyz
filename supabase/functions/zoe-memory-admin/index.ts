import { requireCaller } from '../_shared/caller-guard.ts';
/**
 * ZOE MEMORY ADMIN
 * ================
 * Read-only window into what Zoe remembers about a member: their remembered
 * preferences, their life timeline (posts, memories, saved dates) and their orb
 * conversation history.
 *
 * The caller must hold the `admin` role — checked server-side through the
 * security-definer `has_role` function with the caller's own JWT. Only after
 * that check passes does the service-role client read another member's rows,
 * and every read is scoped to the single requested user id.
 *
 * POST { mode: 'users', search? }        → { ok, users }
 * POST { mode: 'memory', userId }        → { ok, profile, facts, timeline, orb }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { resolveClaims } from '../_shared/auth-claims.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  { const __c = await requireCaller(req, 'admin'); if (__c instanceof Response) return __c; }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const asCaller = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: claimData, error: claimError } = await resolveClaims(asCaller, token);
  const callerId = claimData?.claims?.sub;
  if (claimError || !callerId) return json({ error: 'Unauthorized' }, 401);

  const { data: isAdmin } = await asCaller.rpc('has_role', { _user_id: callerId, _role: 'admin' });
  if (!isAdmin) return json({ error: 'Forbidden' }, 403);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const mode = typeof body.mode === 'string' ? body.mode : 'users';

  if (mode === 'users') {
    const search = typeof body.search === 'string' ? body.search.trim().slice(0, 80) : '';
    let query = db
      .from('profiles')
      .select('user_id, username, display_name, real_name, city, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (search) {
      query = query.or(
        `username.ilike.%${search}%,display_name.ilike.%${search}%,real_name.ilike.%${search}%`,
      );
    }
    const { data, error } = await query;
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, users: data ?? [] });
  }

  if (mode !== 'memory') return json({ error: 'Unknown mode' }, 400);

  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!UUID_RE.test(userId)) return json({ error: 'A valid userId is required' }, 400);

  const [profile, facts, posts, memories, dates, orb] = await Promise.all([
    db
      .from('profiles')
      .select('user_id, username, display_name, real_name, bio, city, created_at')
      .eq('user_id', userId)
      .maybeSingle(),
    db
      .from('zoe_life_context')
      .select('category, fact_key, fact_value, confidence, last_seen_at')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false })
      .limit(200),
    db
      .from('posts')
      .select('id, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40),
    db
      .from('mmora_memories')
      .select('id, content, type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40),
    db
      .from('important_dates')
      .select('id, title, date_type, date_value')
      .eq('user_id', userId)
      .order('date_value', { ascending: true })
      .limit(40),
    db
      .from('ai_companion_messages')
      .select('id, role, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(60),
  ]);

  const timeline = [
    ...(posts.data ?? []).map((p) => ({
      kind: 'post' as const,
      id: p.id,
      label: String(p.content ?? '').slice(0, 200),
      at: p.created_at,
    })),
    ...(memories.data ?? []).map((m) => ({
      kind: 'memory' as const,
      id: m.id,
      label: `${m.type ? `${m.type}: ` : ''}${String(m.content ?? '').slice(0, 200)}`,
      at: m.created_at,
    })),
    ...(dates.data ?? []).map((d) => ({
      kind: 'date' as const,
      id: d.id,
      label: `${d.date_type ?? 'date'} — ${d.title ?? ''}`,
      at: d.date_value,
    })),
  ].sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')));

  return json({
    ok: true,
    profile: profile.data ?? null,
    facts: facts.data ?? [],
    timeline,
    orb: (orb.data ?? []).reverse(),
    counts: {
      facts: facts.data?.length ?? 0,
      posts: posts.data?.length ?? 0,
      memories: memories.data?.length ?? 0,
      dates: dates.data?.length ?? 0,
      orb: orb.data?.length ?? 0,
    },
  });
});
