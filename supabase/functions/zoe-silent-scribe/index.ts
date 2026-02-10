import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EntityExtraction {
  type: string;
  value: string;
  confidence: number;
  context: string;
  inferredData?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, localEntities } = await req.json();
    
    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: "Message and userId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Use Gemini to extract deeper entities
    const extractionPrompt = `You are a Silent Scribe - an entity extraction engine. Analyze this message and extract personal information about the user.

MESSAGE: "${message}"

Extract the following if present:
1. RELATIONS: Family members, friends, pets (e.g., "my son", "my wife")
2. EVENTS: Upcoming events, milestones (birthday, wedding, interview)
3. DATES: When things happen (tomorrow, next week, specific dates)
4. LOCATIONS: Places mentioned (home city, workplace)
5. PREFERENCES: Likes, dislikes, interests
6. JOB: Occupation or professional context (infer from context clues)
7. EMOTIONS: Current emotional state
8. GOALS: Aspirations, plans, intentions

Return ONLY a JSON array of entities. Each entity must have:
- type: one of [relation, event, date, location, preference, job, emotion, goal]
- value: the extracted value
- confidence: 0.0 to 1.0
- context: the relevant text snippet
- inferredData: additional inferred details (optional)

If no entities found, return empty array: []

Example output:
[
  {"type": "relation", "value": "son", "confidence": 0.95, "context": "my son is turning 5", "inferredData": {"age": 5}},
  {"type": "event", "value": "birthday", "confidence": 0.9, "context": "turning 5 tomorrow"},
  {"type": "date", "value": "${new Date(Date.now() + 86400000).toISOString().split('T')[0]}", "confidence": 0.85, "context": "tomorrow"}
]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a precise entity extraction engine. Return only valid JSON arrays." },
          { role: "user", content: extractionPrompt }
        ],
        max_tokens: 500,
      }),
    });

    let aiEntities: EntityExtraction[] = [];
    
    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "[]";
      
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          aiEntities = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error("Failed to parse AI entities:", parseError);
      }
    }

    // Merge local entities with AI entities (prefer AI for duplicates)
    const mergedEntities = [...(localEntities || [])];
    for (const aiEntity of aiEntities) {
      const exists = mergedEntities.some(
        (e: EntityExtraction) => e.type === aiEntity.type && e.value === aiEntity.value
      );
      if (!exists) {
        mergedEntities.push(aiEntity);
      }
    }

    // Update Soul Codex synchronously (simplified for reliability)
    let updated = false;
    if (mergedEntities.length > 0) {
      updated = await updateSoulCodex(supabase, userId, mergedEntities);
    }

    // Generate acknowledgment for significant discoveries
    let acknowledgment: string | undefined;
    const hasRelationWithEvent = 
      mergedEntities.some((e: EntityExtraction) => e.type === 'relation') &&
      mergedEntities.some((e: EntityExtraction) => e.type === 'event');

    if (hasRelationWithEvent) {
      const event = mergedEntities.find((e: EntityExtraction) => e.type === 'event');
      if (event?.value === 'birthday') {
        acknowledgment = "I have noted this birthday. Shall I help plan a gift?";
      } else {
        acknowledgment = "I have remembered this. Would you like me to set a reminder?";
      }
    }

    return new Response(
      JSON.stringify({
        entities: mergedEntities,
        acknowledgment,
        updated
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Silent Scribe error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Update Soul Codex with extracted entities
 */
async function updateSoulCodex(
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  entities: EntityExtraction[]
): Promise<boolean> {
  try {
    console.log(`[Silent Scribe] Updating codex for ${userId} with ${entities.length} entities`);

    // Fetch existing codex
    const { data: existingCodex } = await supabase
      .from('dhf_soul_codex')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Type the codex data
    // deno-lint-ignore no-explicit-any
    const codex = existingCodex as Record<string, any> | null;

    // deno-lint-ignore no-explicit-any
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      last_harvest_at: new Date().toISOString(),
    };

    // Process entities into codex updates
    for (const entity of entities) {
      switch (entity.type) {
        case 'relation': {
          const existingMemories = (codex?.formative_memories as unknown[]) || [];
          updates.formative_memories = [
            ...existingMemories,
            {
              type: 'family',
              relation: entity.value,
              context: entity.context,
              discovered_at: new Date().toISOString(),
              ...entity.inferredData
            }
          ].slice(-20); // Keep last 20 memories
          break;
        }

        case 'event': {
          const existingExperiences = (codex?.peak_experiences as unknown[]) || [];
          updates.peak_experiences = [
            ...existingExperiences,
            {
              event: entity.value,
              context: entity.context,
              mentioned_at: new Date().toISOString()
            }
          ].slice(-20);
          break;
        }

        case 'job': {
          const existingAnchors = (codex?.belief_anchors as Record<string, unknown>) || {};
          updates.belief_anchors = {
            ...existingAnchors,
            professional_domain: entity.value,
            inferred_at: new Date().toISOString()
          };
          break;
        }

        case 'emotion': {
          // Map emotion to valid stress_response enum values
          // Constraint allows: fight, flight, freeze, adaptive, social
          const emotionValue = entity.value.toLowerCase();
          const stressResponseMap: Record<string, string> = {
            // Positive/calm emotions → adaptive
            'happy': 'adaptive',
            'joyful': 'adaptive',
            'content': 'adaptive',
            'balanced': 'adaptive',
            'calm': 'adaptive',
            'peaceful': 'adaptive',
            'grateful': 'adaptive',
            'hopeful': 'adaptive',
            'excited': 'adaptive',
            'neutral': 'adaptive',
            // Social emotions → social
            'loving': 'social',
            'friendly': 'social',
            'connected': 'social',
            'supported': 'social',
            'lonely': 'social',
            'nostalgic': 'social',
            // Fear/anxiety → flight
            'anxious': 'flight',
            'worried': 'flight',
            'scared': 'flight',
            'nervous': 'flight',
            'overwhelmed': 'flight',
            'stressed': 'flight',
            // Sad/withdrawn → freeze
            'sad': 'freeze',
            'depressed': 'freeze',
            'numb': 'freeze',
            'withdrawn': 'freeze',
            'stuck': 'freeze',
            'exhausted': 'freeze',
            'tired': 'freeze',
            // Anger/frustration → fight
            'angry': 'fight',
            'frustrated': 'fight',
            'irritated': 'fight',
            'annoyed': 'fight',
            'defensive': 'fight',
          };
          const mappedResponse = stressResponseMap[emotionValue] || 'adaptive';
          updates.stress_response = mappedResponse;
          break;
        }

        case 'preference': {
          const existingValues = (codex?.core_values as string[]) || [];
          if (!existingValues.includes(entity.value)) {
            updates.core_values = [...existingValues, entity.value].slice(-10);
          }
          break;
        }

        case 'goal': {
          const existingGoals = (codex?.peak_experiences as unknown[]) || [];
          updates.peak_experiences = [
            ...existingGoals,
            {
              type: 'goal',
              value: entity.value,
              context: entity.context,
              set_at: new Date().toISOString()
            }
          ].slice(-20);
          break;
        }
      }
    }

    // Increment data points
    updates.data_points_collected = ((codex?.data_points_collected as number) || 0) + entities.length;

    if (codex) {
      // Update existing codex
      const { error } = await supabase
        .from('dhf_soul_codex')
        .update(updates)
        .eq('user_id', userId);
      
      if (error) {
        console.error("[Silent Scribe] Update error:", error);
        return false;
      }
    } else {
      // Create new codex
      const { error } = await supabase
        .from('dhf_soul_codex')
        .insert({
          user_id: userId,
          ...updates,
          codex_version: '2.0-infinity',
          is_complete: false,
          completion_percentage: 5
        });
      
      if (error) {
        console.error("[Silent Scribe] Insert error:", error);
        return false;
      }
    }

    console.log(`[Silent Scribe] Codex updated successfully for ${userId}`);
    return true;
  } catch (error) {
    console.error("[Silent Scribe] Failed to update codex:", error);
    return false;
  }
}
