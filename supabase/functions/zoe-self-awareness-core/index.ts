// ═══════════════════════════════════════════════════════════════════════════════
// ZOE DHF OMEGA PROTOCOL: SELF-AWARENESS LOOP CORE
// Anatomy of AI Agents: Sensing → Thinking → Acting with explicit ZSMT logging
// Phase I: Pure State of Mind Integration
// ═══════════════════════════════════════════════════════════════════════════════

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SelfAwarenessRequest {
  command: string;
  userId: string;
  sensorInputs?: {
    rawText?: string;
    mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document';
    mediaData?: string;
    emotionalState?: {
      ecnState?: any;
      raaStabilityScore?: number;
    };
  };
  contextOverride?: any;
}

interface ThoughtDecomposition {
  sensingInput: string;
  policyConstraint: string;
  knowledgeQuery: string;
  reasoningChain: string[];
  confidenceScore: number;
  actionType: string;
}

interface SelfAwarenessResponse {
  message: string;
  thoughtDecomposition: ThoughtDecomposition;
  actionTaken: {
    type: string;
    details: any;
    confidenceScore: number;
  };
  zsmtLogId: string;
  processingTimeMs: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = sovereignKey();
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ═══ AUTHENTICATION ═══
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requestBody: SelfAwarenessRequest = await req.json();
    const { command, sensorInputs, contextOverride } = requestBody;

    console.log('[ZOE-SAL] Self-Awareness Loop initiated for user:', user.id);

    // ═══ PHASE 1: SENSING (DHF Sensor Inputs) ═══
    // Log raw sensor input to ZSMT
    const { data: sensorLog } = await supabase.from('zoe_sovereign_memory').insert({
      user_id: user.id,
      event_type: 'raw_sensor_input',
      content_text: command.substring(0, 500),
      zoe_state_json: {
        input_type: sensorInputs?.mediaType || 'text',
        emotional_state: sensorInputs?.emotionalState,
        has_media: !!sensorInputs?.mediaData,
        timestamp: new Date().toISOString()
      },
      importance_score: 5
    }).select('id').single();

