import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectedProduct {
  name: string;
  brand: string;
  category: string;
  confidence: number;
  isPremium: boolean;
  estimatedPrice?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageData, imageUrl } = await req.json();
    
    if (!imageData && !imageUrl) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SOVEREIGN_AI_KEY = sovereignKey();
    if (!SOVEREIGN_AI_KEY) {
      throw new Error("SOVEREIGN_AI_KEY not configured");
    }

    console.log('[Selfie City Vision] Analyzing image for products...');

    // Build the image content for Gemini
    const imageContent = imageData 
      ? { type: "image_url", image_url: { url: imageData } }
      : { type: "image_url", image_url: { url: imageUrl } };

    const systemPrompt = `You are a product detection AI for "Selfie City" - an AR commerce platform.
Analyze the image and detect ALL visible products, brands, and items the person is wearing or holding.

For each item detected, provide:
1. Product name (e.g., "Crossbody Bag", "Lipstick", "Watch")
2. Brand name (if identifiable, otherwise "Unknown Brand")
3. Category (Fashion, Beauty, Electronics, Accessories, Footwear, Jewelry, Eyewear, etc.)
4. Confidence score (0.0 to 1.0)
5. isPremium (true if luxury brand like Louis Vuitton, Gucci, Rolex, Apple, etc.)
6. Estimated price range

Return ONLY a valid JSON array of detected products. No other text.
Example:
[
  {"name": "Crossbody Bag", "brand": "Louis Vuitton", "category": "Fashion", "confidence": 0.95, "isPremium": true, "estimatedPrice": "₹1,50,000+"},
  {"name": "Lipstick", "brand": "MAC", "category": "Beauty", "confidence": 0.85, "isPremium": false, "estimatedPrice": "₹1,500-2,500"}
]`;

    const response = await sovereignFetch("sovereign://chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SOVEREIGN_AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Analyze this selfie and detect all products, brands, and items visible. Return JSON array." },
              imageContent
            ]
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Selfie City Vision] AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '[]';
    
    console.log('[Selfie City Vision] Raw AI response:', aiResponse);

    // Parse the JSON response
    let detectedProducts: DetectedProduct[] = [];
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = aiResponse;
      if (aiResponse.includes('```json')) {
        jsonStr = aiResponse.split('```json')[1].split('```')[0].trim();
      } else if (aiResponse.includes('```')) {
        jsonStr = aiResponse.split('```')[1].split('```')[0].trim();
      }
      detectedProducts = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[Selfie City Vision] JSON parse error:', parseError);
      // Return empty array if parsing fails
      detectedProducts = [];
    }

    console.log('[Selfie City Vision] Detected products:', detectedProducts.length);

    return new Response(JSON.stringify({ 
      success: true,
      products: detectedProducts,
      totalDetected: detectedProducts.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Selfie City Vision] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      products: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
