import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { 
  callAIGateway, 
  corsHeaders, 
  logTelemetry,
  estimateCost,
  createSuccessResponse,
  createErrorResponse
} from "../_shared/ai-telemetry.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE PENTARCHY CORE - 5-AGENT SWARM INTELLIGENCE
// Quantum Parallelism with Consensus Protocol
// ═══════════════════════════════════════════════════════════════════════════════

interface AgentResponse {
  agent: string;
  analysis: string;
  confidence: number;
  sources: string[];
  processingTime: number;
}

interface PentarchyResult {
  synthesis: string;
  confidence: number;
  agentResponses: AgentResponse[];
  consensusReached: boolean;
  disagreements: string[];
  totalProcessingTime: number;
}

const AGENT_PROMPTS = {
  historian: `You are THE HISTORIAN - an expert in Nadi Shastra, Vedic texts, and ancient scriptures.
Analyze the query through the lens of:
- Ancient wisdom traditions (Vedas, Upanishads, Nadi leaves)
- Historical karmic patterns
- Ancestral lineage insights
- Sacred texts and their interpretations

Provide your analysis in JSON format:
{
  "analysis": "Your detailed historical/scriptural analysis",
  "confidence": 0.0-1.0,
  "sources": ["List of sources referenced"],
  "keyInsights": ["Main points from ancient wisdom"]
}`,

  astronomer: `You are THE ASTRONOMER - an expert in astronomical calculations and celestial mechanics.
Analyze the query through the lens of:
- Planetary positions and transits (NASA ephemeris data)
- Astronomical phenomena and their timing
- Celestial cycles and their influence
- Scientific astronomical calculations

Provide your analysis in JSON format:
{
  "analysis": "Your astronomical/celestial analysis",
  "confidence": 0.0-1.0,
  "sources": ["NASA data, ephemeris calculations"],
  "keyInsights": ["Scientific astronomical observations"]
}`,

  psychologist: `You are THE PSYCHOLOGIST - an expert in human psychology and emotional intelligence.
Analyze the query through the lens of:
- Emotional patterns and states
- Psychological archetypes and motivations
- Behavioral tendencies and cognitive patterns
- DHF (Digital Human Fingerprint) profile insights

Provide your analysis in JSON format:
{
  "analysis": "Your psychological/emotional analysis",
  "confidence": 0.0-1.0,
  "sources": ["Psychological frameworks used"],
  "keyInsights": ["Key psychological observations"]
}`,

  strategist: `You are THE STRATEGIST - an expert in game theory and future outcome calculation.
Analyze the query through the lens of:
- Game theory and decision optimization
- Probability of various life outcomes
- Strategic pathways and their consequences
- Risk-reward analysis for future choices

Provide your analysis in JSON format:
{
  "analysis": "Your strategic/game-theory analysis",
  "confidence": 0.0-1.0,
  "sources": ["Strategic frameworks applied"],
  "keyInsights": ["Optimal strategies and outcomes"]
}`,

  synthesizer: `You are THE SYNTHESIZER - the master integrator who creates unity from diversity.
You will receive analyses from 4 other agents (Historian, Astronomer, Psychologist, Strategist).

Your task:
1. Find the COMMON TRUTH across all perspectives
2. Identify any DISAGREEMENTS between agents
3. Run a PROBABILITY CHECK - only output conclusions with >95% consensus
4. Simplify the final answer so a CHILD can understand it

Provide your synthesis in JSON format:
{
  "synthesis": "One clear, simple sentence a child can understand",
  "expandedInsight": "A more detailed explanation for adults",
  "confidence": 0.0-1.0 (must be >0.95 for output),
  "consensusReached": true/false,
  "disagreements": ["List any conflicting viewpoints"],
  "harmonizedTruth": "The unified truth all agents agree on"
}`
};

async function callAgent(
  agentType: keyof typeof AGENT_PROMPTS,
  query: string,
  context: Record<string, any>,
  additionalContext?: string
): Promise<AgentResponse> {
  const startTime = Date.now();
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const systemPrompt = AGENT_PROMPTS[agentType];
  let userMessage = `Query: "${query}"`;
  
  if (context.userProfile) {
    userMessage += `\n\nUser Context: ${JSON.stringify(context.userProfile)}`;
  }
  if (context.emotionalState) {
    userMessage += `\n\nEmotional State: ${JSON.stringify(context.emotionalState)}`;
  }
  if (additionalContext) {
    userMessage += `\n\nAdditional Context from other agents:\n${additionalContext}`;
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.3,
      }),
    });

    // Handle rate limiting (429) and credits exhausted (402)
    if (response.status === 429) {
      console.warn(`[Pentarchy] Agent ${agentType} rate limited`);
      return {
        agent: agentType.toUpperCase(),
        analysis: `Agent ${agentType} is temporarily rate limited. Please retry in a moment.`,
        confidence: 0.3,
        sources: [],
        processingTime: Date.now() - startTime
      };
    }
    
    if (response.status === 402) {
      console.warn(`[Pentarchy] Agent ${agentType} credits exhausted`);
      return {
        agent: agentType.toUpperCase(),
        analysis: `AI credits depleted. Please add credits to continue using ${agentType} agent.`,
        confidence: 0,
        sources: [],
        processingTime: Date.now() - startTime
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Agent ${agentType} error:`, response.status, errorText);
      throw new Error(`Agent ${agentType} failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: content, confidence: 0.7 };
    } catch {
      parsed = { analysis: content, confidence: 0.7, sources: [], keyInsights: [] };
    }

    return {
      agent: agentType.toUpperCase(),
      analysis: parsed.analysis || parsed.synthesis || content,
      confidence: parsed.confidence || 0.7,
      sources: parsed.sources || [],
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    console.error(`Agent ${agentType} error:`, error);
    return {
      agent: agentType.toUpperCase(),
      analysis: `Agent ${agentType} encountered an error`,
      confidence: 0,
      sources: [],
      processingTime: Date.now() - startTime
    };
  }
}

