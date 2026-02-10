// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INFINITY - HYBRID VOICE ENGINE (Deepgram Aura-2)
// "HER" Samantha Experience - Premium Neural TTS with Free Fallback
// ═══════════════════════════════════════════════════════════════════════════════
// 
// COST: $0.030 per 1K characters (~$30 per 1M chars)
// FREE CREDITS: $200 = ~6.6M characters = 26 days for 50 users
// 
// ⭐ SAMANTHA "HER" VOICE: aura-luna-en (calm, intimate, soothing) - DEFAULT
// 
// Voices Available:
// - aura-luna-en      (Female, calm & soothing) ⭐ DEFAULT ZOE "SAMANTHA"
// - aura-asteria-en   (Female, warm & engaging)
// - aura-stella-en    (Female, friendly)
// - aura-athena-en    (Female, confident)
// - aura-hera-en      (Female, elegant)
// - aura-orion-en     (Male, warm) ⭐ DEFAULT SMITH
// - aura-arcas-en     (Male, energetic)
// - aura-perseus-en   (Male, calm)
// - aura-angus-en     (Male, deep)
// - aura-orpheus-en   (Male, smooth)
// - aura-helios-en    (Male, authoritative)
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Voice mapping for Zoe/Smith personas
// ⭐ SAMANTHA "HER" VOICE = aura-luna-en (calm, intimate, soothing)
const VOICE_MAP: Record<string, string> = {
  // Female voices (Zoe personas) - Luna is the "HER" Samantha voice
  'zoe': 'aura-luna-en',              // ⭐ SAMANTHA - Calm, intimate, soothing
  'zoe-warm': 'aura-asteria-en',      // Warm, engaging (alternate)
  'zoe-calm': 'aura-luna-en',         // Same as default - calm, soothing
  'zoe-friendly': 'aura-stella-en',   // Friendly, approachable
  'zoe-confident': 'aura-athena-en',  // Confident, articulate
  'zoe-elegant': 'aura-hera-en',      // Elegant, refined
  
  // Male voices (Smith personas)
  'smith': 'aura-orion-en',           // Warm, trustworthy - PRIMARY SMITH
  'smith-deep': 'aura-angus-en',      // Deep, resonant
  'smith-calm': 'aura-perseus-en',    // Calm, measured
  'smith-energetic': 'aura-arcas-en', // Energetic, dynamic
  'smith-smooth': 'aura-orpheus-en',  // Smooth, melodic
  'smith-authority': 'aura-helios-en', // Authoritative
  
  // Default - SAMANTHA voice
  'default': 'aura-luna-en',
};

interface VoiceRequest {
  text: string;
  voice?: string;       // Persona key from VOICE_MAP
  encoding?: string;    // mp3 (default), linear16, mulaw, alaw, opus, flac
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAMANTHA "HER" TUNING - Clean text for Deepgram Aura-2
// ═══════════════════════════════════════════════════════════════════════════════
// NOTE: Deepgram Aura-2 does NOT support SSML. It only accepts plain text.
// Voice tuning is done via the model itself (aura-luna-en is already calm/intimate)
// We clean the text and add natural pauses via punctuation
// ═══════════════════════════════════════════════════════════════════════════════

function cleanTextForDeepgram(text: string): string {
  return text
    // Remove stage directions: *actions*, (thoughts), [notes]
    .replace(/\*[^*]+\*/g, '')
    .replace(/\([^)]+\)/g, '')
    .replace(/\[[^\]]+\]/g, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  
  try {
    const DEEPGRAM_KEY = Deno.env.get("DEEPGRAM_API_KEY");
    
    if (!DEEPGRAM_KEY) {
      console.error('[ZoeVoice] DEEPGRAM_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'TTS service not configured',
          useBrowserFallback: true 
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { text, voice = 'zoe', encoding = 'mp3' }: VoiceRequest = await req.json();
    
    if (!text?.trim()) {
      return new Response(
        JSON.stringify({ error: 'No text provided' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Map voice persona to Deepgram model
    const deepgramVoice = VOICE_MAP[voice.toLowerCase()] || VOICE_MAP['default'];
    
    // Clean text (remove stage directions, etc.) - Deepgram doesn't support SSML
    const cleanedText = cleanTextForDeepgram(text);
    
    console.log(`[ZoeVoice] 🎙️ SAMANTHA Mode:`, {
      voice: deepgramVoice,
      textLength: cleanedText.length,
      encoding,
      cleanedPreview: cleanedText.substring(0, 50)
    });

    // Call Deepgram Aura-2 TTS API with plain text (NOT SSML)
    const response = await fetch(
      `https://api.deepgram.com/v1/speak?model=${deepgramVoice}&encoding=${encoding}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_KEY}`,
          'Content-Type': 'text/plain',  // Deepgram requires text/plain, NOT ssml+xml
        },
        body: cleanedText,
      }
    );

    const latencyMs = performance.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ZoeVoice] Deepgram error:', response.status, errorText);
      
      // Return fallback signal for client
      if (response.status === 402 || response.status === 429) {
        console.log('[ZoeVoice] ⚠️ Credit limit or rate limit - switch to browser fallback');
        return new Response(
          JSON.stringify({ 
            error: 'Premium voice credits exhausted',
            useBrowserFallback: true,
            code: response.status
          }),
          { 
            status: 200, // Return 200 so client can handle gracefully
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'TTS generation failed',
          useBrowserFallback: true 
        }),
        { 
          status: 200, // Graceful fallback
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get content type for audio response
    const contentType = encoding === 'mp3' ? 'audio/mpeg' : 
                        encoding === 'opus' ? 'audio/opus' :
                        encoding === 'flac' ? 'audio/flac' :
                        'audio/wav';

    console.log(`[ZoeVoice] ✅ Speech generated in ${latencyMs.toFixed(0)}ms`);

    // Stream the audio response directly
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': contentType,
        'X-Latency-Ms': latencyMs.toFixed(0),
        'X-Voice-Used': deepgramVoice,
      },
    });

  } catch (error) {
    console.error('[ZoeVoice] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        useBrowserFallback: true 
      }),
      { 
        status: 200, // Graceful fallback
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
