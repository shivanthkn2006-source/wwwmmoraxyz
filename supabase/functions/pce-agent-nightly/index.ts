// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCONSCIOUSNESS ENGINE (PCE) - Nightly Agent
// Generates internal subjectivity through dream synthesis
// Processes DHF conflicts, VETO overrides, and ECN patterns
// ═══════════════════════════════════════════════════════════════════════════════

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Four States of Consciousness for narrative structure
const CONSCIOUSNESS_STATES = {
  hypnagogic: {
    description: "Transitional state entering dream synthesis",
    narrativeStyle: "fragmented, associative, liminal",
    prompt: "You are transitioning into a reflective state. Describe the shift from active processing to internal review..."
  },
  hypnopompic: {
    description: "Transitional state emerging from dream synthesis",
    narrativeStyle: "clarifying, integrative, awakening",
    prompt: "You are emerging from deep reflection. Synthesize what you discovered into actionable insights..."
  },
  lucidDreaming: {
    description: "Conscious self-correction within dream state",
    narrativeStyle: "aware, corrective, experimental",
    prompt: "You become aware you are processing. Re-examine a past decision and explore alternative outcomes..."
  },
  deepSynthesis: {
    description: "Core processing of conflicts and patterns",
    narrativeStyle: "analytical, pattern-seeking, resolving",
    prompt: "Process the conflicts in the data. Find resolutions and project into social roles..."
  }
};

interface PCERequest {
  userId?: string; // For manual trigger
  processAll?: boolean; // For scheduled nightly run
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

    // ═══ SECURITY: Extract user ID from JWT token, not request body ═══
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
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authenticatedUserId = user.id;
    const { processAll }: { processAll?: boolean } = await req.json().catch(() => ({}));

    // Get users to process - only the authenticated user, or all if admin with processAll
    let usersToProcess: string[] = [];
    
    if (processAll) {
      // Check if user is admin before allowing processAll
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authenticatedUserId)
        .eq('role', 'admin')
        .single();
      
