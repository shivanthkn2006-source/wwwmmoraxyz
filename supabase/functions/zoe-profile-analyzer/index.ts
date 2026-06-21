/**
 * ZOE PROFILE ANALYZER EDGE FUNCTION
 * Uses cost-effective gemini-2.5-flash-lite for profile analysis
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are Zoe, an AI companion analyzing a user's profile to understand them better.
    
Analyze the provided profile data and extract:
1. Personal interests (hobbies, passions, what they care about)
2. Personality insights (communication style, values, preferences)
3. Activity patterns (how they use the platform)
4. Personalized suggestions (what might interest them, how to help)

Be warm, insightful, and genuinely helpful. Focus on understanding the human behind the data.
Respond in JSON format with these exact keys: interests, personality, patterns, suggestions, summary.
Keep the summary under 50 words, conversational, and friendly.`;

    const userPrompt = `Analyze this user profile:
    
Profile:
- Name: ${context.profile.name || 'Unknown'}
- Bio: ${context.profile.bio || 'Not provided'}
- Profession: ${context.profile.profession || 'Not specified'}
- Field of Study: ${context.profile.fieldOfStudy || 'Not specified'}
- Hobbies: ${context.profile.hobbies?.join(', ') || 'None listed'}
- City: ${context.profile.city || 'Unknown'}
- Organization: ${context.profile.organization || 'Not specified'}
- Job Title: ${context.profile.jobTitle || 'Not specified'}
- Birth Place: ${context.profile.birthPlace || 'Not specified'}
- Preferred Personality: ${context.profile.personalityTone || 'Default'}

Recent Posts (sample):
${context.recentPosts?.slice(0, 5).join('\n') || 'No recent posts'}

Emotional Patterns:
${context.emotionalPatterns?.slice(0, 10).join(', ') || 'No data'}

Platform Activity:
${context.behaviorSummary?.slice(0, 10).join(', ') || 'Limited activity'}

Provide analysis in JSON format.`;

    // Use cost-effective model: gemini-2.5-flash-lite
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      // Return fallback analysis
      return new Response(JSON.stringify({
        interests: context.profile.hobbies || [],
        personality: ["Engaged user", "Active platform member"],
        patterns: ["Regular activity"],
        suggestions: ["Try exploring new features", "Connect with similar users"],
        summary: `Based on your profile${context.profile.name ? `, ${context.profile.name}` : ''}, you seem like a thoughtful person with diverse interests. Let me know how I can help!`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let analysis;
    try {
      // Extract JSON from response (might be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Fallback structure
      analysis = {
        interests: context.profile.hobbies || [],
        personality: ["Engaged user"],
        patterns: ["Active"],
        suggestions: ["Explore new features"],
        summary: content.slice(0, 200) || "Analysis complete. You have a unique profile!"
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Profile analyzer error:", errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      interests: [],
      personality: [],
      patterns: [],
      suggestions: [],
      summary: "I encountered an issue analyzing your profile. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
