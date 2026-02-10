import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = 'Puck' } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    console.log('Lovable TTS: TTS not supported via Lovable AI Gateway, using browser fallback. Requested voice:', voice);

    // Lovable AI Gateway doesn't support TTS models, instruct client to use browser fallback
    return new Response(
      JSON.stringify({
        error: 'TTS not supported via Lovable AI Gateway',
        useBrowserFallback: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  } catch (error) {
    console.error('Error in lovable-tts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
