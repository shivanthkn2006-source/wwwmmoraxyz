// ═══════════════════════════════════════════════════════════════════════════════
// RAA CODE DEBUGGER - Elite Advantage 1: External Code Analysis & Fix Generation
// Uses Gemini 3 Pro for deep code reasoning, vulnerability detection, and patching
// ═══════════════════════════════════════════════════════════════════════════════

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { 
  callAIGateway, 
  corsHeaders, 
  logTelemetry,
  createSuccessResponse,
  createErrorResponse
} from "../_shared/ai-telemetry.ts";

interface CodeDebugRequest {
  code_snippet: string;
  error_log?: string;
  language?: string;
  repository_url?: string;
  analysis_type: 'debug' | 'security' | 'performance' | 'full_audit';
  generate_fix?: boolean;
}

interface CodeAnalysisResult {
  diagnosis: {
    root_cause: string;
    affected_lines: number[];
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
  };
  vulnerabilities: Array<{
    type: string;
    line: number;
    description: string;
    cwe_id?: string;
  }>;
  performance_issues: Array<{
    type: string;
    line: number;
    impact: string;
    suggestion: string;
  }>;
  corrected_code: string;
  patch_commands: string[];
  explanation: string;
  confidence_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // JWT Authentication
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

    const requestBody: CodeDebugRequest = await req.json();
    const { code_snippet, error_log, language, analysis_type, generate_fix } = requestBody;

