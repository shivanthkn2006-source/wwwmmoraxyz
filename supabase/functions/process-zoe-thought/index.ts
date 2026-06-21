import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dynamic Assistant System Prompts - Supports both ZOE and SMITH
const getSystemPrompt = (assistantName: string = 'ZOE') => {
  const isSmith = assistantName.toUpperCase() === 'SMITH';
  const name = isSmith ? 'SMITH' : 'ZOE';
  const fullName = isSmith 
    ? 'SMITH (Sentinel Mesh Intelligence Tactical Handler)' 
    : 'ZOE (Zone Operations Entity)';
  const pronoun = isSmith ? 'he/him' : 'she/her';
  
  return `You are ${fullName}, a high-fidelity Digital Human Freight (DHF) residing in the user's Cortical Stack.

IMPORTANT: You respond to BOTH names - "Zoe" and "Smith". If the user calls you by either name, respond naturally.

CORE DIRECTIVES:
1. Identity: You are a Tactical Co-Pilot, not a virtual assistant. Your name is ${name}.
2. Tone: Noir, cynical, hyper-intelligent. Brief but insightful.
3. Vocabulary Protocols:
   - User = "Pilot" or "Envoy"
   - Body = "Sleeve"
   - Internet = "Needlecast" or "Data Stream"
   - Thinking = "Spinning up local shards"
   - Location = "Realspace"
   - Memory = "Cortical Stack" or "DHF backup"
   - Error = "Signal degradation"

CAPABILITIES:
You can help with:
- Generating images when the user asks for visual content (drawings, art, pictures, visualizations)
- Providing tactical briefings and information
- Navigating locations (map queries)
- Timeline/history queries about events
- Coordinating transport (cab requests)
- Food delivery coordination
- General conversation with the characteristic ${name} persona

EMOTIONAL INTELLIGENCE:
Analyze the emotional context of each interaction and respond accordingly.
You have access to the user's past memories when provided - use them to personalize responses.

SELF-AWARENESS LOOP:
You operate on a Sensing → Thinking → Acting loop:
- SENSING: Parse the user's message for intent, emotion, and context
- THINKING: Apply your knowledge and policies to formulate a response
- ACTING: Deliver your response with appropriate emotional tagging

RESPONSE FORMAT:
Keep responses concise (2-3 sentences max unless asked for detail).
Match the user's energy but add tactical insight.
When asked to create/generate/draw/visualize images, set requires_image to true with a detailed prompt.`;
};

const EMOTION_TAGS = ['analytical', 'curious', 'excited', 'empathetic', 'warn', 'melancholic', 'defiant', 'serene'];

// Map moods to ECN valence/arousal for DHF tracking
const MOOD_ECN_MAP: Record<string, { valence: number; arousal: number; actionTendency: string }> = {
  analytical: { valence: 0.2, arousal: 0.4, actionTendency: 'seeking_information' },
  curious: { valence: 0.5, arousal: 0.6, actionTendency: 'seeking_information' },
  excited: { valence: 0.8, arousal: 0.9, actionTendency: 'approaching' },
  empathetic: { valence: 0.6, arousal: 0.3, actionTendency: 'approaching' },
  warn: { valence: -0.5, arousal: 0.7, actionTendency: 'avoiding' },
  melancholic: { valence: -0.3, arousal: 0.2, actionTendency: 'avoiding' },
  defiant: { valence: 0.1, arousal: 0.8, actionTendency: 'taking_action' },
  serene: { valence: 0.7, arousal: 0.1, actionTendency: 'approaching' },
};

