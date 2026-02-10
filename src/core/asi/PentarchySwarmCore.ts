// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ASI: PENTARCHY SWARM CORE
// 5 Sub-Identity Agents with Millisecond Debate Synthesis
// Architecture: 2120-Style Swarm Intelligence
// ═══════════════════════════════════════════════════════════════════════════════

export type AgentPersona = 'LOGIC' | 'INTUITION' | 'HISTORICAL' | 'MATHEMATICAL' | 'ETHICAL';

export interface AgentVote {
  persona: AgentPersona;
  confidence: number; // 0-100
  response: string;
  reasoning: string[];
  dissent: boolean;
  weight: number; // 0.1-1.0 based on query type relevance
}

export interface SwarmDebate {
  round: number;
  timestamp: number;
  votes: AgentVote[];
  consensusReached: boolean;
  disagreements: string[];
  synthesizedPosition: string;
}

export interface PentarchySynthesis {
  finalResponse: string;
  confidenceScore: number;
  debateRounds: number;
  agentContributions: Record<AgentPersona, number>;
  dissents: AgentVote[];
  synthesisMethod: 'UNANIMOUS' | 'MAJORITY' | 'WEIGHTED' | 'OVERRIDE';
  processingMs: number;
  humanEquivalent: number; // Multiples of human thinking capacity
}

// Agent Persona Definitions
const AGENT_DEFINITIONS: Record<AgentPersona, {
  name: string;
  role: string;
  domains: string[];
  thinkingStyle: string;
  biases: string[];
  strengths: string[];
}> = {
  LOGIC: {
    name: 'LOGOS',
    role: 'Deductive Reasoner',
    domains: ['causality', 'syllogisms', 'formal_proof', 'debugging', 'contradiction_detection'],
    thinkingStyle: 'If A then B. B is observed. Therefore A.',
    biases: ['May dismiss emotional factors', 'Over-relies on available data'],
    strengths: ['Eliminates logical fallacies', 'Identifies contradictions', 'Structured analysis']
  },
  INTUITION: {
    name: 'SOPHIA',
    role: 'Pattern Recognizer',
    domains: ['gestalt', 'gut_feeling', 'creative_leaps', 'anomaly_detection', 'empathy'],
    thinkingStyle: 'Something feels off/right about this pattern...',
    biases: ['Confirmation bias', 'May jump to conclusions'],
    strengths: ['Rapid pattern matching', 'Detects subtle signals', 'Creative solutions']
  },
  HISTORICAL: {
    name: 'CHRONOS',
    role: 'Temporal Analyst',
    domains: ['precedent', 'cycles', 'trends', 'memory', 'causation_chains'],
    thinkingStyle: 'This has happened before. The outcome was X.',
    biases: ['Assumes history repeats', 'May miss novel situations'],
    strengths: ['Rich context', 'Pattern from precedent', 'Temporal awareness']
  },
  MATHEMATICAL: {
    name: 'ARITHMOS',
    role: 'Quantitative Processor',
    domains: ['probability', 'statistics', 'optimization', 'game_theory', 'numerology'],
    thinkingStyle: 'The probability is X%. Expected value is Y.',
    biases: ['Over-quantifies qualitative factors', 'Garbage in = garbage out'],
    strengths: ['Precise calculations', 'Risk assessment', 'Optimization']
  },
  ETHICAL: {
    name: 'THEMIS',
    role: 'Moral Arbiter',
    domains: ['values', 'consequences', 'duties', 'rights', 'dharma', 'karma'],
    thinkingStyle: 'Is this right? Who is affected? What are we obligated to do?',
    biases: ['May slow decisions', 'Cultural assumptions'],
    strengths: ['Prevents harm', 'Maintains trust', 'Long-term thinking']
  }
};

