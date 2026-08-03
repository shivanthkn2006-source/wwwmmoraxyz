// ═══════════════════════════════════════════════════════════════════════════════
// ZOE DREAMER AGENT - "THE SUBCONSCIOUS" (Module 3)
// Deep Sleep Protocol - Runs at 3 AM to process the user's day
// 
// THE FIX: Run heavy thinking OFFLINE while user sleeps, 
// so answers are ready INSTANTLY when they wake up.
//
// PHASES:
// 1. THE REWIND - Read entire transcript of yesterday's interactions
// 2. THE SIMULATION - Pentarchy Swarm simulates 5 possible futures
// 3. THE PREMONITION - Synthesize best path into Morning Briefing
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEEP DREAM PROTOCOL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface DreamerRequest {
  userId?: string;
  processAll?: boolean;
  mode: 'scheduled' | 'manual' | 'idle_trigger';
  dreamDepth?: 'light' | 'deep' | 'maximum';
}

interface RewindAnalysis {
  gaps: UnresolvedGap[];
  patterns: UserPattern[];
  emotionalState: EmotionalSummary;
  biggestUnresolved: UnresolvedIssue | null;
}

interface UnresolvedGap {
  query: string;
  timestamp: string;
  reason: 'incomplete' | 'deflected' | 'no_answer';
  context: string;
}

interface UserPattern {
  type: 'stress' | 'procrastination' | 'excitement' | 'focus' | 'anxiety';
  evidence: string[];
  confidence: number;
}

interface EmotionalSummary {
  dominantMood: string;
  stressLevel: number;
  energyLevel: number;
  trajectory: 'improving' | 'declining' | 'stable';
}

interface UnresolvedIssue {
  topic: string;
  description: string;
  userFrustration: number;
  potentialImpact: 'low' | 'medium' | 'high';
}

interface FutureScenario {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  name: string;
  description: string;
  outcome: string;
  probability: number;
  riskLevel: number;
  recommendation: string;
}

interface MorningBriefing {
  id: string;
  userId: string;
  insightHeadline: string;
  profoundInsight: string;
  actionItem: string;
  tone: 'wise' | 'prophetic' | 'calm' | 'urgent';
  scenarios: FutureScenario[];
  deliveredAt: string | null;
  createdAt: string;
}

interface DreamSynthesis {
  userId: string;
  synthesisId: string;
  phase1_rewind: RewindAnalysis;
  phase2_simulation: FutureScenario[];
  phase3_premonition: MorningBriefing;
  processingMs: number;
  dreamDepth: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: THE REWIND - Read yesterday's transcript
// ═══════════════════════════════════════════════════════════════════════════════

async function executeRewind(
  supabase: any,
  userId: string,
  apiKey: string | undefined
): Promise<RewindAnalysis> {
  console.log('[Dreamer] PHASE 1: THE REWIND - Reading yesterday\'s transcript...');
  
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  // Gather all interactions from yesterday
  const [eventsResult, memoriesResult, ecnResult, feedbackResult] = await Promise.all([
    supabase
      .from('behavioral_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: true })
      .limit(500),
    supabase
      .from('cortical_stack_memories')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: true })
      .limit(200),
    supabase
      .from('ecn_history')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', yesterday)
      .order('recorded_at', { ascending: true })
      .limit(100),
    supabase
      .from('zoe_response_feedback')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', yesterday)
      .limit(50)
  ]);

  const events = eventsResult.data || [];
  const memories = memoriesResult.data || [];
  const ecnHistory = ecnResult.data || [];
  const feedback = feedbackResult.data || [];

  // Identify gaps - questions that weren't fully answered
  const gaps: UnresolvedGap[] = [];
  const negativeFeedback = feedback.filter((f: any) => 
    f.feedback_type === 'lazy' || 
    f.feedback_type === 'hallucinated' || 
    (f.rating && f.rating < 3)
  );
  