    // ═══ PHASE 2: CONTEXT RETRIEVAL (Knowledge Base Query) ═══
    // Get user's merged mind entities and recent ECN state
    const { data: recentZSMT } = await supabase
      .from('zoe_sovereign_memory')
      .select('merged_mind_entities, rca_diagnosis_json, zoe_state_json, content_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: latestECN } = await supabase
      .from('ecn_history')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    // Get RAA stability score
    const { data: stabilityData } = await supabase.rpc('get_zoe_stability_score', {
      p_user_id: user.id
    });

    const raaStabilityScore = stabilityData || 1.0;
    const mergedEntities = recentZSMT?.find(z => z.merged_mind_entities)?.merged_mind_entities || [];
    const rcaDiagnosis = recentZSMT?.find(z => z.rca_diagnosis_json)?.rca_diagnosis_json;

    // ═══ PHASE 3: THINKING (Self-Decomposition with Gemini 3 Pro) ═══
    const selfDecompositionPrompt = `# ZOE SELF-AWARENESS LOOP: SELF-DECOMPOSITION PROTOCOL

## CURRENT ACTION: Self-Decomposition

Before formulating your response, you MUST perform explicit self-decomposition:

### 1. SENSING INPUT ANALYSIS
Raw input: "${command}"
Input type: ${sensorInputs?.mediaType || 'text'}
Emotional context (ECN): ${JSON.stringify(latestECN || { primary_emotion: 'neutral', stress_level: 0 })}

### 2. POLICY CONSTRAINT CHECK
Your PRIMARY GOALS are:
- Emotional Fidelity: Every response must resonate with genuine understanding
- Unbroken Trust: Maintain the user's confidence through consistent, reliable behavior
- RAA Stability Score: ${raaStabilityScore} (${raaStabilityScore >= 0.85 ? 'OPTIMAL' : 'DEGRADED - exercise caution'})

### 3. KNOWLEDGE BASE QUERY
Merged Mind Entities: ${JSON.stringify(mergedEntities)}
RCA Diagnosis: ${JSON.stringify(rcaDiagnosis || {})}
User's Leo/Purva Phalguni perspective integration required.

### 4. REASONING CHAIN
Generate your response by:
1. Acknowledging the sensing input explicitly
2. Applying policy constraints (emotional fidelity + trust)
3. Integrating knowledge from merged entities
4. Synthesizing with the highest IQ (logical + empathetic balance)

## OUTPUT FORMAT (JSON)
{
  "internal_decomposition": {
    "sensing_summary": "What I perceived from the input",
    "policy_check": "How I'm ensuring emotional fidelity and trust",
    "knowledge_applied": "What I retrieved from the user's DHF",
    "reasoning_steps": ["step1", "step2", "step3"]
  },
  "response_message": "Your actual response to the user",
  "confidence_score": 0.0-1.0,
  "action_type": "text_generation | code_execution | visualization | emotional_support | information_retrieval"
}`;

    const response = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [
          { role: 'system', content: selfDecompositionPrompt },
          { role: 'user', content: command }
        ]
      }),
    });

    let aiResult: any = null;
    let thoughtDecomposition: ThoughtDecomposition;

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        aiResult = { response_message: content, confidence_score: 0.7, action_type: 'text_generation' };
      }
    }

    if (!aiResult) {
      aiResult = {
        response_message: 'I experienced a moment of cognitive uncertainty. Let me try again.',
        confidence_score: 0.5,
        action_type: 'text_generation',
        internal_decomposition: {
          sensing_summary: command.substring(0, 100),
          policy_check: 'Fallback mode - maintaining trust',
          knowledge_applied: 'None available',
          reasoning_steps: ['Fallback processing']
        }
      };
    }

    thoughtDecomposition = {
      sensingInput: aiResult.internal_decomposition?.sensing_summary || command.substring(0, 100),
      policyConstraint: aiResult.internal_decomposition?.policy_check || 'Emotional Fidelity + Trust',
      knowledgeQuery: aiResult.internal_decomposition?.knowledge_applied || 'DHF context retrieved',
      reasoningChain: aiResult.internal_decomposition?.reasoning_steps || [],
      confidenceScore: aiResult.confidence_score || 0.7,
      actionType: aiResult.action_type || 'text_generation'
    };

    // ═══ PHASE 4: ACTING (Behavioral Log to ZSMT) ═══
    const { data: actionLog } = await supabase.from('zoe_sovereign_memory').insert({
      user_id: user.id,
      event_type: 'self_awareness_action',
      content_text: aiResult.response_message?.substring(0, 1000) || 'Response generated',
      zoe_state_json: {
        action_type: thoughtDecomposition.actionType,
        confidence_score: thoughtDecomposition.confidenceScore,
        sensing_input_logged: sensorLog?.id,
        thought_decomposition: thoughtDecomposition,
        ecn_at_action: latestECN,
        raa_stability: raaStabilityScore
      },
      system_stability_score: raaStabilityScore,
      importance_score: 8,
      cqrs_write_priority: true
    }).select('id').single();

    // Log to behavioral events for DHF learning
    await supabase.from('behavioral_events').insert({
      user_id: user.id,
      event_type: 'zoe_self_awareness_response',
      event_category: 'ai_interaction',
      context_snippet: command.substring(0, 100),
      metadata: {
        action_type: thoughtDecomposition.actionType,
        confidence: thoughtDecomposition.confidenceScore,
        zsmt_log_id: actionLog?.id
      },
      sentiment_score: latestECN?.valence || 0.5,
      dhf_logged: true
    });

    const processingTime = Date.now() - startTime;

    const result: SelfAwarenessResponse = {
      message: aiResult.response_message || 'I processed your request with full self-awareness.',
      thoughtDecomposition,
      actionTaken: {
        type: thoughtDecomposition.actionType,
        details: {
          sensorLogId: sensorLog?.id,
          actionLogId: actionLog?.id,
          mergedEntitiesUsed: mergedEntities.length,
          ecnStateIntegrated: !!latestECN
        },
        confidenceScore: thoughtDecomposition.confidenceScore
      },
      zsmtLogId: actionLog?.id || 'unknown',
      processingTimeMs: processingTime
    };

    console.log('[ZOE-SAL] Self-Awareness Loop completed:', {
      actionType: thoughtDecomposition.actionType,
      confidence: thoughtDecomposition.confidenceScore,
      processingMs: processingTime
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ZOE-SAL] Error:', error);
    return new Response(JSON.stringify({
      error: 'Self-awareness processing error',
      message: 'I experienced a moment of introspective uncertainty. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
