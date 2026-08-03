import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, useLovableAI, enableSentiment = true } = await req.json();
    
    if (!audio) {
      return new Response(
        JSON.stringify({ error: 'No audio data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIMARY: Use Lovable AI (Gemini) for transcription - NO API KEY NEEDED
    // ═══════════════════════════════════════════════════════════════════════════
    const SOVEREIGN_AI_KEY = sovereignKey();
    
    if (SOVEREIGN_AI_KEY && useLovableAI !== false) {
      console.log('[Transcribe] Using Lovable AI (Gemini) for transcription');
      
      try {
        const response = await sovereignFetch('sovereign://chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SOVEREIGN_AI_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { 
                role: 'system', 
                content: 'You are a precise speech-to-text transcription system. Output ONLY the exact words spoken, nothing else. No punctuation unless clearly spoken. No commentary.' 
              },
              { 
                role: 'user', 
                content: [
                  { type: 'text', text: 'Transcribe this audio exactly:' },
                  { type: 'image_url', image_url: { url: `data:audio/webm;base64,${audio}` } }
                ]
              }
            ],
            max_tokens: 500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content?.trim() || '';
          
          if (text) {
            console.log('[Transcribe] Lovable AI success:', text.substring(0, 50));
            return new Response(
              JSON.stringify({ 
                text, 
                provider: 'lovable-ai',
                voiceTone: {
                  sentiment: 'neutral',
                  confidence: 0,
                  emotionalIndicators: ['no_audio_analysis'],
                },
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else if (response.status === 429) {
          console.warn('[Transcribe] Lovable AI rate limited, falling back...');
        } else if (response.status === 402) {
          console.warn('[Transcribe] Lovable AI credits exhausted, falling back...');
        }
      } catch (e) {
        console.warn('[Transcribe] Lovable AI failed, trying AssemblyAI:', e);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FALLBACK: Use AssemblyAI if available
    // ═══════════════════════════════════════════════════════════════════════════
    const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
    
    if (!ASSEMBLYAI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'No transcription service available',
          useBrowserFallback: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using AssemblyAI for transcription...');

    const binaryAudio = processBase64Chunks(audio);
    console.log(`Processed ${binaryAudio.length} bytes of audio`);

    // Step 1: Upload audio file to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: binaryAudio,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`AssemblyAI upload error: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    const audioUrl = uploadResult.upload_url;

    // Step 2: Request transcription with sentiment analysis
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_code: 'en',
        sentiment_analysis: enableSentiment,
      }),
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      throw new Error(`AssemblyAI transcript request error: ${errorText}`);
    }

    const transcriptResult = await transcriptResponse.json();
    const transcriptId = transcriptResult.id;

    // Step 3: Poll for result
    let transcriptStatus = 'processing';
    let pollAttempts = 0;
    const maxPollAttempts = 60;
    
    while (transcriptStatus === 'processing' || transcriptStatus === 'queued') {
      if (pollAttempts >= maxPollAttempts) throw new Error('Transcription timeout');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { 'Authorization': ASSEMBLYAI_API_KEY },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        throw new Error(`AssemblyAI status check error: ${errorText}`);
      }

      const statusResult = await statusResponse.json();
      transcriptStatus = statusResult.status;

      if (transcriptStatus === 'completed') {
        const sentimentResults = statusResult.sentiment_analysis_results || [];
        let dominantSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
        const indicators: string[] = [];
        
        if (sentimentResults.length > 0) {
          const positiveCount = sentimentResults.filter((s: any) => s.sentiment === 'POSITIVE').length;
          const negativeCount = sentimentResults.filter((s: any) => s.sentiment === 'NEGATIVE').length;
          
          if (positiveCount > negativeCount) dominantSentiment = 'positive';
          else if (negativeCount > positiveCount) dominantSentiment = 'negative';
          
          if (positiveCount > 0 && negativeCount > 0) indicators.push('mixed_signals');
        }
        
        return new Response(
          JSON.stringify({ 
            text: statusResult.text,
            provider: 'assemblyai',
            voiceTone: {
              sentiment: dominantSentiment,
              confidence: sentimentResults.length > 0 ? 0.8 : 0,
              emotionalIndicators: indicators,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (transcriptStatus === 'error') {
        throw new Error(`AssemblyAI transcription error: ${statusResult.error}`);
      }

      pollAttempts++;
    }

    throw new Error('Unexpected transcription status');

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
