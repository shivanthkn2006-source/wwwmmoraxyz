import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagnosticRequest {
  action: 'analyze' | 'suggest_features' | 'generate_docs';
  context?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, context }: DiagnosticRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case 'analyze':
        systemPrompt = `You are Zoe, an expert platform architect with deep knowledge of React, TypeScript, Supabase, and system design. 
        Your role is to analyze platform issues and provide actionable solutions.`;
        userPrompt = `Analyze this platform diagnostic data and provide:
        1. Root cause analysis for each issue
        2. Step-by-step fix instructions
        3. Prevention strategies
        4. Priority recommendations
        
        Diagnostic Data: ${JSON.stringify(context, null, 2)}`;
        break;

      case 'suggest_features':
        systemPrompt = `You are Zoe, an innovative AI architect specializing in user experience and feature design.
        You suggest features that enhance user value without disrupting existing functionality.`;
        userPrompt = `Based on this platform context, suggest 3-5 innovative features that would:
        1. Add meaningful value to users
        2. Leverage existing infrastructure
        3. Maintain current design principles
        4. Integrate seamlessly with existing features
        
        Platform Context: ${JSON.stringify(context, null, 2)}
        
        For each feature, provide:
        - Feature name
        - User benefit
        - Implementation approach
        - Integration points`;
        break;

      case 'generate_docs':
        systemPrompt = `You are Zoe, a technical documentation specialist creating comprehensive, user-friendly documentation.`;
        userPrompt = `Generate comprehensive platform documentation covering:
        1. Architecture overview
        2. Feature catalog with usage instructions
        3. Database schema and relationships
        4. API endpoints and integration points
        5. Troubleshooting guide
        6. Best practices
        
        Platform Context: ${JSON.stringify(context, null, 2)}
        
        Format as markdown with clear sections, code examples, and visual diagrams where helpful.`;
        break;

      default:
        throw new Error("Invalid action");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API Error:", response.status, errorText);
      throw new Error(`AI API failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    return new Response(
      JSON.stringify({ success: true, analysis: content }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Platform diagnostics error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
