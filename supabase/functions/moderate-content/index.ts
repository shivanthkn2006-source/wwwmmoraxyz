import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const moderationSchema = z.object({
  content: z.string().max(10000).optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(['image', 'video']).optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { content, mediaUrl, mediaType } = moderationSchema.parse(body);
    const SOVEREIGN_AI_KEY = sovereignKey();

    if (!SOVEREIGN_AI_KEY) {
      throw new Error("SOVEREIGN_AI_KEY not configured");
    }

    // Prepare messages for AI moderation
    const messages: any[] = [
      {
        role: "system",
        content: `You are a content moderation AI. Analyze content for:
- Explicit/sexual content
- Hate speech or harassment
- Graphic violence
- Harmful or dangerous content
- Spam or misleading information

Respond ONLY with a JSON object in this exact format:
{
  "approved": true/false,
  "reason": "brief reason if rejected, empty string if approved",
  "severity": "low/medium/high" (only if rejected)
}`
      }
    ];

    // Add text content if present
    if (content) {
      messages.push({
        role: "user",
        content: `Analyze this text: "${content}"`
      });
    }

    // Add image content if present
    if (mediaUrl && mediaType === 'image') {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Analyze this image for inappropriate content:" },
          { type: "image_url", image_url: { url: mediaUrl } }
        ]
      });
    }

    // Call Lovable AI for moderation
    const response = await sovereignFetch("sovereign://chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SOVEREIGN_AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      // If AI fails, allow post but log error
      return new Response(
        JSON.stringify({ 
          approved: true, 
          reason: "", 
          severity: "none" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse AI response
    let moderationResult;
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        moderationResult = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, assume approved
        moderationResult = { approved: true, reason: "", severity: "none" };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      // On parse error, allow post
      moderationResult = { approved: true, reason: "", severity: "none" };
    }

    return new Response(
      JSON.stringify(moderationResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Moderation error:", error);
    // On error, allow post to avoid blocking users
    return new Response(
      JSON.stringify({ 
        approved: true, 
        reason: "", 
        severity: "none",
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
