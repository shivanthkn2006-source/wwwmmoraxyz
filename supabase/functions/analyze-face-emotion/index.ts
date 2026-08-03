import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, analysisType = 'face' } = await req.json();

    if (!image) {
      throw new Error('Image data is required');
    }

    const SOVEREIGN_AI_KEY = sovereignKey();
    if (!SOVEREIGN_AI_KEY) {
      throw new Error('SOVEREIGN_AI_KEY is not configured');
    }

    console.log('Analyzing image with Gemini 2.5 Pro Vision:', analysisType);

    // Determine analysis prompt based on type
    let prompt = '';
    if (analysisType === 'face') {
      prompt = `Analyze this image for facial features and emotions. Provide:
1. Primary emotion detected (happy, sad, neutral, surprised, angry, etc.)
2. Emotion intensity (0-100)
3. Observable facial patterns (eyes, mouth, eyebrows, etc.)
4. Additional context about the person's state

Return ONLY valid JSON with structure: { "emotion": "string", "intensity": number, "patterns": ["string"], "context": "string" }`;
    } else if (analysisType === 'content') {
      prompt = `Analyze this image comprehensively. Identify:
1. Main objects and subjects
2. Scene context and setting
3. Text if present (OCR)
4. Colors and mood
5. Potential use case or category

Return ONLY valid JSON with structure: { "objects": ["string"], "scene": "string", "text": "string", "colors": ["string"], "mood": "string", "category": "string" }`;
    } else if (analysisType === 'product') {
      prompt = `Analyze this product image for customer service purposes. Identify:
1. Product type and category
2. Brand if visible
3. Condition assessment
4. Potential issues or defects
5. Recommended service actions

Return ONLY valid JSON with structure: { "product": "string", "brand": "string", "condition": "string", "issues": ["string"], "recommendations": ["string"] }`;
    }

    const response = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SOVEREIGN_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url',
                image_url: { url: image }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add more credits to continue.');
      }
      
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('AI Vision Analysis:', aiResponse);

    // Extract JSON from response
    let analysisResult;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Failed to parse AI analysis result');
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        rawResponse: aiResponse
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-face-emotion:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
