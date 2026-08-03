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
    const { imageData, prompt, filterType, intensity } = await req.json();

    if (!imageData || !prompt) {
      throw new Error('Image data and prompt are required');
    }

    const SOVEREIGN_AI_KEY = sovereignKey();
    if (!SOVEREIGN_AI_KEY) {
      throw new Error('SOVEREIGN_AI_KEY not configured');
    }

    console.log('Applying AI filter:', filterType, 'with prompt:', prompt);

    // Use Gemini's image editing capabilities
    const response = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SOVEREIGN_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'RATE_LIMIT', 
            message: 'Rate limit exceeded. Please try again in a moment.' 
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'NO_CREDITS', 
            message: 'AI service pending credit top-up. Please add credits to continue.' 
          }),
          { 
            status: 402, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI filter applied successfully');
    
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('No image URL in response');
      throw new Error('No image URL returned from Lovable AI');
    }

    return new Response(
      JSON.stringify({ 
        imageUrl,
        filterType,
        intensity
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in apply-ai-filter function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
