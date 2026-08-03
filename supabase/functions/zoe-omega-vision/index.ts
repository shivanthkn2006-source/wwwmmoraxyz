import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const { image, context } = await req.json();

    if (!image) {
      return new Response(JSON.stringify({ error: 'No image data provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SOVEREIGN_AI_KEY = sovereignKey();
    if (!SOVEREIGN_AI_KEY) {
      return new Response(JSON.stringify({ error: 'AI gateway not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use Gemini Pro for vision analysis
    const aiResponse = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SOVEREIGN_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are Zoe Omega Vision. Analyze this image and provide detailed insights.\n\nContext: ${context || 'General analysis'}`,
            },
            {
              type: 'image_url',
              image_url: { url: image },
            },
          ],
        }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[zoe-omega-vision] AI error [${aiResponse.status}]: ${errText}`);
      return new Response(JSON.stringify({ error: 'Vision analysis failed' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const analysis = aiData?.choices?.[0]?.message?.content || 'Visual analysis complete.';

    // Log to sovereign memory
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    await serviceClient.from('zoe_sovereign_memory').insert({
      user_id: userId,
      event_type: 'omega_vision',
      content_text: `Vision analysis: ${analysis.substring(0, 500)}`,
      zoe_state_json: { source: 'omega_vision', context },
    });

    return new Response(JSON.stringify({
      analysis,
      source: 'omega_vision',
      confidence: 0.85,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[zoe-omega-vision] Error:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
