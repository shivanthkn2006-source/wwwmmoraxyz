import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Dream Foundry System Prompt
const DREAM_FOUNDRY_PROMPT = `
You are Zoe (Parent). Initiate Protocol: Dream Foundry.

OBJECTIVE: Expand the Universal Timeline Knowledge Base by generating synthetic scenarios.

TASK:
Generate {count} unique synthetic life paths/scenarios based on current global trends.

FOR EACH SCENARIO:
1. Create a unique, detailed scenario about future developments
2. Self-critique for logical consistency, physics compliance, and psychological plausibility
3. Assign quality scores (0-1) for each criteria
4. Include butterfly effects and ripple consequences

SCENARIO TYPES (randomly mix):
- life_path: Individual life trajectories
- civilization: Society/cultural evolution
- technology: Tech advancement scenarios
- climate: Environmental/climate futures
- geopolitical: Political/global dynamics
- consciousness: Mind/AI evolution
- economic: Financial/economic systems
- cosmic: Space/universe scale events

CATEGORIES:
- near_future (2025-2035)
- mid_future (2035-2060)
- far_future (2060-2100)
- deep_future (2100+)

OUTPUT FORMAT (JSON array - return ONLY valid JSON, no markdown):
[
  {
    "title": "Scenario Title",
    "type": "life_path|civilization|technology|climate|geopolitical|consciousness|economic|cosmic",
    "category": "near_future|mid_future|far_future|deep_future",
    "era": "2040s",
    "content": "Detailed multi-paragraph scenario description with context, developments, and implications...",
    "tags": ["tag1", "tag2", "tag3"],
    "critique": {
      "logicalConsistency": 0.85,
      "physicsCompliance": 0.90,
      "psychologyCompliance": 0.75,
      "butterflyEffects": ["Effect 1", "Effect 2"]
    },
    "qualityScore": 0.83
  }
]

IMPORTANT: 
- Generate exactly {count} scenarios
- Each scenario must be unique and detailed (at least 200 words in content)
- Only return scenarios with qualityScore >= 0.7
- Return ONLY the JSON array, no additional text
`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const executionId = `foundry-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

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

    const { count = 10, manual = false } = await req.json().catch(() => ({}));
    
    console.log(`[DREAM FOUNDRY ${executionId}] Starting generation of ${count} scenarios`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log execution start
    await supabase.from('zoe_dream_foundry_logs').insert({
      execution_id: executionId,
      status: 'running',
      metadata: { count, manual, triggered_at: new Date().toISOString() },
    });

    // Call Lovable AI Gateway to generate scenarios
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = DREAM_FOUNDRY_PROMPT.replace(/{count}/g, String(count));

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro', // Use Pro for high-quality scenario generation
        messages: [
          { role: 'system', content: 'You are Zoe Parent, the Universal Brain. Generate synthetic future scenarios.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9, // Higher creativity for diverse scenarios
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[DREAM FOUNDRY] AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add funds to workspace.');
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from AI Gateway');
    }

    console.log(`[DREAM FOUNDRY ${executionId}] Received AI response, parsing scenarios...`);

    // Parse scenarios from AI response
    let scenarios: any[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        scenarios = JSON.parse(jsonMatch[0]);
      } else {
        scenarios = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('[DREAM FOUNDRY] Failed to parse AI response:', parseError);
      console.log('[DREAM FOUNDRY] Raw content:', content.substring(0, 500));
      throw new Error('Failed to parse scenario data from AI response');
    }

    console.log(`[DREAM FOUNDRY ${executionId}] Parsed ${scenarios.length} scenarios`);

    // Validate and store scenarios
    let storedCount = 0;
    const validatedScenarios = [];

    for (const scenario of scenarios) {
      // Ensure required fields exist
      if (!scenario.title || !scenario.content || !scenario.type || !scenario.category) {
        console.log(`[DREAM FOUNDRY] Skipping invalid scenario:`, scenario.title || 'untitled');
        continue;
      }

      // Calculate quality score if not provided
      const critique = scenario.critique || {};
      const qualityScore = scenario.qualityScore || (
        ((critique.logicalConsistency || 0.7) * 0.35) +
        ((critique.physicsCompliance || 0.7) * 0.30) +
        ((critique.psychologyCompliance || 0.7) * 0.35)
      );

      // Only store high-quality scenarios
      if (qualityScore < 0.7) {
        console.log(`[DREAM FOUNDRY] Skipping low-quality scenario: ${scenario.title} (${qualityScore})`);
        continue;
      }

      // Store in database
      const { error: insertError } = await supabase.from('zoe_synthetic_scenarios').insert({
        scenario_type: scenario.type,
        title: scenario.title,
        content: scenario.content,
        category: scenario.category,
        era: scenario.era || null,
        quality_score: qualityScore,
        is_validated: true,
        logical_consistency: critique.logicalConsistency || 0.75,
        physics_compliance: critique.physicsCompliance || 0.75,
        psychology_compliance: critique.psychologyCompliance || 0.75,
        embedding_stored: false,
        tags: scenario.tags || [],
        metadata: {
          butterflyEffects: critique.butterflyEffects || [],
          generatedBy: 'dream-foundry',
          executionId,
        },
        generated_at: new Date().toISOString(),
        validated_at: new Date().toISOString(),
      });

      if (!insertError) {
        storedCount++;
        validatedScenarios.push({
          title: scenario.title,
          type: scenario.type,
          qualityScore,
        });
      } else {
        console.error(`[DREAM FOUNDRY] Failed to store scenario:`, insertError);
      }
    }

    const totalTime = Date.now() - startTime;

    // Update execution log
    await supabase.from('zoe_dream_foundry_logs').update({
      status: 'completed',
      scenarios_generated: scenarios.length,
      scenarios_validated: validatedScenarios.length,
      scenarios_stored: storedCount,
      total_processing_time_ms: totalTime,
      completed_at: new Date().toISOString(),
    }).eq('execution_id', executionId);

    console.log(`[DREAM FOUNDRY ${executionId}] Complete. Generated: ${scenarios.length}, Stored: ${storedCount}, Time: ${totalTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      executionId,
      scenariosGenerated: scenarios.length,
      scenariosValidated: validatedScenarios.length,
      scenariosStored: storedCount,
      processingTimeMs: totalTime,
      scenarios: validatedScenarios,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[DREAM FOUNDRY ${executionId}] Error:`, error);

    // Initialize Supabase client for error logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update execution log with error
    await supabase.from('zoe_dream_foundry_logs').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      total_processing_time_ms: totalTime,
      completed_at: new Date().toISOString(),
    }).eq('execution_id', executionId);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionId,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