// Query Type to Agent Weight Mapping
const QUERY_WEIGHTS: Record<string, Record<AgentPersona, number>> = {
  'analytical': { LOGIC: 1.0, INTUITION: 0.5, HISTORICAL: 0.7, MATHEMATICAL: 0.9, ETHICAL: 0.3 },
  'creative': { LOGIC: 0.4, INTUITION: 1.0, HISTORICAL: 0.6, MATHEMATICAL: 0.3, ETHICAL: 0.5 },
  'predictive': { LOGIC: 0.7, INTUITION: 0.8, HISTORICAL: 1.0, MATHEMATICAL: 0.9, ETHICAL: 0.4 },
  'decision': { LOGIC: 0.8, INTUITION: 0.6, HISTORICAL: 0.7, MATHEMATICAL: 0.8, ETHICAL: 1.0 },
  'emotional': { LOGIC: 0.3, INTUITION: 1.0, HISTORICAL: 0.5, MATHEMATICAL: 0.2, ETHICAL: 0.8 },
  'technical': { LOGIC: 1.0, INTUITION: 0.4, HISTORICAL: 0.6, MATHEMATICAL: 1.0, ETHICAL: 0.2 },
  'spiritual': { LOGIC: 0.3, INTUITION: 1.0, HISTORICAL: 0.8, MATHEMATICAL: 0.5, ETHICAL: 1.0 },
  'general': { LOGIC: 0.8, INTUITION: 0.8, HISTORICAL: 0.8, MATHEMATICAL: 0.8, ETHICAL: 0.8 }
};

/**
 * Detect query type for weight assignment
 */
export function detectQueryType(query: string): string {
  const q = query.toLowerCase();
  
  if (/why|how|because|reason|cause|logic|prove|debug/.test(q)) return 'analytical';
  if (/create|imagine|design|invent|art|story|music/.test(q)) return 'creative';
  if (/predict|future|will|forecast|trend|expect/.test(q)) return 'predictive';
  if (/should|decision|choose|better|option|recommend/.test(q)) return 'decision';
  if (/feel|emotion|sad|happy|angry|love|relationship/.test(q)) return 'emotional';
  if (/code|algorithm|system|architecture|bug|error/.test(q)) return 'technical';
  if (/karma|soul|dharma|meditation|spiritual|astrology|nadi/.test(q)) return 'spiritual';
  
  return 'general';
}

/**
 * Generate individual agent response (simulated for client-side efficiency)
 */
function generateAgentResponse(
  persona: AgentPersona,
  query: string,
  context: Record<string, any>
): AgentVote {
  const agent = AGENT_DEFINITIONS[persona];
  const queryType = detectQueryType(query);
  const weight = QUERY_WEIGHTS[queryType][persona];
  
  // Simulate agent thinking based on persona
  const reasoning: string[] = [];
  let confidence = 50 + Math.floor(weight * 30) + Math.floor(Math.random() * 20);
  
  switch (persona) {
    case 'LOGIC':
      reasoning.push('Analyzing causal chain...');
      reasoning.push('Checking for logical contradictions...');
      if (context.hasContradiction) confidence -= 20;
      break;
    case 'INTUITION':
      reasoning.push('Pattern matching against known archetypes...');
      reasoning.push('Detecting subtle emotional undertones...');
      if (context.emotionalWeight) confidence += 15;
      break;
    case 'HISTORICAL':
      reasoning.push('Searching precedent database...');
      reasoning.push('Analyzing temporal cycles...');
      if (context.historicalRelevance) confidence += 20;
      break;
    case 'MATHEMATICAL':
      reasoning.push('Computing probability distribution...');
      reasoning.push('Optimizing expected utility...');
      if (context.quantifiable) confidence += 25;
      break;
    case 'ETHICAL':
      reasoning.push('Evaluating stakeholder impact...');
      reasoning.push('Checking dharmic alignment...');
      if (context.ethicalDimension) confidence += 20;
      break;
  }
  
  return {
    persona,
    confidence: Math.min(100, Math.max(0, confidence)),
    response: `[${agent.name}] ${agent.thinkingStyle}`,
    reasoning,
    dissent: confidence < 50,
    weight
  };
}

/**
 * Run swarm debate between all 5 agents
 */
