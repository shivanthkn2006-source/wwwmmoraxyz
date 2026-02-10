/**
 * EDGE TTS PROXY v5 - Using @lobehub/tts approach
 * =================================================
 * Microsoft Edge Neural Voice via proper WebSocket protocol
 * 
 * Note: If this fails, Zoe falls back to Deepgram (zoe-voice) which is the primary
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TTSRequest {
  text: string;
  voice?: string;
  language?: string;  // 'en', 'ta', 'ml' - auto-detected if not specified
  rate?: string;
  pitch?: string;
}

// Voice configurations - English voices
const VOICE_MAP: Record<string, string> = {
  'jenny': 'en-US-JennyNeural',
  'aria': 'en-US-AriaNeural',
  'sara': 'en-US-SaraNeural',
  'emma': 'en-US-EmmaMultilingualNeural',
  'jane': 'en-AU-JaneNeural',
  'sonia': 'en-GB-SoniaNeural',
  'zoe': 'en-US-JennyNeural',
  'samantha': 'en-US-JennyNeural',
};

// Tamil voices (ta-IN)
const TAMIL_VOICE_MAP: Record<string, string> = {
  'pallavi': 'ta-IN-PallaviNeural',  // Female - warm, natural
  'valluvar': 'ta-IN-ValluvarNeural', // Male - clear, articulate
  'tamil_default': 'ta-IN-PallaviNeural',
};

// Malayalam voices (ml-IN)
const MALAYALAM_VOICE_MAP: Record<string, string> = {
  'sobhana': 'ml-IN-SobhanaNeural',  // Female - warm, expressive
  'midhun': 'ml-IN-MidhunNeural',    // Male - clear, professional
  'malayalam_default': 'ml-IN-SobhanaNeural',
};

// Language detection and voice selection
const LANGUAGE_VOICE_DEFAULTS: Record<string, string> = {
  'en': 'en-US-JennyNeural',
  'ta': 'ta-IN-PallaviNeural',
  'ml': 'ml-IN-SobhanaNeural',
};

const DEFAULT_VOICE = 'en-US-JennyNeural';
const DEFAULT_RATE = '-5%';
const DEFAULT_PITCH = '-3Hz';

/**
 * Detect language from text (simple heuristic based on Unicode ranges)
 */
function detectLanguage(text: string): 'en' | 'ta' | 'ml' {
  // Tamil Unicode range: U+0B80–U+0BFF
  const tamilPattern = /[\u0B80-\u0BFF]/;
  // Malayalam Unicode range: U+0D00–U+0D7F
  const malayalamPattern = /[\u0D00-\u0D7F]/;
  
  // Count characters in each script
  const tamilCount = (text.match(tamilPattern) || []).length;
  const malayalamCount = (text.match(malayalamPattern) || []).length;
  const totalNonLatin = tamilCount + malayalamCount;
  
  // If significant Indic characters present, determine language
  if (totalNonLatin > text.length * 0.1) {
    if (tamilCount > malayalamCount) return 'ta';
    if (malayalamCount > tamilCount) return 'ml';
  }
  
  return 'en';
}

/**
 * Get voice ID based on voice key and detected/specified language
 */
function getVoiceId(voiceKey: string, language?: string, text?: string): string {
  const normalizedKey = (voiceKey || '').toLowerCase();
  
  // If language specified, use that
  const detectedLang = language || (text ? detectLanguage(text) : 'en');
  
  // Check language-specific voice maps
  if (detectedLang === 'ta') {
    if (TAMIL_VOICE_MAP[normalizedKey]) return TAMIL_VOICE_MAP[normalizedKey];
    return TAMIL_VOICE_MAP['tamil_default'];
  }
  
  if (detectedLang === 'ml') {
    if (MALAYALAM_VOICE_MAP[normalizedKey]) return MALAYALAM_VOICE_MAP[normalizedKey];
    return MALAYALAM_VOICE_MAP['malayalam_default'];
  }
  
  // English fallback
  return VOICE_MAP[normalizedKey] || DEFAULT_VOICE;
}

/**
 * Clean text for SSML
 */
function cleanTextForSSML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/\[.*?\]/g, '')
    .replace(/\*.*?\*/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();
}

/**
 * Generate SSML
 */
function generateSSML(text: string, voice: string, rate: string, pitch: string): string {
  const cleanText = cleanTextForSSML(text);
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
  <voice name="${voice}">
    <mstts:express-as style="friendly" styledegree="1.2">
      <prosody rate="${rate}" pitch="${pitch}" volume="+5%">
        ${cleanText}
      </prosody>
    </mstts:express-as>
  </voice>
</speak>`;
}

/**
 * Try Bing speech API (free tier, may have limits)
 */
async function synthesizeWithBing(text: string, voice: string, rate: string, pitch: string): Promise<Uint8Array | null> {
  const ssml = generateSSML(text, voice, rate, pitch);
  
  // Bing Translator TTS endpoint (free, no auth)
  const bingUrl = 'https://www.bing.com/tfettts';
  
  try {
    // Get auth token first
    const tokenRes = await fetch('https://www.bing.com/translator', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
    });
    
    if (!tokenRes.ok) {
      console.log('[Edge-TTS] Failed to get Bing page');
      return null;
    }
    
    const html = await tokenRes.text();
    
    // Extract IG and IID parameters
    const igMatch = html.match(/IG:"([^"]+)"/);
    const iidMatch = html.match(/IID:"([^"]+)"/);
    
    if (!igMatch || !iidMatch) {
      console.log('[Edge-TTS] Could not extract Bing params');
      return null;
    }
    
    const ig = igMatch[1];
    const iid = iidMatch[1];
    
    // Make TTS request
    const ttsRes = await fetch(`${bingUrl}?isVertical=1&IG=${ig}&IID=${iid}.1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://www.bing.com',
        'Referer': 'https://www.bing.com/translator',
      },
      body: `ssml=${encodeURIComponent(ssml)}&token=&key=0`,
    });
    
    if (!ttsRes.ok) {
      console.log(`[Edge-TTS] Bing TTS returned ${ttsRes.status}`);
      return null;
    }
    
    const buffer = await ttsRes.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    if (bytes.length > 500) {
      console.log(`[Edge-TTS] ✅ Bing success: ${bytes.length} bytes`);
      return bytes;
    }
  } catch (e) {
    console.log('[Edge-TTS] Bing error:', e instanceof Error ? e.message : e);
  }
  
  return null;
}

