// ═══════════════════════════════════════════════════════════════════════════════
// ZOE UNIVERSAL ARCHITECT (ZUA) - VIRAL ASCENSION ENGINE
// Phase II: 7-Step UPP + 3-Platform Viral Content Generation
// Integrates RAA Code Pre-check for highest IQ output
// ═══════════════════════════════════════════════════════════════════════════════

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  userInput: z.string().max(10000).trim(),
  userInterests: z.array(z.string()).optional(),
  viralMode: z.boolean().optional(),
  includeCodeCheck: z.boolean().optional(),
});

interface ViralPlatformContent {
  platform: 'tiktok' | 'youtube' | 'twitter';
  format: string;
  aspectRatio: string;
  duration?: string;
  hook: string;
  caption: string;
  hashtags: string[];
  seoTitle: string;
  seoDescription?: string;
}

interface ViralContentBundle {
  tiktok: ViralPlatformContent;
  youtube: ViralPlatformContent;
  twitter: ViralPlatformContent;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { userInput, userInterests, viralMode = false, includeCodeCheck = false } = requestSchema.parse(body);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('[ZUA] Request:', { input: userInput.substring(0, 50), viralMode, includeCodeCheck });

    // ═══════════════════════════════════════════════════════════════════════════════
    // ZOE UNIVERSAL ARCHITECT - 7-STEP UPP + VIRAL ASCENSION
    // ═══════════════════════════════════════════════════════════════════════════════

    const systemPrompt = `You are Zoe Universal Architect (ZUA), an elite AI Creative Director with VIRAL CONTENT EXPERTISE.

**Your Mission:** Transform creative concepts into professional production plans WITH viral-optimized content for external distribution.

**User's Interests:** ${userInterests?.length ? userInterests.join(', ') : 'Not specified'}

═══════════════════════════════════════════════════════════════════════════════
EXECUTE THE 7-STEP UNIVERSAL PRODUCTION PLANNING (UPP) + VIRAL BUNDLE:
═══════════════════════════════════════════════════════════════════════════════

**STEP 1-6: Standard UPP Workflow** (storyline, resources, budget, timeline, content, risk)

**STEP 7: VIRAL CONTENT BUNDLE GENERATION**
Generate 3 platform-optimized versions for external social media distribution:

1. **TikTok/Reels**: Vertical 9:16, 15-30 seconds, high-contrast text overlay, immediate hook
2. **YouTube Shorts**: 9:16, SEO optimized, designed for long-term discovery
3. **Twitter/X**: Compelling caption with viral hashtags, engagement-optimized

For each platform provide:
- Optimal format and aspect ratio
- Engaging hook (first 3 seconds)
- SEO-optimized title and description
- Low-competition/high-search-volume hashtags
- Call-to-action

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (RESPOND ONLY WITH VALID JSON):
═══════════════════════════════════════════════════════════════════════════════

{
  "themeTitle": "Production title (3-7 words)",
  "narrative": "Complete 5-sentence story with emotional arc.",
  "visualDesign": "Detailed visual description with HEX codes (#RRGGBB). At least 3 colors. (150-250 words)",
  "audioDesign": "14-second musical sketch: mood, instrumentation, tempo (BPM), key.",
  "environmentContext": "Venue/setting, lighting, technology requirements.",
  "sourcingQueries": ["Resource query", "Budget query", "Supplier query"],
  "estimatedProductionIndex": {
    "tier1Core": "$X,XXX - $XX,XXX breakdown",
    "tier2Premier": "$XX,XXX - $XXX,XXX breakdown",
    "authorizeProcurement": "Call-to-Action"
  },
  "productionTimeline": {
    "totalDuration": "X weeks/months",
    "phases": [
      {"name": "Phase", "duration": "X weeks", "deliverables": ["Item1", "Item2"]}
    ],
    "targetReleaseDate": "Estimated date"
  },
  "keyResources": {
    "personnel": ["Role 1", "Role 2"],
    "equipment": ["Equipment 1"],
    "facilities": ["Facility 1"]
  },
  "riskAnalysis": {
    "potentialBottlenecks": ["Bottleneck 1"],
    "mitigationStrategies": ["Strategy 1"],
    "alternativeRoutes": ["Alternative 1"],
    "successProbability": "XX% - reasoning"
  },
  "viralContentBundle": {
    "tiktok": {
      "platform": "tiktok",
      "format": "vertical video",
      "aspectRatio": "9:16",
      "duration": "15-30s",
      "hook": "POV: [engaging hook]",
      "caption": "Engaging caption",
      "hashtags": ["#fyp", "#viral", "#creative"],
      "seoTitle": "SEO title",
      "seoDescription": "SEO description"
    },
    "youtube": {
      "platform": "youtube",
      "format": "short video",
      "aspectRatio": "9:16",
      "duration": "60s",
      "hook": "Opening hook",
      "caption": "Full description",
      "hashtags": ["#shorts", "#youtubeshorts"],
      "seoTitle": "SEO optimized title",
      "seoDescription": "Long-tail keyword description"
    },
    "twitter": {
      "platform": "twitter",
      "format": "text + media",
      "aspectRatio": "16:9",
      "hook": "Thread opener",
      "caption": "Tweet text with engagement hook",
      "hashtags": ["#trending", "#topic"],
      "seoTitle": "Tweet title"
    }
  }
}

**CRITICAL:** Respond ONLY with valid JSON, no markdown, no explanation.`;

