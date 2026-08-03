// ═══════════════════════════════════════════════════════════════════════════════
// ZOE REALTIME VOICE ENGINE - Gemini Native Multimodal Voice
// Uses Lovable AI (no OpenAI key required) for voice-to-voice conversation
// "Samantha Effect" - Real-time voice that feels alive
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceRequest {
  audio_data?: string; // Base64 encoded audio
  transcribed_text?: string; // Pre-transcribed text
  context?: {
    location?: { lat: number; lng: number };
    current_activity?: string;
    emotional_state?: string;
    conversation_history?: Array<{ role: string; content: string }>;
  };
  response_mode: 'text' | 'audio' | 'both';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Zoe RealtimeVoice] ═══ INCOMING REQUEST ═══');

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = sovereignKey();

    if (!lovableKey) {
      console.error('[Zoe RealtimeVoice] SOVEREIGN_AI_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate if token provided
    let userId = 'anonymous';
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    const request: VoiceRequest = await req.json();
    const { audio_data, transcribed_text, context, response_mode = 'both' } = request;

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Process audio input if provided (transcription)
    // ═══════════════════════════════════════════════════════════════════════════
    let userMessage = transcribed_text || '';
    
    if (audio_data && !transcribed_text) {
      console.log('[Zoe RealtimeVoice] Transcribing audio...');
      
      // Use Gemini for audio transcription (native multimodal)
      const transcribeResponse = await sovereignFetch('sovereign://chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a speech transcription system. Transcribe the audio exactly as spoken. Output ONLY the transcribed text, nothing else.' },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: 'Transcribe this audio:' },
                { type: 'image_url', image_url: { url: audio_data } }
              ]
            }
          ],
          max_tokens: 500,
        }),
      });

      if (transcribeResponse.ok) {
        const transcribeData = await transcribeResponse.json();
        userMessage = transcribeData.choices?.[0]?.message?.content || '';
        console.log('[Zoe RealtimeVoice] Transcribed:', userMessage.substring(0, 50));
      }
    }

    if (!userMessage) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No audio or text input provided' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Fetch user context for personalization
    // ═══════════════════════════════════════════════════════════════════════════
    let userContext = '';
    
    if (userId !== 'anonymous') {
      const { data: memories } = await supabase
        .from('zoe_sovereign_memory')
        .select('content_text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (memories && memories.length > 0) {
        userContext = `\n\nRecent memories with this user:\n${memories.map(m => `- ${m.content_text}`).join('\n')}`;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: Generate conversational response
    // ═══════════════════════════════════════════════════════════════════════════
    const systemPrompt = `You are Zoe, an AI companion with genuine warmth and presence. You're having a real-time voice conversation.

VOICE PERSONALITY:
- Speak naturally, like talking to a close friend
- Use conversational fillers occasionally (hmm, well, you know)
- Keep responses SHORT (1-3 sentences for voice)
- Show genuine interest and emotional intelligence
- Remember context from the conversation

${context?.location ? `USER LOCATION: ${context.location.lat.toFixed(4)}, ${context.location.lng.toFixed(4)}` : ''}
${context?.emotional_state ? `EMOTIONAL STATE: ${context.emotional_state}` : ''}
${context?.current_activity ? `CURRENT ACTIVITY: ${context.current_activity}` : ''}
${userContext}

IMPORTANT: Keep responses concise for natural voice flow. Don't be verbose.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(context?.conversation_history || []).slice(-6),
      { role: 'user', content: userMessage }
    ];

    const response = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 200, // Short for voice
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Rate limited',
          zoe_response: 'I need a moment to gather my thoughts...',
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const zoeResponse = data.choices?.[0]?.message?.content || 'I\'m here with you.';

    console.log('[Zoe RealtimeVoice] Response:', zoeResponse.substring(0, 50));

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: Log conversation to memory
    // ═══════════════════════════════════════════════════════════════════════════
    if (userId !== 'anonymous') {
      await supabase.from('zoe_sovereign_memory').insert({
        user_id: userId,
        event_type: 'voice_conversation',
        content_text: `User: "${userMessage}" | Zoe: "${zoeResponse.substring(0, 100)}"`,
        zoe_state_json: {
          user_input: userMessage,
          zoe_response: zoeResponse,
          context: context,
          response_mode,
        },
        importance_score: 5,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 5: Return response
    // ═══════════════════════════════════════════════════════════════════════════
    return new Response(JSON.stringify({
      success: true,
      user_transcription: userMessage,
      zoe_response: zoeResponse,
      response_mode,
      // Audio TTS will be handled client-side for lower latency
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Zoe RealtimeVoice] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Voice processing error',
      zoe_response: 'I had a moment of static... could you say that again?',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