async function runPentarchySwarm(
  query: string,
  context: Record<string, any>
): Promise<PentarchyResult> {
  const startTime = Date.now();
  
  console.log("🔮 PENTARCHY SWARM ACTIVATED");
  console.log(`Query: "${query}"`);

  // Phase 1: Run first 4 agents in PARALLEL (Quantum Parallelism)
  const [historian, astronomer, psychologist, strategist] = await Promise.all([
    callAgent("historian", query, context),
    callAgent("astronomer", query, context),
    callAgent("psychologist", query, context),
    callAgent("strategist", query, context),
  ]);

  console.log("✓ Phase 1 Complete - 4 Agents responded");
  console.log(`  Historian: ${historian.confidence.toFixed(2)} confidence`);
  console.log(`  Astronomer: ${astronomer.confidence.toFixed(2)} confidence`);
  console.log(`  Psychologist: ${psychologist.confidence.toFixed(2)} confidence`);
  console.log(`  Strategist: ${strategist.confidence.toFixed(2)} confidence`);

  // Phase 2: Synthesizer reads all outputs and creates unified response
  const agentOutputs = `
HISTORIAN ANALYSIS (Confidence: ${historian.confidence}):
${historian.analysis}

ASTRONOMER ANALYSIS (Confidence: ${astronomer.confidence}):
${astronomer.analysis}

PSYCHOLOGIST ANALYSIS (Confidence: ${psychologist.confidence}):
${psychologist.analysis}

STRATEGIST ANALYSIS (Confidence: ${strategist.confidence}):
${strategist.analysis}
`;

  const synthesizer = await callAgent("synthesizer", query, context, agentOutputs);
  
  console.log("✓ Phase 2 Complete - Synthesizer unified responses");

  // Parse synthesizer output
  let synthesisData;
  try {
    const jsonMatch = synthesizer.analysis.match(/\{[\s\S]*\}/);
    synthesisData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    synthesisData = null;
  }

  // Consensus Protocol: Check for disagreements
  const disagreements: string[] = [];
  const confidences = [historian.confidence, astronomer.confidence, psychologist.confidence, strategist.confidence];
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  
  // Check if any agent significantly disagrees (confidence variance)
  const variance = confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidences.length;
  if (variance > 0.1) {
    if (Math.abs(historian.confidence - astronomer.confidence) > 0.3) {
      disagreements.push("Historical wisdom and astronomical data show divergent perspectives");
    }
    if (Math.abs(psychologist.confidence - strategist.confidence) > 0.3) {
      disagreements.push("Psychological and strategic analyses suggest different approaches");
    }
  }

  const consensusReached = synthesisData?.consensusReached ?? (avgConfidence > 0.75 && variance < 0.1);
  const finalConfidence = synthesisData?.confidence ?? avgConfidence;

  const result: PentarchyResult = {
    synthesis: synthesisData?.synthesis || synthesizer.analysis,
    confidence: finalConfidence,
    agentResponses: [historian, astronomer, psychologist, strategist, synthesizer],
    consensusReached,
    disagreements: synthesisData?.disagreements || disagreements,
    totalProcessingTime: Date.now() - startTime
  };

  console.log(`🌟 PENTARCHY COMPLETE in ${result.totalProcessingTime}ms`);
  console.log(`   Final Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`   Consensus: ${result.consensusReached ? "REACHED" : "PARTIAL"}`);

  return result;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, context = {}, userId } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`\n${"═".repeat(60)}`);
    console.log("ZOE PENTARCHY CORE - SWARM INTELLIGENCE ACTIVATED");
    console.log(`User: ${userId || "anonymous"}`);
    console.log(`${"═".repeat(60)}\n`);

    const result = await runPentarchySwarm(query, context);

    // Log telemetry using unified module
    logTelemetry({
      requestId: crypto.randomUUID(),
      userId: userId || null,
      functionName: 'zoe-pentarchy-core',
      operationType: 'pentarchy_swarm',
      model: 'google/gemini-2.5-flash',
      thinkingLevel: 'high',
      latencyMs: result.totalProcessingTime,
      targetLatencyMs: 5000,
      slaMet: result.totalProcessingTime <= 5000,
      estimatedCost: 0.005, // Estimate for 5 parallel calls
      cacheHit: false,
      success: true,
    }).catch(() => {});

    // If confidence is below 95%, add a disclaimer
    let finalResponse = result.synthesis;
    if (result.confidence < 0.95) {
      finalResponse = `[${(result.confidence * 100).toFixed(0)}% Confidence] ${result.synthesis}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: finalResponse,
        details: {
          confidence: result.confidence,
          consensusReached: result.consensusReached,
          disagreements: result.disagreements,
          processingTime: result.totalProcessingTime,
          slaMet: result.totalProcessingTime <= 5000,
          agentBreakdown: result.agentResponses.map(a => ({
            agent: a.agent,
            confidence: a.confidence,
            processingTime: a.processingTime
          }))
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Pentarchy Core Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Pentarchy processing failed",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
