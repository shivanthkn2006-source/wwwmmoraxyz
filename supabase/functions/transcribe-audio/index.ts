import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE TONE ANALYSIS - "Vibe Check" from the Intuition Protocol
// Analyzes Deepgram sentiment to detect lies/mismatch
// ═══════════════════════════════════════════════════════════════════════════════
interface VoiceToneAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  averagePitch?: number;
  energy?: number;
  speechRate?: number;
  emotionalIndicators: string[];
}

function analyzeDeepgramSentiment(sentiments: any[]): VoiceToneAnalysis {
  if (!sentiments || sentiments.length === 0) {
    return {
      sentiment: 'neutral',
      confidence: 0,
      emotionalIndicators: [],
    };
  }

  // Aggregate sentiment across segments
  let positiveSum = 0;
  let negativeSum = 0;
  let neutralSum = 0;
  const indicators: string[] = [];

  for (const segment of sentiments) {
    const avg = segment.average || segment;
    positiveSum += avg.positive || 0;
    negativeSum += avg.negative || 0;
    neutralSum += avg.neutral || 0;
    
    // Detect emotional indicators
    if ((avg.positive || 0) > 0.6) indicators.push('high_positivity');
    if ((avg.negative || 0) > 0.6) indicators.push('high_negativity');
    if ((avg.positive || 0) < 0.2 && (avg.negative || 0) < 0.2) indicators.push('flat_affect');
  }

  const count = sentiments.length;
  const avgPositive = positiveSum / count;
  const avgNegative = negativeSum / count;
  const avgNeutral = neutralSum / count;

  // Determine dominant sentiment
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  let confidence = avgNeutral;

  if (avgPositive > avgNegative && avgPositive > avgNeutral) {
    sentiment = 'positive';
    confidence = avgPositive;
  } else if (avgNegative > avgPositive && avgNegative > avgNeutral) {
    sentiment = 'negative';
    confidence = avgNegative;
  }

  // Detect mismatch indicators
  if (avgNegative > 0.3 && avgPositive > 0.3) {
    indicators.push('mixed_signals');
  }

  return {
    sentiment,
    confidence,
    emotionalIndicators: [...new Set(indicators)],
  };
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
    // PRIMARY: Use Deepgram STT with Sentiment Analysis (TRUE VIBE CHECK)
    // This enables the "Listen to the space between the words" intuition
    // ═══════════════════════════════════════════════════════════════════════════
    const DEEPGRAM_KEY = Deno.env.get('DEEPGRAM_API_KEY');
    
    if (DEEPGRAM_KEY) {
      console.log('[Transcribe] Using Deepgram STT with sentiment analysis');
      
      try {
        const binaryAudio = processBase64Chunks(audio);
        
        // Build Deepgram URL with features
        const features = [
          'model=nova-2',           // Best accuracy model
          'language=en',
          'punctuate=true',
          'diarize=false',
          enableSentiment ? 'sentiment=true' : '',  // 🎭 THE VIBE CHECK
          'detect_language=true',
          'smart_format=true',
        ].filter(Boolean).join('&');
        
        const response = await fetch(
          `https://api.deepgram.com/v1/listen?${features}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Token ${DEEPGRAM_KEY}`,
              'Content-Type': 'audio/webm',
            },
            body: binaryAudio,
          }
        );

        if (response.ok) {
          const data = await response.json();
          const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
          const confidence = data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;
          const detectedLanguage = data.results?.channels?.[0]?.detected_language;
          
          // 🎭 VIBE CHECK: Extract sentiment analysis for Intuition Engine
          const sentiments = data.results?.sentiments?.segments || 
                           data.results?.channels?.[0]?.alternatives?.[0]?.sentiments || [];
          const voiceTone = analyzeDeepgramSentiment(sentiments);
          
          console.log('[Transcribe] Deepgram success:', {
            text: transcript.substring(0, 50),
            sentiment: voiceTone.sentiment,
            indicators: voiceTone.emotionalIndicators,
          });
          
          return new Response(
            JSON.stringify({ 
              text: transcript,
              confidence,
              detectedLanguage,
              provider: 'deepgram',
              // 🎭 THE INTUITION DATA - Voice tone for Subtext Override
              voiceTone: {
                sentiment: voiceTone.sentiment,
                confidence: voiceTone.confidence,
                emotionalIndicators: voiceTone.emotionalIndicators,
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (response.status === 402 || response.status === 429) {
          console.warn('[Transcribe] Deepgram credits/rate limit, falling back...');
        } else {
          const errorText = await response.text();
          console.warn('[Transcribe] Deepgram error:', response.status, errorText);
        }
      } catch (e) {
        console.warn('[Transcribe] Deepgram failed, trying fallback:', e);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FALLBACK 1: Use Lovable AI (Gemini) for transcription - NO API KEY NEEDED
    // ═══════════════════════════════════════════════════════════════════════════
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (LOVABLE_API_KEY && useLovableAI !== false) {
      console.log('[Transcribe] Using Lovable AI (Gemini) for transcription');
      
      try {
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
                // No voice tone from Gemini - return neutral
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
    // FALLBACK 2: Use AssemblyAI if available
    // ═══════════════════════════════════════════════════════════════════════════
    const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
    
    if (!ASSEMBLYAI_API_KEY) {
      // Return browser fallback signal
      return new Response(
        JSON.stringify({ 
          error: 'No transcription service available',
          useBrowserFallback: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using AssemblyAI for transcription...');

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    console.log(`Processed ${binaryAudio.length} bytes of audio`);

    // Step 1: Upload audio file to AssemblyAI
    console.log('Uploading audio to AssemblyAI...');
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
      console.error('AssemblyAI upload error:', uploadResponse.status, errorText);
      throw new Error(`AssemblyAI upload error: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    const audioUrl = uploadResult.upload_url;
    
    console.log('Audio uploaded, starting transcription with sentiment...');

    // Step 2: Request transcription WITH sentiment analysis
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_code: 'en',
        sentiment_analysis: enableSentiment, // 🎭 THE VIBE CHECK
      }),
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error('AssemblyAI transcript request error:', transcriptResponse.status, errorText);
      throw new Error(`AssemblyAI transcript request error: ${errorText}`);
    }

    const transcriptResult = await transcriptResponse.json();
    const transcriptId = transcriptResult.id;

    console.log('Transcription started, polling for result...');

    // Step 3: Poll for transcription result
    let transcriptStatus = 'processing';
    let pollAttempts = 0;
    const maxPollAttempts = 60; // 60 seconds max wait
    
    while (transcriptStatus === 'processing' || transcriptStatus === 'queued') {
      if (pollAttempts >= maxPollAttempts) {
        throw new Error('Transcription timeout');
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'Authorization': ASSEMBLYAI_API_KEY,
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('AssemblyAI status check error:', statusResponse.status, errorText);
        throw new Error(`AssemblyAI status check error: ${errorText}`);
      }

      const statusResult = await statusResponse.json();
      transcriptStatus = statusResult.status;

      if (transcriptStatus === 'completed') {
        // 🎭 VIBE CHECK: Extract AssemblyAI sentiment
        const sentimentResults = statusResult.sentiment_analysis_results || [];
        let dominantSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
        const indicators: string[] = [];
        
        if (sentimentResults.length > 0) {
          const positiveCount = sentimentResults.filter((s: any) => s.sentiment === 'POSITIVE').length;
          const negativeCount = sentimentResults.filter((s: any) => s.sentiment === 'NEGATIVE').length;
          
          if (positiveCount > negativeCount) dominantSentiment = 'positive';
          else if (negativeCount > positiveCount) dominantSentiment = 'negative';
          
          // Check for mixed signals
          if (positiveCount > 0 && negativeCount > 0) {
            indicators.push('mixed_signals');
          }
        }
        
        console.log('[Transcribe] AssemblyAI success:', {
          text: statusResult.text?.substring(0, 50),
          sentiment: dominantSentiment,
        });
        
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
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
