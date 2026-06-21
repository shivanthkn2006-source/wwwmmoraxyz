// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INFINITY — QUOTA PRUNE (manual, admin-only)
// User chose "NEVER auto-delete — manual only".
// Always returns dry-run counts unless body has { confirm: true }.
// Requires caller to be a root admin (is_root_admin).
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Target = "expired_cache" | "old_behavioral_events" | "old_ecn_history";

interface Body {
  targets?: Target[];
  confirm?: boolean;
  daysBehavioral?: number; // default 90
  daysEcn?: number;        // default 60
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify root admin via SECURITY DEFINER function
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdminRows } = await admin.rpc("is_root_admin", { check_user_id: user.id });
    const isAdmin = Boolean(isAdminRows);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = await req.json().catch(() => ({}));
    const targets: Target[] = body.targets?.length
      ? body.targets
      : ["expired_cache", "old_behavioral_events", "old_ecn_history"];
    const confirm = Boolean(body.confirm);
    const daysBehavioral = body.daysBehavioral ?? 90;
    const daysEcn = body.daysEcn ?? 60;

    const cutoffBehavioral = new Date(Date.now() - daysBehavioral * 86400_000).toISOString();
    const cutoffEcn = new Date(Date.now() - daysEcn * 86400_000).toISOString();

    const result: Record<string, { wouldDelete: number; deleted: number }> = {};

    // expired_cache
    if (targets.includes("expired_cache")) {
      const { count } = await admin
        .from("zoe_response_cache")
        .select("id", { count: "exact", head: true })
        .lt("expires_at", new Date().toISOString());
      const wouldDelete = count || 0;
      let deleted = 0;
      if (confirm && wouldDelete > 0) {
        const { error } = await admin
          .from("zoe_response_cache")
          .delete()
          .lt("expires_at", new Date().toISOString());
        if (!error) deleted = wouldDelete;
      }
      result.expired_cache = { wouldDelete, deleted };
    }

    // old_behavioral_events
    if (targets.includes("old_behavioral_events")) {
      const { count } = await admin
        .from("behavioral_events")
        .select("id", { count: "exact", head: true })
        .lt("created_at", cutoffBehavioral);
      const wouldDelete = count || 0;
      let deleted = 0;
      if (confirm && wouldDelete > 0) {
        const { error } = await admin
          .from("behavioral_events")
          .delete()
          .lt("created_at", cutoffBehavioral);
        if (!error) deleted = wouldDelete;
      }
      result.old_behavioral_events = { wouldDelete, deleted };
    }

    // old_ecn_history
    if (targets.includes("old_ecn_history")) {
      const { count } = await admin
        .from("ecn_history")
        .select("id", { count: "exact", head: true })
        .lt("recorded_at", cutoffEcn);
      const wouldDelete = count || 0;
      let deleted = 0;
      if (confirm && wouldDelete > 0) {
        const { error } = await admin
          .from("ecn_history")
          .delete()
          .lt("recorded_at", cutoffEcn);
        if (!error) deleted = wouldDelete;
      }
      result.old_ecn_history = { wouldDelete, deleted };
    }

    return new Response(
      JSON.stringify({ ok: true, dryRun: !confirm, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[quota-prune] failed:", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