/**
 * Simple text-to-speech via Google Translate TTS (very limited but always works)
 * Supports Tamil (ta) and Malayalam (ml) as fallback
 */
async function synthesizeWithGoogle(text: string, language: string = 'en'): Promise<Uint8Array | null> {
  // Google TTS is limited to ~200 chars
  const shortText = text.substring(0, 200);
  const encoded = encodeURIComponent(shortText);
  
  // Map language code for Google TTS
  const googleLangMap: Record<string, string> = { 'en': 'en', 'ta': 'ta', 'ml': 'ml' };
  const tl = googleLangMap[language] || 'en';
  
  try {
    const res = await fetch(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encoded}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (bytes.length > 100) {
        console.log(`[Edge-TTS] ✅ Google TTS success: ${bytes.length} bytes`);
        return bytes;
      }
    }
  } catch (e) {
    console.log('[Edge-TTS] Google TTS error:', e);
  }
  
  return null;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = performance.now();
  
  console.log(`[Edge-TTS:${requestId}] ═══════════════════════════════════════`);
  console.log(`[Edge-TTS:${requestId}] 🔊 INVOKED at ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    const body: TTSRequest = await req.json();
    
    if (!body.text || body.text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const text = body.text.trim();
    const detectedLang = body.language || detectLanguage(text);
    const voice = getVoiceId(body.voice || 'default', detectedLang, text);
    const rate = body.rate || DEFAULT_RATE;
    const pitch = body.pitch || DEFAULT_PITCH;
    
    console.log(`[Edge-TTS:${requestId}] Text: ${text.length} chars, lang=${detectedLang}, voice=${voice}`);
    
    // Try Bing first (best quality) - with retry
    let audioData: Uint8Array | null = null;
    let provider = 'unknown';
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`[Edge-TTS:${requestId}] Bing attempt ${attempt}/2...`);
      audioData = await synthesizeWithBing(text, voice, rate, pitch);
      if (audioData && audioData.length > 100) {
        provider = 'bing';
        console.log(`[Edge-TTS:${requestId}] ✅ Bing success on attempt ${attempt}`);
        break;
      }
      // Small delay before retry
      if (attempt < 2) await new Promise(r => setTimeout(r, 500));
    }
    
    // Fallback to Google (limited but reliable) - pass detected language
    if (!audioData || audioData.length <= 100) {
      console.log(`[Edge-TTS:${requestId}] Bing failed, trying Google TTS (lang=${detectedLang})...`);
      audioData = await synthesizeWithGoogle(text, detectedLang);
      if (audioData && audioData.length > 100) {
        provider = 'google';
      }
    }
    
    const latencyMs = Math.round(performance.now() - startTime);
    
    if (audioData && audioData.length > 100) {
      const buffer = new ArrayBuffer(audioData.length);
      new Uint8Array(buffer).set(audioData);
      
      console.log(`[Edge-TTS:${requestId}] ═══════════════════════════════════════`);
      console.log(`[Edge-TTS:${requestId}] ✅ SUCCESS in ${latencyMs}ms`);
      console.log(`[Edge-TTS:${requestId}] Provider: ${provider} | Voice: ${voice}`);
      console.log(`[Edge-TTS:${requestId}] Audio: ${audioData.length} bytes`);
      console.log(`[Edge-TTS:${requestId}] ═══════════════════════════════════════`);
      
      return new Response(buffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioData.length.toString(),
          'X-Voice-Used': voice,
          'X-Provider': provider,
          'X-Latency-Ms': latencyMs.toString(),
        },
      });
    }
    
    // Signal fallback to Deepgram (primary voice provider)
    console.log(`[Edge-TTS:${requestId}] ═══════════════════════════════════════`);
    console.log(`[Edge-TTS:${requestId}] ⚠️ FALLBACK after ${latencyMs}ms`);
    console.log(`[Edge-TTS:${requestId}] Reason: All Edge TTS providers failed`);
    console.log(`[Edge-TTS:${requestId}] ═══════════════════════════════════════`);
    
    return new Response(
      JSON.stringify({ 
        fallback: true, 
        text,
        reason: 'Edge TTS unavailable - use Deepgram zoe-voice endpoint',
        provider: 'deepgram',
        latencyMs,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startTime);
    console.error(`[Edge-TTS:${requestId}] ═══════════════════════════════════════`);
    console.error(`[Edge-TTS:${requestId}] ❌ ERROR after ${latencyMs}ms`);
    console.error(`[Edge-TTS:${requestId}] Error:`, error);
    console.error(`[Edge-TTS:${requestId}] ═══════════════════════════════════════`);
    
    return new Response(
      JSON.stringify({ 
        fallback: true,
        error: 'TTS synthesis failed', 
        provider: 'deepgram',
        latencyMs,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
