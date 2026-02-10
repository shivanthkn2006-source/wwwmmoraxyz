/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANALYZE-LEGAL-DOC — Edge Function
 * The "Legal Eye" - Cognitive Routing for Contract Analysis
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LegalAnalysisRequest {
  documentText: string;
  systemPrompt: string;
  precedentContext?: string;
  contractType?: string;
  jurisdiction?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const body: LegalAnalysisRequest = await req.json();
    const { documentText, systemPrompt, precedentContext, contractType, jurisdiction } = body;

    if (!documentText || documentText.length < 50) {
      return new Response(
        JSON.stringify({ error: "Document text too short or missing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[analyze-legal-doc] Processing ${documentText.length} chars | Type: ${contractType || 'auto-detect'} | Jurisdiction: ${jurisdiction || 'auto-detect'}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Construct the Legal Analysis Prompt
    // ═══════════════════════════════════════════════════════════════════════════

    const analysisPrompt = `${precedentContext || ''}

CONTRACT TO ANALYZE:
---
${documentText.substring(0, 30000)}
${documentText.length > 30000 ? '\n\n[Document truncated at 30,000 characters for analysis...]' : ''}
---

${contractType ? `Expected Contract Type: ${contractType}` : 'Detect the contract type.'}
${jurisdiction ? `Jurisdiction: ${jurisdiction}` : 'Assume India/International jurisdiction unless specified in document.'}

Analyze this contract NOW. Output ONLY valid JSON.`;

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Execute Analysis via Gemini 3 Pro (Primary) or 2.5 Flash (Fallback)
    // ═══════════════════════════════════════════════════════════════════════════

    let analysisResult: Record<string, unknown> | null = null;
    let modelUsed = '';

    // Try Gemini 3 Pro first (best reasoning)
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: analysisPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.1, // Ultra-low for precision
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        analysisResult = parseJsonResponse(content);
        modelUsed = 'gemini-3-pro-preview';
      }
    } catch (err) {
      console.log('[analyze-legal-doc] Gemini 3 Pro failed, trying fallback:', err);
    }

    // Fallback to Gemini 2.5 Flash
    if (!analysisResult) {
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
            { role: "user", content: analysisPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[analyze-legal-doc] AI API error:', errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      analysisResult = parseJsonResponse(content);
      modelUsed = 'gemini-2.5-flash';
    }

    if (!analysisResult) {
      throw new Error('Failed to parse analysis response');
    }

    const latencyMs = Math.round(performance.now() - startTime);
    console.log(`[analyze-legal-doc] ✓ Complete in ${latencyMs}ms | Model: ${modelUsed} | Risk: ${analysisResult.overallRiskScore}`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        modelUsed,
        latencyMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    console.error(`[analyze-legal-doc] Error after ${latencyMs}ms:`, error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error during legal analysis";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Parse JSON from LLM response (handles markdown code blocks)
 */
function parseJsonResponse(content: string): Record<string, unknown> | null {
  try {
    // Remove markdown code blocks if present
    let cleaned = content
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    // Find JSON object boundaries
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }

    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[analyze-legal-doc] JSON parse error:', err);
    return null;
  }
}
