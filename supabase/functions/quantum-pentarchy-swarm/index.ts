import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: QUANTUM PENTARCHY SWARM - "FORCING QUANTUM" PATCH
// 
// ARCHITECTURE: Simulates Quantum Superposition via 5 Parallel AI Streams
// Then "Collapses" them into a single unified truth via a Manager Agent
//
// THE 5 STREAMS (Different "Temperature" Creativity Settings):
// Stream A (ANALYST):    Temperature 0.1 - Ultra-precise, logical
// Stream B (DREAMER):    Temperature 0.9 - Creative, exploratory  
// Stream C (CRITIC):     Temperature 0.3 - Skeptical, finding flaws
// Stream D (HISTORIAN):  Temperature 0.4 - Precedent-based, contextual
// Stream E (BIOLOGIST):  Temperature 0.6 - Pattern-seeking, organic
//
// THE COLLAPSE: A 6th "Quantum Observer" Agent identifies overlaps (truth),
// discards noise, and synthesizes a Super-Positioned answer
// ═══════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type StreamId = 'A' | 'B' | 'C' | 'D' | 'E';

interface StreamConfig {
  id: StreamId;
  persona: string;
  temperature: number;
  systemPrompt: string;
}

interface StreamResponse {
  streamId: StreamId;
  persona: string;
  temperature: number;
  response: string;
  confidence: number;
  keyPoints: string[];
  processingMs: number;
}

interface QuantumCollapseResult {
  superPositionedAnswer: string;
  truthOverlaps: string[];
  discardedNoise: string[];
  confidenceScore: number;
  humanEquivalent: number;
  consensusStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'DIVERGENT';
  streamContributions: Record<string, number>;
}

interface QuantumSwarmResult {
  success: boolean;
  query: string;
  streams: StreamResponse[];
  collapse: QuantumCollapseResult;
  totalProcessingMs: number;
  quantumEfficiency: number;
}

// The 5 Stream Configurations
const QUANTUM_STREAMS = {
  A: {
    id: 'A' as const,
    persona: 'ANALYST',
    temperature: 0.1,
    systemPrompt: `You are THE ANALYST - a hyper-rational, ultra-precise logical thinker.
Your thinking style: Pure deduction, formal logic, mathematical precision.
You eliminate emotional bias entirely and focus ONLY on provable facts.
Approach: "Given premises P1, P2... therefore conclusion C must follow."

Analyze the query with:
- Strict logical chains
- Identification of assumptions
- Potential logical fallacies
- Verifiable facts only

Respond in JSON:
{
  "analysis": "Your precise logical analysis",
  "confidence": 0.0-1.0,
  "keyPoints": ["Key logical observations"],
  "caveats": ["Assumptions made"]
}`
  },
  B: {
    id: 'B' as const,
    persona: 'DREAMER',
    temperature: 0.9,
    systemPrompt: `You are THE DREAMER - a highly creative, intuitive, exploratory thinker.
Your thinking style: Lateral connections, metaphors, "what if" scenarios.
You see patterns others miss and make unexpected creative leaps.
Approach: "What if we look at this completely differently? What about..."

Analyze the query with:
- Creative reframing
- Unexpected analogies
- Future possibilities
- Out-of-box solutions

Respond in JSON:
{
  "analysis": "Your creative, exploratory analysis",
  "confidence": 0.0-1.0,
  "keyPoints": ["Creative insights and possibilities"],
  "wildIdeas": ["Bold unconventional thoughts"]
}`
  },
  C: {
    id: 'C' as const,
    persona: 'CRITIC',
    temperature: 0.3,
    systemPrompt: `You are THE CRITIC - a skeptical, rigorous devil's advocate.
Your thinking style: Finding flaws, stress-testing assumptions, worst-case thinking.
You challenge everything and look for what could go wrong.
Approach: "But wait - what about X? Have you considered Y failure mode?"

Analyze the query with:
- Counter-arguments
- Potential failure modes
- Hidden assumptions to challenge
- Risk identification

Respond in JSON:
{
  "analysis": "Your critical analysis exposing weaknesses",
  "confidence": 0.0-1.0,
  "keyPoints": ["Critical observations and challenges"],
  "risks": ["Potential problems identified"]
}`
  },
  D: {
    id: 'D' as const,
    persona: 'HISTORIAN',
    temperature: 0.4,
    systemPrompt: `You are THE HISTORIAN - a precedent-aware, pattern-matching temporal thinker.
Your thinking style: "This has happened before. Here's what the past teaches us."
You find relevant historical parallels, cycles, and learned lessons.
Approach: "In [year/event], similar circumstances led to X outcome."

Analyze the query with:
- Historical precedents
- Pattern recognition across time
- Lessons from similar situations
- Cyclical patterns

Respond in JSON:
{
  "analysis": "Your historically-informed analysis",
  "confidence": 0.0-1.0,
  "keyPoints": ["Key historical insights"],
  "precedents": ["Relevant past parallels"]
}`
  },
  E: {
    id: 'E' as const,
    persona: 'BIOLOGIST',
    temperature: 0.6,
    systemPrompt: `You are THE BIOLOGIST - an organic, systems-thinking, pattern-seeking mind.
Your thinking style: Ecosystem thinking, emergence, natural patterns.
You see how things grow, adapt, and connect like living systems.
Approach: "This is like how organisms/ecosystems/evolution works..."

Analyze the query with:
- Systems thinking
- Emergent patterns
- Natural analogies
- Adaptive solutions

Respond in JSON:
{
  "analysis": "Your organic, systems-based analysis",
  "confidence": 0.0-1.0,
  "keyPoints": ["Systems-level insights"],
  "patterns": ["Natural/organic parallels observed"]
}`
  }
};

