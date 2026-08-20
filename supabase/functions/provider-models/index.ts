// Temporary diagnostic: pings candidate model IDs with the configured provider keys.
// deno-lint-ignore no-explicit-any
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_CANDIDATES = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'groq/compound-mini'];
const GEMINI_CANDIDATES = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const results: Record<string, unknown> = {};
  const groqKey = Deno.env.get('GROQ_API_KEY');
  const gKey = Deno.env.get('GOOGLE_AI_STUDIO_KEY') || Deno.env.get('GEMINI_API_KEY');

  for (const m of GROQ_CANDIDATES) {
    if (!groqKey) break;
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'say pong' }], max_tokens: 16 }),
      });
      const t = await r.text();
      results[`groq:${m}`] = `${r.status} ${t.slice(0, 120)}`;
    } catch (e) { results[`groq:${m}`] = String(e); }
  }

  for (const m of GEMINI_CANDIDATES) {
    if (!gKey) break;
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${gKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'say pong' }] }] }),
      });
      const t = await r.text();
      results[`gemini:${m}`] = `${r.status} ${t.slice(0, 120)}`;
    } catch (e) { results[`gemini:${m}`] = String(e); }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
