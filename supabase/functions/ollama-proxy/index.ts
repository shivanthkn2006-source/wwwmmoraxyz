// ═══════════════════════════════════════════════════════════════════════════════
// SOVEREIGN CONNECTION PROXY — Routes requests to M1 Pro via ngrok tunnel
// Bypasses browser CORS restrictions by proxying through edge function
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// The Sovereign Connection — M1 Pro ngrok tunnel
const OLLAMA_ENDPOINT = Deno.env.get("OLLAMA_ENDPOINT") || "https://aff4dd5e383c2a.lhr.life";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model, prompt, stream } = await req.json();

    console.log(`🚀 Proxying to M1 Pro at ${OLLAMA_ENDPOINT}...`);
    console.log(`📦 Model: ${model} | Prompt length: ${prompt?.length || 0}`);

    const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "ZoeSovereignProxy/1.0",
      },
      body: JSON.stringify({
        model: model || "llama3",
        prompt,
        stream: stream ?? false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Ollama error: ${response.status} ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Ollama error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log(`✅ M1 Pro responded! Length: ${data.response?.length || 0} chars`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to reach M1 Pro" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