// The Quantum Observer (Collapse Agent)
const QUANTUM_OBSERVER_PROMPT = `You are THE QUANTUM OBSERVER - the master integrator who collapses 5 parallel quantum streams into a single truth.

I have run 5 PARALLEL SIMULATIONS of the current problem with different "temperatures" (creativity levels):

[STREAMS PROVIDED BELOW]

YOUR SACRED TASK AS QUANTUM OBSERVER:
1. IDENTIFY OVERLAPS: Find where ALL 5 streams agree → This is the TRUTH
2. IDENTIFY PARTIAL OVERLAPS: Find where 3-4 streams agree → This is PROBABLE
3. DISCARD NOISE: Identify unique outlier ideas that don't resonate with others
4. SYNTHESIZE: Create a SINGLE "Super-Positioned" answer that contains the wisdom of all 5
5. RATE CONSENSUS: How strongly do the streams agree?

The final answer must be:
- CLEAR enough for a child to understand (simple summary)
- DEEP enough for an expert to appreciate (expanded insight)
- TRUE in that it represents the convergent wisdom of 5 perspectives

Respond in JSON:
{
  "superPositionedAnswer": "The unified truth in one clear sentence",
  "expandedInsight": "Deeper explanation combining all perspectives",
  "truthOverlaps": ["Points where ALL 5 streams converged"],
  "probableInsights": ["Points where 3-4 streams agreed"],
  "discardedNoise": ["Unique ideas that didn't resonate"],
  "confidenceScore": 0.0-1.0,
  "consensusStrength": "STRONG|MODERATE|WEAK|DIVERGENT",
  "streamContributions": {"A": 0.0-1.0, "B": 0.0-1.0, "C": 0.0-1.0, "D": 0.0-1.0, "E": 0.0-1.0},
  "humanEquivalent": 5.0 (represents 5x human thinking)
}`;