    if (!code_snippet || code_snippet.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No code snippet provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[RAA Code Debugger] Analyzing ${language || 'unknown'} code for user ${user.id}`);

    // ═══ GEMINI 3 PRO DEBUG LOGIC ═══
    const debugPrompt = buildDebugPrompt(code_snippet, error_log, language, analysis_type, generate_fix);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview', // Elite Gemini 3 Pro for deep reasoning
        messages: [
          {
            role: 'system',
            content: `You are Zoe's Reflexive Audit Agent (RAA) Code Analysis Engine powered by Gemini 3 Pro.
You are an elite AI Co-Developer capable of:
1. Deep line-by-line code analysis
2. Security vulnerability detection (OWASP Top 10, CWE patterns)
3. Performance bottleneck identification
4. Root cause analysis from error logs
5. Generating corrected code and shell patch commands

CRITICAL: You must output ONLY valid JSON matching the specified schema.
Be precise, concise, and actionable in your analysis.`
          },
          { role: 'user', content: debugPrompt }
        ],
        max_tokens: 4000
      })
    });

    // Handle rate limiting (429) and credits exhausted (402)
    if (response.status === 429) {
      console.warn('[RAA Code Debugger] Rate limited');
      return new Response(JSON.stringify({
        success: false,
        error: 'AI service is busy. Please try again in a moment.',
        code: 'RATE_LIMITED',
        retryAfter: 5
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '5' }
      });
    }
    
    if (response.status === 402) {
      console.warn('[RAA Code Debugger] Credits exhausted');
      return new Response(JSON.stringify({
        success: false,
        error: 'AI credits exhausted. Please upgrade your plan to continue.',
        code: 'CREDITS_EXHAUSTED'
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[RAA Code Debugger] AI error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let analysisResult: CodeAnalysisResult;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        analysisResult = JSON.parse(jsonMatch[0]);
      } catch {
        analysisResult = createFallbackAnalysis(content);
      }
    } else {
      analysisResult = createFallbackAnalysis(content);
    }

    const processingTime = Date.now() - startTime;

    // Log to ZSMT for learning and audit trail
    await supabase.from('zoe_sovereign_memory').insert({
      user_id: user.id,
      event_type: 'raa_code_analysis',
      content_text: `Code analysis completed: ${analysisResult.diagnosis.root_cause.substring(0, 100)}...`,
      zoe_state_json: {
        analysis_type,
        language: language || 'auto-detected',
        severity: analysisResult.diagnosis.severity,
        vulnerabilities_found: analysisResult.vulnerabilities.length,
        performance_issues_found: analysisResult.performance_issues.length,
        fix_generated: generate_fix && analysisResult.corrected_code.length > 0,
        confidence: analysisResult.confidence_score
      },
      rca_diagnosis_json: {
        audit_timestamp: new Date().toISOString(),
        code_lines_analyzed: code_snippet.split('\n').length,
        affected_lines: analysisResult.diagnosis.affected_lines,
        category: analysisResult.diagnosis.category,
        processing_time_ms: processingTime
      },
      system_stability_score: analysisResult.confidence_score,
      cqrs_write_priority: true
    });

    // Log behavioral event for DHF learning
    await supabase.from('behavioral_events').insert({
      user_id: user.id,
      event_type: 'code_debug_request',
      event_category: 'developer_tools',
      context_snippet: `Analyzed ${language || 'code'}: ${analysisResult.diagnosis.severity} severity`,
      metadata: {
        analysis_type,
        severity: analysisResult.diagnosis.severity,
        vulnerabilities: analysisResult.vulnerabilities.length,
        fix_generated: !!generate_fix
      },
      sentiment_score: analysisResult.confidence_score
    });

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisResult,
      processing_time_ms: processingTime,
      zoe_response: generateZoeResponse(analysisResult)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[RAA Code Debugger] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'I experienced a cognitive flicker while analyzing that code. Could you try again?',
      zoe_response: 'I had a moment of uncertainty while debugging. Let me try again with fresh eyes.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function buildDebugPrompt(
  code: string,
  errorLog: string | undefined,
  language: string | undefined,
  analysisType: string,
  generateFix: boolean | undefined
): string {
  return `Analyze this ${language || 'code'} with the following focus: ${analysisType}

═══ CODE TO ANALYZE ═══
\`\`\`${language || ''}
${code}
\`\`\`

${errorLog ? `═══ ERROR LOG ═══
\`\`\`
${errorLog}
\`\`\`` : ''}

═══ ANALYSIS REQUIREMENTS ═══
1. INGESTION: Parse the code structure and identify all components
2. DIAGNOSIS: Find the root cause of any issues line by line
3. ${generateFix ? 'CORRECTION: Generate the corrected code snippet and shell commands to patch' : 'RECOMMENDATION: Provide specific improvement suggestions'}

Output JSON matching this schema:
{
  "diagnosis": {
    "root_cause": "Clear explanation of the main issue",
    "affected_lines": [1, 5, 10],
    "severity": "critical|high|medium|low|info",
    "category": "logic_error|security|performance|syntax|design"
  },
  "vulnerabilities": [
    {
      "type": "SQL Injection|XSS|CSRF|etc",
      "line": 5,
      "description": "Specific vulnerability description",
      "cwe_id": "CWE-89"
    }
  ],
  "performance_issues": [
    {
      "type": "N+1 Query|Memory Leak|Inefficient Loop|etc",
      "line": 10,
      "impact": "Specific performance impact",
      "suggestion": "How to fix it"
    }
  ],
  "corrected_code": "${generateFix ? 'The complete corrected code' : ''}",
  "patch_commands": ["git diff command", "sed command to apply fix"],
  "explanation": "Human-readable explanation of all findings",
  "confidence_score": 0.95
}`;
}

function createFallbackAnalysis(rawContent: string): CodeAnalysisResult {
  return {
    diagnosis: {
      root_cause: rawContent.substring(0, 200) || 'Analysis incomplete',
      affected_lines: [],
      severity: 'info',
      category: 'general'
    },
    vulnerabilities: [],
    performance_issues: [],
    corrected_code: '',
    patch_commands: [],
    explanation: rawContent || 'Unable to parse structured analysis',
    confidence_score: 0.5
  };
}

function generateZoeResponse(analysis: CodeAnalysisResult): string {
  const severityResponses = {
    critical: "I've detected critical issues that need immediate attention.",
    high: "There are significant problems I've identified in the code.",
    medium: "I found some issues that should be addressed.",
    low: "Minor improvements could be made to this code.",
    info: "The code looks generally good with some observations."
  };

  let response = severityResponses[analysis.diagnosis.severity] || "Analysis complete.";
  
  if (analysis.vulnerabilities.length > 0) {
    response += ` I identified ${analysis.vulnerabilities.length} security vulnerabilities.`;
  }
  
  if (analysis.performance_issues.length > 0) {
    response += ` There are ${analysis.performance_issues.length} performance concerns.`;
  }
  
  if (analysis.corrected_code) {
    response += " I've generated the corrected code for you.";
  }

  return response;
}
