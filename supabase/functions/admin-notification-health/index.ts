// Admin-only notification health: per-feature wiring, delivery counts, failures,
// online/offline members, and an end-to-end test that sends one alert per kind
// to the admin's own account and reads it back.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Which database table automatically creates each feature's alert.
const AUTO_SOURCES: Record<string, string> = {
  likes: 'post_likes / comment_likes', comments: 'post_comments', replies: 'post_comments',
  tags: 'post_tags', friends: 'friend_requests', badges: 'user_badges / user_challenges',
  music: 'music_listens', messages: 'messages', growth: 'growth-dispatch', dhf: 'dhf essays',
  calls: 'call screen', lol: 'humor drops', admin: 'admin notices', zoe: 'Zoe', posts: 'timelines', system: 'fallback',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    if (!token) return json({ error: 'Sign in required.' }, 401);
    const caller = createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: u } = await caller.auth.getUser(token);
    if (!u?.user) return json({ error: 'Sign in required.' }, 401);
    const db = createClient(URL_, SERVICE);
    const { data: isAdmin } = await db.rpc('is_root_admin', { check_user_id: u.user.id });
    if (isAdmin !== true) return json({ error: 'Admin only.' }, 403);

    const body = await req.json().catch(() => ({})) as { action?: string };
    const { data: kinds } = await db.from('notification_kinds').select('kind, feature, label');

    if (body.action === 'test') {
      const marker = crypto.randomUUID();
      const rows = (kinds ?? []).map((k) => ({
        user_id: u.user.id, from_user_id: u.user.id, type: k.kind, read: true,
        context_data: { e2e_test: marker, title: `Test: ${k.label}` },
      }));
      const { error: insErr } = await db.from('notifications').insert(rows);
      const { data: back } = await db.from('notifications').select('type').eq('context_data->>e2e_test', marker);
      const got = new Set((back ?? []).map((r) => r.type));
      await db.from('notifications').delete().eq('context_data->>e2e_test', marker);
      return json({
        ok: !insErr,
        error: insErr?.message ?? null,
        results: (kinds ?? []).map((k) => ({ kind: k.kind, feature: k.feature, label: k.label, pass: got.has(k.kind) })),
      });
    }

    const day = new Date(Date.now() - 86400_000).toISOString();
    const week = new Date(Date.now() - 7 * 86400_000).toISOString();
    const [{ data: notes }, { data: attempts }, online, push, unread] = await Promise.all([
      db.from('notifications').select('type, created_at, context_data').gte('created_at', week).limit(20000),
      db.from('notification_attempts').select('channel, succeeded, error, source, created_at').gte('created_at', week).order('created_at', { ascending: false }).limit(5000),
      db.from('online_sessions').select('user_id', { count: 'exact', head: true }).gte('last_heartbeat', new Date(Date.now() - 5 * 60_000).toISOString()),
      db.from('push_subscriptions').select('id', { count: 'exact', head: true }),
      db.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
    ]);
    const { count: members } = await db.from('profiles').select('user_id', { count: 'exact', head: true });

    const features: Record<string, { feature: string; kinds: string[]; source: string; sent24h: number; sent7d: number; failed7d: number; lastError: string | null }> = {};
    for (const k of kinds ?? []) {
      const f = features[k.feature] ??= { feature: k.feature, kinds: [], source: AUTO_SOURCES[k.feature] ?? '—', sent24h: 0, sent7d: 0, failed7d: 0, lastError: null };
      f.kinds.push(k.kind);
    }
    const kindToFeature = new Map((kinds ?? []).map((k) => [k.kind, k.feature]));
    for (const n of notes ?? []) {
      if ((n.context_data as any)?.e2e_test) continue;
      const f = features[kindToFeature.get(n.type) ?? 'system'];
      if (!f) continue;
      f.sent7d++; if (n.created_at >= day) f.sent24h++;
    }
    const channels: Record<string, { channel: string; ok: number; failed: number; lastError: string | null }> = {};
    for (const a of attempts ?? []) {
      const c = channels[a.channel] ??= { channel: a.channel, ok: 0, failed: 0, lastError: null };
      if (a.succeeded) c.ok++; else { c.failed++; c.lastError ??= a.error; }
      if (!a.succeeded && a.source === 'growth-dispatch' && features.growth) {
        features.growth.failed7d++; features.growth.lastError ??= a.error;
      }
    }
    return json({
      features: Object.values(features),
      channels: Object.values(channels),
      onlineNow: online.count ?? 0,
      members: members ?? 0,
      pushDevices: push.count ?? 0,
      unread: unread.count ?? 0,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
