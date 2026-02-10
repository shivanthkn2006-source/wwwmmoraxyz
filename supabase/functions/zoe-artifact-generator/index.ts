// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ARTIFACT GENERATOR - Vision, Chronicle, Education
// Part 5: The Visionary (Protocol Artifact)
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArtifactRequest {
  type: 'vision' | 'chronicle' | 'education';
  prompt: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  subject?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[Artifact ${requestId}] Request received`);

  try {
    const body: ArtifactRequest = await req.json();
    const { type, prompt, conversationHistory, subject } = body;

    console.log(`[Artifact ${requestId}] Type: ${type}, Subject: ${subject || 'N/A'}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VISION: Generate cinematic image
    // ═══════════════════════════════════════════════════════════════════════════
    if (type === 'vision') {
      const enhancedPrompt = `Ultra high resolution, cinematic masterpiece, breathtaking visual: ${prompt}. 
        Dramatic lighting, photorealistic detail, museum quality artwork, 8K resolution.
        Style: Epic cinematic visualization, otherworldly beauty.`;

      console.log(`[Artifact ${requestId}] Generating vision...`);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [{ role: 'user', content: enhancedPrompt }],
          modalities: ['image', 'text'],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Artifact ${requestId}] Vision error:`, response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'RATE_LIMIT', message: 'Vision manifesting too fast. Please wait a moment.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'NO_CREDITS', message: 'Vision requires credits. Please top up.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`Vision generation failed: ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl) {
        throw new Error('No image generated');
      }

      console.log(`[Artifact ${requestId}] Vision manifested successfully`);

      return new Response(
        JSON.stringify({
          type: 'vision',
          content: imageUrl,
          title: subject || 'Vision',
          description: data.choices?.[0]?.message?.content || 'A glimpse into the infinite.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EDUCATION: Generate worksheet image
    // ═══════════════════════════════════════════════════════════════════════════
    if (type === 'education') {
      const worksheetPrompt = `Create a clean, professional educational worksheet image.
        Topic: ${subject || prompt}
        
        Requirements:
        - Clean black and white design suitable for printing
        - Clear title at the top
        - 5-8 practice problems or exercises
        - Space for student answers
        - Instructions clearly written
        - Professional educational layout
        - Include a mix of difficulty levels
        
        Style: Clean, minimalist, professional educational material design.`;

      console.log(`[Artifact ${requestId}] Generating worksheet...`);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [{ role: 'user', content: worksheetPrompt }],
          modalities: ['image', 'text'],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Artifact ${requestId}] Worksheet error:`, response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'RATE_LIMIT', message: 'Worksheet generation too fast. Please wait.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`Worksheet generation failed: ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl) {
        throw new Error('No worksheet generated');
      }

      console.log(`[Artifact ${requestId}] Worksheet created successfully`);

      return new Response(
        JSON.stringify({
          type: 'education',
          content: imageUrl,
          title: `${subject || 'Practice'} Worksheet`,
          description: 'Educational worksheet ready for download.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CHRONICLE: Generate PDF report data
    // ═══════════════════════════════════════════════════════════════════════════
    if (type === 'chronicle') {
      console.log(`[Artifact ${requestId}] Compiling chronicle...`);

      // Use AI to summarize and structure the conversation
      const summaryPrompt = `You are compiling a professional report based on a conversation.
        
        Conversation:
        ${conversationHistory?.map(m => `${m.role}: ${m.content}`).join('\n') || 'No conversation provided.'}
        
        Create a structured report with:
        1. Executive Summary (2-3 sentences)
        2. Key Points Discussed (bullet points)
        3. Insights & Analysis
        4. Recommendations (if applicable)
        5. Conclusion
        
        Format the response as a JSON object with these sections as keys.
        Be concise but comprehensive.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: summaryPrompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Artifact ${requestId}] Chronicle error:`, response.status, errorText);
        throw new Error(`Chronicle generation failed: ${response.status}`);
      }

      const data = await response.json();
      const summaryContent = data.choices?.[0]?.message?.content || '';

      // Parse the JSON response or use raw text
      let reportData;
      try {
        // Try to extract JSON from the response
        const jsonMatch = summaryContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          reportData = JSON.parse(jsonMatch[0]);
        } else {
          reportData = { content: summaryContent };
        }
      } catch {
        reportData = { content: summaryContent };
      }

      console.log(`[Artifact ${requestId}] Chronicle compiled successfully`);

      return new Response(
        JSON.stringify({
          type: 'chronicle',
          content: reportData,
          title: subject || 'Conversation Chronicle',
          description: 'Your conversation compiled into a comprehensive report.',
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown type
    return new Response(
      JSON.stringify({ error: 'Unknown artifact type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[Artifact ${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'ARTIFACT_ERROR', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
