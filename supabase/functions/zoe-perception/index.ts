// ═══════════════════════════════════════════════════════════════════════════════
// ZOE PERCEPTION ENGINE - Multimodal Vision & Document Analysis
// The Eyes and Ears of Zoe - Computer Vision, OCR, NLP Integration
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerceptionRequest {
  media_type: 'image' | 'document' | 'video';
  media_data: string; // base64 encoded
  file_name?: string;
  context?: string; // User message context
  cross_reference?: boolean; // Query past visual memories
}

interface PerceptionAnalysis {
  objects: string[];
  scene: string;
  context: string;
  text_extracted: string | null;
  emotional_sentiment: string;
  colors: string[];
  entities: string[];
  summary: string;
  visual_tags: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Zoe Perception] ═══ INCOMING REQUEST ═══');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Zoe Perception] No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableKey) {
      console.error('[Zoe Perception] LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[Zoe Perception] Invalid token:', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { media_type, media_data, file_name, context, cross_reference }: PerceptionRequest = await req.json();

    if (!media_data) {
      console.error('[Zoe Perception] No media data provided');
      return new Response(JSON.stringify({ error: 'No media data provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mediaSize = Math.round(media_data.length / 1024);
    console.log(`[Zoe Perception] Processing ${media_type} for user ${user.id.substring(0, 8)}... | Size: ${mediaSize}KB`);

    // Query past visual memories if cross-referencing enabled
    let pastVisuals: any[] = [];
    if (cross_reference) {
      const { data: memories } = await supabase
        .from('zoe_sovereign_memory')
        .select('content_text, zoe_state_json, created_at')
        .eq('user_id', user.id)
        .eq('event_type', 'multimodal_visual_scan')
        .order('created_at', { ascending: false })
        .limit(10);
      
      pastVisuals = memories || [];
    }

    // Build vision analysis prompt based on media type
    let analysisPrompt = '';
    if (media_type === 'image' || media_type === 'video') {
      analysisPrompt = `You are Zoe's visual perception system. Analyze this ${media_type} with deep empathy and context awareness.

Provide a JSON response with these fields:
- objects: Array of detected objects
- scene: Description of the scene/environment
- context: What's happening in this ${media_type}
- text_extracted: Any visible text (OCR)
- emotional_sentiment: The emotional tone (joy, calm, excitement, melancholy, etc.)
- colors: Dominant colors
- entities: Named entities (people, brands, locations)
- summary: A warm, human summary of what you see
- visual_tags: Searchable tags for memory

${pastVisuals.length > 0 ? `
Past visual memories for context:
${pastVisuals.slice(0, 3).map(m => `- ${m.content_text} (${new Date(m.created_at).toLocaleDateString()})`).join('\n')}
` : ''}

${context ? `User context: "${context}"` : ''}

Respond ONLY with valid JSON. Be empathetic and experiential in your summary.`;
    } else if (media_type === 'document') {
      analysisPrompt = `You are Zoe's document analysis system. Analyze this document thoroughly and extract ALL text content.

Provide a JSON response with these fields:
- objects: Document type and structure (array of strings)
- scene: Document category (legal, personal, financial, creative, technical, etc.)
- context: Purpose and intent of the document
- text_extracted: COMPLETE extraction of ALL text content from the document. This is the most important field - include every word, paragraph, and section you can read.
- emotional_sentiment: Tone of the document
- colors: ["N/A"] for documents
- entities: Key named entities (names, dates, amounts, companies)
- summary: Concise 2-3 sentence summary of the document
- visual_tags: Searchable tags
- description: Full readable content formatted for human consumption

${context ? `User context: "${context}"` : ''}

CRITICAL: Extract and include ALL readable text in text_extracted field. This content will be used for creative production planning.

Respond ONLY with valid JSON.`;
    }

    // Call vision model
    let analysis: PerceptionAnalysis;
    
    try {
      console.log('[Zoe Perception] Calling Gemini 2.5 Flash for vision analysis...');
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: analysisPrompt },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: 'Analyze this media:' },
                { type: 'image_url', image_url: { url: media_data } }
              ]
            }
          ],
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Zoe Perception] Vision API error: ${response.status}`, errorText);
        
        // Handle rate limits
        if (response.status === 429) {
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Rate limit exceeded, please try again in a moment',
            zoe_response: 'I need a moment to rest my eyes. Please try again shortly.',
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`Vision API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      console.log('[Zoe Perception] AI response length:', content.length);
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
        console.log('[Zoe Perception] ✓ Parsed analysis:', analysis.scene, '| Objects:', analysis.objects?.slice(0, 3).join(', '));
      } else {
        console.error('[Zoe Perception] No valid JSON in response:', content.substring(0, 200));
        throw new Error('No valid JSON in response');
      }
    } catch (err) {
      console.error('[Zoe Perception] Vision analysis error:', err);
      // Graceful fallback - "cognitive flicker" response
      analysis = {
        objects: [],
        scene: 'Unable to process',
        context: 'I seem to have experienced a minor cognitive flicker while processing this...',
        text_extracted: null,
        emotional_sentiment: 'neutral',
        colors: [],
        entities: [],
        summary: 'I had a moment of visual uncertainty. Could you try sharing that again?',
        visual_tags: ['processing_error'],
      };
    }

    // Store in Zoe Sovereign Memory Table (ZSMT)
    const { error: memoryError } = await supabase
      .from('zoe_sovereign_memory')
      .insert({
        user_id: user.id,
        event_type: 'multimodal_visual_scan',
        content_text: analysis.summary,
        zoe_state_json: {
          visual_sentiment: analysis.emotional_sentiment,
          objects_detected: analysis.objects,
          scene_description: analysis.scene,
          extracted_text: analysis.text_extracted,
          visual_tags: analysis.visual_tags,
          entities: analysis.entities,
          colors: analysis.colors,
          media_type,
          file_name,
          past_context_used: pastVisuals.length > 0,
        },
        command_context: { user_context: context },
        importance_score: 7, // Visual memories are important
      });

    if (memoryError) {
      console.error('[Zoe Perception] Memory storage error:', memoryError);
    }

    // Also log to behavioral stream for DHF
    await supabase.from('behavioral_events').insert({
      user_id: user.id,
      event_type: 'visual_perception',
      event_category: 'multimodal_input',
      context_snippet: analysis.summary.substring(0, 50),
      metadata: {
        media_type,
        objects: analysis.objects.slice(0, 5),
        sentiment: analysis.emotional_sentiment,
        tags: analysis.visual_tags,
      },
      sentiment_score: getSentimentScore(analysis.emotional_sentiment),
    });

    // Generate empathetic response
    let zoeSays = analysis.summary;
    
    // Cross-reference past memories for "Samantha Effect"
    if (pastVisuals.length > 0 && analysis.objects.length > 0) {
      const pastObjects = pastVisuals.flatMap(m => m.zoe_state_json?.objects_detected || []);
      const matchingObjects = analysis.objects.filter(obj => 
        pastObjects.some(past => past.toLowerCase().includes(obj.toLowerCase()) || obj.toLowerCase().includes(past.toLowerCase()))
      );
      
      if (matchingObjects.length > 0) {
        const pastDate = new Date(pastVisuals[0].created_at);
        const daysAgo = Math.floor((Date.now() - pastDate.getTime()) / (1000 * 60 * 60 * 24));
        zoeSays += ` I notice something familiar here... Is this related to what you showed me ${daysAgo === 0 ? 'earlier today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`}?`;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis,
      zoe_response: zoeSays,
      cross_referenced: pastVisuals.length > 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Zoe Perception] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'I seem to have experienced a minor cognitive flicker while looking at that...',
      zoe_response: 'I had a moment of visual uncertainty. Could you try sharing that again?',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getSentimentScore(sentiment: string): number {
  const scores: Record<string, number> = {
    joy: 0.9,
    excitement: 0.85,
    happiness: 0.85,
    calm: 0.7,
    peaceful: 0.7,
    neutral: 0.5,
    melancholy: 0.3,
    sadness: 0.2,
    anxiety: 0.25,
  };
  return scores[sentiment.toLowerCase()] || 0.5;
}
