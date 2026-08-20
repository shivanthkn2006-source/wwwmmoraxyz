// Temporary diagnostic: lists model IDs available to the configured provider keys.
// deno-lint-ignore no-explicit-any
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const out: Record<string, unknown> = {};

  const groqKey = Deno.env.get('GROQ_API_KEY');
  if (groqKey) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${groqKey}` },
      });
      const j = await r.json();
      out.groq = Array.isArray(j?.data) ? j.data.map((m: any) => m.id) : j;
    } catch (e) { out.groq = String(e); }
  }

  const gKey = Deno.env.get('GOOGLE_AI_STUDIO_KEY') || Deno.env.get('GEMINI_API_KEY');
  if (gKey) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${gKey}&pageSize=200`);
      const j = await r.json();
      out.gemini = Array.isArray(j?.models)
        ? j.models
            .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
            .map((m: any) => m.name)
        : j;
    } catch (e) { out.gemini = String(e); }
  }

  return new Response(JSON.stringify(out), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