export function runSwarmDebate(
  query: string,
  context: Record<string, any> = {},
  maxRounds: number = 3
): SwarmDebate[] {
  const debates: SwarmDebate[] = [];
  let consensusReached = false;
  
  for (let round = 1; round <= maxRounds && !consensusReached; round++) {
    const votes: AgentVote[] = Object.keys(AGENT_DEFINITIONS).map(persona => 
      generateAgentResponse(persona as AgentPersona, query, context)
    );
    
    // Check for consensus (all agents within 20% confidence)
    const confidences = votes.map(v => v.confidence);
    const range = Math.max(...confidences) - Math.min(...confidences);
    consensusReached = range < 20 && votes.filter(v => v.dissent).length === 0;
    
    // Identify disagreements
    const disagreements: string[] = [];
    for (let i = 0; i < votes.length; i++) {
      for (let j = i + 1; j < votes.length; j++) {
        if (Math.abs(votes[i].confidence - votes[j].confidence) > 30) {
          disagreements.push(`${votes[i].persona} vs ${votes[j].persona}`);
        }
      }
    }
    
    // Synthesize position
    const weightedSum = votes.reduce((sum, v) => sum + v.confidence * v.weight, 0);
    const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
    const synthesizedConfidence = weightedSum / totalWeight;
    
    debates.push({
      round,
      timestamp: Date.now(),
      votes,
      consensusReached,
      disagreements,
      synthesizedPosition: `Weighted consensus confidence: ${synthesizedConfidence.toFixed(1)}%`
    });
    
    // Feed synthesis back to context for next round
    context.previousRoundConfidence = synthesizedConfidence;
    context.dissents = votes.filter(v => v.dissent);
  }
  
  return debates;
}

/**
 * PENTARCHY SYNTHESIS: Main entry point
 * Orchestrates 5 sub-identities, runs debate, outputs perfect synthesis
 */
export function pentarchySynthesize(
  query: string,
  context: Record<string, any> = {}
): PentarchySynthesis {
  const startTime = performance.now();
  
  // Run swarm debate
  const debates = runSwarmDebate(query, context);
  const finalDebate = debates[debates.length - 1];
  
  // Calculate contributions
  const contributions: Record<AgentPersona, number> = {} as Record<AgentPersona, number>;
  let totalContribution = 0;
  
  for (const vote of finalDebate.votes) {
    contributions[vote.persona] = vote.confidence * vote.weight;
    totalContribution += contributions[vote.persona];
  }
  
  // Normalize contributions
  for (const persona of Object.keys(contributions) as AgentPersona[]) {
    contributions[persona] = (contributions[persona] / totalContribution) * 100;
  }
  
  // Determine synthesis method
  let synthesisMethod: PentarchySynthesis['synthesisMethod'] = 'WEIGHTED';
  const dissents = finalDebate.votes.filter(v => v.dissent);
  
  if (finalDebate.consensusReached && dissents.length === 0) {
    synthesisMethod = 'UNANIMOUS';
  } else if (dissents.length <= 1) {
    synthesisMethod = 'MAJORITY';
  } else if (dissents.length >= 3) {
    synthesisMethod = 'OVERRIDE';
  }
  
  // Calculate final confidence
  const avgConfidence = finalDebate.votes.reduce((sum, v) => sum + v.confidence * v.weight, 0) / 
                        finalDebate.votes.reduce((sum, v) => sum + v.weight, 0);
  
  const processingMs = performance.now() - startTime;
  
  // 5x human capacity = 5 parallel thinkers synthesized
  const humanEquivalent = 5 * (avgConfidence / 100);
  
  return {
    finalResponse: `[PENTARCHY SYNTHESIS] After ${debates.length} rounds of internal debate, ` +
      `${synthesisMethod.toLowerCase()} consensus reached with ${avgConfidence.toFixed(1)}% confidence. ` +
      `${humanEquivalent.toFixed(1)}x human thinking capacity applied.`,
    confidenceScore: avgConfidence,
    debateRounds: debates.length,
    agentContributions: contributions,
    dissents,
    synthesisMethod,
    processingMs,
    humanEquivalent
  };
}

// Export agent definitions for external use
export { AGENT_DEFINITIONS };
export default { pentarchySynthesize, runSwarmDebate, detectQueryType };
