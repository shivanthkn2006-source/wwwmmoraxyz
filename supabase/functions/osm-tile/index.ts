// Shared real-map tile cache (public OpenStreetMap data only).
// Map servers block cloud servers, so members' phones download each block
// from OpenStreetMap and signed-in members share the parsed result here;
// everyone after them gets the block instantly from this cache.
//   { action: 'get', key }                -> { data } | 404
//   { action: 'put', key, data }          -> signed-in members only
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const TTL_MS = 30 * 24 * 3600 * 1000;
const MAX_BYTES = 400_000;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Pt = [number, number];
function validChunk(d: unknown): boolean {
  if (!d || typeof d !== 'object') return false;
  const c = d as { buildings?: unknown; roads?: unknown; pois?: unknown };
  const arr = (a: unknown, max: number) => Array.isArray(a) && a.length <= max;
  if (!arr(c.buildings, 400) || !arr(c.roads, 250) || !arr(c.pois, 30)) return false;
  const pts = (p: unknown) => Array.isArray(p) && p.length <= 400 &&
    p.every((q) => Array.isArray(q) && q.length === 2 && q.every((n) => typeof n === 'number' && Number.isFinite(n)));
  return (c.buildings as { pts: Pt[]; h: number }[]).every((b) => pts(b.pts) && typeof b.h === 'number' && b.h > 0 && b.h <= 300) &&
    (c.roads as { pts: Pt[]; w: number }[]).every((r) => pts(r.pts) && typeof r.w === 'number' && r.w > 0 && r.w <= 20) &&
    (c.pois as { lat: number; lng: number; name: string }[]).every((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && typeof p.name === 'string' && p.name.length <= 40);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const text = await req.text();
  if (text.length > MAX_BYTES) return json({ error: 'too large' }, 413);
  let body: { action?: string; key?: string; data?: unknown };
  try { body = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400); }
  const { action, key } = body;
  if (!key || !/^-?\d{1,6}_-?\d{1,7}$/.test(key)) return json({ error: 'bad key' }, 400);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  if (action === 'get') {
    const { data: hit } = await db.from('spatial_tile_cache').select('data, fetched_at').eq('tile_key', key).maybeSingle();
    if (!hit || Date.now() - new Date(hit.fetched_at).getTime() > TTL_MS) return json({ error: 'miss' }, 404);
    return json({ data: hit.data });
  }

  if (action === 'put') {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: u } = await db.auth.getUser(token);
    if (!u?.user) return json({ error: 'sign in to share map blocks' }, 401);
    if (!validChunk(body.data)) return json({ error: 'bad data' }, 400);
    const { error } = await db.from('spatial_tile_cache').upsert({ tile_key: key, data: body.data, fetched_at: new Date().toISOString() });
    if (error) { console.error('osm-tile put', error.message); return json({ error: 'save failed' }, 500); }
    return json({ ok: true });
  }
  return json({ error: 'bad action' }, 400);
});
