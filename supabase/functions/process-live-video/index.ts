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
    const { video_data, context, analysis_type = 'comprehensive' } = await req.json();
    
    if (!video_data) {
      return new Response(
        JSON.stringify({ error: 'No video data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ProcessLiveVideo] Processing video with Gemini 3 Pro, context:', context);
    
    const SOVEREIGN_AI_KEY = sovereignKey();
    if (!SOVEREIGN_AI_KEY) {
      throw new Error('SOVEREIGN_AI_KEY is not configured');
    }

    // Build analysis prompt based on type
    const analysisPrompts: Record<string, string> = {
      comprehensive: `Analyze this video comprehensively and provide:
1. Scene Description: What is happening in this video?
2. Objects Detected: List all visible objects, people, and elements
3. Actions/Motion: Describe any movement or actions taking place
4. Audio Content: If there's speech, transcribe it. Note any sounds.
5. Emotional Tone: What is the overall mood or emotion?
6. Context Clues: Time of day, location type, setting
7. Key Moments: Most important or notable moments
8. Suggestions: Any relevant insights or recommendations

Be detailed but concise. Focus on actionable information.`,
      
      quick: `Briefly analyze this video:
- What's happening?
- Key objects/people visible
- Any speech or important audio
- Overall mood
Keep response under 200 words.`,
      
      transcription: `Focus on audio transcription from this video:
- Transcribe all speech word-for-word
- Note speaker changes if multiple people
- Include relevant sound descriptions
- Timestamp key moments if possible`,
      
      object_detection: `List all objects, people, and visual elements in this video:
- People (count, descriptions, activities)
- Objects (items, products, tools visible)
- Text (any visible text, signs, labels)
- Environment (indoor/outdoor, location type)
- Motion patterns`
    };

    const systemPrompt = `You are Zoe, an advanced AI with multimodal perception capabilities. 
You can see and understand video content with high accuracy. 
Analyze the provided video thoroughly and respond naturally.
${context ? `User context: ${context}` : ''}`;

    const userPrompt = analysisPrompts[analysis_type] || analysisPrompts.comprehensive;

    // Call Gemini 3 Pro for advanced video analysis
    const response = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SOVEREIGN_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'video_url',
                video_url: { url: video_data }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ProcessLiveVideo] API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limited. Please try again in a moment.',
            success: false 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisResult = data.choices?.[0]?.message?.content || 'Unable to analyze the video content.';

    console.log('[ProcessLiveVideo] Analysis complete, response length:', analysisResult.length);

    // Build structured response
    const result = {
      success: true,
      analysis: {
        raw_response: analysisResult,
        analysis_type,
        processed_at: new Date().toISOString(),
      },
      zoe_response: analysisResult,
      model_used: 'google/gemini-3-pro-preview',
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ProcessLiveVideo] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error processing video',
        zoe_response: 'I had a moment of visual processing difficulty. Could you try recording again?'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
