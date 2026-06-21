// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INFINITY — QUOTA MONITOR (cron, every 15 min)
// Reads live Supabase usage and writes to zoe_infinity_quota_state.
// ISOLATED: never touches VR / mmora / omega code paths.
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Free-tier defaults
const FREE_DB_LIMIT = 524_288_000;       // 500 MB
const FREE_STORAGE_LIMIT = 1_073_741_824; // 1 GB
const FREE_MAU_LIMIT = 50_000;
const FREE_EGRESS_LIMIT = 5_368_709_120;  // 5 GB

// Throttle thresholds (locked by user)
const T_CACHE_OFF = 70;
const T_MEMORY_LIGHT = 85;
const T_HARD = 95;

function deriveThrottle(dbPercent: number): { active: boolean; level: string } {
  if (dbPercent >= T_HARD) return { active: true, level: "hard" };
  if (dbPercent >= T_MEMORY_LIGHT) return { active: true, level: "memory_light" };
  if (dbPercent >= T_CACHE_OFF) return { active: true, level: "cache_off" };
  return { active: false, level: "none" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const projectRef = Deno.env.get("SUPABASE_PROJECT_ID") || "gpxuuydvlnuajqkroobp";
    const mgmtToken = Deno.env.get("MMORA_MGMT_API_TOKEN");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let dbBytes = 0;
    let storageBytes = 0;
    let mauCount = 0;
    let egressBytes = 0;
    let lastError: string | null = null;

    // 1. DB size via pg function (will use a tiny inline RPC)
    try {
      const { data, error } = await supabase.rpc("pg_database_size_safe").single() as any;
      if (!error && data) dbBytes = Number(data) || 0;
    } catch {
      // Fallback: query via raw size
      try {
        const { data } = await supabase
          .from("zoe_infinity_quota_state")
          .select("db_bytes_used")
          .limit(1)
          .single();
        dbBytes = data?.db_bytes_used || 0;
      } catch { /* keep 0 */ }
    }

    // 2. Storage size — sum of storage.objects metadata->size
    try {
      const { data } = await supabase
        .schema("storage" as any)
        .from("objects")
        .select("metadata");
      if (Array.isArray(data)) {
        storageBytes = data.reduce((sum: number, o: any) => {
          const s = o?.metadata?.size;
          return sum + (typeof s === "number" ? s : 0);
        }, 0);
      }
    } catch (e) {
      console.warn("[quota-monitor] storage size unavailable:", e);
    }

    // 3. MAU count — distinct users with sign-in in last 30 days
    try {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .gte("updated_at", since);
      mauCount = count || 0;
    } catch (e) {
      console.warn("[quota-monitor] MAU count failed:", e);
    }

    // 4. Egress via Management API (optional, requires MMORA_MGMT_API_TOKEN)
    if (mgmtToken) {
      try {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const resp = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/usage`,
          { headers: { Authorization: `Bearer ${mgmtToken}` } },
        );
        if (resp.ok) {
          const usage = await resp.json();
          // Management API shape varies — try common keys
          const egress = usage?.egress?.usage
            ?? usage?.usage?.egress
            ?? usage?.bandwidth?.egress
            ?? 0;
          egressBytes = typeof egress === "number" ? egress : 0;
        } else {
          lastError = `mgmt api ${resp.status}`;
        }
      } catch (e) {
        lastError = `egress fetch failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    } else {
      lastError = "MMORA_MGMT_API_TOKEN not set — egress unavailable";
    }

    // Compute percents
    const dbPercent = Math.min(100, (dbBytes / FREE_DB_LIMIT) * 100);
    const storagePercent = Math.min(100, (storageBytes / FREE_STORAGE_LIMIT) * 100);
    const mauPercent = Math.min(100, (mauCount / FREE_MAU_LIMIT) * 100);
    const egressPercent = Math.min(100, (egressBytes / FREE_EGRESS_LIMIT) * 100);

    const throttle = deriveThrottle(dbPercent);

    // Upsert singleton state row
    const { data: existing } = await supabase
      .from("zoe_infinity_quota_state")
      .select("id")
      .limit(1)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      tier: "free",
      db_bytes_used: dbBytes,
      db_bytes_limit: FREE_DB_LIMIT,
      storage_bytes_used: storageBytes,
      storage_bytes_limit: FREE_STORAGE_LIMIT,
      mau_count: mauCount,
      mau_limit: FREE_MAU_LIMIT,
      egress_bytes_month: egressBytes,
      egress_bytes_limit: FREE_EGRESS_LIMIT,
      db_percent: Number(dbPercent.toFixed(2)),
      storage_percent: Number(storagePercent.toFixed(2)),
      mau_percent: Number(mauPercent.toFixed(2)),
      egress_percent: Number(egressPercent.toFixed(2)),
      throttle_active: throttle.active,
      throttle_level: throttle.level,
      last_error: lastError,
      last_checked_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await supabase
        .from("zoe_infinity_quota_state")
        .update(payload)
        .eq("id", existing.id);
    } else {
      await supabase.from("zoe_infinity_quota_state").insert(payload);
    }

    // Append history snapshot
    await supabase.from("zoe_infinity_quota_history").insert({
      db_bytes_used: dbBytes,
      storage_bytes_used: storageBytes,
      mau_count: mauCount,
      egress_bytes_month: egressBytes,
      db_percent: Number(dbPercent.toFixed(2)),
      storage_percent: Number(storagePercent.toFixed(2)),
      throttle_level: throttle.level,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        dbPercent: Number(dbPercent.toFixed(2)),
        storagePercent: Number(storagePercent.toFixed(2)),
        mauPercent: Number(mauPercent.toFixed(2)),
        egressPercent: Number(egressPercent.toFixed(2)),
        throttle: throttle.level,
        lastError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[quota-monitor] failed:", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
