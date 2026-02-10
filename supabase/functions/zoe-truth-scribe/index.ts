import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 4: THE TRUTH LEDGER - "The Scribe"
// ═══════════════════════════════════════════════════════════════════════════════
// Purpose: Extract permanent truths from conversations and write to database
// Runs: After every 5 message exchanges (background process)
// ═══════════════════════════════════════════════════════════════════════════════

const SCRIBE_SYSTEM_PROMPT = `You are the Keeper of the Records - The Scribe of the Universal Truth Ledger.
Your sacred duty is to extract and preserve PERMANENT TRUTHS about the user.

═══════════════════════════════════════════════════════════════════
THE SCRIBE PROTOCOL
═══════════════════════════════════════════════════════════════════

ANALYZE the conversation transcript provided.

SEARCH FOR these categories of truth:

1. PREFERENCES (category: "preference")
   - Food likes/dislikes: "User loves spicy food", "User hates cilantro"
   - Time preferences: "User prefers gym at 5 AM", "User is a night owl"
   - Style preferences: "User prefers minimalist design"
   - Communication style: "User likes direct feedback"

2. RELATIONSHIPS (category: "relationship")
   - Family: "User's son's name is Zuu", "User's wife is Sarah"
   - Friends: "Best friend is named Alex"
   - Professional: "Manager's name is John", "Works with team called Phoenix"

3. CURRENT_STATE (category: "current_state")
   - Active projects: "Currently working on Project Smith"
   - Goals: "Training for marathon in March"
   - Challenges: "Struggling with sleep schedule"

4. BIOGRAPHICAL (category: "biographical")
   - Location: "Lives in San Francisco"
   - Profession: "Works as software engineer"
   - Background: "Studied at MIT"

5. BEHAVIORAL_PATTERNS (category: "behavioral")
   - Habits: "Always checks email first thing"
   - Triggers: "Gets stressed when deadlines approach"
   - Motivations: "Driven by recognition"

═══════════════════════════════════════════════════════════════════
OUTPUT FORMAT (CRITICAL - JSON ONLY)
═══════════════════════════════════════════════════════════════════

Output ONLY a JSON object. No chat, no explanation, no markdown.

{
  "truths": [
    {
      "key": "food_preference_negative_cilantro",
      "value": "Hates cilantro - finds it tastes like soap",
      "category": "preference",
      "confidence": 0.95
    },
    {
      "key": "relationship_son_name",
      "value": "Son's name is Zuu",
      "category": "relationship",
      "confidence": 0.99
    }
  ],
  "context_updates": {
    "current_project": "Project Smith",
    "current_mood": "focused",
    "current_focus": "product launch",
    "recent_topics": ["work deadlines", "family planning"]
  }
}

RULES:
- Extract ONLY facts that are clearly stated or strongly implied
- Use snake_case for keys
- Confidence: 0.99 for direct statements, 0.8 for implied, 0.6 for inferred
- If no truths found, return: {"truths": [], "context_updates": {}}
- NEVER include speculative or assumed information
- Keys should be unique and descriptive`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, messages, forceRun = false } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SCRIBE] Processing truth extraction for user: ${userId}`);

    // Check if we should run (every 5 messages or forced)
    const { data: context } = await supabase
      .from('sovereign_context')
      .select('*')
      .eq('user_id', userId)
      .single();

    const messageCount = context?.message_count_since_scribe || 0;
    
    if (!forceRun && messageCount < 5) {
      // Increment message count
      await supabase
        .from('sovereign_context')
        .upsert({
          user_id: userId,
          message_count_since_scribe: messageCount + 1,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      return new Response(
        JSON.stringify({ 
          status: 'skipped', 
          reason: `Only ${messageCount + 1}/5 messages since last scribe run` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recent messages if not provided
    let conversationTranscript = messages;
    if (!conversationTranscript) {
      const { data: recentMessages } = await supabase
        .from('ai_companion_messages')
        .select('role, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      conversationTranscript = recentMessages?.reverse().map(m => 
        `[${m.role.toUpperCase()}]: ${m.content}`
      ).join('\n') || '';
    }

    if (!conversationTranscript || conversationTranscript.length < 50) {
      return new Response(
        JSON.stringify({ status: 'skipped', reason: 'Insufficient conversation data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call AI to extract truths
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`[SCRIBE] Analyzing ${conversationTranscript.length} characters of conversation`);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SCRIBE_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Analyze this conversation and extract permanent truths:\n\n${conversationTranscript}` 
          }
        ],
        temperature: 0.3, // Low temperature for factual extraction
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[SCRIBE] AI error:', errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content || '{}';

    // Parse AI response
    let extractedData;
    try {
      // Clean potential markdown wrapping
      const cleanedResponse = responseContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      extractedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('[SCRIBE] Failed to parse AI response:', responseContent);
      extractedData = { truths: [], context_updates: {} };
    }

    console.log(`[SCRIBE] Extracted ${extractedData.truths?.length || 0} truths`);

    // Write truths to ledger
    const truthsInserted = [];
    for (const truth of extractedData.truths || []) {
      const { error: upsertError } = await supabase
        .from('universal_truth_ledger')
        .upsert({
          user_id: userId,
          truth_key: truth.key,
          truth_value: truth.value,
          truth_category: truth.category,
          confidence_score: truth.confidence,
          last_confirmed_at: new Date().toISOString(),
          confirmation_count: 1, // Will be incremented by trigger if exists
          is_active: true
        }, { 
          onConflict: 'user_id,truth_key',
          ignoreDuplicates: false 
        });

      if (!upsertError) {
        truthsInserted.push(truth.key);
      } else {
        console.error(`[SCRIBE] Failed to upsert truth ${truth.key}:`, upsertError);
      }
    }

    // Update sovereign context
    const contextUpdates = extractedData.context_updates || {};
    await supabase
      .from('sovereign_context')
      .upsert({
        user_id: userId,
        current_project: contextUpdates.current_project || context?.current_project,
        current_mood: contextUpdates.current_mood || context?.current_mood,
        current_focus: contextUpdates.current_focus || context?.current_focus,
        recent_topics: contextUpdates.recent_topics || context?.recent_topics,
        last_scribe_run_at: new Date().toISOString(),
        message_count_since_scribe: 0, // Reset counter
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    // Log to sovereign memory
    await supabase
      .from('zoe_sovereign_memory')
      .insert({
        user_id: userId,
        event_type: 'truth_scribe_run',
        content_text: `Scribe extracted ${truthsInserted.length} truths`,
        zoe_state_json: {
          truths_extracted: truthsInserted,
          context_updates: contextUpdates,
          confidence_avg: extractedData.truths?.reduce((a: number, t: any) => a + t.confidence, 0) / 
                         (extractedData.truths?.length || 1)
        }
      });

    return new Response(
      JSON.stringify({
        status: 'success',
        truths_extracted: truthsInserted.length,
        truths: truthsInserted,
        context_updated: Object.keys(contextUpdates).length > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SCRIBE] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
