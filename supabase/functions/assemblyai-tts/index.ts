import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = 'nova' } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
    
    if (!ASSEMBLYAI_API_KEY) {
      console.warn('AssemblyAI API key not configured, using browser fallback');
      return new Response(
        JSON.stringify({
          error: 'AssemblyAI not configured',
          useBrowserFallback: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log('AssemblyAI TTS: Not fully implemented yet, using browser fallback. Requested voice:', voice);

    // For now, always instruct the client to use browser TTS without throwing an error
    return new Response(
      JSON.stringify({
        error: 'AssemblyAI TTS not implemented yet, using browser fallback',
        useBrowserFallback: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('AssemblyAI TTS error:', error);
    
    // Still fall back gracefully without a 500 to avoid runtime errors/blank screen
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'TTS generation failed',
        useBrowserFallback: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