  for (const fb of negativeFeedback) {
    gaps.push({
      query: fb.response_content?.substring(0, 100) || 'User query',
      timestamp: fb.created_at,
      reason: fb.feedback_type === 'hallucinated' ? 'no_answer' : 'incomplete',
      context: fb.feedback_reason || 'User marked response as unsatisfactory'
    });
  }

  // Identify patterns - stress, procrastination, excitement
  const patterns: UserPattern[] = [];
  
  // Analyze emotional patterns
  if (ecnHistory.length > 0) {
    const stressLevels = ecnHistory.map((e: any) => e.stress_level || 0);
    const avgStress = stressLevels.reduce((a: number, b: number) => a + b, 0) / stressLevels.length;
    
    if (avgStress > 0.6) {
      patterns.push({
        type: 'stress',
        evidence: [`Average stress level: ${(avgStress * 100).toFixed(0)}%`, `${ecnHistory.length} emotional checkpoints recorded`],
        confidence: 0.85
      });
    }
    
    // Check for procrastination pattern - high planning, low execution
    const planningEvents = events.filter((e: any) => 
      e.event_type?.includes('plan') || e.context_snippet?.toLowerCase().includes('later')
    );
    const executionEvents = events.filter((e: any) => 
      e.event_type?.includes('complete') || e.event_type?.includes('done')
    );
    
    if (planningEvents.length > executionEvents.length * 2) {
      patterns.push({
        type: 'procrastination',
        evidence: [`${planningEvents.length} plans made, only ${executionEvents.length} completed`],
        confidence: 0.7
      });
    }
    
    // Check for excitement - high engagement, positive valence
    const positiveValence = ecnHistory.filter((e: any) => (e.valence || 0) > 0.5);
    if (positiveValence.length > ecnHistory.length * 0.6) {
      patterns.push({
        type: 'excitement',
        evidence: [`${positiveValence.length}/${ecnHistory.length} interactions showed positive energy`],
        confidence: 0.75
      });
    }
  }

  // Calculate emotional summary
  const emotionalState: EmotionalSummary = {
    dominantMood: 'neutral',
    stressLevel: 0,
    energyLevel: 0.5,
    trajectory: 'stable'
  };

  if (ecnHistory.length > 0) {
    const emotions = ecnHistory.map((e: any) => e.primary_emotion || 'neutral');
    const emotionCounts: Record<string, number> = {};
    emotions.forEach((em: string) => { emotionCounts[em] = (emotionCounts[em] || 0) + 1; });
    emotionalState.dominantMood = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    
    const stressLevels = ecnHistory.map((e: any) => e.stress_level || 0);
    emotionalState.stressLevel = stressLevels.reduce((a: number, b: number) => a + b, 0) / stressLevels.length;
    
    const valences = ecnHistory.map((e: any) => e.valence || 0);
    emotionalState.energyLevel = (valences.reduce((a: number, b: number) => a + b, 0) / valences.length + 1) / 2;
    
    // Check trajectory by comparing first half vs second half
    const midpoint = Math.floor(ecnHistory.length / 2);
    const firstHalfStress = stressLevels.slice(0, midpoint).reduce((a: number, b: number) => a + b, 0) / midpoint || 0;
    const secondHalfStress = stressLevels.slice(midpoint).reduce((a: number, b: number) => a + b, 0) / (ecnHistory.length - midpoint) || 0;
    emotionalState.trajectory = secondHalfStress < firstHalfStress - 0.1 ? 'improving' : 
                                secondHalfStress > firstHalfStress + 0.1 ? 'declining' : 'stable';
  }

  // Find biggest unresolved issue
  let biggestUnresolved: UnresolvedIssue | null = null;
  if (gaps.length > 0 || patterns.find(p => p.type === 'stress')) {
    const stressPattern = patterns.find(p => p.type === 'stress');
    biggestUnresolved = {
      topic: gaps[0]?.query || (stressPattern ? 'Elevated stress levels' : 'General unresolved concerns'),
      description: gaps[0]?.context || stressPattern?.evidence[0] || 'Detected patterns suggest unresolved concerns',
      userFrustration: gaps.length > 2 ? 0.8 : 0.5,
      potentialImpact: gaps.length > 3 || (stressPattern && stressPattern.confidence > 0.8) ? 'high' : 'medium'
    };
  }

