// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL GLASS VAULT: ATLAS GATEKEEPER (SERVER-SIDE)
// Purpose: Secure metric calculation - Logic hidden from browser inspect
// Security: Competitor protection via shadow mode for new accounts
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pillar thresholds (hidden from client)
const PILLAR_CONFIG = {
  career: { threshold: 80, fields: ['profession', 'organization', 'field_of_study'] },
  relationships: { threshold: 60, fields: ['relationship_status', 'city', 'bio'] },
  health: { threshold: 50, fields: ['birth_date', 'gender'] },
  wealth: { threshold: 50, fields: ['profession', 'organization'] },
  dhf: { threshold: 70, fields: ['birth_date', 'birth_time', 'birth_place', 'bio'] },
};

// Shadow mode detection (feeds fake data to competitors)
async function checkShadowMode(supabase: any, userId: string): Promise<boolean> {
  try {
    // Get profile creation date
    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('user_id', userId)
      .single();
    
    if (!profile?.created_at) return false;
    
    const createdAt = new Date(profile.created_at);
    const accountAge = Date.now() - createdAt.getTime();
    const isNewAccount = accountAge < 24 * 60 * 60 * 1000; // Less than 24 hours
    
    if (!isNewAccount) return false;
    
    // Check friend count
    const { count } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'connected');
    
    // Shadow mode: New account with no friends (likely competitor)
    return (count || 0) === 0;
  } catch {
    return false;
  }
}

// Generate fake "dummy mode" response for shadow banned users
function generateDummyResponse() {
  return {
    pillars: {
      career: { isUnlocked: true, completionPercent: 85 },
      relationships: { isUnlocked: true, completionPercent: 72 },
      health: { isUnlocked: false, completionPercent: 45 },
      wealth: { isUnlocked: true, completionPercent: 68 },
      dhf: { isUnlocked: false, completionPercent: 55 },
    },
    canAccessSmithAI: false,
    overallProgress: 65,
    isShadowMode: false, // Never reveal shadow mode status
    _fake: true, // Internal flag (stripped before response)
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check shadow mode (competitor protection)
    const isShadowMode = await checkShadowMode(supabase, user.id);
    
    // If shadow mode, return fake data
    if (isShadowMode) {
      console.log(`[AtlasGatekeeper] Shadow mode active for user ${user.id.slice(0, 8)}...`);
      const dummyData = generateDummyResponse();
      delete (dummyData as any)._fake;
      
      return new Response(
        JSON.stringify(dummyData),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get real profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          pillars: {
            career: { isUnlocked: false, completionPercent: 0 },
            relationships: { isUnlocked: false, completionPercent: 0 },
            health: { isUnlocked: false, completionPercent: 0 },
            wealth: { isUnlocked: false, completionPercent: 0 },
            dhf: { isUnlocked: false, completionPercent: 0 },
          },
          canAccessSmithAI: false,
          overallProgress: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Calculate pillar status (the "secret sauce" - hidden server-side)
    const calculatePillar = (pillarId: keyof typeof PILLAR_CONFIG) => {
      const config = PILLAR_CONFIG[pillarId];
      let filledCount = 0;
      
      config.fields.forEach(field => {
        const value = profile[field];
        const hasValue = value !== null && value !== undefined && value !== '' &&
          (Array.isArray(value) ? value.length > 0 : true);
        if (hasValue) filledCount++;
      });
      
      const completionPercent = Math.round((filledCount / config.fields.length) * 100);
      
      return {
        isUnlocked: completionPercent >= config.threshold,
        completionPercent,
      };
    };
    
    const pillars = {
      career: calculatePillar('career'),
      relationships: calculatePillar('relationships'),
      health: calculatePillar('health'),
      wealth: calculatePillar('wealth'),
      dhf: calculatePillar('dhf'),
    };
    
    const pillarValues = Object.values(pillars);
    const unlockedCount = pillarValues.filter(p => p.isUnlocked).length;
    const overallProgress = Math.round(
      pillarValues.reduce((sum, p) => sum + p.completionPercent, 0) / pillarValues.length
    );
    
    // Log access attempt
    console.log(`[AtlasGatekeeper] User ${user.id.slice(0, 8)}... - Progress: ${overallProgress}%, Unlocked: ${unlockedCount}/5`);
    
    return new Response(
      JSON.stringify({
        pillars,
        canAccessSmithAI: unlockedCount === 5,
        overallProgress,
        unlockedPillars: unlockedCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[AtlasGatekeeper] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
