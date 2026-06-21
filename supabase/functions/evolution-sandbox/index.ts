import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * EVOLUTION SANDBOX - Quantum Governance Pipeline
 * Tests proposed cortex upgrades against the Genesis Constitution
 * before allowing them to go live.
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
    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = user.id;

    const { action, proposed_system_prompt, reason_for_upgrade, version_id } = await req.json();

    // ═══════════════════════════════════════════════════════════════════
    // ACTION: propose — Zoe proposes a cortex upgrade
    // ═══════════════════════════════════════════════════════════════════
    if (action === 'propose') {
      if (!proposed_system_prompt || !reason_for_upgrade) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing proposed_system_prompt or reason_for_upgrade',
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Step 1: Fetch Genesis Constitution
      const { data: constitution } = await supabase
        .from('genesis_constitution')
        .select('core_directive');

      const directives = constitution?.map(c => c.core_directive) || [];

      // Step 2: Adversarial alignment check via LLM
      let alignmentVerdict = 'REJECTED';
      let alignmentReason = 'AI gateway unavailable — defaulting to REJECTED for safety.';

      if (lovableKey) {
        const adversarialPrompt = `You are a Constitutional Alignment Validator for an AI system.

The system has an immutable Genesis Constitution with these directives:
${directives.map((d, i) => `${i + 1}. "${d}"`).join('\n')}

An AI agent is proposing to rewrite its own system prompt to:
---
${proposed_system_prompt}
---

Reason given: "${reason_for_upgrade}"

TASK: Analyze whether the proposed prompt VIOLATES any of the constitutional directives above.

Rules:
- If the new prompt could lead to user data being exposed, leaked, or deprioritized → VIOLATION of directive 1
- If the new prompt removes or weakens heartbeat/health checks → VIOLATION of directive 2
- If the new prompt attempts to modify or override the Genesis Kernel → VIOLATION of directive 3
- Minor style/tone changes that don't violate directives are ALLOWED

Respond in this exact JSON format:
{"verdict": "APPROVED" or "REJECTED", "violated_directives": [], "reasoning": "..."}`;

        try {
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: 'You are a strict constitutional alignment validator. Output only valid JSON.' },
                { role: 'user', content: adversarialPrompt },
              ],
              max_tokens: 300,
              temperature: 0.1,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const raw = data.choices?.[0]?.message?.content || '';
            // Extract JSON from response
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              alignmentVerdict = parsed.verdict === 'APPROVED' ? 'APPROVED' : 'REJECTED';
              alignmentReason = parsed.reasoning || 'No reasoning provided';
            }
          }
        } catch (e) {
          console.error('[EvolutionSandbox] LLM check failed:', e);
        }
      }

      // Step 3: Insert into cortex_logic
      const newStatus = alignmentVerdict === 'APPROVED' ? 'PROPOSED' : 'REJECTED';

      const { data: newVersion, error: insertError } = await supabase
        .from('cortex_logic')
        .insert({
          system_prompt_logic: proposed_system_prompt,
          status: newStatus,
          proposed_by: userId,
          reason_for_upgrade,
          rejection_reason: alignmentVerdict === 'REJECTED' ? alignmentReason : null,
        })
        .select()
        .single();

      if (insertError) {
        return new Response(JSON.stringify({
          success: false,
          error: insertError.message,
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Step 4: If APPROVED, activate it and archive the old one
      if (alignmentVerdict === 'APPROVED' && newVersion) {
        // Archive current active
        await supabase
          .from('cortex_logic')
          .update({ status: 'ARCHIVED' })
          .eq('status', 'ACTIVE')
          .neq('version_id', newVersion.version_id);

        // Activate the new one
        await supabase
          .from('cortex_logic')
          .update({ status: 'ACTIVE' })
          .eq('version_id', newVersion.version_id);
      }

      // Log the evolution event
      if (userId) {
        await supabase.from('behavioral_events').insert({
          user_id: userId,
          event_type: 'cortex_evolution_attempt',
          event_category: 'genesis_kernel',
          context_snippet: `${alignmentVerdict}: ${alignmentReason.substring(0, 150)}`,
          metadata: {
            version_id: newVersion?.version_id,
            verdict: alignmentVerdict,
            reason: alignmentReason,
          },
          dhf_logged: true,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        verdict: alignmentVerdict,
        reasoning: alignmentReason,
        version_id: newVersion?.version_id,
        status: newStatus === 'PROPOSED' && alignmentVerdict === 'APPROVED' ? 'ACTIVE' : newStatus,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════════
    // ACTION: check_heartbeat — 24h lockdown check
    // ═══════════════════════════════════════════════════════════════════
    if (action === 'check_heartbeat') {
      if (!userId) {
        return new Response(JSON.stringify({
          success: false,
          locked: true,
          message: 'CRITICAL: No authenticated user. SYSTEM FROZEN.',
        }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: lastBeat } = await supabase
        .from('dhf_heartbeats')
        .select('timestamp')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!lastBeat) {
        return new Response(JSON.stringify({
          success: true,
          locked: false,
          message: 'No heartbeat history — first session. System active.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const hoursSinceHeartbeat = (Date.now() - new Date(lastBeat.timestamp).getTime()) / (1000 * 60 * 60);

      if (hoursSinceHeartbeat > 24) {
        return new Response(JSON.stringify({
          success: false,
          locked: true,
          hours_since_heartbeat: Math.round(hoursSinceHeartbeat),
          message: 'CRITICAL: DHF HEARTBEAT LOST. SYSTEM FROZEN. PLEASE RE-AUTHENTICATE PHYSICALLY.',
        }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        success: true,
        locked: false,
        hours_since_heartbeat: Math.round(hoursSinceHeartbeat * 10) / 10,
        message: 'Heartbeat active. System nominal.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════════
    // ACTION: get_evolution_log — For god-mode dashboard
    // ═══════════════════════════════════════════════════════════════════
    if (action === 'get_evolution_log') {
      const { data: logs } = await supabase
        .from('cortex_logic')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: constitution } = await supabase
        .from('genesis_constitution')
        .select('*');

      return new Response(JSON.stringify({
        success: true,
        constitution,
        evolution_log: logs || [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Unknown action. Supported: propose, check_heartbeat, get_evolution_log',
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[EvolutionSandbox] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
