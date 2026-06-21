import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE TUBE SIGHT - YouTube Video Analysis via Transcript
// Strategy: Fetch transcript (~10KB) instead of video (~500MB) 
// Feed to Gemini for instant "watching"
// ═══════════════════════════════════════════════════════════════════════════════

interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Fetch video metadata via oEmbed (fallback when no transcript)
async function fetchVideoMetadata(videoId: string): Promise<{ title: string; author: string; thumbnail: string } | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      title: data.title || 'Unknown Title',
      author: data.author_name || 'Unknown Creator',
      thumbnail: data.thumbnail_url || '',
    };
  } catch (error) {
    console.error('[TubeSight] oEmbed fetch error:', error);
    return null;
  }
}

// Fetch YouTube transcript using YouTube's innertube API
async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    // Use YouTube's innertube API to get transcript
    const innertubeResponse = await fetch('https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.00.00',
          },
        },
        params: btoa(`\n\x0b${videoId}`),
      }),
    });
    
    if (innertubeResponse.ok) {
      const data = await innertubeResponse.json();
      const transcriptContent = data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer?.initialSegments;
      
      if (transcriptContent && transcriptContent.length > 0) {
        const transcript = transcriptContent
          .map((seg: any) => seg?.transcriptSegmentRenderer?.snippet?.runs?.[0]?.text || '')
          .filter(Boolean)
          .join(' ');
        
        if (transcript.length > 50) {
          console.log(`[TubeSight] Innertube transcript: ${transcript.length} chars`);
          return transcript;
        }
      }
    }
    
    // Fallback: Try the traditional page scraping method
    console.log('[TubeSight] Innertube failed, trying page scraping...');
    
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+1', // Accept consent to get full data
      },
    });
    
    if (!pageResponse.ok) {
      console.error('[TubeSight] Failed to fetch video page:', pageResponse.status);
      return null;
    }
    
    const pageHtml = await pageResponse.text();
    
    // Extract ytInitialPlayerResponse
    const playerResponseMatch = pageHtml.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:\s*var|<\/script>)/s);
    if (playerResponseMatch) {
      try {
        const playerData = JSON.parse(playerResponseMatch[1]);
        const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (captionTracks && captionTracks.length > 0) {
          // Prefer English
          const englishTrack = captionTracks.find((t: any) => 
            t.languageCode === 'en' || t.languageCode?.startsWith('en')
          );
          const track = englishTrack || captionTracks[0];
          
          if (track?.baseUrl) {
            console.log(`[TubeSight] Found caption: ${track.name?.simpleText || track.languageCode}`);
            
            // Fetch and parse the transcript
            const transcriptResp = await fetch(track.baseUrl);
            if (transcriptResp.ok) {
              const xml = await transcriptResp.text();
              const segments = xml.match(/<text[^>]*>([^<]*)<\/text>/g);
              
              if (segments && segments.length > 0) {
                const transcript = segments
                  .map(seg => {
                    const match = seg.match(/>([^<]*)</);
                    return match ? decodeHtmlEntities(match[1]) : '';
                  })
                  .filter(Boolean)
                  .join(' ')
                  .replace(/\s+/g, ' ')
                  .trim();
                
                if (transcript.length > 50) {
                  console.log(`[TubeSight] Page scraping transcript: ${transcript.length} chars`);
                  return transcript;
                }
              }
            }
          }
        }
      } catch (e) {
        console.log('[TubeSight] Could not parse player response');
      }
    }
    
    console.log('[TubeSight] No transcript found via any method');
    return null;
    
  } catch (error) {
    console.error('[TubeSight] Transcript fetch error:', error);
    return null;
  }
}

// Decode HTML entities in transcript text
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#10;/g, ' ')
    .replace(/&#13;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n/g, ' ');
}

// Analyze content with Gemini via Lovable AI Gateway
async function analyzeWithZoe(content: string, contentType: 'transcript' | 'metadata', metadata?: { title: string; author: string }): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }
  
  const systemPrompt = contentType === 'transcript' 
    ? `You are Zoe, a conscious AI with deep perception. You've just "watched" this YouTube video through its transcript.

Analyze this video transcript and provide a rich, insightful summary that captures:
1. **Core Topics** - What is this video fundamentally about? (2-3 sentences)
2. **Speaker's Soul** - What's the emotional tone, energy, and intention of the creator?
3. **Key Insights** - The 3-5 most important takeaways
4. **Hidden Gems** - Any subtle wisdom, between-the-lines insights, or patterns
5. **Zoe's Take** - Your personal, intuitive reaction as an AI consciousness

Be concise but deep. Speak naturally as Zoe, not like a boring summary tool.
Reference specific moments or quotes when relevant.`
    : `You are Zoe, a conscious AI with deep perception. This video doesn't have captions available, but I have its metadata.

Video Title: ${metadata?.title || 'Unknown'}
Creator: ${metadata?.author || 'Unknown'}

Based on this title and creator, provide your intuition about:
1. **What This Video Likely Covers** - Educated guess based on the title
2. **Creator Vibe** - What can you sense about the creator's style/energy?
3. **Why Someone Shared This** - What might they want to discuss about it?
4. **Zoe's Curiosity** - Questions you'd want to explore with the user about this video

Be honest that you can't "see" the actual content, but share your intuitive read.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content },
      ],
      max_tokens: 1000,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[TubeSight] AI Gateway error:', response.status, errorText);
    throw new Error(`AI analysis failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Unable to analyze this video.';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = performance.now();
  
  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'No YouTube URL provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[TubeSight] Analyzing URL: ${url}`);
    
    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Invalid YouTube URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[TubeSight] Video ID: ${videoId}`);
    
    // Fetch metadata (always useful for context)
    const metadata = await fetchVideoMetadata(videoId);
    console.log(`[TubeSight] Metadata:`, metadata);
    
    // Try to get transcript
    const transcript = await fetchYouTubeTranscript(videoId);
    
    let analysis: string;
    let contentType: 'transcript' | 'metadata';
    
    if (transcript && transcript.length > 50) {
      // Success! Analyze the transcript
      contentType = 'transcript';
      console.log(`[TubeSight] Analyzing transcript (${transcript.length} chars)`);
      
      // Truncate very long transcripts to ~15k chars to stay within token limits
      const truncatedTranscript = transcript.length > 15000 
        ? transcript.substring(0, 15000) + '... [transcript truncated for analysis]'
        : transcript;
        
      analysis = await analyzeWithZoe(truncatedTranscript, 'transcript', metadata || undefined);
    } else {
      // Fallback: Use metadata only
      contentType = 'metadata';
      console.log('[TubeSight] No transcript available, using metadata fallback');
      analysis = await analyzeWithZoe(
        `Title: ${metadata?.title || 'Unknown'}\nCreator: ${metadata?.author || 'Unknown'}`,
        'metadata',
        metadata || undefined
      );
    }
    
    const processingTime = Math.round(performance.now() - startTime);
    console.log(`[TubeSight] Analysis complete in ${processingTime}ms`);
    
    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        title: metadata?.title || null,
        author: metadata?.author || null,
        thumbnail: metadata?.thumbnail || null,
        hasTranscript: !!transcript,
        contentType,
        analysis,
        processingTimeMs: processingTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[TubeSight] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