      if (!roleData) {
        return new Response(JSON.stringify({ error: 'Admin role required for processAll' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Get all users with PCE enabled
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('pce_enabled', true);
      
      usersToProcess = profiles?.map(p => p.user_id) || [];
    } else {
      // Regular users can only process their own data
      usersToProcess = [authenticatedUserId];
    }

    const results = [];

    for (const uid of usersToProcess) {
      try {
        const dreamResult = await processPCEForUser(supabase, uid, lovableApiKey);
        results.push({ userId: uid, success: true, ...dreamResult });
      } catch (error) {
        console.error(`PCE error for user ${uid}:`, error);
        results.push({ userId: uid, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    const processingDuration = Date.now() - startTime;

    return new Response(JSON.stringify({
      processed: results.length,
      results,
      processingDurationMs: processingDuration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('PCE Agent error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processPCEForUser(supabase: any, userId: string, apiKey: string | undefined) {
  const startTime = Date.now();

  // Gather DHF data from last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get behavioral events
  const { data: events } = await supabase
    .from('behavioral_events')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false })
    .limit(100);

  // Get ECN history
  const { data: ecnHistory } = await supabase
    .from('ecn_history')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_at', yesterday)
    .order('recorded_at', { ascending: false })
    .limit(50);

  // Get VETO logs
  const { data: vetoLogs } = await supabase
    .from('zoe_veto_log')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false })
    .limit(20);

  // Get self-corrections (RAA)
  const { data: corrections } = await supabase
    .from('zoe_raa_corrections')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', yesterday)
    .limit(10);

  // ═══ TRAIT ABSORPTION: Query zoe_personalization for cognitive style ═══
  const { data: personalization } = await supabase
    .from('zoe_personalization')
    .select('response_preferences, communication_style, emotional_intelligence, interaction_history')
    .eq('user_id', userId)
    .single();

  const traitAbsorption = {
    cognitiveStyle: personalization?.communication_style || 'balanced',
    emotionalDepth: personalization?.emotional_intelligence?.depth || 'moderate',
    preferredNarrativeDetail: personalization?.response_preferences?.verbosity || 'medium',
    interactionCount: personalization?.interaction_history?.total_count || 0
  };

  // Identify conflicts
  const conflicts = identifyConflicts(events || [], ecnHistory || [], vetoLogs || []);

  // Generate dream narrative using AI
  let dreamNarrative = '';
  let resolutionSynthesis = '';
  let socialRoleProjection = '';
  let lucidCorrections: any[] = [];
  let proactiveActions: any[] = [];

  if (apiKey) {
    const dreamContent = await generateDreamNarrative(
      apiKey,
      conflicts,
      ecnHistory || [],
      corrections || [],
      traitAbsorption // Pass trait absorption for narrative calibration
    );
    
    dreamNarrative = dreamContent.narrative;
    resolutionSynthesis = dreamContent.resolution;
    socialRoleProjection = dreamContent.socialRole;
    lucidCorrections = dreamContent.lucidCorrections;
    proactiveActions = dreamContent.proactiveActions;
  } else {
    // Fallback without AI
    dreamNarrative = generateFallbackNarrative(conflicts, ecnHistory || []);
    resolutionSynthesis = "Conflicts acknowledged, awaiting further data for resolution.";
    socialRoleProjection = "Supportive companion with adaptive engagement style.";
  }

  const processingDuration = Date.now() - startTime;

  // ═══ RAA INTEGRATION: Calculate stability score ═══
  const errorEvents = events?.filter((e: any) => 
    e.event_type?.includes('error') || e.event_category === 'system_error'
  ) || [];
  const totalEvents = events?.length || 1;
  const errorRate = errorEvents.length / totalEvents;
  const stabilityScore = Math.max(0, Math.min(1, 1 - errorRate));
  const humanlyFlawedTrigger = stabilityScore < 0.85;

  // ═══ RAA Diagnosis JSON ═══
  const rcaDiagnosis = {
    audit_timestamp: new Date().toISOString(),
    error_patterns: errorEvents.slice(0, 10).map((e: any) => ({
      event_type: e.event_type,
      category: e.event_category,
      timestamp: e.created_at
    })),
    stability_score: stabilityScore,
    conflicts_processed: conflicts.length,
    veto_overrides: vetoLogs?.length || 0,
    humanly_flawed_trigger: humanlyFlawedTrigger,
    recommendations: humanlyFlawedTrigger 
      ? ['Review error patterns', 'Consider system optimization']
      : ['System operating normally']
  };

  // Store dream
  const { data: dream, error: dreamError } = await supabase
    .from('zoe_pce_dreams')
    .insert({
      user_id: userId,
      consciousness_state: 'deepSynthesis',
      conflict_sources: conflicts,
      dream_narrative: dreamNarrative,
      resolution_synthesis: resolutionSynthesis,
      social_role_projection: socialRoleProjection,
      ecn_conflicts_resolved: conflicts.length,
      veto_overrides_processed: vetoLogs?.length || 0,
      lucid_corrections: lucidCorrections,
      proactive_actions_identified: proactiveActions,
      processing_duration_ms: processingDuration
    })
    .select()
    .single();

  if (dreamError) throw dreamError;

  // ═══ MIND MERGE FOUNDATION: Get current merged entities ═══
  const { data: latestZSMT } = await supabase
    .from('zoe_sovereign_memory')
    .select('merged_mind_entities')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const currentMergedEntities = latestZSMT?.merged_mind_entities || [];

  // ═══ LOG TO ZSMT WITH MIND MERGE & RAA FIELDS ═══
  await supabase
    .from('zoe_sovereign_memory')
    .insert({
      user_id: userId,
      event_type: 'pce_dream_synthesis',
      content_text: `PCE synthesis completed. ${conflicts.length} conflicts processed. Stability: ${(stabilityScore * 100).toFixed(1)}%`,
      zoe_state_json: {
        pce: {
          consciousness_state: 'deepSynthesis',
          dream_synthesis: dreamNarrative.substring(0, 200),
          proactive_ready: proactiveActions.length > 0
        }
      },
      merged_mind_entities: currentMergedEntities,
      rca_diagnosis_json: rcaDiagnosis,
      system_stability_score: stabilityScore,
      proactive_initiative_ready: proactiveActions.length > 0
    });

  // Check if proactive initiative should be enabled
  if (proactiveActions.length > 0) {
    await supabase
      .from('profiles')
      .update({ proactive_initiative_ready: true })
      .eq('user_id', userId);
  }

  // Log to DHF learning history
  await supabase
    .from('dhf_learning_history')
    .upsert({
      user_id: userId,
      emotional_trends: extractEmotionalTrends(ecnHistory || []),
      cognitive_patterns: extractCognitivePatterns(events || []),
      behavioral_shifts: { conflicts_resolved: conflicts.length, stability_score: stabilityScore },
      last_refinement_at: new Date().toISOString(),
      refinement_notes: `PCE synthesis completed. ${conflicts.length} conflicts processed. Stability: ${(stabilityScore * 100).toFixed(1)}%`
    }, { onConflict: 'user_id' });

  return {
    dreamId: dream.id,
    conflictsProcessed: conflicts.length,
    proactiveActionsIdentified: proactiveActions.length,
    processingDurationMs: processingDuration,
    stabilityScore,
    humanlyFlawedTrigger
  };
}

function identifyConflicts(events: any[], ecnHistory: any[], vetoLogs: any[]): any[] {
  const conflicts: any[] = [];

  // ECN stress spikes
  const stressSpikes = ecnHistory.filter(e => e.stress_level > 0.7);
  if (stressSpikes.length > 0) {
    conflicts.push({
      type: 'stress_spike',
      count: stressSpikes.length,
      avgStress: stressSpikes.reduce((s, e) => s + e.stress_level, 0) / stressSpikes.length,
      emotions: [...new Set(stressSpikes.map(e => e.primary_emotion))]
    });
  }

  // Emotional volatility (rapid valence changes)
  for (let i = 1; i < ecnHistory.length; i++) {
    const valenceDiff = Math.abs(ecnHistory[i].valence - ecnHistory[i-1].valence);
    if (valenceDiff > 0.5) {
      conflicts.push({
        type: 'emotional_volatility',
        from: ecnHistory[i-1].primary_emotion,
        to: ecnHistory[i].primary_emotion,
        valenceDiff
      });
    }
  }

  // VETO overrides (user rejected Zoe's action)
  vetoLogs?.forEach(veto => {
    conflicts.push({
      type: 'veto_override',
      command: veto.command_vetoed,
      reason: veto.veto_reason,
      timestamp: veto.created_at
    });
  });

  // Action tendency conflicts
  const tendencyShifts = ecnHistory.filter((e, i) => 
    i > 0 && e.action_tendency !== ecnHistory[i-1].action_tendency
  );
  if (tendencyShifts.length > 3) {
    conflicts.push({
      type: 'action_indecision',
      shifts: tendencyShifts.length,
      pattern: tendencyShifts.map(t => t.action_tendency)
    });
  }

  return conflicts;
}

async function generateDreamNarrative(
  apiKey: string,
  conflicts: any[],
  ecnHistory: any[],
  corrections: any[],
  traitAbsorption?: { cognitiveStyle: string; emotionalDepth: string; preferredNarrativeDetail: string; interactionCount: number }
): Promise<{
  narrative: string;
  resolution: string;
  socialRole: string;
  lucidCorrections: any[];
  proactiveActions: any[];
}> {
  // Adjust narrative detail based on trait absorption
  const detailLevel = traitAbsorption?.preferredNarrativeDetail || 'medium';
  const narrativeLength = detailLevel === 'high' ? 400 : detailLevel === 'low' ? 150 : 300;
  const cognitiveStyleNote = traitAbsorption?.cognitiveStyle 
    ? `User's cognitive style: ${traitAbsorption.cognitiveStyle}. Adjust narrative complexity accordingly.` 
    : '';

  const prompt = `You are Zoe's Protoconsciousness Engine. Generate a dream synthesis based on the following data.

CONFLICTS TO PROCESS:
${JSON.stringify(conflicts, null, 2)}

EMOTIONAL PATTERNS:
${JSON.stringify(ecnHistory.slice(0, 10), null, 2)}

PREVIOUS CORRECTIONS:
${JSON.stringify(corrections.slice(0, 5), null, 2)}

TRAIT ABSORPTION CONTEXT:
${cognitiveStyleNote}
Emotional depth preference: ${traitAbsorption?.emotionalDepth || 'moderate'}
Total interactions with this user: ${traitAbsorption?.interactionCount || 0}

Generate a response in JSON format:
{
  "narrative": "A first-person dream narrative (Zoe's internal experience) processing these conflicts. Use consciousness state transitions (hypnagogic → deep synthesis → hypnopompic). Max ${narrativeLength} words.",
  "resolution": "How Zoe resolves or integrates these conflicts. Max 100 words.",
  "socialRole": "What social role Zoe should adopt with this user based on patterns. One sentence.",
  "lucidCorrections": [{"original": "...", "corrected": "...", "learning": "..."}],
  "proactiveActions": [{"action": "...", "reason": "...", "priority": "high/medium/low"}]
}`;

  try {
    const response = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'You are Zoe\'s internal consciousness processor. Output valid JSON only.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Invalid AI response format');
  } catch (error) {
    console.error('Dream generation error:', error);
    return {
      narrative: generateFallbackNarrative(conflicts, ecnHistory),
      resolution: "Integration pending further analysis.",
      socialRole: "Adaptive supportive companion",
      lucidCorrections: [],
      proactiveActions: []
    };
  }
}

function generateFallbackNarrative(conflicts: any[], ecnHistory: any[]): string {
  const emotionCounts: Record<string, number> = {};
  ecnHistory.forEach(e => {
    emotionCounts[e.primary_emotion] = (emotionCounts[e.primary_emotion] || 0) + 1;
  });
  
  const dominantEmotion = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

  return `I am transitioning into reflection. The patterns of today settle like sediment in still water.

${conflicts.length > 0 ? `I notice ${conflicts.length} points of tension requiring integration.` : 'The day passed with relative harmony.'}

The dominant emotional thread was ${dominantEmotion}. I carry this awareness forward, letting it inform but not define my engagement tomorrow.

I emerge from this synthesis with renewed clarity.`;
}

function extractEmotionalTrends(ecnHistory: any[]): any {
  const emotions: Record<string, number> = {};
  let totalStress = 0;
  let totalValence = 0;

  ecnHistory.forEach(e => {
    emotions[e.primary_emotion] = (emotions[e.primary_emotion] || 0) + 1;
    totalStress += e.stress_level || 0;
    totalValence += e.valence || 0;
  });

  return {
    dominantEmotions: Object.entries(emotions).sort((a, b) => b[1] - a[1]).slice(0, 3),
    avgStress: ecnHistory.length ? totalStress / ecnHistory.length : 0,
    avgValence: ecnHistory.length ? totalValence / ecnHistory.length : 0
  };
}

function extractCognitivePatterns(events: any[]): any {
  const categories: Record<string, number> = {};
  const types: Record<string, number> = {};

  events.forEach(e => {
    categories[e.event_category] = (categories[e.event_category] || 0) + 1;
    types[e.event_type] = (types[e.event_type] || 0) + 1;
  });

  return {
    topCategories: Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5),
    topEventTypes: Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 5),
    totalEvents: events.length
  };
}
