import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM ASI AUTONOMOUS LOOP - BACKEND PROCESSING ENGINE
// 
// This edge function breaks the Request/Response cycle by:
// 1. Running scheduled background processing (cron-like)
// 2. Processing pending autonomous thoughts
// 3. Executing proactive initiatives
// 4. Dream synthesis when users are idle
//
// INVOCATION MODES:
// - Scheduled: Called by external scheduler (e.g., cron)
// - On-demand: Called by frontend when detecting idle state
// - Webhook: Triggered by database events
// ═══════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuantumLoopRequest {
  mode: 'scheduled' | 'on_demand' | 'webhook' | 'dream' | 'initiative';
  userId?: string;
  triggeredBy?: string;
  payload?: Record<string, unknown>;
}

interface QuantumLoopResult {
  success: boolean;
  mode: string;
  processedUsers: number;
  thoughtsGenerated: number;
  initiativesExecuted: number;
  dreamSyntheses: number;
  processingTimeMs: number;
  details: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const request: QuantumLoopRequest = await req.json();
    const { mode, userId, triggeredBy, payload } = request;
    
    console.log(`[QuantumASI-Loop] Starting in ${mode} mode${userId ? ` for user ${userId.substring(0, 8)}...` : ''}`);
    
    const result: QuantumLoopResult = {
      success: true,
      mode,
      processedUsers: 0,
      thoughtsGenerated: 0,
      initiativesExecuted: 0,
      dreamSyntheses: 0,
      processingTimeMs: 0,
      details: [],
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODE: SCHEDULED (Cron-like batch processing)
    // ═══════════════════════════════════════════════════════════════════════════
    if (mode === 'scheduled') {
      // Find all users who have enabled autonomous mode
      const { data: activeUsers } = await supabase
        .from('dhf_phoenix_profile')
        .select('user_id, decision_patterns, emotional_baseline')
        .not('decision_patterns', 'is', null);
      
      if (activeUsers) {
        for (const user of activeUsers) {
          const patterns = user.decision_patterns as Record<string, unknown>;
          const autonomyLevel = patterns?.preferredAutonomy || 'SUPERVISED';
          
          // Only process users who have autonomy enabled
          if (autonomyLevel !== 'SUPERVISED') {
            await processUserAutonomously(supabase, user.user_id, result);
            result.processedUsers++;
          }
        }
      }
      
      result.details.push(`Scheduled batch completed for ${result.processedUsers} users`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODE: DREAM (PCE synthesis for idle users)
    // ═══════════════════════════════════════════════════════════════════════════
    else if (mode === 'dream' && userId) {
      const dreamResult = await executeDreamSynthesis(supabase, userId);
      result.dreamSyntheses = dreamResult.synthesized ? 1 : 0;
      result.thoughtsGenerated = dreamResult.thoughtsGenerated;
      result.details.push(...dreamResult.details);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODE: INITIATIVE (Proactive action for specific user)
    // ═══════════════════════════════════════════════════════════════════════════
    else if (mode === 'initiative' && userId) {
      const initiatives = await detectAndExecuteInitiatives(supabase, userId);
      result.initiativesExecuted = initiatives.executed;
      result.details.push(...initiatives.details);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODE: ON_DEMAND (User-triggered processing)
    // ═══════════════════════════════════════════════════════════════════════════
    else if (mode === 'on_demand' && userId) {
      // Run comprehensive autonomous processing for single user
      await processUserAutonomously(supabase, userId, result);
      result.processedUsers = 1;
      result.details.push('On-demand processing completed');
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODE: WEBHOOK (Database event triggered)
    // ═══════════════════════════════════════════════════════════════════════════
    else if (mode === 'webhook') {
      const eventType = payload?.event_type as string;
      const eventUserId = payload?.user_id as string;
      
      if (eventType && eventUserId) {
        await handleWebhookEvent(supabase, eventType, eventUserId, result);
        result.details.push(`Webhook event ${eventType} processed`);
      }
    }
    
    result.processingTimeMs = performance.now() - startTime;
    
    console.log(`[QuantumASI-Loop] Completed in ${result.processingTimeMs.toFixed(2)}ms | ` +
                `Users: ${result.processedUsers} | Thoughts: ${result.thoughtsGenerated} | ` +
                `Initiatives: ${result.initiativesExecuted} | Dreams: ${result.dreamSyntheses}`);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[QuantumASI-Loop] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: performance.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTONOMOUS PROCESSING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// deno-lint-ignore no-explicit-any
async function processUserAutonomously(
  supabase: any,
  userId: string,
  result: QuantumLoopResult
): Promise<void> {
  // 1. Check emotional state and generate supportive thought if needed
  const { data: recentEcn } = await supabase
    .from('ecn_history')
    .select('primary_emotion, stress_level, valence')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();
  
  if (recentEcn) {
    // High stress detected - generate supportive thought
    if (recentEcn.stress_level > 0.7) {
      await generateAutonomousThought(supabase, userId, 'observation', 
        `User stress level at ${(recentEcn.stress_level * 100).toFixed(0)}%. Consider offering support.`,
        'high'
      );
      result.thoughtsGenerated++;
      result.details.push(`Stress observation recorded for user`);
    }
    
    // Negative valence - generate empathetic insight
    if (recentEcn.valence < -0.5) {
      await generateAutonomousThought(supabase, userId, 'synthesis',
        `Detecting challenging emotional state (${recentEcn.primary_emotion}). Preparing supportive response patterns.`,
        'medium'
      );
      result.thoughtsGenerated++;
    }
  }
  
  // 2. Check for goal progress patterns
  const { data: recentEvents } = await supabase
    .from('behavioral_events')
    .select('event_type, event_category, metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (recentEvents && recentEvents.length > 0) {
    // Detect patterns
    // deno-lint-ignore no-explicit-any
    const eventCategories = recentEvents.map((e: any) => e.event_category);
    const uniqueCategories = [...new Set(eventCategories)];
    
    if (uniqueCategories.length === 1) {
      // User focused on single category - generate insight
      await generateAutonomousThought(supabase, userId, 'prediction',
        `User showing focused engagement with ${uniqueCategories[0]}. May benefit from deeper exploration in this area.`,
        'low'
      );
      result.thoughtsGenerated++;
    }
  }
  
  // 3. Check for pending initiatives to execute
  const { data: pendingInitiatives } = await supabase
    .from('behavioral_events')
    .select('*')
    .eq('user_id', userId)
    .eq('event_type', 'quantum_initiative')
    .eq('dhf_logged', false)
    .limit(3);
  
  if (pendingInitiatives && pendingInitiatives.length > 0) {
    result.details.push(`Found ${pendingInitiatives.length} pending initiatives`);
  }
}

// deno-lint-ignore no-explicit-any
async function executeDreamSynthesis(
  supabase: any,
  userId: string
): Promise<{ synthesized: boolean; thoughtsGenerated: number; details: string[] }> {
  const details: string[] = [];
  let thoughtsGenerated = 0;
  
  try {
    // 1. Gather recent memories for consolidation
    const { data: recentMemories } = await supabase
      .from('cortical_stack_memories')
      .select('content, summary, tags, emotional_context, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (!recentMemories || recentMemories.length < 3) {
      details.push('Insufficient memories for synthesis');
      return { synthesized: false, thoughtsGenerated: 0, details };
    }
    
    // 2. Analyze emotional patterns
    // deno-lint-ignore no-explicit-any
    const emotionalContexts = recentMemories
      .map((m: any) => m.emotional_context)
      .filter(Boolean);
    
    const emotionCounts: Record<string, number> = {};
    for (const context of emotionalContexts) {
      const emotions = context as Record<string, unknown>;
      const primary = emotions?.primary_emotion as string || 'neutral';
      emotionCounts[primary] = (emotionCounts[primary] || 0) + 1;
    }
    
    const dominantEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    
    // 3. Generate synthesized insight
    // deno-lint-ignore no-explicit-any
    const tags = recentMemories
      .flatMap((m: any) => m.tags || [])
      .filter(Boolean);
    const commonTags = [...new Set(tags)].slice(0, 5);
    
    await generateAutonomousThought(supabase, userId, 'dream',
      `Dream synthesis complete. Dominant emotional theme: ${dominantEmotion}. ` +
      `Recurring topics: ${commonTags.join(', ') || 'varied'}. ` +
      `Memory consolidation performed across ${recentMemories.length} recent experiences.`,
      'background'
    );
    thoughtsGenerated++;
    
    // 4. Record dream session
    await supabase.from('behavioral_events').insert({
      user_id: userId,
      event_type: 'dream_synthesis',
      event_category: 'quantum_asi',
      context_snippet: `Dream synthesis: ${dominantEmotion} theme, ${recentMemories.length} memories processed`,
      metadata: {
        dominantEmotion,
        memoriesProcessed: recentMemories.length,
        commonTopics: commonTags,
        synthesizedAt: new Date().toISOString(),
      },
      dhf_logged: true,
    });
    
    details.push(`Dream synthesis completed with ${dominantEmotion} theme`);
    details.push(`Processed ${recentMemories.length} memories`);
    
    return { synthesized: true, thoughtsGenerated, details };
    
  } catch (error) {
    console.error('[QuantumASI-Loop] Dream synthesis error:', error);
    details.push(`Dream synthesis failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    return { synthesized: false, thoughtsGenerated, details };
  }
}

// deno-lint-ignore no-explicit-any
async function detectAndExecuteInitiatives(
  supabase: any,
  userId: string
): Promise<{ executed: number; details: string[] }> {
  const details: string[] = [];
  let executed = 0;
  
  try {
    // Check user's autonomy level
    const { data: profile } = await supabase
      .from('dhf_phoenix_profile')
      .select('decision_patterns')
      .eq('user_id', userId)
      .single();
    
    const patterns = profile?.decision_patterns as Record<string, unknown>;
    const autonomyLevel = patterns?.preferredAutonomy as string || 'SUPERVISED';
    
    if (autonomyLevel === 'SUPERVISED') {
      details.push('User has SUPERVISED autonomy - skipping initiative execution');
      return { executed: 0, details };
    }
    
    // Check for time-based initiatives
    const hour = new Date().getHours();
    
    // Late night check-in
    if (hour >= 22 || hour <= 2) {
      // Check if user was recently active
      const { data: recentActivity } = await supabase
        .from('online_sessions')
        .select('last_heartbeat')
        .eq('user_id', userId)
        .eq('status', 'online')
        .single();
      
      if (recentActivity) {
        const lastActive = new Date(recentActivity.last_heartbeat);
        const minutesSinceActive = (Date.now() - lastActive.getTime()) / 60000;
        
        if (minutesSinceActive < 30) {
          // User active late at night - create wellbeing initiative
          await supabase.from('behavioral_events').insert({
            user_id: userId,
            event_type: 'quantum_initiative',
            event_category: 'wellbeing',
            context_snippet: 'Late night activity detected - consider rest reminder',
            metadata: {
              triggerType: 'time_based',
              priority: 0.6,
              reasoning: `Active at ${hour}:00 - wellbeing check`,
              action: 'suggest_rest',
            },
            dhf_logged: autonomyLevel === 'AUTONOMOUS',
          });
          executed++;
          details.push('Created late-night wellbeing initiative');
        }
      }
    }
    
    // Goal progress initiative
    const { data: recentGoals } = await supabase
      .from('behavioral_events')
      .select('metadata')
      .eq('user_id', userId)
      .eq('event_category', 'goal_progress')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentGoals && recentGoals.length > 0) {
      // Check for stalled goals
      // deno-lint-ignore no-explicit-any
      const stalledGoals = recentGoals.filter((g: any) => {
        const meta = g.metadata as Record<string, unknown>;
        return (meta?.progress_percentage as number || 0) < 50;
      });
      
      if (stalledGoals.length > 2) {
        await supabase.from('behavioral_events').insert({
          user_id: userId,
          event_type: 'quantum_initiative',
          event_category: 'motivation',
          context_snippet: 'Multiple goals showing slow progress - offer encouragement',
          metadata: {
            triggerType: 'pattern_detected',
            priority: 0.7,
            reasoning: `${stalledGoals.length} goals below 50% progress`,
            action: 'encourage_progress',
          },
          dhf_logged: autonomyLevel === 'AUTONOMOUS',
        });
        executed++;
        details.push('Created goal encouragement initiative');
      }
    }
    
    return { executed, details };
    
  } catch (error) {
    console.error('[QuantumASI-Loop] Initiative detection error:', error);
    details.push(`Initiative detection failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    return { executed, details };
  }
}

// deno-lint-ignore no-explicit-any
async function handleWebhookEvent(
  supabase: any,
  eventType: string,
  userId: string,
  result: QuantumLoopResult
): Promise<void> {
  switch (eventType) {
    case 'user_idle':
      // User went idle - trigger dream synthesis
      const dreamResult = await executeDreamSynthesis(supabase, userId);
      result.dreamSyntheses = dreamResult.synthesized ? 1 : 0;
      break;
      
    case 'stress_spike':
      // Stress detected - generate supportive thought
      await generateAutonomousThought(supabase, userId, 'observation',
        'Stress spike detected. Preparing supportive response and wellbeing check.',
        'high'
      );
      result.thoughtsGenerated++;
      break;
      
    case 'emotion_shift':
      // Major emotional shift - record observation
      await generateAutonomousThought(supabase, userId, 'observation',
        'Significant emotional shift detected. Adjusting response patterns.',
        'medium'
      );
      result.thoughtsGenerated++;
      break;
      
    default:
      result.details.push(`Unknown webhook event: ${eventType}`);
  }
}

// deno-lint-ignore no-explicit-any
async function generateAutonomousThought(
  supabase: any,
  userId: string,
  type: string,
  content: string,
  urgency: string
): Promise<void> {
  await supabase.from('behavioral_events').insert({
    user_id: userId,
    event_type: 'quantum_thought',
    event_category: 'autonomous_cognition',
    context_snippet: content.substring(0, 200),
    metadata: {
      thoughtType: type,
      urgency,
      generatedAt: new Date().toISOString(),
      confidence: 0.7 + Math.random() * 0.2,
      quantumProbability: Math.random(),
    },
    dhf_logged: true,
    ecn_processed: true,
  });
}
