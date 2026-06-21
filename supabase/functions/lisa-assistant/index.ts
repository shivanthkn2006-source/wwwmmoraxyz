import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Generate image via Pollinations (free, no key needed)
 */
async function generateViaPollinations(prompt: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&model=flux&nologo=true&enhance=true`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'image/*' },
    });
    clearTimeout(timeout);
    
    if (!resp.ok) return null;
    
    const buf = await resp.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const ct = resp.headers.get('content-type') || 'image/jpeg';
    return `data:${ct};base64,${b64}`;
  } catch (e) {
    console.warn('[lisa-assistant] Pollinations failed:', e);
    return null;
  }
}

/**
 * Generate image via Lovable AI Gateway (Gemini)
 */
async function generateViaLovableAI(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[lisa-assistant] Lovable AI error [${aiResponse.status}]: ${errText}`);
      return null;
    }

    const aiData = await aiResponse.json();
    return aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  } catch (e) {
    console.error('[lisa-assistant] Lovable AI failed:', e);
    return null;
  }
}

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI gateway not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, prompt, provider } = await req.json();

    if (type === 'generate_text') {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: `Generate a creative social media post about: ${prompt}. Keep it engaging, concise (under 280 characters), and add relevant emoji.`,
          }],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error(`[lisa-assistant] AI error [${aiResponse.status}]: ${errText}`);
        return new Response(JSON.stringify({ error: 'AI generation failed' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiResponse.json();
      const content = aiData?.choices?.[0]?.message?.content || 'Here is your generated post!';

      return new Response(JSON.stringify({ content, type: 'text' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'generate_image') {
      let imageUrl: string | null = null;
      let usedProvider = 'unknown';

      // Try Pollinations first (free), then Lovable AI as fallback
      if (provider === 'lovable-ai') {
        imageUrl = await generateViaLovableAI(prompt, LOVABLE_API_KEY);
        usedProvider = 'lovable-ai';
      } else {
        imageUrl = await generateViaPollinations(prompt);
        usedProvider = 'pollinations';
        
        if (!imageUrl) {
          imageUrl = await generateViaLovableAI(prompt, LOVABLE_API_KEY);
          usedProvider = 'lovable-ai-fallback';
        }
      }

      if (!imageUrl) {
        return new Response(JSON.stringify({ error: 'Image generation failed from all providers' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ imageUrl, type: 'image', provider: usedProvider }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid type. Use generate_text or generate_image.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[lisa-assistant] Error:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
