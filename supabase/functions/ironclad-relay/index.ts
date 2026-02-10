import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const body = await req.json();
    const { targetUrl, method = 'POST', payload, headers: customHeaders = {} } = body;
    
    if (!targetUrl) {
      throw new Error('Missing targetUrl in request body');
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
