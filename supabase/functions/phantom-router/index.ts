import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-phantom-key, x-route-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Ghost Network: Dynamic API routing with decoy endpoints
// This creates a "maze" of endpoints that change every hour

interface PhantomRoute {
  realEndpoint: string;
  phantomKey: string;
  expiresAt: number;
  decoyPaths: string[];
}

// Generate time-based phantom key (changes every hour)
function generatePhantomKey(): string {
  const hourBlock = Math.floor(Date.now() / 3600000);
  const seed = `zoe-phantom-${hourBlock}-${Deno.env.get('SUPABASE_PROJECT_REF') || 'local'}`;
  // Simple hash for obfuscation
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `ph_${Math.abs(hash).toString(36)}_${hourBlock.toString(36)}`;
}

// Generate decoy paths (fake endpoints)
function generateDecoyPaths(count: number = 50): string[] {
  const prefixes = ['api', 'v1', 'v2', 'data', 'sync', 'auth', 'user', 'core', 'service', 'node'];
  const suffixes = ['get', 'post', 'fetch', 'update', 'query', 'stream', 'batch', 'process'];
  const decoys: string[] = [];
  
  const hourBlock = Math.floor(Date.now() / 3600000);
  
  for (let i = 0; i < count; i++) {
    const prefix = prefixes[(i + hourBlock) % prefixes.length];
    const suffix = suffixes[(i * 3 + hourBlock) % suffixes.length];
    const randomId = ((hourBlock * (i + 1)) % 99999).toString(36);
    decoys.push(`/${prefix}/${suffix}/${randomId}`);
  }
  
  return decoys;
}

// Route mapping (real endpoints hidden behind phantom keys)
const ROUTE_MAP: Record<string, string> = {
  'zoe-core': 'zoe-core-intelligence',
  'phoenix': 'dhf-visualization',
  'soul': 'process-dhf-asset',
  'ghost': 'zoe-chat',
  'sentinel': 'zoe-sentinel',
  'god': 'zoe-god-mode',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const authToken = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = new URL(req.url);
    const phantomKey = req.headers.get('x-phantom-key');
    const routeToken = req.headers.get('x-route-token');
    const requestedPath = url.pathname.split('/').pop();
    
    // Parse body for action-based requests
    let body: { action?: string } = {};
    try {
      if (req.method === 'POST') {
        body = await req.json();
      }
    } catch {
      // Ignore JSON parse errors
    }

    // Validate phantom key (time-based)
    const validPhantomKey = generatePhantomKey();
    
    // Generate current decoys for confusion
    const currentDecoys = generateDecoyPaths(100);
    
    // Handle "connect" action - allows unauthenticated users to connect gracefully
    if (body.action === 'connect') {
      return new Response(
        JSON.stringify({ 
          status: 'GHOST_MESH_ONLINE',
          connected: true,
          phantomKey: validPhantomKey,
          expiresIn: 3600 - (Math.floor(Date.now() / 1000) % 3600),
          mode: 'PUBLIC_MESH'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if this is a decoy path (return fake 404 with delay)
    if (requestedPath && currentDecoys.some(d => d.includes(requestedPath))) {
      // Random delay to simulate real processing
      await new Promise(r => setTimeout(r, Math.random() * 500 + 100));
      return new Response(
        JSON.stringify({ error: 'Endpoint not found', code: 'E_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If requesting route info (authenticated)
    if (requestedPath === 'routes' || requestedPath === 'phantom-router') {
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader) {
        // Return public response for unauthenticated
        return new Response(
          JSON.stringify({ 
            status: 'active',
            decoys: currentDecoys.slice(0, 10), // Only show some decoys
            phantomKey: validPhantomKey,
            expiresIn: 3600 - (Math.floor(Date.now() / 1000) % 3600),
            routeMap: Object.keys(ROUTE_MAP).reduce((acc, key) => {
              acc[key] = `phantom_${key}_${validPhantomKey.slice(-8)}`;
              return acc;
            }, {} as Record<string, string>)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Authenticated - return real route map
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log phantom route access
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'phantom_route_access',
        event_category: 'security',
        metadata: { phantomKey: validPhantomKey, timestamp: Date.now() }
      });

      return new Response(
        JSON.stringify({
          status: 'authenticated',
          phantomKey: validPhantomKey,
          expiresIn: 3600 - (Math.floor(Date.now() / 1000) % 3600),
          routeMap: ROUTE_MAP,
          decoyCount: currentDecoys.length,
          securityLevel: 'GHOST_MESH_ACTIVE'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Proxy to real endpoint if phantom key matches
    if (phantomKey === validPhantomKey && routeToken && ROUTE_MAP[routeToken]) {
      const realEndpoint = ROUTE_MAP[routeToken];
      console.log(`[Phantom Router] Routing ${routeToken} -> ${realEndpoint}`);
      
      return new Response(
        JSON.stringify({ 
          routed: true, 
          target: realEndpoint,
          message: 'Use supabase.functions.invoke() with the target endpoint'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: return maze status
    return new Response(
      JSON.stringify({
        status: 'GHOST_MESH_ONLINE',
        nodes: 47,
        activeDecoys: currentDecoys.length,
        message: 'Phantom Router is protecting Zoe Core'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Phantom Router] Error:', error);
    // Even errors are obfuscated
    return new Response(
      JSON.stringify({ error: 'Route processing failed', code: 'E_PHANTOM' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
