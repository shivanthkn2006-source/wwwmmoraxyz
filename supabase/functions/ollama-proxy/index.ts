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

    // First, try a GET to check if the tunnel is alive and capture any redirect/auth page
    const healthCheck = await fetch(`${OLLAMA_ENDPOINT}/api/version`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "ZoeSovereignProxy/1.0",
      },
    });
    console.log(`🏥 Health check: ${healthCheck.status}`);
    const healthBody = await healthCheck.text();
    console.log(`🏥 Health body: ${healthBody.substring(0, 500)}`);

    // If health check fails, report the actual issue
    if (!healthCheck.ok) {
      return new Response(
        JSON.stringify({ 
          error: `Tunnel returned ${healthCheck.status}`, 
          details: healthBody.substring(0, 1000),
          hint: "Serveo may require browser verification. Try visiting the tunnel URL in your browser first, or use a different tunnel (e.g., cloudflared)."
        }),
        { status: healthCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
