// Daily rotating quote from ZenQuotes (https://zenquotes.io) — "quote of the day".
// Server-side fetch avoids browser CORS; in-memory cache per UTC day.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

let cache: { day: string; body: string } | null = null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const day = new Date().toISOString().slice(0, 10);
  if (cache?.day === day) return new Response(cache.body, { headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://zenquotes.io/api/today', { signal: ctrl.signal });
    clearTimeout(t);
    const data = await res.json();
    const q = Array.isArray(data) ? data[0] : null;
    if (!q?.q || String(q.q).includes('Too many requests')) throw new Error('no quote');
    const body = JSON.stringify({ quote: q.q, author: q.a, source: 'ZenQuotes.io', source_url: 'https://zenquotes.io', day });
    cache = { day, body };
    return new Response(body, { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
