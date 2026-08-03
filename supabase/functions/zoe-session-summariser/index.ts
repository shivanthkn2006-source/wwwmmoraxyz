import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, userId, sessionId } = await req.json();

    if (!messages || messages.length < 5) {
      return new Response(
        JSON.stringify({ summary: null, reason: "too_few_messages" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the messages text for summarisation
    const conversationText = messages
      .slice(-30) // Only last 30 messages
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Zoe'}: ${m.content}`)
      .join('\n');

    // Call Lovable AI Gateway to summarise
    const response = await sovereignFetch('sovereign://chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sovereignKey()}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are summarising a conversation between a user and their AI companion Zoe. Create a structured memory summary. Return ONLY a JSON object with exactly these fields:
{
  "emotional_themes": "2-3 word description of main emotions",
  "key_facts": ["fact 1", "fact 2", "fact 3"],
  "intimacy_moments": "one sentence about connection moments",
  "user_mood_arc": "started as X, ended as Y",
  "topics_discussed": ["topic1", "topic2"],
  "raw_summary": "2-3 sentence plain English summary"
}
Return ONLY the JSON. No other text.`
            },
            {
              role: 'user',
              content: `CONVERSATION:\n${conversationText}`
            }
          ],
          temperature: 0.3,
          max_tokens: 400,
        }),
      }
    );

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content || '{}';

    // Clean and parse JSON
    const cleanJson = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let summary;
    try {
      summary = JSON.parse(cleanJson);
    } catch {
      summary = { raw_summary: rawText.slice(0, 500) };
    }

    return new Response(
      JSON.stringify({
        summary,
        messageCount: messages.length,
        sessionId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
