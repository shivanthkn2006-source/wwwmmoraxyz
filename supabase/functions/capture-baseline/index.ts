import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * CAPTURE-BASELINE — Phase 1: The Golden Record
 * Records the "correct behavior" snapshot for a feature.
 * Called when user confirms "this feature works perfectly."
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, feature_name, test_input, expected_output, screenshot_url, notes, version_tag } = await req.json();

    // ── ACTION: capture — Save a baseline snapshot ──
    if (action === 'capture') {
      if (!feature_name) {
        return new Response(JSON.stringify({ success: false, error: 'feature_name is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Deactivate any previous baseline for this feature
      await supabase
        .from('regression_snapshots')
        .update({ is_baseline: false })
        .eq('feature_name', feature_name)
        .eq('is_baseline', true);

      // Insert new baseline
      const { data: snapshot, error: insertError } = await supabase
        .from('regression_snapshots')
        .insert({
          feature_name,
          test_input: test_input || {},
          expected_output: expected_output || {},
          screenshot_url: screenshot_url || null,
          is_baseline: true,
          captured_by: user.id,
          notes: notes || null,
          version_tag: version_tag || `v${Date.now()}`,
        })
        .select()
        .single();

      if (insertError) {
        return new Response(JSON.stringify({ success: false, error: insertError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log to behavioral events for DHF tracking
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'baseline_captured',
        event_category: 'regression_engine',
        context_snippet: `Golden Record: ${feature_name}`,
        metadata: { snapshot_id: snapshot.id, feature_name },
        dhf_logged: true,
      });

      return new Response(JSON.stringify({
        success: true,
        snapshot_id: snapshot.id,
        feature_name,
        message: `✅ Golden Record captured for "${feature_name}". This is now the baseline truth.`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── ACTION: list — Get all baselines ──
    if (action === 'list') {
      const { data: baselines } = await supabase
        .from('regression_snapshots')
        .select('*')
        .eq('is_baseline', true)
        .order('created_at', { ascending: false });

      return new Response(JSON.stringify({
        success: true,
        baselines: baselines || [],
        count: baselines?.length || 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── ACTION: get — Get baseline for specific feature ──
    if (action === 'get') {
      if (!feature_name) {
        return new Response(JSON.stringify({ success: false, error: 'feature_name required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: baseline } = await supabase
        .from('regression_snapshots')
        .select('*')
        .eq('feature_name', feature_name)
        .eq('is_baseline', true)
        .single();

      return new Response(JSON.stringify({
        success: true,
        baseline: baseline || null,
        exists: !!baseline,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Unknown action. Supported: capture, list, get',
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[CaptureBaseline] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
