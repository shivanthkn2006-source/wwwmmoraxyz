import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OLLAMA_ENDPOINT = Deno.env.get("OLLAMA_ENDPOINT") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model, prompt, stream } = await req.json();

    console.log(`🚀 Proxying to M1 Pro at ${OLLAMA_ENDPOINT}...`);
    console.log(`📦 Model: ${model} | Prompt length: ${prompt?.length || 0}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout

    const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Bypass-Tunnel-Reminder": "true",
        "User-Agent": "ZoeProxy/1.0",
      },
      body: JSON.stringify({
        model: model || "zoe",
        prompt,
        stream: stream ?? false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Ollama error: ${response.status} | Headers: ${JSON.stringify(Object.fromEntries(response.headers))} | Body: ${errorText.substring(0, 500)}`);
      return new Response(
        JSON.stringify({ error: `Ollama error: ${response.status}`, details: errorText.substring(0, 500) }),
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
    if (error.name === "AbortError") {
      return new Response(
        JSON.stringify({ error: "Request timed out — M1 Pro took too long to respond", details: "Try a shorter prompt or ensure the model is loaded (run: ollama pull llama3)" }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: error.message || "Failed to reach M1 Pro" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
