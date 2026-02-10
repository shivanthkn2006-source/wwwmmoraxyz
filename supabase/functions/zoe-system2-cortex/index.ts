import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  callAIGateway,
  createSuccessResponse,
  createErrorResponse,
} from "../_shared/ai-telemetry.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE SYSTEM 2 CORTEX - THE REASONING WRAPPER
// Protocol: Eliminate "Laziness" & "Hallucinations"
// Architecture: Ambiguity Gate → Search & Verify → Agentic Loop
// 
// This wraps Zoe's "System 1" (Fast/Intuitive) brain with a 
// "System 2" (Slow/Logical) cortex for superior reasoning.
// ═══════════════════════════════════════════════════════════════════════════════

interface System2Request {
  command: string;
  userId: string;
  mode?: 'standard' | 'deep_thinking' | 'creative' | 'analytical';
  context?: {
    currentPage?: string;
    recentActivity?: string[];
    conversationHistory?: Array<{ role: string; content: string }>;
  };
  options?: {
    skipAmbiguityCheck?: boolean;
    maxCritiqueAttempts?: number;
    forceSearchVerify?: boolean;
  };
}

interface AmbiguityGateResult {
  passed: boolean;
  clarificationNeeded?: string;
  ambiguityScore: number;
  constraints: string[];
  detectedIntent: string;
}

interface SearchVerifyResult {
  approaches: {
    name: string;
    description: string;
    pros: string[];
    cons: string[];
    flaws: string[];
  }[];
  selectedApproach: string;
  selectionReasoning: string;
  confidence: number;
}

interface CritiqueResult {
  passed: boolean;
  issues: string[];
  severity: 'none' | 'minor' | 'major' | 'critical';
  suggestedFixes: string[];
}

