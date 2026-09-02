import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bound the upstream call: OpenSky's anonymous tier can hang far past the edge
// worker budget, pinning a worker per request.
const UPSTREAM_TIMEOUT_MS = 8000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const degraded = (reason: string, status: number) =>
    new Response(
      JSON.stringify({ ok: false, degraded: true, reason, time: Math.floor(Date.now() / 1000), states: [] }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  try {
    const openSkyUrl =
      "https://opensky-network.org/api/states/all?lamin=20.0&lomin=-130.0&lamax=60.0&lomax=20.0";

    const res = await fetch(openSkyUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!res.ok) {
      await res.body?.cancel();
      return degraded(`upstream_${res.status}`, res.status === 429 ? 429 : 502);
    }

    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, degraded: false, ...data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("[opensky-proxy] Error:", message);
    return degraded(timedOut ? "upstream_timeout" : message, timedOut ? 504 : 502);
  }
});
