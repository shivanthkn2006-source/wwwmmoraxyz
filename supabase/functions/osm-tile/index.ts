// Shared real-map tile cache. One ~200 m OpenStreetMap block per request:
// database cache first (shared by every member), then Overpass mirrors
// server-side with retry. Only public map data is stored.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const TTL_MS = 30 * 24 * 3600 * 1000;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function query(s: number, w: number, n: number, e: number) {
  const box = `${s},${w},${n},${e}`;
  return `[out:json][timeout:20];(way["building"](${box});way["highway"](${box});` +
    `node["shop"]["name"](${box});` +
    `node["amenity"~"restaurant|cafe|fast_food|bank|hospital|pharmacy|school|cinema|marketplace|place_of_worship"]["name"](${box});` +
    `);out geom tags;`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let body: { key?: string; bbox?: { south: number; west: number; north: number; east: number } };
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const { key, bbox } = body;
  if (!key || !/^-?\d{1,6}_-?\d{1,7}$/.test(key) || !bbox) return json({ error: 'bad key' }, 400);
  const { south, west, north, east } = bbox;
  const nums = [south, west, north, east];
  if (!nums.every((v) => typeof v === 'number' && Number.isFinite(v)) ||
      north - south <= 0 || north - south > 0.003 || east - west <= 0 || east - west > 0.06 ||
      Math.abs(south) > 85 || Math.abs(west) > 180) return json({ error: 'bad bbox' }, 400);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: hit } = await db.from('spatial_tile_cache').select('data, fetched_at').eq('tile_key', key).maybeSingle();
  if (hit && Date.now() - new Date(hit.fetched_at).getTime() < TTL_MS) return json({ source: 'shared', data: hit.data });

  const q = query(south, west, north, east);
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const url of MIRRORS) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 12_000);
      try {
        const r = await fetch(url, {
          method: 'POST', signal: ctl.signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'MMora-VRWorld/1.0 (mmora.xyz)' },
          body: 'data=' + encodeURIComponent(q),
        });
        if (r.ok) {
          const raw = await r.json();
          await db.from('spatial_tile_cache').upsert({ tile_key: key, data: raw, fetched_at: new Date().toISOString() });
          return json({ source: 'osm', data: raw });
        }
        await r.text();
      } catch { /* next mirror */ } finally { clearTimeout(t); }
    }
    await new Promise((res) => setTimeout(res, 800));
  }
  if (hit) return json({ source: 'stale', data: hit.data });
  return json({ error: 'map servers busy' }, 503);
});
