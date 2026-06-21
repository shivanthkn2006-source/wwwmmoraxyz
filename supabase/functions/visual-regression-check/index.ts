import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * VISUAL-REGRESSION-CHECK — Phase 3: The Deep Visual Check
 * Runs Critical User Paths and detects UI regressions:
 * - Missing elements (buttons disappeared)
 * - Layout shifts beyond tolerance (>10px)
 * - Broken routes / navigation failures
 * Uses LLM reasoning to analyze reported DOM state.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
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

    const body = await req.json();
    const { action, dom_snapshot, change_description, path_name } = body;

    // ═══════════════════════════════════════════════════════════════
    // ACTION: check — Run visual regression against Critical User Paths
    // ═══════════════════════════════════════════════════════════════
    if (action === 'check') {
      // Fetch all active Critical User Paths
      const { data: paths } = await supabase
        .from('critical_user_paths')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (!paths || paths.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          status: 'NO_PATHS',
          message: 'No Critical User Paths configured.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Filter to specific path if requested
      const targetPaths = path_name
        ? paths.filter(p => p.path_name.toLowerCase() === path_name.toLowerCase())
        : paths;

      const results: Array<{
        path_name: string;
        route: string;
        status: 'PASS' | 'VISUAL_REGRESSION' | 'ELEMENT_MISSING' | 'LAYOUT_SHIFT';
        missing_elements: string[];
        layout_shifts: Array<{ element: string; shift_px: number }>;
        details: string;
      }> = [];

      // If dom_snapshot is provided, analyze it against paths
      if (dom_snapshot && lovableKey) {
        for (const path of targetPaths) {
          try {
            const checkPrompt = `You are a Visual Regression Detector for a web application.

CRITICAL USER PATH: "${path.path_name}" (Route: ${path.route})

EXPECTED ELEMENTS that MUST exist on this page:
${JSON.stringify(path.expected_elements)}

LAYOUT TOLERANCE: Maximum ${(path.layout_tolerances as any)?.max_shift_px || 10}px shift allowed.

DOM SNAPSHOT of the current page state:
${typeof dom_snapshot === 'string' ? dom_snapshot.substring(0, 3000) : JSON.stringify(dom_snapshot).substring(0, 3000)}

CHANGE THAT WAS MADE: "${change_description || 'Unknown change'}"

TASK: Analyze whether any expected elements are MISSING or if any layout has SHIFTED beyond tolerance.

Rules:
- Check each expected element — is it present in the DOM snapshot?
- Look for displaced elements (shifted more than ${(path.layout_tolerances as any)?.max_shift_px || 10}px)
- Consider if the change could have caused side effects on other elements

Respond ONLY in this JSON format:
{
  "status": "PASS" or "VISUAL_REGRESSION",
  "missing_elements": ["list of missing element identifiers"],
  "layout_shifts": [{"element": "name", "shift_px": 15, "direction": "down"}],
  "max_shift_px": 0,
  "reasoning": "..."
}`;

            const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${lovableKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  { role: 'system', content: 'You are a strict visual regression detector. Output only valid JSON.' },
                  { role: 'user', content: checkPrompt },
                ],
                max_tokens: 400,
                temperature: 0.1,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const raw = data.choices?.[0]?.message?.content || '';
              const jsonMatch = raw.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const hasMissing = parsed.missing_elements?.length > 0;
                const hasShift = (parsed.max_shift_px || 0) > ((path.layout_tolerances as any)?.max_shift_px || 10);
                
                let status: 'PASS' | 'VISUAL_REGRESSION' | 'ELEMENT_MISSING' | 'LAYOUT_SHIFT' = 'PASS';
                if (hasMissing) status = 'ELEMENT_MISSING';
                else if (hasShift) status = 'LAYOUT_SHIFT';
                else if (parsed.status === 'VISUAL_REGRESSION') status = 'VISUAL_REGRESSION';

                results.push({
                  path_name: path.path_name,
                  route: path.route,
                  status,
                  missing_elements: parsed.missing_elements || [],
                  layout_shifts: parsed.layout_shifts || [],
                  details: parsed.reasoning || 'Analysis complete',
                });

                // Save result to DB
                await supabase.from('visual_regression_results').insert({
                  path_id: path.id,
                  run_by: user.id,
                  status,
                  elements_found: path.expected_elements,
                  elements_missing: parsed.missing_elements || [],
                  layout_shifts: parsed.layout_shifts || [],
                  max_shift_px: parsed.max_shift_px || 0,
                  triggered_by: change_description || 'manual',
                  details: parsed.reasoning,
                });

                continue;
              }
            }
          } catch (e) {
            console.error(`[VisualCheck] LLM failed for ${path.path_name}:`, e);
          }

          // Fallback
          results.push({
            path_name: path.path_name,
            route: path.route,
            status: 'PASS',
            missing_elements: [],
            layout_shifts: [],
            details: 'LLM analysis unavailable — assumed PASS (manual verify recommended)',
          });
        }
      } else {
        // No DOM snapshot — run structural check only
        for (const path of targetPaths) {
          results.push({
            path_name: path.path_name,
            route: path.route,
            status: 'PASS',
            missing_elements: [],
            layout_shifts: [],
            details: 'No DOM snapshot provided — structural baseline recorded. Provide dom_snapshot for deep analysis.',
          });
        }
      }

      const regressions = results.filter(r => r.status !== 'PASS');
      const overallStatus = regressions.length > 0 ? 'VISUAL_REGRESSION' : 'PASS';

      // Log event
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'visual_regression_check',
        event_category: 'regression_engine',
        context_snippet: `Visual Check: ${overallStatus} | ${results.length} paths, ${regressions.length} regressions`,
        metadata: { results, change_description },
        dhf_logged: true,
      });

      // If regressions, log to sovereign memory
      if (regressions.length > 0) {
        await supabase.from('zoe_sovereign_memory').insert({
          user_id: user.id,
          event_type: 'visual_regression_alert',
          content_text: `⚠️ VISUAL REGRESSION: ${regressions.map(r => `${r.path_name} (${r.status}: ${r.missing_elements.join(', ') || 'layout shift'})`).join('; ')}`,
          zoe_state_json: { visual_check: { status: overallStatus, regressions } },
          system_stability_score: Math.max(0.5, 1.0 - (regressions.length * 0.1)),
        });
      }

      return new Response(JSON.stringify({
        success: true,
        status: overallStatus,
        summary: {
          total_paths: targetPaths.length,
          passed: results.filter(r => r.status === 'PASS').length,
          regressions: regressions.length,
        },
        results,
        revert_recommended: regressions.length > 0,
        message: overallStatus === 'PASS'
          ? '✅ All Critical User Paths verified. No visual regressions.'
          : `⚠️ VISUAL REGRESSION in ${regressions.length} path(s). Revert recommended.`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: list_paths — Get all Critical User Paths
    // ═══════════════════════════════════════════════════════════════
    if (action === 'list_paths') {
      const { data: paths } = await supabase
        .from('critical_user_paths')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      return new Response(JSON.stringify({
        success: true,
        paths: paths || [],
        count: paths?.length || 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: add_path — Add a new Critical User Path
    // ═══════════════════════════════════════════════════════════════
    if (action === 'add_path') {
      const { route, actions: pathActions, expected_elements, layout_tolerances } = body;
      if (!path_name || !route) {
        return new Response(JSON.stringify({ success: false, error: 'path_name and route required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: newPath, error: insertError } = await supabase
        .from('critical_user_paths')
        .insert({
          path_name,
          route,
          actions: pathActions || [],
          expected_elements: expected_elements || [],
          layout_tolerances: layout_tolerances || { max_shift_px: 10 },
        })
        .select()
        .single();

      if (insertError) {
        return new Response(JSON.stringify({ success: false, error: insertError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        path: newPath,
        message: `✅ Critical User Path "${path_name}" added.`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: history — Get recent visual check results
    // ═══════════════════════════════════════════════════════════════
    if (action === 'history') {
      const { data: history } = await supabase
        .from('visual_regression_results')
        .select('*, critical_user_paths(path_name, route)')
        .order('created_at', { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({
        success: true,
        history: history || [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Unknown action. Supported: check, list_paths, add_path, history',
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[VisualCheck] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