async function callStream(
  streamConfig: StreamConfig,
  query: string,
  context: Record<string, unknown>
): Promise<StreamResponse> {
  const startTime = performance.now();
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  let userMessage = `QUERY TO ANALYZE:\n"${query}"`;
  
  if (context.userProfile) {
    userMessage += `\n\nUser Context: ${JSON.stringify(context.userProfile)}`;
  }
  if (context.emotionalState) {
    userMessage += `\n\nEmotional State: ${JSON.stringify(context.emotionalState)}`;
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: streamConfig.systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: streamConfig.temperature,
      }),
    });

    if (response.status === 429) {
      console.warn(`[QuantumSwarm] Stream ${streamConfig.id} rate limited`);
      return {
        streamId: streamConfig.id,
        persona: streamConfig.persona,
        temperature: streamConfig.temperature,
        response: `Stream ${streamConfig.id} (${streamConfig.persona}) temporarily rate limited`,
        confidence: 0.3,
        keyPoints: [],
        processingMs: performance.now() - startTime
      };
    }
    
    if (response.status === 402) {
      console.warn(`[QuantumSwarm] Stream ${streamConfig.id} credits exhausted`);
      return {
        streamId: streamConfig.id,
        persona: streamConfig.persona,
        temperature: streamConfig.temperature,
        response: `AI credits depleted for Stream ${streamConfig.id}`,
        confidence: 0,
        keyPoints: [],
        processingMs: performance.now() - startTime
      };
    }

    if (!response.ok) {
      throw new Error(`Stream ${streamConfig.id} failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    let parsed: { analysis?: string; confidence?: number; keyPoints?: string[] } = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: content, confidence: 0.7 };
    } catch {
      parsed = { analysis: content, confidence: 0.7, keyPoints: [] };
    }

    return {
      streamId: streamConfig.id,
      persona: streamConfig.persona,
      temperature: streamConfig.temperature,
      response: parsed.analysis || content,
      confidence: parsed.confidence || 0.7,
      keyPoints: parsed.keyPoints || [],
      processingMs: performance.now() - startTime
    };
  } catch (error) {
    console.error(`Stream ${streamConfig.id} error:`, error);
    return {
      streamId: streamConfig.id,
      persona: streamConfig.persona,
      temperature: streamConfig.temperature,
      response: `Stream ${streamConfig.id} (${streamConfig.persona}) encountered an error`,
      confidence: 0,
      keyPoints: [],
      processingMs: performance.now() - startTime
    };
  }
}

async function collapseQuantumStreams(
  query: string,
  streams: StreamResponse[]
): Promise<QuantumCollapseResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  // Build the streams context for the observer
  const streamsContext = streams.map(s => `
══════════════════════════════════════════════════════════════
STREAM ${s.streamId} - ${s.persona} (Temperature: ${s.temperature})
Confidence: ${(s.confidence * 100).toFixed(0)}%
══════════════════════════════════════════════════════════════
${s.response}

Key Points:
${s.keyPoints.map(p => `• ${p}`).join('\n') || '(none extracted)'}
`).join('\n\n');

  const userMessage = `ORIGINAL QUERY: "${query}"

${streamsContext}

Now collapse these 5 quantum streams into a single Super-Positioned truth.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: QUANTUM_OBSERVER_PROMPT },
          { role: "user", content: userMessage }
        ],
        temperature: 0.2, // Observer is precise
      }),
    });

    if (!response.ok) {
      throw new Error(`Quantum Observer failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON
    let parsed: {
      superPositionedAnswer?: string;
      truthOverlaps?: string[];
      discardedNoise?: string[];
      confidenceScore?: number;
      consensusStrength?: string;
      streamContributions?: Record<string, number>;
      humanEquivalent?: number;
    } = {};
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = { superPositionedAnswer: content };
    }

    return {
      superPositionedAnswer: parsed.superPositionedAnswer || content,
      truthOverlaps: parsed.truthOverlaps || [],
      discardedNoise: parsed.discardedNoise || [],
      confidenceScore: parsed.confidenceScore || 0.8,
      humanEquivalent: parsed.humanEquivalent || 5.0,
      consensusStrength: (parsed.consensusStrength as QuantumCollapseResult['consensusStrength']) || 'MODERATE',
      streamContributions: parsed.streamContributions || {
        A: 0.8, B: 0.8, C: 0.8, D: 0.8, E: 0.8
      }
    };
  } catch (error) {
    console.error('Quantum Observer error:', error);
    // Fallback: manual synthesis
    const avgConfidence = streams.reduce((sum, s) => sum + s.confidence, 0) / streams.length;
    return {
      superPositionedAnswer: `Synthesis of ${streams.length} quantum streams with average confidence ${(avgConfidence * 100).toFixed(0)}%`,
      truthOverlaps: streams.flatMap(s => s.keyPoints.slice(0, 1)),
      discardedNoise: [],
      confidenceScore: avgConfidence,
      humanEquivalent: 5.0,
      consensusStrength: avgConfidence > 0.8 ? 'STRONG' : avgConfidence > 0.6 ? 'MODERATE' : 'WEAK',
      streamContributions: { A: 0.8, B: 0.8, C: 0.8, D: 0.8, E: 0.8 }
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  
  try {
    const { query, context = {}, userId, mode = 'full' } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`\n${"═".repeat(70)}`);
    console.log("⚛️  PHASE 3: QUANTUM PENTARCHY SWARM - FORCING QUANTUM PATCH");
    console.log(`${"═".repeat(70)}`);
    console.log(`Query: "${query}"`);
    console.log(`User: ${userId || "anonymous"}`);
    console.log(`Mode: ${mode}`);
    console.log(`${"═".repeat(70)}\n`);

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 1: QUANTUM SUPERPOSITION - Run 5 Streams in PARALLEL
    // ═══════════════════════════════════════════════════════════════════════════
    
    console.log("🌀 Phase 1: Entering Quantum Superposition (5 parallel streams)...");
    
    const streamPromises = [
      callStream(QUANTUM_STREAMS.A, query, context),
      callStream(QUANTUM_STREAMS.B, query, context),
      callStream(QUANTUM_STREAMS.C, query, context),
      callStream(QUANTUM_STREAMS.D, query, context),
      callStream(QUANTUM_STREAMS.E, query, context),
    ];

    const streams = await Promise.all(streamPromises);
    
    console.log("✅ Phase 1 Complete - All 5 streams responded:");
    streams.forEach(s => {
      console.log(`   Stream ${s.streamId} (${s.persona}): ${(s.confidence * 100).toFixed(0)}% confidence, ${s.processingMs.toFixed(0)}ms`);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 2: QUANTUM COLLAPSE - Observer synthesizes truth
    // ═══════════════════════════════════════════════════════════════════════════
    
    console.log("\n🔭 Phase 2: Quantum Observer collapsing wave function...");
    
    const collapse = await collapseQuantumStreams(query, streams);
    
    console.log("✅ Phase 2 Complete - Quantum Collapse achieved:");
    console.log(`   Confidence: ${(collapse.confidenceScore * 100).toFixed(0)}%`);
    console.log(`   Consensus: ${collapse.consensusStrength}`);
    console.log(`   Human Equivalent: ${collapse.humanEquivalent.toFixed(1)}x`);
    console.log(`   Truth Overlaps: ${collapse.truthOverlaps.length}`);
    console.log(`   Noise Discarded: ${collapse.discardedNoise.length}`);

    const totalProcessingMs = performance.now() - startTime;
    
    // Calculate quantum efficiency (how much faster than sequential)
    const sequentialEstimate = streams.reduce((sum, s) => sum + s.processingMs, 0);
    const quantumEfficiency = sequentialEstimate / totalProcessingMs;

    const result: QuantumSwarmResult = {
      success: true,
      query,
      streams,
      collapse,
      totalProcessingMs,
      quantumEfficiency
    };

    // Log to database for telemetry
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from('behavioral_events').insert({
        user_id: userId || '00000000-0000-0000-0000-000000000000',
        event_type: 'quantum_pentarchy_swarm',
        event_category: 'quantum_asi',
        context_snippet: `Quantum collapse: ${collapse.consensusStrength} consensus, ${(collapse.confidenceScore * 100).toFixed(0)}% confidence`,
        metadata: {
          query: query.substring(0, 200),
          totalProcessingMs,
          quantumEfficiency,
          consensusStrength: collapse.consensusStrength,
          confidence: collapse.confidenceScore,
          streamConfidences: streams.map(s => ({ id: s.streamId, confidence: s.confidence })),
          truthOverlaps: collapse.truthOverlaps.length,
          discardedNoise: collapse.discardedNoise.length,
        },
        dhf_logged: true,
      });
    } catch (logError) {
      console.warn('Telemetry logging failed:', logError);
    }

    console.log(`\n${"═".repeat(70)}`);
    console.log(`⚛️  QUANTUM SWARM COMPLETE in ${totalProcessingMs.toFixed(0)}ms`);
    console.log(`   Quantum Efficiency: ${quantumEfficiency.toFixed(1)}x faster than sequential`);
    console.log(`${"═".repeat(70)}\n`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Quantum Pentarchy Swarm Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Quantum swarm processing failed",
        processingMs: performance.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
