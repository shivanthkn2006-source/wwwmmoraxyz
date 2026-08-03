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
    const { videoData, stylePrompt, analysisType = 'transform' } = await req.json();

    if (!videoData) {
      return new Response(
        JSON.stringify({ error: 'No video data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SOVEREIGN_AI_KEY = sovereignKey();
    if (!SOVEREIGN_AI_KEY) {
      throw new Error('SOVEREIGN_AI_KEY is not configured');
    }
    
    console.log('[AIVideoTransform] Processing video with style:', stylePrompt);
    
    // Use Gemini for video analysis/description
    const response = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SOVEREIGN_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an advanced video analysis AI. Analyze the provided video/image content and describe what you see in detail.' 
          },
          { 
            role: 'user', 
            content: [
              { 
                type: 'text', 
                text: stylePrompt 
                  ? `Analyze this video with focus on: ${stylePrompt}` 
                  : 'Describe this video content in detail - what is happening, who/what is visible, any audio or text, and the overall mood.' 
              },
              { 
                type: 'image_url', 
                image_url: { 
                  url: videoData,
                  detail: 'high'
                } 
              }
            ]
          }
        ],
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AIVideoTransform] API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limited, please try again shortly', success: false }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || 'Unable to analyze the video.';

    console.log('[AIVideoTransform] Analysis complete');
    
    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        transformedVideo: videoData, // Return original for now
        message: 'Video analyzed successfully',
        model_used: 'google/gemini-2.5-flash'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[AIVideoTransform] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
