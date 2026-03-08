// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INFINITY - HYBRID VOICE ENGINE (Deepgram Aura-2 + Aura-2 Janus)
// "HER" Samantha Experience - Premium Neural TTS with Free Fallback
// ═══════════════════════════════════════════════════════════════════════════════
// 
// COST: $0.030 per 1K characters (~$30 per 1M chars)
// FREE CREDITS: $200 = ~6.6M characters = 26 days for 50 users
// 
// ⭐ SAMANTHA "HER" VOICE: aura-2-thalia-en (next-gen Janus, warm & natural) - DEFAULT
// 
// === AURA-2 JANUS VOICES (Next-Gen, English) ===
// - aura-2-thalia-en    (Female, warm & natural) ⭐ DEFAULT ZOE "SAMANTHA"
// - aura-2-andromeda-en (Female, confident & clear)
// - aura-2-aurora-en    (Female, bright & energetic)
// - aura-2-luna-en      (Female, calm & soothing)
// - aura-2-harmonia-en  (Female, balanced & smooth)
// - aura-2-janus-en     (Male, warm & versatile) ⭐ DEFAULT SMITH
// - aura-2-orpheus-en   (Male, deep & resonant)
// - aura-2-arcas-en     (Male, energetic)
// - aura-2-atlas-en     (Male, authoritative)
// - aura-2-helios-en    (Male, bright & confident)
// 
// === LEGACY AURA VOICES (Still Available) ===
// - aura-luna-en      (Female, calm & soothing) 
// - aura-asteria-en   (Female, warm & engaging)
// - aura-orion-en     (Male, warm)
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Voice mapping — Aura-2 Janus (next-gen) as primary, legacy Aura as fallback
// ⭐ SAMANTHA "HER" VOICE = aura-2-thalia-en (next-gen warm & natural)
const VOICE_MAP: Record<string, string> = {
  // ═══ AURA-2 JANUS — Next-Gen Female (Zoe personas) ═══
  'zoe': 'aura-2-thalia-en',              // ⭐ SAMANTHA - Warm, natural, intimate
  'zoe-warm': 'aura-2-thalia-en',         // Warm & natural (default Janus)
  'zoe-calm': 'aura-2-luna-en',           // Calm & soothing (Janus)
  'zoe-confident': 'aura-2-andromeda-en', // Confident & clear (Janus)
  'zoe-bright': 'aura-2-aurora-en',       // Bright & energetic (Janus)
  'zoe-smooth': 'aura-2-harmonia-en',     // Balanced & smooth (Janus)
  'zoe-friendly': 'aura-2-aurora-en',     // Friendly (maps to bright)
  'zoe-elegant': 'aura-2-andromeda-en',   // Elegant (maps to confident)
  
  // ═══ AURA-2 JANUS — Next-Gen Male (Smith personas) ═══
  'smith': 'aura-2-janus-en',             // ⭐ Warm & versatile - PRIMARY SMITH
  'smith-deep': 'aura-2-orpheus-en',      // Deep & resonant (Janus)
  'smith-energetic': 'aura-2-arcas-en',   // Energetic (Janus)
  'smith-authority': 'aura-2-atlas-en',   // Authoritative (Janus)
  'smith-calm': 'aura-2-orpheus-en',      // Calm (maps to deep)
  'smith-smooth': 'aura-2-helios-en',     // Bright & confident (Janus)
  
  // ═══ LEGACY AURA (backward compat) ═══
  'zoe-legacy': 'aura-luna-en',
  'smith-legacy': 'aura-orion-en',
  
  // Default — SAMANTHA Janus voice
  'default': 'aura-2-thalia-en',
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
      console.warn('[ZoeVoice] DEEPGRAM_API_KEY not configured, using browser fallback');
      return new Response(
        JSON.stringify({ 
          error: 'TTS service not configured',
          useBrowserFallback: true 
        }),
        { 
          status: 200,
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