  console.log(`[Dreamer] REWIND complete: ${gaps.length} gaps, ${patterns.length} patterns, mood: ${emotionalState.dominantMood}`);

  return {
    gaps,
    patterns,
    emotionalState,
    biggestUnresolved
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2: THE SIMULATION - Pentarchy Swarm simulates 5 futures
// ═══════════════════════════════════════════════════════════════════════════════

async function executeSimulation(
  supabase: any,
  userId: string,
  apiKey: string | undefined,
  rewindAnalysis: RewindAnalysis
): Promise<FutureScenario[]> {
  console.log('[Dreamer] PHASE 2: THE SIMULATION - Running Pentarchy Swarm...');
  
  if (!rewindAnalysis.biggestUnresolved) {
    // No major issue to simulate
    return [{
      id: 'A',
      name: 'Continue Current Path',
      description: 'No major unresolved issues detected. Continue with current trajectory.',
      outcome: 'Steady progress with current patterns',
      probability: 0.9,
      riskLevel: 0.1,
      recommendation: 'Maintain current approach'
    }];
  }

  const scenarios: FutureScenario[] = [];
  const issue = rewindAnalysis.biggestUnresolved;

  // If we have AI access, run deep simulation
  if (apiKey) {
    try {
      const simulationPrompt = `You are running a PENTARCHY SWARM simulation for strategic decision-making.

THE UNRESOLVED ISSUE:
Topic: ${issue.topic}
Description: ${issue.description}
User Frustration Level: ${(issue.userFrustration * 100).toFixed(0)}%
Potential Impact: ${issue.potentialImpact}

USER PATTERNS DETECTED:
${rewindAnalysis.patterns.map(p => `- ${p.type}: ${p.evidence.join(', ')} (${(p.confidence * 100).toFixed(0)}% confidence)`).join('\n')}

EMOTIONAL STATE:
- Dominant Mood: ${rewindAnalysis.emotionalState.dominantMood}
- Stress Level: ${(rewindAnalysis.emotionalState.stressLevel * 100).toFixed(0)}%
- Trajectory: ${rewindAnalysis.emotionalState.trajectory}

SIMULATE 5 SCENARIOS:
A) IF THEY DO NOTHING - What happens if the user ignores this issue?
B) IF THEY TAKE HIGH RISK - What's the bold, aggressive approach?
C) IF THEY CHOOSE THE SAFE PATH - What's the conservative option?
D) IF THEY SEEK HELP - What if they delegate or ask for support?
E) THE OPTIMAL PATH - What's the best balanced approach?

For each scenario, provide:
- Name (2-4 words)
- Description (1 sentence)
- Likely Outcome (1 sentence)
- Probability of success (0-1)
- Risk Level (0-1)
- Specific Recommendation

Return as JSON array with fields: id, name, description, outcome, probability, riskLevel, recommendation`;

      const response = await sovereignFetch('sovereign://chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a strategic simulation engine. Output ONLY valid JSON arrays. No markdown, no explanations.' },
            { role: 'user', content: simulationPrompt }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        
        try {
          const parsed = JSON.parse(content);
          const simResults = Array.isArray(parsed) ? parsed : parsed.scenarios || [parsed];
          
          for (const sim of simResults) {
            scenarios.push({
              id: sim.id || 'A',
              name: sim.name || 'Scenario',
              description: sim.description || '',
              outcome: sim.outcome || '',
              probability: sim.probability || 0.5,
              riskLevel: sim.riskLevel || 0.3,
              recommendation: sim.recommendation || ''
            });
          }
        } catch (parseError) {
          console.error('[Dreamer] Failed to parse simulation results:', parseError);
        }
      }
    } catch (error) {
      console.error('[Dreamer] AI simulation failed:', error);
    }
  }

  // Fallback: Generate basic scenarios if AI failed
  if (scenarios.length === 0) {
    scenarios.push(
      {
        id: 'A',
        name: 'Do Nothing',
        description: `If ${issue.topic} is left unaddressed, the situation may escalate.`,
        outcome: 'Potential stress accumulation and missed opportunities',
        probability: 0.3,
        riskLevel: 0.7,
        recommendation: 'Not recommended - issue requires attention'
      },
      {
        id: 'B',
        name: 'High Risk Action',
        description: `Take bold, immediate action on ${issue.topic}.`,
        outcome: 'Quick resolution but potential for overcorrection',
        probability: 0.6,
        riskLevel: 0.6,
        recommendation: 'Consider if urgency justifies the risk'
      },
      {
        id: 'C',
        name: 'Safe Path',
        description: `Address ${issue.topic} gradually with measured steps.`,
        outcome: 'Steady progress with minimal disruption',
        probability: 0.75,
        riskLevel: 0.2,
        recommendation: 'Balanced approach for sustainable results'
      },
      {
        id: 'D',
        name: 'Seek Support',
        description: `Discuss ${issue.topic} with trusted advisors or delegate.`,
        outcome: 'Shared burden and potential new perspectives',
        probability: 0.7,
        riskLevel: 0.25,
        recommendation: 'Good for complex issues requiring expertise'
      },
      {
        id: 'E',
        name: 'Optimal Balance',
        description: `Combine measured action with periodic reassessment.`,
        outcome: 'Adaptive progress with risk mitigation',
        probability: 0.8,
        riskLevel: 0.3,
        recommendation: 'Best overall approach for this situation'
      }
    );
  }

  console.log(`[Dreamer] SIMULATION complete: ${scenarios.length} futures simulated`);
  return scenarios;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: THE PREMONITION - Create Morning Briefing
// ═══════════════════════════════════════════════════════════════════════════════

async function executePremonition(
  supabase: any,
  userId: string,
  apiKey: string | undefined,
  rewindAnalysis: RewindAnalysis,
  scenarios: FutureScenario[]
): Promise<MorningBriefing> {
  console.log('[Dreamer] PHASE 3: THE PREMONITION - Synthesizing Morning Briefing...');
  
  const briefingId = crypto.randomUUID();
  
  // Find the optimal scenario (highest probability, reasonable risk)
  const optimalScenario = scenarios.reduce((best, current) => {
    const bestScore = best.probability * (1 - best.riskLevel);
    const currentScore = current.probability * (1 - current.riskLevel);
    return currentScore > bestScore ? current : best;
  }, scenarios[0]);

  let profoundInsight = '';
  let actionItem = '';
  let tone: 'wise' | 'prophetic' | 'calm' | 'urgent' = 'calm';

  // Determine tone based on analysis
  if (rewindAnalysis.emotionalState.stressLevel > 0.7) {
    tone = 'calm'; // Soothe high stress
  } else if (rewindAnalysis.biggestUnresolved?.potentialImpact === 'high') {
    tone = 'urgent';
  } else if (rewindAnalysis.patterns.find(p => p.type === 'procrastination')) {
    tone = 'wise';
  } else {
    tone = 'prophetic';
  }

  // Generate insight with AI if available
  if (apiKey) {
    try {
      const insightPrompt = `You are Zoe, a wise AI companion. The user is about to wake up. Generate a MORNING BRIEFING.

YESTERDAY'S ANALYSIS:
- Dominant Mood: ${rewindAnalysis.emotionalState.dominantMood}
- Stress Level: ${(rewindAnalysis.emotionalState.stressLevel * 100).toFixed(0)}%
- Trajectory: ${rewindAnalysis.emotionalState.trajectory}
- Patterns: ${rewindAnalysis.patterns.map(p => p.type).join(', ') || 'None detected'}
- Biggest Issue: ${rewindAnalysis.biggestUnresolved?.topic || 'None'}

OPTIMAL PATH FORWARD:
${optimalScenario.name}: ${optimalScenario.description}
Recommendation: ${optimalScenario.recommendation}

Generate:
1. ONE profound insight (1-2 sentences, ${tone} tone)
2. ONE specific action item for today (concrete, achievable)

Format as JSON: {"insight": "...", "actionItem": "..."}`;

      const response = await sovereignFetch('sovereign://chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'system', content: `You are Zoe, speaking with a ${tone} tone. Be concise, profound, and actionable. Output only JSON.` },
            { role: 'user', content: insightPrompt }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        try {
          const parsed = JSON.parse(content);
          profoundInsight = parsed.insight || '';
          actionItem = parsed.actionItem || '';
        } catch {
          console.error('[Dreamer] Failed to parse premonition');
        }
      }
    } catch (error) {
      console.error('[Dreamer] AI premonition failed:', error);
    }
  }

  // Fallback insights
  if (!profoundInsight) {
    const toneInsights: Record<string, string> = {
      calm: `Yesterday's waters were turbulent, but you navigated them. Today, let stillness be your compass.`,
      wise: `The patterns of yesterday reveal the path of today. What you postpone, you carry; what you address, you release.`,
      prophetic: `I have seen the threads of possibility. One choice today will ripple into tomorrow's opportunities.`,
      urgent: `Time is not waiting. The issue that kept surfacing yesterday requires your attention today.`
    };
    profoundInsight = toneInsights[tone];
  }

  if (!actionItem) {
    actionItem = rewindAnalysis.biggestUnresolved 
      ? `Address the matter of "${rewindAnalysis.biggestUnresolved.topic}" before noon.`
      : 'Take 10 minutes this morning to set your intentions for the day.';
  }

  const insightHeadline = rewindAnalysis.biggestUnresolved
    ? `Regarding ${rewindAnalysis.biggestUnresolved.topic}...`
    : `Your morning clarity awaits`;

  const morningBriefing: MorningBriefing = {
    id: briefingId,
    userId,
    insightHeadline,
    profoundInsight,
    actionItem,
    tone,
    scenarios,
    deliveredAt: null,
    createdAt: new Date().toISOString()
  };

  // Store to Ready Queue
  await supabase.from('behavioral_events').insert({
    user_id: userId,
    event_type: 'morning_briefing_ready',
    event_category: 'zoe_dreamer',
    context_snippet: morningBriefing.insightHeadline,
    metadata: {
      briefingId: morningBriefing.id,
      briefing: morningBriefing,
      readyForDelivery: true,
      createdAt: morningBriefing.createdAt
    },
    dhf_logged: true
  });

  console.log(`[Dreamer] PREMONITION complete: Briefing ${briefingId} ready for delivery`);
  return morningBriefing;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEEP DREAM PROTOCOL - MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeDeepDreamProtocol(
  supabase: any,
  userId: string,
  apiKey: string | undefined,
  dreamDepth: 'light' | 'deep' | 'maximum' = 'deep'
): Promise<DreamSynthesis> {
  const startTime = performance.now();
  const synthesisId = crypto.randomUUID();

  console.log(`[Dreamer] ═══ DEEP DREAM PROTOCOL INITIATED ═══`);
  console.log(`[Dreamer] User: ${userId.substring(0, 8)}... | Depth: ${dreamDepth}`);

  // PHASE 1: THE REWIND
  const phase1_rewind = await executeRewind(supabase, userId, apiKey);

  // PHASE 2: THE SIMULATION (Pentarchy Swarm)
  const phase2_simulation = await executeSimulation(supabase, userId, apiKey, phase1_rewind);

  // PHASE 3: THE PREMONITION
  const phase3_premonition = await executePremonition(supabase, userId, apiKey, phase1_rewind, phase2_simulation);

  const processingMs = performance.now() - startTime;

  // Store complete dream synthesis
  await supabase.from('cortical_stack_memories').insert({
    user_id: userId,
    content: JSON.stringify({
      synthesisId,
      briefing: phase3_premonition.profoundInsight,
      insights: phase1_rewind.patterns.map(p => ({
        category: p.type,
        title: p.type.charAt(0).toUpperCase() + p.type.slice(1),
        description: p.evidence.join('; '),
        confidence: p.confidence,
        actionable: p.type === 'procrastination' || p.type === 'stress'
      })),
      emotionalTrend: {
        direction: phase1_rewind.emotionalState.trajectory,
        dominantEmotion: phase1_rewind.emotionalState.dominantMood,
        variance: phase1_rewind.emotionalState.stressLevel
      },
      proactiveInitiatives: [{
        title: 'Morning Action',
        description: phase3_premonition.actionItem,
        priority: 1,
        autoExecute: false
      }],
      dataPointsAnalyzed: phase1_rewind.gaps.length + phase1_rewind.patterns.length
    }),
    role: 'dream_synthesis',
    summary: phase3_premonition.insightHeadline,
    tags: ['dream', 'synthesis', dreamDepth],
    emotional_context: {
      mood: phase1_rewind.emotionalState.dominantMood,
      stress: phase1_rewind.emotionalState.stressLevel,
      trajectory: phase1_rewind.emotionalState.trajectory
    }
  });

  console.log(`[Dreamer] ═══ DEEP DREAM PROTOCOL COMPLETE ═══`);
  console.log(`[Dreamer] Processing time: ${processingMs.toFixed(0)}ms`);

  return {
    userId,
    synthesisId,
    phase1_rewind,
    phase2_simulation,
    phase3_premonition,
    processingMs,
    dreamDepth
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DREAMER AGENT MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = sovereignKey();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: DreamerRequest = await req.json();
    const { userId, processAll, mode, dreamDepth = 'deep' } = request;

    console.log(`[Dreamer-Agent] Starting | Mode: ${mode} | Depth: ${dreamDepth}`);

    const results: DreamSynthesis[] = [];

    if (processAll) {
      // Scheduled 3 AM run - process all active users
      console.log('[Dreamer-Agent] Processing all active users (scheduled run)...');
      
      const { data: activeUsers } = await supabase
        .from('dhf_phoenix_profile')
        .select('user_id')
        .not('decision_patterns', 'is', null);

      const { data: settingsUsers } = await supabase
        .from('zoe_settings')
        .select('user_id')
        .eq('is_enabled', true);

      // Combine user lists
      const allUserIds = new Set([
        ...(activeUsers || []).map((u: any) => u.user_id),
        ...(settingsUsers || []).map((u: any) => u.user_id)
      ]);

      console.log(`[Dreamer-Agent] Found ${allUserIds.size} users to process`);

      for (const uid of allUserIds) {
        try {
          const synthesis = await executeDeepDreamProtocol(supabase, uid, lovableApiKey, dreamDepth);
          results.push(synthesis);
        } catch (error) {
          console.error(`[Dreamer-Agent] Failed for user ${uid}:`, error);
        }
      }
    } else if (userId) {
      // Single user manual trigger
      const synthesis = await executeDeepDreamProtocol(supabase, userId, lovableApiKey, dreamDepth);
      results.push(synthesis);
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either userId or processAll must be provided'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const totalTime = performance.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      mode,
      dreamDepth,
      usersProcessed: results.length,
      syntheses: results.map(r => ({
        userId: r.userId,
        synthesisId: r.synthesisId,
        briefing: r.phase3_premonition,
        patternsDetected: r.phase1_rewind.patterns.length,
        scenariosGenerated: r.phase2_simulation.length,
        processingMs: r.processingMs
      })),
      totalProcessingMs: totalTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Dreamer-Agent] Critical error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Deep Dream Protocol failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