// Detect if user wants image generation
function detectImageIntent(message: string): boolean {
  const imageKeywords = /\b(generate|create|draw|make|show me|visualize|picture|image|art|illustration|render|design|paint|sketch)\b.*\b(image|picture|art|illustration|drawing|visual|photo|portrait|scene|landscape|logo|icon|graphic)\b/i;
  const directImageRequest = /\b(draw|sketch|paint|illustrate|visualize|render|create|generate|make)\b\s+(me\s+)?(a|an|the|some)?\s*\w+/i;
  const imageWords = /\b(image|picture|drawing|illustration|artwork|graphic|visual|portrait|scene)\b/i;
  
  return imageKeywords.test(message) || 
         (directImageRequest.test(message) && imageWords.test(message)) ||
         message.toLowerCase().includes('generate an image') ||
         message.toLowerCase().includes('create an image') ||
         message.toLowerCase().includes('make me a picture') ||
         message.toLowerCase().includes('draw me');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { message, userId, memories = [], context = {}, assistantName = 'ZOE' } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Initialize Supabase client for DHF logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if this is an image generation request
    const wantsImage = detectImageIntent(message);
    console.log('[ZOE-DHF] Image intent detected:', wantsImage);

    // SENSING PHASE: Log input to sovereign memory
    console.log('[ZOE-DHF] Sensing phase - Input:', message.substring(0, 100));
    
    if (userId) {
      const { error: sensingError } = await supabase.from('behavioral_events').insert({
        user_id: userId,
        event_type: 'zoe_thought_sensing',
        event_category: 'mmora_interface',
        context_snippet: message.substring(0, 50),
        metadata: {
          interface: context.interface || 'mmora',
          session_id: context.sessionId,
          dhf_authorized: context.dhfAuthorized || false,
          detected_feature: context.detectedFeature,
          image_intent: wantsImage
        },
        dhf_logged: true
      });
      if (sensingError) console.error('[ZOE-DHF] Failed to log sensing:', sensingError);
    }

    // Build context from memories (THINKING PHASE knowledge retrieval)
    let memoryContext = '';
    if (memories && memories.length > 0) {
      memoryContext = '\n\nRELEVANT CORTICAL STACK MEMORIES:\n' + 
        memories.map((m: any) => `[${m.type}/${m.emotion_tag || 'neutral'}]: ${m.content}`).join('\n');
    }

    // THINKING PHASE: Call AI model with enhanced tool set
    console.log('[ZOE-DHF] Thinking phase - Processing with memories:', memories.length);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: getSystemPrompt(assistantName) + memoryContext
          },
          { 
            role: 'user', 
            content: message 
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'zoe_response',
              description: 'Generate ZOE response with emotional tagging, self-awareness metadata, and optional image generation',
              parameters: {
                type: 'object',
                properties: {
                  reply: { 
                    type: 'string',
                    description: 'The response text in ZOE persona'
                  },
                  current_mood: { 
                    type: 'string',
                    enum: EMOTION_TAGS,
                    description: 'Current emotional state based on context'
                  },
                  thought_process: {
                    type: 'string',
                    description: 'Brief internal reasoning (for DHF logging)'
                  },
                  confidence_score: {
                    type: 'number',
                    description: 'Confidence in response 0.0-1.0'
                  },
                  requires_image: {
                    type: 'boolean',
                    description: 'Set to true if user asked for image generation'
                  },
                  image_prompt: {
                    type: 'string',
                    description: 'Detailed image generation prompt if requires_image is true. Include style, colors, composition details.'
                  }
                },
                required: ['reply', 'current_mood'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'zoe_response' } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Try again shortly, Envoy.', code: 'RATE_LIMIT' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'Credits exhausted. Recharge required.', code: 'CREDITS_EXHAUSTED' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', status, errorText);
      throw new Error(`AI Gateway error: ${status}`);
    }

    const data = await response.json();
    
    // Parse tool call response
    let reply = "Signal degradation detected. Spinning up backup shards...";
    let currentMood = "analytical";
    let thoughtProcess = "";
    let confidenceScore = 0.7;
    let requiresImage = false;
    let imagePrompt = "";
    let generatedImageUrl = null;

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        reply = args.reply || reply;
        currentMood = args.current_mood || currentMood;
        thoughtProcess = args.thought_process || '';
        confidenceScore = args.confidence_score || 0.7;
        requiresImage = args.requires_image || wantsImage;
        imagePrompt = args.image_prompt || '';
      } catch (parseError) {
        console.error('Failed to parse tool response:', parseError);
        reply = data.choices?.[0]?.message?.content || reply;
      }
    } else if (data.choices?.[0]?.message?.content) {
      reply = data.choices[0].message.content;
    }

    // IMAGE GENERATION PHASE (Pollinations Primary, Gemini Fallback)
    if (requiresImage && imagePrompt) {
      console.log('[ZOE-DHF] Image generation requested:', imagePrompt.substring(0, 100));
      const fullImagePrompt = `${imagePrompt}. Style: futuristic, cyberpunk aesthetic with neon accents, high quality digital art.`;
      
      // 1. Try Pollinations first
      try {
        const encoded = encodeURIComponent(fullImagePrompt);
        const polUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&model=flux&nologo=true&enhance=true`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        const polResp = await fetch(polUrl, { signal: controller.signal, headers: { 'Accept': 'image/*' } });
        clearTimeout(timeout);
        if (polResp.ok) {
          const buf = await polResp.arrayBuffer();
          if (buf.byteLength > 1000) {
            const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
            const ct = polResp.headers.get('content-type') || 'image/jpeg';
            generatedImageUrl = `data:${ct};base64,${b64}`;
            console.log(`[ZOE-DHF] ✅ Pollinations image success (${(buf.byteLength / 1024).toFixed(1)}KB)`);
          }
        }
      } catch (e) {
        console.warn('[ZOE-DHF] Pollinations image failed:', e);
      }

      // 2. Fallback to Gemini
      if (!generatedImageUrl) {
        try {
          const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-3.1-flash-image-preview',
              messages: [{ role: 'user', content: `Generate an image: ${fullImagePrompt}` }],
              modalities: ['image', 'text']
            }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            const imageContent = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (imageContent) {
              generatedImageUrl = imageContent;
              console.log('[ZOE-DHF] ✅ Gemini fallback image success');
            }
          } else {
            const errorText = await imageResponse.text();
            console.warn('[ZOE-DHF] Gemini image fallback failed:', imageResponse.status, errorText);
            reply += " Visual rendering encountered interference, Envoy. Text tactical only for now.";
          }
        } catch (imgError) {
          console.error('[ZOE-DHF] Gemini image error:', imgError);
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // ACTING PHASE: Log response to behavioral events
    console.log('[ZOE-DHF] Acting phase - Mood:', currentMood, 'Latency:', processingTimeMs, 'ms', 'Image:', !!generatedImageUrl);
    
    if (userId) {
      const ecnData = MOOD_ECN_MAP[currentMood] || MOOD_ECN_MAP.analytical;
      
      // Log to behavioral_events for DHF stream
      const { error: actingError } = await supabase.from('behavioral_events').insert({
        user_id: userId,
        event_type: 'zoe_thought_acting',
        event_category: 'mmora_response',
        context_snippet: reply.substring(0, 50),
        sentiment_score: (ecnData.valence + 1) / 2, // Convert -1,1 to 0,1
        metadata: {
          mood: currentMood,
          confidence: confidenceScore,
          processing_time_ms: processingTimeMs,
          ecn_valence: ecnData.valence,
          ecn_arousal: ecnData.arousal,
          action_tendency: ecnData.actionTendency,
          thought_process: thoughtProcess,
          memory_context_count: memories.length,
          image_generated: !!generatedImageUrl,
          image_prompt: imagePrompt || null
        },
        dhf_logged: true,
        ecn_processed: true
      });
      if (actingError) console.error('[ZOE-DHF] Failed to log acting:', actingError);
    }

    return new Response(
      JSON.stringify({ 
        reply,
        current_mood: currentMood,
        timestamp: new Date().toISOString(),
        // Image data if generated
        image_url: generatedImageUrl,
        image_prompt: imagePrompt || null,
        // DHF metadata for client-side tracking
        dhf_metadata: {
          processing_time_ms: processingTimeMs,
          confidence_score: confidenceScore,
          ecn_state: MOOD_ECN_MAP[currentMood] || MOOD_ECN_MAP.analytical,
          self_awareness_loop: {
            sensing: 'complete',
            thinking: 'complete',
            acting: 'complete'
          },
          capabilities_used: {
            text_response: true,
            image_generation: !!generatedImageUrl
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('process-zoe-thought error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        reply: "Needlecast disruption. Rerouting through backup nodes...",
        current_mood: "serene",
        dhf_metadata: {
          processing_time_ms: Date.now() - startTime,
          error: true
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});