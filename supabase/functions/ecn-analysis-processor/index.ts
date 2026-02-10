// ═══════════════════════════════════════════════════════════════════════════════
// ECN ANALYSIS PROCESSOR - Cost-Effective Emotion Pattern Analysis
// Uses Gemini 2.5 Flash-Lite for high-volume, continuous processing
// Part of 360-Degree Conversational Foundation
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 27 ECN Emotion States
const ECN_EMOTIONS = [
  'admiration', 'amusement', 'anger', 'annoyance', 'approval',
  'awe', 'caring', 'confusion', 'curiosity', 'desire',
  'disappointment', 'disapproval', 'disgust', 'embarrassment', 'empathic_pain',
  'excitement', 'fear', 'gratitude', 'grief', 'joy',
  'love', 'nervousness', 'nostalgia', 'optimism', 'pride',
  'realization', 'relief', 'remorse', 'sadness', 'surprise',
  'neutral'
];

interface ECNAnalysisResult {
  primary_emotion: string;
  secondary_emotions: string[];
  valence: number;
  arousal: number;
  engagement_score: number;
  stress_level: number;
  action_tendency: string;
  patterns_detected: string[];
  learning_style_indicators: {
    visual: number;
    auditory: number;
    kinesthetic: number;
    reading_writing: number;
  };
}

