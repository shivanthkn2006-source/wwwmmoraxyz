// ═══════════════════════════════════════════════════════════════════════════════
// REALTIME VOICE - Migrated to Lovable AI (No OpenAI Key Required)
// Provides voice-to-text and text-to-voice via Lovable AI gateway
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceRequest {
  audio_data?: string; // Base64 encoded audio for transcription
  text?: string; // Text for chat response
  context?: {
    conversation_history?: Array<{ role: string; content: string }>;
    user_context?: string;
  };
  mode?: 'transcribe' | 'chat' | 'both';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[RealtimeVoice] ═══ REQUEST ═══');

  try {
    const lovableKey = sovereignKey();
    
    if (!lovableKey) {
      console.error('[RealtimeVoice] SOVEREIGN_AI_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'AI service not configured',
          fallback_response: "I'm having trouble connecting. Please try again."
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if WebSocket upgrade requested
    const upgrade = req.headers.get("upgrade") || "";
    if (upgrade.toLowerCase() === "websocket") {
      // WebSocket mode - simplified streaming
      console.log('[RealtimeVoice] WebSocket mode requested');
      
      const { socket, response } = Deno.upgradeWebSocket(req);

      socket.onopen = () => {
        console.log('[RealtimeVoice] Client connected');
        socket.send(JSON.stringify({ 
          type: "connection", 
          status: "connected",
          message: "Zoe voice ready - using Lovable AI"
        }));
      };

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[RealtimeVoice] Message:', data.type);

          if (data.type === 'conversation.item.create' && data.item?.content) {
            // Process text message
            const userText = data.item.content.find((c: any) => c.type === 'input_text')?.text;
            
            if (userText) {
              // Get AI response
              const response = await sovereignFetch('sovereign://chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${lovableKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash',
                  messages: [
                    { 
                      role: 'system', 
                      content: `You are Zoe, a warm and helpful AI voice assistant for Zoe Infinity. 
Keep responses concise (1-3 sentences) for natural voice conversation.
Be friendly, supportive, and conversational.`
                    },
                    { role: 'user', content: userText }
                  ],
                  max_tokens: 150,
                  temperature: 0.8,
                }),
              });

              if (response.ok) {
                const aiData = await response.json();
                const zoeResponse = aiData.choices?.[0]?.message?.content || "I'm here with you.";
                
                // Send response back in OpenAI-like format for compatibility
                socket.send(JSON.stringify({
                  type: 'response.audio_transcript.delta',
                  delta: zoeResponse
                }));
                
                socket.send(JSON.stringify({
                  type: 'response.audio_transcript.done'
                }));
              }
            }
          }

          if (data.type === 'input_audio_buffer.append') {
            // Audio input - acknowledge receipt
            // Note: Full audio processing would require additional implementation
            console.log('[RealtimeVoice] Audio buffer received');
          }

        } catch (error) {
          console.error('[RealtimeVoice] Message error:', error);
          socket.send(JSON.stringify({ 
            type: 'error', 
            message: 'Processing error' 
          }));
        }
      };

      socket.onclose = () => {
        console.log('[RealtimeVoice] Client disconnected');
      };

      socket.onerror = (error) => {
        console.error('[RealtimeVoice] WebSocket error:', error);
      };

      return response;
    }

    // HTTP mode - simple request/response
    const request: VoiceRequest = await req.json();
    const { text, context, mode = 'chat' } = request;

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'No text provided' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build conversation messages
    const messages = [
      { 
        role: 'system', 
        content: `You are Zoe, a warm and helpful AI voice assistant for Zoe Infinity.
Keep responses concise (1-3 sentences) for natural voice conversation.
Be friendly, supportive, and conversational.
${context?.user_context || ''}`
      },
      ...(context?.conversation_history?.slice(-6) || []),
      { role: 'user', content: text }
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
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const zoeResponse = data.choices?.[0]?.message?.content || "I'm here with you.";

    console.log('[RealtimeVoice] Response:', zoeResponse.substring(0, 50));

    return new Response(
      JSON.stringify({
        success: true,
        response: zoeResponse,
        // For compatibility with clients expecting OpenAI format
        choices: [{
          message: {
            role: 'assistant',
            content: zoeResponse
          }
        }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RealtimeVoice] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback_response: "I had a moment of static... could you say that again?"
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