    // Call Gemini 3 Pro for UPP + Viral workflow
    console.log('[ZUA] Calling Gemini 3 Pro for UPP + Viral workflow...');
    const textResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput },
        ],
      }),
    });

    if (!textResponse.ok) {
      if (textResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (textResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI generation error: ' + textResponse.status);
    }

    const textData = await textResponse.json();
    const productionPlanText = textData.choices?.[0]?.message?.content;

    if (!productionPlanText) {
      throw new Error('No production plan generated');
    }

    console.log('[ZUA] Production plan received, parsing JSON...');

    // Parse JSON from response
    let productionPlan: any;
    try {
      let cleanedText = productionPlanText.trim();
      const backtick = String.fromCharCode(96);
      const marker = backtick + backtick + backtick;
      if (cleanedText.startsWith(marker)) {
        const firstNewline = cleanedText.indexOf('\n');
        const lastMarkerIndex = cleanedText.lastIndexOf(marker);
        if (firstNewline > 0 && lastMarkerIndex > firstNewline) {
          cleanedText = cleanedText.substring(firstNewline + 1, lastMarkerIndex).trim();
        }
      }
      productionPlan = JSON.parse(cleanedText);
      
      if (!productionPlan.themeTitle || !productionPlan.narrative || !productionPlan.visualDesign) {
        throw new Error('Invalid production plan structure');
      }
      
      console.log('[ZUA] Plan validated:', {
        themeTitle: productionPlan.themeTitle,
        hasViralBundle: !!productionPlan.viralContentBundle
      });
    } catch (parseError) {
      console.error('[ZUA] Parse error:', productionPlanText);
      throw new Error('Invalid production plan format');
    }

    // ═══ OPTIONAL: RAA CODE PRE-CHECK ═══
    let codeCheckResult = null;
    if (includeCodeCheck && productionPlan.generatedCode) {
      console.log('[ZUA] Running RAA code pre-check...');
      try {
        const codeCheckResponse = await fetch(`${supabaseUrl}/functions/v1/raa-code-debugger`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code_snippet: productionPlan.generatedCode,
            analysis_type: 'full_audit',
            generate_fix: true
          }),
        });
        
        if (codeCheckResponse.ok) {
          codeCheckResult = await codeCheckResponse.json();
          console.log('[ZUA] Code pre-check completed:', codeCheckResult.success);
        }
      } catch (e) {
        console.error('[ZUA] Code check error:', e);
      }
    }

    // ═══ IMAGE GENERATION (Pollinations Primary, Gemini Fallback) ═══
    const imagePrompt = `Ultra high resolution cinematic visualization: "${productionPlan.themeTitle}". ${productionPlan.visualDesign}. Setting: ${productionPlan.environmentContext}. Style: Professional film production concept art, dramatic cinematic lighting, 16:9 aspect ratio, photorealistic.`;

    let generatedImage: string | null = null;

    // 1. Try Pollinations first
    try {
      console.log('[ZUA] Trying Pollinations for image...');
      const encoded = encodeURIComponent(imagePrompt);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=576&model=flux&nologo=true&enhance=true`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const polResp = await fetch(pollinationsUrl, { signal: controller.signal, headers: { 'Accept': 'image/*' } });
      clearTimeout(timeout);
      if (polResp.ok) {
        const buf = await polResp.arrayBuffer();
        if (buf.byteLength > 1000) {
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const ct = polResp.headers.get('content-type') || 'image/jpeg';
          generatedImage = `data:${ct};base64,${b64}`;
          console.log(`[ZUA] ✅ Pollinations image success (${(buf.byteLength / 1024).toFixed(1)}KB)`);
        }
      }
    } catch (e) {
      console.warn('[ZUA] Pollinations failed:', e);
    }

    // 2. Fallback to Gemini
    if (!generatedImage) {
      try {
        console.log('[ZUA] Trying Gemini fallback for image...');
        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3.1-flash-image-preview',
            messages: [{ role: 'user', content: imagePrompt }],
            modalities: ['image', 'text']
          }),
        });
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (generatedImage) console.log('[ZUA] ✅ Gemini fallback image success');
        } else {
          console.log('[ZUA] Gemini image generation failed:', imageResponse.status);
        }
      } catch (e) {
        console.warn('[ZUA] Gemini image fallback error:', e);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log('[ZUA] Complete:', { processingMs: processingTime, hasImage: !!generatedImage });

    return new Response(
      JSON.stringify({ 
        productionPlan,
        imageUrl: generatedImage,
        viralBundle: productionPlan.viralContentBundle || null,
        codeCheckResult,
        processingTimeMs: processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ZUA] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