// Rate limiting - simple in-memory tracker
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max 10 requests per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Default fallback result
function getDefaultAnalysisResult(): ECNAnalysisResult {
  return {
    primary_emotion: 'neutral',
    secondary_emotions: [],
    valence: 0,
    arousal: 50,
    engagement_score: 50,
    stress_level: 0,
    action_tendency: 'seeking_information',
    patterns_detected: [],
    learning_style_indicators: {
      visual: 50,
      auditory: 50,
      kinesthetic: 50,
      reading_writing: 50,
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      console.log(`[ECN Processor] Rate limited for user ${user.id}`);
      return new Response(JSON.stringify({ 
        error: 'Rate limited', 
        retry_after_ms: RATE_LIMIT_WINDOW_MS,
        message: 'Too many ECN analysis requests. Please wait before retrying.'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { events, queue_id } = await req.json();

    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ error: 'No events provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ECN Processor] Analyzing ${events.length} events for user ${user.id}`);

    // Build context from events for analysis
    const eventSummary = events.map(e => {
      return `Event: ${e.event_type} (${e.event_category}) - Context: "${e.context_snippet || 'N/A'}"${
        e.metadata?.ecn_emotion ? ` - Emotion: ${e.metadata.ecn_emotion}` : ''
      }${
        e.metadata?.voice_characteristics ? ` - Voice: ${JSON.stringify(e.metadata.voice_characteristics)}` : ''
      }${
        e.metadata?.face_emotion ? ` - Face: ${e.metadata.face_emotion} (${e.metadata.face_confidence})` : ''
      }`;
    }).join('\n');

    // Initialize with default - will be overwritten by AI or rule-based analysis
    let analysisResult: ECNAnalysisResult = getDefaultAnalysisResult();

    // Use Lovable AI Gateway with Gemini 2.5 Flash-Lite for cost efficiency
    const analysisPrompt = `Analyze the following user behavioral events and extract emotional patterns.

EVENTS:
${eventSummary}

Analyze for:
1. Primary emotion from these 27 states: ${ECN_EMOTIONS.join(', ')}
2. Secondary emotions (up to 3)
3. Valence (-100 to 100, negative to positive as INTEGER)
4. Arousal (0 to 100 as INTEGER)
5. Engagement score (0 to 100 as INTEGER)
6. Stress level (0 to 100 as INTEGER)
7. Action tendency (seeking_information, taking_action, avoiding, approaching)
8. Patterns detected (list behavioral patterns)
9. Learning style indicators (visual, auditory, kinesthetic, reading_writing - each 0 to 100 as INTEGER)

IMPORTANT: All numeric values must be INTEGERS, not decimals.

Respond in JSON format only.`;

    if (lovableApiKey) {
      // Use Lovable AI Gateway with retry logic
      let retries = 2;
      let aiSuccess = false;
      
      while (retries > 0 && !aiSuccess) {
        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite', // Cost-effective model
              messages: [
                { 
                  role: 'system', 
                  content: 'You are an emotion analysis AI. Analyze behavioral events and return JSON with emotion patterns. All numeric values must be INTEGERS (not decimals).' 
                },
                { role: 'user', content: analysisPrompt }
              ],
            }),
          });

          if (aiResponse.status === 429) {
            // Rate limited by AI gateway, wait and retry
            console.log(`[ECN Processor] AI rate limited, waiting before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            retries--;
            continue;
          }

          if (!aiResponse.ok) {
            throw new Error(`AI analysis failed: ${aiResponse.statusText}`);
          }

          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysisResult = JSON.parse(jsonMatch[0]);
            aiSuccess = true;
          } else {
            throw new Error('No JSON in response');
          }
        } catch (parseError) {
          console.error('[ECN Processor] AI/Parse error:', parseError);
          retries--;
        }
      }
      
      // Fallback if AI failed
      if (!aiSuccess) {
        analysisResult = performRuleBasedAnalysis(events);
      }
    } else {
      // Fallback to rule-based analysis if no API key
      analysisResult = performRuleBasedAnalysis(events);
    }

    // Ensure all values are proper integers for database (scale 0-1 to 0-100)
    const valenceInt = Math.round(
      typeof analysisResult.valence === 'number' 
        ? (Math.abs(analysisResult.valence) <= 1 ? analysisResult.valence * 100 : analysisResult.valence)
        : 0
    );
    const engagementInt = Math.round(
      typeof analysisResult.engagement_score === 'number'
        ? (analysisResult.engagement_score <= 1 ? analysisResult.engagement_score * 100 : analysisResult.engagement_score)
        : 50
    );
    const stressInt = Math.round(
      typeof analysisResult.stress_level === 'number'
        ? (analysisResult.stress_level <= 1 ? analysisResult.stress_level * 100 : analysisResult.stress_level)
        : 0
    );

    // Store ECN history with properly typed values
    const { error: ecnError } = await supabase
      .from('ecn_history')
      .insert({
        user_id: user.id,
        primary_emotion: analysisResult.primary_emotion || 'neutral',
        valence: Math.max(-100, Math.min(100, valenceInt)),
        engagement_score: Math.max(0, Math.min(100, engagementInt)),
        stress_level: Math.max(0, Math.min(100, stressInt)),
        action_tendency: analysisResult.action_tendency || 'seeking_information',
        metadata: {
          secondary_emotions: analysisResult.secondary_emotions || [],
          arousal: analysisResult.arousal,
          patterns_detected: analysisResult.patterns_detected || [],
          learning_style_indicators: analysisResult.learning_style_indicators,
          events_analyzed: events.length,
        },
      });

    if (ecnError) {
      console.error('[ECN Processor] Insert error:', ecnError);
    }

    // Update queue status if queue_id provided
    if (queue_id) {
      await supabase
        .from('ecn_analysis_queue')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          analysis_result: analysisResult,
        })
        .eq('id', queue_id);
    }

    // Mark events as ECN processed
    const eventIds = events.map((e: any) => e.id).filter(Boolean);
    if (eventIds.length > 0) {
      await supabase
        .from('behavioral_events')
        .update({ ecn_processed: true })
        .in('id', eventIds);
    }

    // Update DHF learning history with patterns
    await supabase
      .from('dhf_learning_history')
      .upsert({
        user_id: user.id,
        emotional_trends: {
          latest_emotion: analysisResult.primary_emotion,
          patterns: analysisResult.patterns_detected,
          learning_style: analysisResult.learning_style_indicators,
          updated_at: new Date().toISOString(),
        },
        last_refinement_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    console.log(`[ECN Processor] Analysis complete for ${user.id}:`, analysisResult.primary_emotion);

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisResult,
      events_processed: events.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ECN Processor] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Rule-based fallback analysis (returns integers)
function performRuleBasedAnalysis(events: any[]): ECNAnalysisResult {
  let positiveCount = 0;
  let negativeCount = 0;
  let highEnergyCount = 0;
  
  const emotionCounts: Record<string, number> = {};
  
  for (const event of events) {
    const sentiment = event.sentiment_score || 0.5;
    if (sentiment > 0.6) positiveCount++;
    if (sentiment < 0.4) negativeCount++;
    
    const category = event.event_category?.toLowerCase() || '';
    if (category.includes('voice') || category.includes('social')) highEnergyCount++;
    
    const emotion = event.metadata?.ecn_emotion || event.metadata?.face_emotion;
    if (emotion) {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    }
  }
  
  // Determine primary emotion
  let primaryEmotion = 'neutral';
  let maxCount = 0;
  for (const [emotion, count] of Object.entries(emotionCounts)) {
    if (count > maxCount) {
      maxCount = count;
      primaryEmotion = emotion;
    }
  }
  
  // Calculate metrics as integers (0-100 scale)
  const total = events.length || 1;
  const valence = Math.round(((positiveCount - negativeCount) / total) * 100);
  const arousal = Math.round((highEnergyCount / total) * 100);
  
  return {
    primary_emotion: primaryEmotion,
    secondary_emotions: Object.keys(emotionCounts).slice(0, 3),
    valence: Math.max(-100, Math.min(100, valence)),
    arousal: Math.min(100, arousal),
    engagement_score: Math.min(100, Math.round((events.length / 20) * 100)),
    stress_level: Math.round((negativeCount / total) * 100),
    action_tendency: arousal > 50 ? 'taking_action' : 'seeking_information',
    patterns_detected: [],
    learning_style_indicators: {
      visual: 50,
      auditory: 50,
      kinesthetic: 50,
      reading_writing: 50,
    },
  };
}
