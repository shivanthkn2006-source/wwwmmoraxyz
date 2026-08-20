import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ErrorPayload {
  errorType?: string;
  message?: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  userAgent?: string;
  severity?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

const MAX = 8000;
const clip = (v: unknown) =>
  typeof v === "string" ? v.slice(0, MAX) : undefined;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ErrorPayload | { events?: ErrorPayload[] };
    const events: ErrorPayload[] = Array.isArray((body as { events?: ErrorPayload[] }).events)
      ? (body as { events: ErrorPayload[] }).events
      : [body as ErrorPayload];

    if (events.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Attribute to a user when the caller sent a valid session token.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data?.user?.id ?? null;
    }

    const rows = events.slice(0, 25).map((e) => ({
      user_id: userId,
      error_type: clip(e.errorType) || "UnknownError",
      message: clip(e.message) || "(no message)",
      stack: clip(e.stack) ?? null,
      component_stack: clip(e.componentStack) ?? null,
      url: clip(e.url) ?? null,
      user_agent: clip(e.userAgent) ?? null,
      severity: clip(e.severity) || "medium",
      source: clip(e.source) || "frontend",
      metadata: e.metadata && typeof e.metadata === "object" ? e.metadata : {},
    }));

    const { error } = await supabase.from("platform_error_events").insert(rows);
    if (error) throw error;

    return new Response(JSON.stringify({ inserted: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[log-platform-error]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
