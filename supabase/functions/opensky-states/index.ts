import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// OpenSky's anonymous tier frequently stalls for 30s+ or rate-limits. Without a
// bound the edge worker is held open, which is an availability risk under load.
const UPSTREAM_TIMEOUT_MS = 8000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const degraded = (reason: string, status: number) =>
    new Response(
      JSON.stringify({ ok: false, degraded: true, reason, time: Math.floor(Date.now() / 1000), states: [] }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  try {
    const response = await fetch('https://opensky-network.org/api/states/all', {
      headers: { 'User-Agent': 'mmora-sentinel/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!response.ok) {
      await response.body?.cancel();
      console.warn('[opensky-states] upstream status', response.status);
      return degraded(`upstream_${response.status}`, response.status === 429 ? 429 : 502);
    }

    const data = await response.json();
    return new Response(JSON.stringify({ ok: true, degraded: false, ...data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown OpenSky fetch failure';
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    console.error('[opensky-states] Error:', message);
    return degraded(timedOut ? 'upstream_timeout' : message, timedOut ? 504 : 502);
  }
});
