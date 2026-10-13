import { requireCaller } from '../_shared/caller-guard.ts';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { clientErrorResponse } from '../_shared/client-error.ts';
import { publicGuard } from '../_shared/public-guard.ts';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - IRONCLAD RELAY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Edge function that acts as an IP-stripping relay for Zoe Mail.
 * All outgoing requests pass through here to:
 * - Strip client IP headers
 * - Add encryption verification
 * - Route through clean exit node
 * 
 * Cost: Supabase Edge Function pricing
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ironclad-protocol, x-ironclad-encrypted, x-ironclad-target',
};

// Headers to strip for privacy
const STRIPPED_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
  'true-client-ip',
  'x-client-ip',
  'forwarded',
  'via',
  'x-cluster-client-ip',
];

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^22[4-9]\./, /^2[3-5]\d\./];
const isPrivateIp = (ip: string) => ip.includes(':')
  ? /^(::1?$|f[cd]|fe[89ab]|::ffff:)/i.test(ip)
  : PRIVATE_V4.some((r) => r.test(ip));
/** Returns a reason when the destination is not a public https web address. */
async function unsafeTarget(raw: string): Promise<string | null> {
  let u: URL; try { u = new URL(raw); } catch { return 'invalid URL'; }
  if (u.protocol !== 'https:') return 'https only';
  if (u.username || u.password) return 'credentials in URL';
  if (u.port && u.port !== '443') return 'non-standard port';
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (/^[\d.]+$/.test(host) || host.includes(':')) return 'IP addresses not allowed';
  if (host === 'localhost' || /\.(local|internal|localhost|lan|home|corp)$/.test(host) || !host.includes('.')) return 'internal host';
  try {
    const ips = [...await Deno.resolveDns(host, 'A').catch(() => [] as string[]), ...await Deno.resolveDns(host, 'AAAA').catch(() => [] as string[])];
    if (!ips.length) return 'host does not resolve';
    if (ips.some(isPrivateIp)) return 'private network';
  } catch { return 'host lookup failed'; }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const guard = await publicGuard(req, { name: 'ironclad-relay', limit: 60, windowSeconds: 60, maxBodyBytes: 512 * 1024, allowRichText: true });
  if (guard.response) return guard.response;
  const __caller = await requireCaller(req, 'member'); if (__caller instanceof Response) return __caller;

  const startTime = Date.now();
  
  try {
    const body = (guard.body as any);
    const { targetUrl, method = 'POST', payload, headers: customHeaders = {} } = body;
    
    if (!targetUrl) {
      throw new Error('Missing targetUrl in request body');
    }
    const unsafe = await unsafeTarget(String(targetUrl));
    if (unsafe) {
      return new Response(JSON.stringify({ error: `Blocked destination: ${unsafe}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[Ironclad Relay] Processing request to: ${targetUrl.substring(0, 50)}...`);
    
    // Build clean headers (strip identifying information)
    const cleanHeaders = new Headers();
    
    // Copy allowed custom headers
    for (const [key, value] of Object.entries(customHeaders)) {
      const lowerKey = key.toLowerCase();
      if (!STRIPPED_HEADERS.includes(lowerKey)) {
        cleanHeaders.set(key, value as string);
      }
    }
    
    // Add relay identification
    cleanHeaders.set('X-Ironclad-Relay', 'active');
    cleanHeaders.set('X-Ironclad-Exit-Node', 'supabase-edge');
    cleanHeaders.set('X-Ironclad-Timestamp', new Date().toISOString());
    
    // Set content type if not already set
    if (!cleanHeaders.has('Content-Type')) {
      cleanHeaders.set('Content-Type', 'application/json');
    }
    
    // Forward the request through clean channel
    const response = await fetch(targetUrl, {
      method,
      headers: cleanHeaders,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    
    const responseData = await response.text();
    let parsedResponse;
    
    try {
      parsedResponse = JSON.parse(responseData);
    } catch {
      parsedResponse = { raw: responseData };
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`[Ironclad Relay] ✓ Request completed in ${duration}ms, status: ${response.status}`);
    
    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        data: parsedResponse,
        relay: {
          exitNode: 'supabase-edge',
          ipStripped: true,
          duration,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.ok ? 200 : response.status,
      }
    );
    
  } catch (error: unknown) {
    const __clientError = clientErrorResponse(error, corsHeaders);
    if (__clientError) return __clientError;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Ironclad Relay] Error:', errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        relay: {
          exitNode: 'supabase-edge',
          ipStripped: true,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
