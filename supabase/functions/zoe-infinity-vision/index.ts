// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 7: ZOE INFINITY VISION - Multi-Modal Image Analysis
// Uses Gemini Vision to analyze images, documents, screenshots, etc.
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisionRequest {
  imageUrl: string;
  prompt: string;
  inputType: string;
  extractStructuredData?: boolean;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ─── AUTH GATE ───
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[Zoe Vision] ═══ VISION ANALYSIS REQUEST ═══');

  try {
    const lovableKey = sovereignKey();
    
    if (!lovableKey) {
      console.error('[Zoe Vision] SOVEREIGN_AI_KEY not configured');
      return new Response(JSON.stringify({ 
        error: 'Vision service not configured',
        description: 'I can see you shared an image, but my vision is temporarily unavailable.',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const request: VisionRequest = await req.json();
    const { imageUrl, prompt, inputType, extractStructuredData } = request;

    // ─── INPUT GUARDS ───
    if (!imageUrl || typeof imageUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'imageUrl required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Allow only data: URIs or https URLs (block file:, javascript:, etc.)
    if (!/^(data:image\/|https:\/\/)/.test(imageUrl)) {
      return new Response(JSON.stringify({ error: 'imageUrl must be data:image/* or https://' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Cap base64 payload size at ~6MB (~8M base64 chars) to prevent abuse
    if (imageUrl.startsWith('data:') && imageUrl.length > 8_000_000) {
      return new Response(JSON.stringify({ error: 'image too large (max ~6MB)' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Zoe Vision] Analyzing ${inputType} image...`);

    // ═══════════════════════════════════════════════════════════════════════════
    // Build vision analysis prompt
    // ═══════════════════════════════════════════════════════════════════════════
    
    let systemPrompt = `You are Zoe's vision system. Analyze images with precision and warmth.
    
RESPONSE FORMAT:
1. Description: A natural, conversational description of what you see
2. Key Details: Important elements, text, objects
3. Context: What this image means or could be used for

Be specific but conversational. Describe as if telling a friend what you see.
If there's text in the image, extract it exactly.`;

    if (extractStructuredData) {
      systemPrompt += `\n\nEXTRACT STRUCTURED DATA:
If the image contains structured information (receipts, forms, cards, etc.), 
also provide a JSON object with the extracted data.`;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Call Gemini Vision
    // ═══════════════════════════════════════════════════════════════════════════
    
    const response = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({
          error: 'Rate limited',
          description: 'My vision needs a moment to rest. Try again in a few seconds.',
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const errorText = await response.text();
      console.error('[Zoe Vision] API error:', response.status, errorText);
      throw new Error(`Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content || '';

    console.log('[Zoe Vision] Analysis complete, length:', analysisText.length);

    // ═══════════════════════════════════════════════════════════════════════════
    // Parse response into structured format
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Extract text that appears to be OCR'd content
    const textMatch = analysisText.match(/(?:text|reads?|says?|written):\s*["']?([^"'\n]+)["']?/gi);
    const extractedText = textMatch 
      ? textMatch.map((m: string) => m.replace(/^(?:text|reads?|says?|written):\s*["']?/i, '').replace(/["']?$/, '')).join(' ')
      : undefined;

    // Try to extract structured data if present
    let structuredData: Record<string, unknown> | undefined;
    const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        structuredData = JSON.parse(jsonMatch[1]);
      } catch {
        // JSON parsing failed, ignore
      }
    }

    // Detect objects mentioned
    const objectPatterns = /(?:see|shows?|contains?|includes?)\s+(?:a|an|the|some)?\s*([a-zA-Z\s]+?)(?:,|\.|and|with|on|in)/gi;
    const objectMatches = Array.from(analysisText.matchAll(objectPatterns)) as RegExpMatchArray[];
    const detectedObjects = objectMatches
      .map((m) => m[1]?.trim().toLowerCase() || '')
      .filter((o, i, arr) => o.length > 2 && arr.indexOf(o) === i)
      .slice(0, 15);

    // Create clean description (first paragraph or first 300 chars)
    const description = analysisText
      .split('\n\n')[0]
      .replace(/```json[\s\S]*?```/g, '')
      .trim()
      .substring(0, 500);

    return new Response(JSON.stringify({
      success: true,
      description,
      detailedAnalysis: analysisText,
      extractedText,
      detectedObjects,
      structuredData,
      confidence: 0.85,
      inputType,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Zoe Vision] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Vision processing error',
      description: 'I see you shared an image, but I had trouble analyzing it clearly.',
      confidence: 0,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
