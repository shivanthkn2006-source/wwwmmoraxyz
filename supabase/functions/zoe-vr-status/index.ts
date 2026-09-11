/**
 * ZOE VR STATUS
 * =============
 * Replaces the placeholder "checking VR" answer with real numbers taken from
 * live platform presence, so Zoe can say something true the instant she is
 * asked. Answers are cached briefly and shared by every user, which keeps this
 * cheap at 500+ concurrent members.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { resolveClaims } from '../_shared/auth-claims.ts';
import { cached } from '../_shared/zoe-cache.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const TTL_SECONDS = 30;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const authClient = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data: claims } = await resolveClaims(authClient, token);
  const userId = claims?.claims?.sub;
  if (!userId) return json({ ok: false, error: 'Unauthorized' }, 401);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();

  try {
    // Platform-wide numbers are identical for everyone, so they are cached once.
    const global = await cached(
      'vr:global',
      { ttlSeconds: TTL_SECONDS, scope: 'vr' },
      async () => {
        const { count: onlineCount } = await db
          .from('online_sessions')
          .select('user_id', { count: 'exact', head: true })
          .gte('last_heartbeat', since);

        const { data: vrRows } = await db
          .from('online_sessions')
          .select('user_id, device_info')
          .gte('last_heartbeat', since)
          .limit(500);

        const inVr = (vrRows ?? []).filter((r) => {
          const info = JSON.stringify(r.device_info ?? {}).toLowerCase();
          return info.includes('vr') || info.includes('xr') || info.includes('headset');
        });

        return {
          usersOnline: onlineCount ?? 0,
          usersInVr: inVr.length,
          measuredAt: new Date().toISOString(),
        };
      },
    );

    // The friend slice is personal, so it gets its own short-lived key.
    const personal = await cached(
      `vr:friends:${userId}`,
      { ttlSeconds: TTL_SECONDS, scope: 'vr' },
      async () => {
        const { data: friendRows } = await db
          .from('friendships')
          .select('user_id, friend_id')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
          .limit(500);

        const friendIds = Array.from(
          new Set((friendRows ?? []).map((r) => (r.user_id === userId ? r.friend_id : r.user_id)).filter(Boolean)),
        ) as string[];

        if (friendIds.length === 0) return { friendsOnline: [] as string[], friendCount: 0 };

        const { data: liveFriends } = await db
          .from('online_sessions')
          .select('user_id')
          .in('user_id', friendIds)
          .gte('last_heartbeat', since);

        const liveIds = Array.from(new Set((liveFriends ?? []).map((r) => r.user_id))) as string[];
        if (liveIds.length === 0) return { friendsOnline: [] as string[], friendCount: friendIds.length };

        const { data: names } = await db
          .from('profiles')
          .select('user_id, display_name, username')
          .in('user_id', liveIds);

        return {
          friendsOnline: (names ?? []).map((p) => p.display_name || p.username || 'a friend'),
          friendCount: friendIds.length,
        };
      },
    );

    return json({
      ok: true,
      ...global.value,
      ...personal.value,
      cached: !global.fresh,
      cachedAt: global.cachedAt,
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'VR status unavailable' }, 502);
  }
});