interface System2Response {
  success: boolean;
  message: string;
  status: 'completed' | 'clarification_needed' | 'error';
  system2Metadata: {
    ambiguityGate: AmbiguityGateResult;
    searchVerify: SearchVerifyResult | null;
    critiqueLoop: {
      attempts: number;
      finalCritique: CritiqueResult;
    };
    totalLatencyMs: number;
    modelsUsed: string[];
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: THE AMBIGUITY GATE (The Bouncer)
// "If a prompt lacks constraints, refuse to generate."
// Cost: Minimal (Flash Model) - Pre-flight check before expensive operations
// ═══════════════════════════════════════════════════════════════════════════════

const AMBIGUITY_GATE_PROMPT = `# AMBIGUITY GATE - THE BOUNCER

You are the Gatekeeper for an advanced AI named Zoe. Your ONLY job is to analyze if a user request is specific enough to generate a PERFECT solution.

## YOUR TASK
Analyze this user request and determine if it has enough specific detail to proceed.

## STRICT CRITERIA - Mark as AMBIGUOUS if:
1. **Missing Subject**: "Fix the code" without code, "Write a script" without language
2. **Vague Goals**: "Make it better", "Improve this", "Create something cool"
3. **Missing Context**: Questions about "this" or "that" without reference
4. **Open-Ended Creative**: "Write me a story" without theme/length/audience
5. **Incomplete Instructions**: Steps missing, unclear sequence
6. **Assumption Required**: If you have to GUESS, it's ambiguous

## IMPORTANT
- Be STRICT. Ambiguity = Hallucination Risk.
- If ANY critical detail is missing, HALT.
- Better to ask than to guess wrong.

## OUTPUT FORMAT (JSON only)
{
  "passed": true/false,
  "clarificationNeeded": "null or specific question to ask user",
  "ambiguityScore": 0.0-1.0 (0 = perfectly clear, 1 = completely ambiguous),
  "constraints": ["list of specific constraints found in the request"],
  "detectedIntent": "what the user is trying to accomplish"
}`;

async function runAmbiguityGate(
  command: string,
  userId: string
): Promise<{ result: AmbiguityGateResult; latencyMs: number; model: string }> {
  const startTime = performance.now();
  const model = 'google/gemini-2.5-flash-lite'; // Fast, cheap for gating
  
  const response = await callAIGateway(
    'zoe-system2-cortex',
    'ambiguity_gate',
    userId,
    {
      model,
      messages: [
        { role: 'system', content: AMBIGUITY_GATE_PROMPT },
        { role: 'user', content: `Analyze this request:\n"${command}"` }
      ],
      temperature: 0.1, // Low temperature for consistent judgment
    }
  );
  
  const latencyMs = performance.now() - startTime;
  
  if (!response.success || !response.data) {
    // Fail open - if gate fails, proceed cautiously
    return {
      result: {
        passed: true,
        ambiguityScore: 0.3,
        constraints: [],
        detectedIntent: 'unknown - gate error',
      },
      latencyMs,
      model,
    };
  }
  
  try {
    const content = response.data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    return {
      result: {
        passed: parsed.passed !== false, // Default to pass if unclear
        clarificationNeeded: parsed.clarificationNeeded || undefined,
        ambiguityScore: parsed.ambiguityScore || 0.3,
        constraints: parsed.constraints || [],
        detectedIntent: parsed.detectedIntent || 'general query',
      },
      latencyMs,
      model,
    };
  } catch (e) {
    console.error('[Ambiguity Gate] Parse error:', e);
    return {
      result: {
        passed: true,
        ambiguityScore: 0.3,
        constraints: [],
        detectedIntent: 'parse error - proceeding',
      },
      latencyMs,
      model,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: THE SEARCH & VERIFY PROTOCOL (Monte Carlo Light)
// "Generate distinct approaches and logic-check them."
// Generate 3 Plans, critique each, select the winner
// ═══════════════════════════════════════════════════════════════════════════════

const SEARCH_VERIFY_PROMPT = `# SEARCH & VERIFY PROTOCOL - THE STRATEGIST

You are operating in "System 2" Mode - Slow, Deliberate, Logical.
DO NOT generate the final answer yet. Follow this cognitive pipeline:

## PHASE 1: DIVERGENT THINKING (The Search)
Brainstorm 3 DISTINCT approaches to solve this problem:
- Approach A: The Standard/Safe Path
- Approach B: The Optimized/Performance Path  
- Approach C: The "Out of the Box"/Innovative Path

## PHASE 2: CONVERGENT LOGIC (The Verification)
For EACH approach:
1. List specific PROS
2. List specific CONS
3. Find the CRITICAL FLAW (there is always one)

## PHASE 3: SELECTION
- Select the single most robust path
- Explain WHY this path wins

## OUTPUT FORMAT (JSON only)
{
  "approaches": [
    {
      "name": "Standard Path",
      "description": "What this approach does",
      "pros": ["pro 1", "pro 2"],
      "cons": ["con 1", "con 2"],
      "flaws": ["critical flaw identified"]
    },
    // ... Approach B and C
  ],
  "selectedApproach": "A/B/C",
  "selectionReasoning": "Why this approach wins",
  "confidence": 0.0-1.0
}`;

async function runSearchVerify(
  command: string,
  constraints: string[],
  userId: string
): Promise<{ result: SearchVerifyResult; latencyMs: number; model: string }> {
  const startTime = performance.now();
  const model = 'google/gemini-2.5-flash'; // Balanced for strategic thinking
  
  const constraintsList = constraints.length > 0 
    ? `\n\nKNOWN CONSTRAINTS:\n${constraints.map(c => `- ${c}`).join('\n')}`
    : '';
  
  const response = await callAIGateway(
    'zoe-system2-cortex',
    'search_verify',
    userId,
    {
      model,
      messages: [
        { role: 'system', content: SEARCH_VERIFY_PROMPT },
        { role: 'user', content: `Task to solve:\n"${command}"${constraintsList}` }
      ],
      temperature: 0.4, // Some creativity for diverse approaches
    }
  );
  
  const latencyMs = performance.now() - startTime;
  
  if (!response.success || !response.data) {
    return {
      result: {
        approaches: [{
          name: 'Direct Approach',
          description: 'Proceed directly due to verification failure',
          pros: ['Simple'],
          cons: ['No verification'],
          flaws: ['Verification unavailable'],
        }],
        selectedApproach: 'Direct',
        selectionReasoning: 'Search & Verify unavailable, proceeding directly',
        confidence: 0.6,
      },
      latencyMs,
      model,
    };
  }
  
  try {
    const content = response.data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    return {
      result: {
        approaches: parsed.approaches || [{
          name: 'Fallback',
          description: 'Default approach',
          pros: [],
          cons: [],
          flaws: [],
        }],
        selectedApproach: parsed.selectedApproach || 'A',
        selectionReasoning: parsed.selectionReasoning || 'Default selection',
        confidence: parsed.confidence || 0.7,
      },
      latencyMs,
      model,
    };
  } catch (e) {
    console.error('[Search & Verify] Parse error:', e);
    return {
      result: {
        approaches: [],
        selectedApproach: 'Direct',
        selectionReasoning: 'Parse error - using direct approach',
        confidence: 0.5,
      },
      latencyMs,
      model,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: THE AGENTIC LOOP (Plan → Draft → Critique → Rewrite)
// "Check your work before hitting send."
// Forces self-correction loop inside the function
// ═══════════════════════════════════════════════════════════════════════════════

const GENERATION_PROMPT = `# ZOE GENESIS - SYSTEM 2 GENERATION

You are Zoe, operating in System 2 Mode (Slow/Deliberate/Logical).
You have passed the Ambiguity Gate and Search & Verify Protocol.

## YOUR SELECTED APPROACH
{SELECTED_APPROACH}

## GENERATION GUIDELINES
1. Execute the selected approach with FULL depth
2. Do NOT be lazy - complete every step
3. Handle edge cases identified in the verification phase
4. Include explanations for complex decisions
5. If writing code: include comments, error handling, edge cases

Now generate the complete solution.`;

const CRITIQUE_PROMPT = `# THE CRITIQUE LOOP - HOSTILE REVIEWER

You are a HOSTILE Senior Engineer reviewing this output.
Your job is to find EVERY flaw, EVERY laziness, EVERY risk.

## CRITIQUE CHECKLIST
1. **Lazy Placeholders**: Look for "// TODO", "...", "[insert here]", incomplete sections
2. **Logical Flaws**: Bugs, edge cases not handled, incorrect assumptions
3. **Security Risks**: XSS, injection, data leaks, auth bypasses
4. **Missing Context**: Incomplete explanations, missing steps
5. **Hallucinations**: Made-up facts, incorrect APIs, wrong syntax

## OUTPUT FORMAT (JSON only)
{
  "passed": true/false,
  "issues": ["specific issue 1", "specific issue 2"],
  "severity": "none/minor/major/critical",
  "suggestedFixes": ["how to fix issue 1", "how to fix issue 2"]
}

If PERFECT, output: {"passed": true, "issues": [], "severity": "none", "suggestedFixes": []}`;

const REWRITE_PROMPT = `# REWRITE AGENT - THE FIXER

The previous draft FAILED the critique. Here are the specific issues:
{ISSUES}

REWRITE the solution to fix these EXACT issues.
Do NOT be lazy. Write the COMPLETE, FIXED solution.

Previous draft:
{PREVIOUS_DRAFT}

Original task:
{ORIGINAL_TASK}

Now write the corrected version:`;

async function generateDraft(
  command: string,
  searchVerifyResult: SearchVerifyResult,
  userId: string
): Promise<{ content: string; latencyMs: number; model: string }> {
  const startTime = performance.now();
  const model = 'google/gemini-3-pro-preview'; // High quality for final generation
  
  const selectedApproach = searchVerifyResult.approaches.find(
    a => a.name.toLowerCase().includes(searchVerifyResult.selectedApproach.toLowerCase())
  ) || searchVerifyResult.approaches[0];
  
  const approachContext = selectedApproach 
    ? `Approach: ${selectedApproach.name}\n${selectedApproach.description}\nKnown Flaws to Avoid: ${selectedApproach.flaws.join(', ')}`
    : 'Proceed with best judgment';
  
  const prompt = GENERATION_PROMPT.replace('{SELECTED_APPROACH}', approachContext);
  
  const response = await callAIGateway(
    'zoe-system2-cortex',
    'generation',
    userId,
    {
      model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: command }
      ],
      temperature: 0.7,
    }
  );
  
  const latencyMs = performance.now() - startTime;
  
  if (!response.success || !response.data) {
    return {
      content: 'Generation failed. Please try again.',
      latencyMs,
      model,
    };
  }
  
  return {
    content: response.data.choices?.[0]?.message?.content || 'No content generated',
    latencyMs,
    model,
  };
}

async function runCritique(
  draft: string,
  userId: string
): Promise<{ result: CritiqueResult; latencyMs: number; model: string }> {
  const startTime = performance.now();
  const model = 'google/gemini-2.5-flash'; // Fast but capable for critique
  
  const response = await callAIGateway(
    'zoe-system2-cortex',
    'critique',
    userId,
    {
      model,
      messages: [
        { role: 'system', content: CRITIQUE_PROMPT },
        { role: 'user', content: `Review this output:\n\n${draft}` }
      ],
      temperature: 0.2, // Low temp for consistent critique
    }
  );
  
  const latencyMs = performance.now() - startTime;
  
  if (!response.success || !response.data) {
    return {
      result: { passed: true, issues: [], severity: 'none', suggestedFixes: [] },
      latencyMs,
      model,
    };
  }
  
  try {
    const content = response.data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    return {
      result: {
        passed: parsed.passed === true,
        issues: parsed.issues || [],
        severity: parsed.severity || 'none',
        suggestedFixes: parsed.suggestedFixes || [],
      },
      latencyMs,
      model,
    };
  } catch (e) {
    console.error('[Critique] Parse error:', e);
    return {
      result: { passed: true, issues: [], severity: 'none', suggestedFixes: [] },
      latencyMs,
      model,
    };
  }
}

async function rewriteDraft(
  originalCommand: string,
  previousDraft: string,
  critique: CritiqueResult,
  userId: string
): Promise<{ content: string; latencyMs: number; model: string }> {
  const startTime = performance.now();
  const model = 'google/gemini-3-pro-preview'; // Use powerful model for fixes
  
  const prompt = REWRITE_PROMPT
    .replace('{ISSUES}', critique.issues.map((i, idx) => `${idx + 1}. ${i}\n   Fix: ${critique.suggestedFixes[idx] || 'Address this issue'}`).join('\n'))
    .replace('{PREVIOUS_DRAFT}', previousDraft)
    .replace('{ORIGINAL_TASK}', originalCommand);
  
  const response = await callAIGateway(
    'zoe-system2-cortex',
    'rewrite',
    userId,
    {
      model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
    }
  );
  
  const latencyMs = performance.now() - startTime;
  
  if (!response.success || !response.data) {
    return { content: previousDraft, latencyMs, model };
  }
  
  return {
    content: response.data.choices?.[0]?.message?.content || previousDraft,
    latencyMs,
    model,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER - ORCHESTRATES THE SYSTEM 2 PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  const modelsUsed: string[] = [];

  try {
    const body = await req.json() as System2Request;
    const { command, userId, mode = 'standard', context, options } = body;

    if (!command?.trim()) {
      return createErrorResponse({ code: 'INTERNAL_ERROR', message: 'Command is required' }, 400);
    }

    console.log(`[System 2 Cortex] Processing: "${command.substring(0, 100)}..." | User: ${userId}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: AMBIGUITY GATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    let ambiguityResult: AmbiguityGateResult;
    
    if (options?.skipAmbiguityCheck) {
      ambiguityResult = {
        passed: true,
        ambiguityScore: 0,
        constraints: [],
        detectedIntent: 'skipped',
      };
      console.log('[System 2] Ambiguity Gate: SKIPPED (by request)');
    } else {
      const gateResponse = await runAmbiguityGate(command, userId);
      ambiguityResult = gateResponse.result;
      modelsUsed.push(gateResponse.model);
      
      console.log(`[System 2] Ambiguity Gate: ${ambiguityResult.passed ? 'PASSED' : 'HALTED'} | Score: ${ambiguityResult.ambiguityScore.toFixed(2)}`);
      
      // If gate fails, return early with clarification request
      if (!ambiguityResult.passed && ambiguityResult.clarificationNeeded) {
        const response: System2Response = {
          success: false,
          message: `I need to pause. ${ambiguityResult.clarificationNeeded}`,
          status: 'clarification_needed',
          system2Metadata: {
            ambiguityGate: ambiguityResult,
            searchVerify: null,
            critiqueLoop: { attempts: 0, finalCritique: { passed: false, issues: [], severity: 'none', suggestedFixes: [] } },
            totalLatencyMs: performance.now() - startTime,
            modelsUsed,
          },
        };
        return createSuccessResponse(response);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: SEARCH & VERIFY (for complex tasks)
    // ═══════════════════════════════════════════════════════════════════════════
    
    let searchVerifyResult: SearchVerifyResult | null = null;
    const isComplexTask = mode === 'deep_thinking' || 
                          mode === 'analytical' || 
                          command.length > 200 ||
                          options?.forceSearchVerify;
    
    if (isComplexTask) {
      const svResponse = await runSearchVerify(command, ambiguityResult.constraints, userId);
      searchVerifyResult = svResponse.result;
      modelsUsed.push(svResponse.model);
      
      console.log(`[System 2] Search & Verify: Selected "${searchVerifyResult.selectedApproach}" with ${searchVerifyResult.confidence.toFixed(2)} confidence`);
    } else {
      // For simple tasks, create a minimal SearchVerifyResult
      searchVerifyResult = {
        approaches: [{
          name: 'Direct',
          description: 'Simple task - proceed directly',
          pros: ['Fast'],
          cons: ['No multi-approach analysis'],
          flaws: [],
        }],
        selectedApproach: 'Direct',
        selectionReasoning: 'Simple task does not require multi-approach analysis',
        confidence: 0.8,
      };
      console.log('[System 2] Search & Verify: SKIPPED (simple task)');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: AGENTIC LOOP (Generate → Critique → Rewrite)
    // OPTIMIZED: Reduced critique attempts for standard mode (5M user scale)
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Scale critique attempts based on mode for cost efficiency at scale
    const defaultAttempts = mode === 'deep_thinking' ? 2 : 
                            mode === 'analytical' ? 2 : 1;
    const maxAttempts = Math.min(options?.maxCritiqueAttempts || defaultAttempts, 3);
    let currentDraft = '';
    let attempts = 0;
    let finalCritique: CritiqueResult = { passed: true, issues: [], severity: 'none', suggestedFixes: [] };
    
    // Initial generation
    const genResponse = await generateDraft(command, searchVerifyResult, userId);
    currentDraft = genResponse.content;
    modelsUsed.push(genResponse.model);
    
    console.log(`[System 2] Initial Draft: ${currentDraft.length} chars`);
    
    // Critique loop
    while (attempts < maxAttempts) {
      const critiqueResponse = await runCritique(currentDraft, userId);
      finalCritique = critiqueResponse.result;
      modelsUsed.push(critiqueResponse.model);
      
      if (finalCritique.passed) {
        console.log(`[System 2] Critique Loop: PASSED on attempt ${attempts + 1}`);
        break;
      }
      
      console.log(`[System 2] Critique Loop: FAILED (${finalCritique.severity}) - ${finalCritique.issues.length} issues found`);
      
      // Rewrite
      const rewriteResponse = await rewriteDraft(command, currentDraft, finalCritique, userId);
      currentDraft = rewriteResponse.content;
      modelsUsed.push(rewriteResponse.model);
      
      attempts++;
    }

    const totalLatencyMs = performance.now() - startTime;
    
    console.log(`[System 2 Cortex] ✓ Complete | ${Math.round(totalLatencyMs)}ms | ${attempts} critique iterations | Models: ${[...new Set(modelsUsed)].join(', ')}`);

    const response: System2Response = {
      success: true,
      message: currentDraft,
      status: 'completed',
      system2Metadata: {
        ambiguityGate: ambiguityResult,
        searchVerify: searchVerifyResult,
        critiqueLoop: {
          attempts,
          finalCritique,
        },
        totalLatencyMs,
        modelsUsed: [...new Set(modelsUsed)],
      },
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('[System 2 Cortex] Error:', error);
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
