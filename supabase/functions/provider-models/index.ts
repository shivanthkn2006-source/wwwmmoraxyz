// Temporary diagnostic: pings candidate model IDs with the configured provider keys.
// deno-lint-ignore no-explicit-any
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_CANDIDATES = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'groq/compound-mini'];
const GEMINI_CANDIDATES = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite'];

const NVIDIA_CANDIDATES = ['meta/llama-3.3-70b-instruct', 'deepseek-ai/deepseek-r1', 'nvidia/llama-3.1-nemotron-70b-instruct'];
const NVIDIA_EMBED_CANDIDATES = ['nvidia/llama-3.2-nv-embedqa-1b-v2', 'nvidia/nv-embedqa-e5-v5'];

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

  const nvKey = Deno.env.get('NVIDIA_API_KEY');
  if (nvKey && new URL(req.url).searchParams.get('nvidia_catalog') === '1') {
    const r = await fetch('https://integrate.api.nvidia.com/v1/models', { headers: { Authorization: `Bearer ${nvKey}` } });
    const j = await r.json().catch(() => null);
    const ids = (j?.data ?? []).map((m: { id: string }) => m.id).sort();
    return new Response(JSON.stringify({ count: ids.length, ids }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  for (const m of NVIDIA_CANDIDATES) {
    if (!nvKey) break;
    try {
      const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${nvKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'say pong' }], max_tokens: 16 }),
      });
      const t = await r.text();
      results[`nvidia:${m}`] = `${r.status} ${t.slice(0, 160)}`;
    } catch (e) { results[`nvidia:${m}`] = String(e); }
  }
  for (const m of NVIDIA_EMBED_CANDIDATES) {
    if (!nvKey) break;
    try {
      const r = await fetch('https://integrate.api.nvidia.com/v1/embeddings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${nvKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: m, input: ['moksh'], input_type: 'query', encoding_format: 'float', truncate: 'END' }),
      });
      const j = await r.json().catch(() => null);
      const dims = j?.data?.[0]?.embedding?.length;
      results[`nvidia-embed:${m}`] = `${r.status} dims=${dims ?? 'n/a'} ${JSON.stringify(j?.detail ?? j?.error ?? '').slice(0, 140)}`;
    } catch (e) { results[`nvidia-embed:${m}`] = String(e); }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
