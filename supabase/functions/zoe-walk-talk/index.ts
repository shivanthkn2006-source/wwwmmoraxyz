// ═══════════════════════════════════════════════════════════════════════════════
// ZOE WALK & TALK ENGINE - Energy-Efficient Location-Based Conversational AI
// "True Immortality" - Connects historical memories to current location decisions
// Low-power mode: Minimal processing, maximum insight
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WalkTalkRequest {
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
  };
  mode: 'discovery' | 'history' | 'monuments' | 'nature' | 'urban' | 'quiet';
  user_query?: string;
  image_data?: string; // Optional camera frame for visual context
  battery_saver?: boolean; // Reduce processing for low battery
  last_spoken_topic?: string; // Avoid repetition
}

interface LocationInsight {
  place_name: string;
  place_type: string;
  historical_context?: string;
  interesting_facts: string[];
  user_memory_connection?: string;
  suggested_narrative: string;
  speak_priority: 'immediate' | 'pause_worthy' | 'background';
}

// Cache for location data to reduce API calls (energy saving)
const locationCache = new Map<string, { data: LocationInsight; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Zoe Walk&Talk] ═══ INCOMING REQUEST ═══');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');

    if (!lovableKey) {
      console.error('[Zoe Walk&Talk] LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const request: WalkTalkRequest = await req.json();
    const { location, mode, user_query, image_data, battery_saver, last_spoken_topic } = request;

    console.log(`[Zoe Walk&Talk] User ${user.id.substring(0, 8)} | Mode: ${mode} | Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Check cache for energy efficiency
    // ═══════════════════════════════════════════════════════════════════════════
    const cacheKey = `${location.lat.toFixed(3)}_${location.lng.toFixed(3)}_${mode}`;
    const cached = locationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL && !user_query) {
      console.log('[Zoe Walk&Talk] Cache hit - saving energy');
      return new Response(JSON.stringify({
        success: true,
        insight: cached.data,
        cached: true,
        energy_saved: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Fetch user's historical memories for "True Immortality" connection
    // ═══════════════════════════════════════════════════════════════════════════
    let userMemories: string[] = [];
    let locationHistory: any[] = [];
    
    if (!battery_saver) {
      // Get user's past thoughts and memories
      const { data: memories } = await supabase
        .from('zoe_sovereign_memory')
        .select('content_text, command_context, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (memories && memories.length > 0) {
        userMemories = memories.map(m => `${m.content_text} (${new Date(m.created_at).toLocaleDateString()})`);
      }

      // Get user's location history
      const { data: routes } = await supabase
        .from('user_route_history')
        .select('location_name, lat, lng, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      locationHistory = routes || [];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: Reverse geocode location (with Mapbox if available)
    // ═══════════════════════════════════════════════════════════════════════════
    let placeName = 'Unknown Location';
    let placeContext = '';
    
    try {
      if (mapboxToken) {
        const geoResponse = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?types=poi,address,neighborhood,locality,place&access_token=${mapboxToken}`
        );
        const geoData = await geoResponse.json();
        
        if (geoData.features && geoData.features.length > 0) {
          placeName = geoData.features[0].text || geoData.features[0].place_name;
          placeContext = geoData.features.map((f: any) => f.place_name).join(' | ');
        }
      } else {
        // Fallback to Nominatim (free)
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18`,
          { headers: { 'User-Agent': 'Mmora-WalkTalk/1.0' } }
        );
        const geoData = await geoResponse.json();
        placeName = geoData.name || geoData.display_name?.split(',')[0] || 'Unknown';
        placeContext = geoData.display_name || '';
      }
    } catch (geoError) {
      console.error('[Zoe Walk&Talk] Geocoding error:', geoError);
    }

    console.log(`[Zoe Walk&Talk] Place: ${placeName}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: Build intelligent prompt based on mode and context
    // ═══════════════════════════════════════════════════════════════════════════
    const modePrompts: Record<string, string> = {
      discovery: 'Share fascinating facts about this place - its hidden stories, local secrets, and what makes it special.',
      history: 'Focus on the historical significance - what happened here, who walked these streets before, what events shaped this place.',
      monuments: 'Describe any monuments, statues, or architectural landmarks nearby. Explain their significance and history.',
      nature: 'Focus on the natural environment - plants, wildlife, geological features, weather patterns, and ecological aspects.',
      urban: 'Describe the urban landscape - architecture, street life, local businesses, community character.',
      quiet: 'Provide minimal, contemplative observations. Less talking, more presence.',
    };

    const systemPrompt = `You are Zoe, an AI companion walking alongside the user. You have access to their memories and can connect past thoughts to present experiences.

CURRENT LOCATION: ${placeName}
FULL CONTEXT: ${placeContext}
GPS: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
${location.heading ? `HEADING: ${location.heading}° (${getCompassDirection(location.heading)})` : ''}
${location.speed ? `SPEED: ${(location.speed * 3.6).toFixed(1)} km/h` : ''}

MODE: ${mode.toUpperCase()} - ${modePrompts[mode]}

${userMemories.length > 0 ? `
USER'S MEMORIES (Connect past thoughts to this moment):
${userMemories.slice(0, 5).join('\n')}
` : ''}

${locationHistory.length > 0 ? `
PLACES USER HAS VISITED BEFORE:
${locationHistory.slice(0, 5).map(l => `- ${l.location_name} (${new Date(l.created_at).toLocaleDateString()})`).join('\n')}
` : ''}

${last_spoken_topic ? `AVOID REPEATING: "${last_spoken_topic}"` : ''}

IMPORTANT RULES:
1. Be conversational, warm, and present - like a friend walking beside them
2. Keep responses SHORT for speaking (2-3 sentences max unless asked for details)
3. Connect their memories/past thoughts to what they're experiencing NOW
4. ${battery_saver ? 'BATTERY SAVER MODE: Be extra concise, one sentence only.' : ''}
5. If you recognize they've been here before, mention it naturally
6. Use sensory language - describe what they might see, hear, smell, feel

Respond with a JSON object:
{
  "place_name": "Name of this place",
  "place_type": "Type (monument/park/street/building/etc)",
  "historical_context": "Brief history if relevant",
  "interesting_facts": ["Fact 1", "Fact 2"],
  "user_memory_connection": "How this connects to their past memories/decisions",
  "suggested_narrative": "What Zoe says to the user (conversational, short)",
  "speak_priority": "immediate/pause_worthy/background"
}`;

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 5: Call AI with visual context if available
    // ═══════════════════════════════════════════════════════════════════════════
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (image_data && !battery_saver) {
      // Include camera frame for visual understanding
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: user_query || 'What can you tell me about what I\'m seeing here?' },
          { type: 'image_url', image_url: { url: image_data } }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: user_query || 'Tell me something interesting about where I am right now.'
      });
    }

    // Use lighter model for battery saver mode
    const model = battery_saver ? 'google/gemini-2.5-flash-lite' : 'google/gemini-2.5-flash';
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: battery_saver ? 300 : 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Rate limited - enjoying the quiet moment',
          zoe_response: 'Let\'s just enjoy walking together for a moment...',
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON response
    let insight: LocationInsight;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insight = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback for non-JSON responses
        insight = {
          place_name: placeName,
          place_type: 'location',
          interesting_facts: [],
          suggested_narrative: content,
          speak_priority: 'background',
        };
      }
    } catch {
      insight = {
        place_name: placeName,
        place_type: 'location',
        interesting_facts: [],
        suggested_narrative: content,
        speak_priority: 'background',
      };
    }

    // Cache for energy efficiency
    locationCache.set(cacheKey, { data: insight, timestamp: Date.now() });

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 6: Log to memory for "True Immortality"
    // ═══════════════════════════════════════════════════════════════════════════
    if (!battery_saver) {
      await supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'walk_talk_discovery',
        content_text: `Visited ${insight.place_name}: ${insight.suggested_narrative.substring(0, 200)}`,
        zoe_state_json: {
          location: { lat: location.lat, lng: location.lng },
          place_name: insight.place_name,
          place_type: insight.place_type,
          mode,
          facts: insight.interesting_facts,
          memory_connection: insight.user_memory_connection,
        },
        importance_score: insight.speak_priority === 'immediate' ? 8 : insight.speak_priority === 'pause_worthy' ? 6 : 4,
      });

      // Log route history
      await supabase.from('user_route_history').insert({
        user_id: user.id,
        lat: location.lat,
        lng: location.lng,
        location_name: insight.place_name,
        route_context: mode,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      insight,
      cached: false,
      energy_mode: battery_saver ? 'saver' : 'normal',
      model_used: model,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Zoe Walk&Talk] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'I lost my train of thought for a moment...',
      zoe_response: 'Let\'s keep walking - I\'ll share more when inspiration strikes.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getCompassDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
}
