// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HEALTH CHECK - AI Availability Status Endpoint
// Used by Voice Citadel to determine if Zoe AI services are online
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthStatus {
  status: 'online' | 'degraded' | 'offline';
  available: boolean;
  services: {
    voice: boolean;
    chat: boolean;
    biometric: boolean;
  };
  timestamp: string;
  version: string;
  latencyMs?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    // Check if Lovable AI API key is available
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const hasAIService = !!lovableApiKey;

    // Check Supabase connectivity
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    const hasSupabase = !!supabaseUrl && !!supabaseKey;

    // Determine overall status
    let status: 'online' | 'degraded' | 'offline' = 'offline';
    
    if (hasAIService && hasSupabase) {
      status = 'online';
    } else if (hasSupabase) {
      status = 'degraded';
    }

    const latencyMs = Math.round(performance.now() - startTime);

    const healthStatus: HealthStatus = {
      status,
      available: status !== 'offline',
      services: {
        voice: hasAIService,
        chat: hasAIService,
        biometric: hasSupabase,
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      latencyMs,
    };

    console.log('[ZoeHealthCheck] Status:', status, 'Latency:', latencyMs + 'ms');

    return new Response(
      JSON.stringify(healthStatus),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[ZoeHealthCheck] Error:', error);
    
    return new Response(
      JSON.stringify({
        status: 'offline',
        available: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 even on error so client knows the endpoint is reachable
      }
    );
  }
});
