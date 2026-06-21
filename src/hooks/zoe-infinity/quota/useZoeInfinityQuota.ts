// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INFINITY QUOTA HOOK — admin-only readout of Supabase usage
// Used by QuotaStatusPill / QuotaAdminPanel and by throttle gate in cache utils.
// Non-admin callers always get { isAdmin: false } and no data.
// Hard isolation: lives under /zoe-infinity/quota/ only.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ZoeInfinityQuotaState {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  tier: "free" | "pro" | "team" | "enterprise" | null;
  dbPercent: number;
  storagePercent: number;
  mauPercent: number;
  egressPercent: number;
  dbBytesUsed: number;
  dbBytesLimit: number;
  storageBytesUsed: number;
  storageBytesLimit: number;
  mauCount: number;
  mauLimit: number;
  egressBytesMonth: number;
  egressBytesLimit: number;
  throttleActive: boolean;
  throttleLevel: "none" | "cache_off" | "memory_light" | "hard";
  lastCheckedAt: string | null;
  lastError: string | null;
  refresh: () => Promise<void>;
}

const ADMIN_USERNAMES = ["moksh50", "justmkbhd", "john", "shivanth_kn"];
const isAdminUsername = (u?: string | null) =>
  !!u && ADMIN_USERNAMES.includes(u.trim().toLowerCase());

const EMPTY: Omit<ZoeInfinityQuotaState, "refresh"> = {
  isAdmin: false,
  loading: true,
  error: null,
  tier: null,
  dbPercent: 0,
  storagePercent: 0,
  mauPercent: 0,
  egressPercent: 0,
  dbBytesUsed: 0,
  dbBytesLimit: 524_288_000,
  storageBytesUsed: 0,
  storageBytesLimit: 1_073_741_824,
  mauCount: 0,
  mauLimit: 50_000,
  egressBytesMonth: 0,
  egressBytesLimit: 5_368_709_120,
  throttleActive: false,
  throttleLevel: "none",
  lastCheckedAt: null,
  lastError: null,
};

export const useZoeInfinityQuota = (): ZoeInfinityQuotaState => {
  const [state, setState] = useState<Omit<ZoeInfinityQuotaState, "refresh">>(EMPTY);

  const load = useCallback(async () => {
    try {
      // Check admin status
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setState({ ...EMPTY, loading: false });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", userId)
        .maybeSingle();

      const isAdmin = isAdminUsername(profile?.username);
      if (!isAdmin) {
        setState({ ...EMPTY, loading: false, isAdmin: false });
        return;
      }

      // Read singleton quota state (RLS will allow because admin)
      const { data, error } = await (supabase as any)
        .from("zoe_infinity_quota_state")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        setState({ ...EMPTY, isAdmin: true, loading: false, error: error.message });
        return;
      }

      if (!data) {
        setState({ ...EMPTY, isAdmin: true, loading: false });
        return;
      }

      setState({
        isAdmin: true,
        loading: false,
        error: null,
        tier: data.tier,
        dbPercent: Number(data.db_percent) || 0,
        storagePercent: Number(data.storage_percent) || 0,
        mauPercent: Number(data.mau_percent) || 0,
        egressPercent: Number(data.egress_percent) || 0,
        dbBytesUsed: Number(data.db_bytes_used) || 0,
        dbBytesLimit: Number(data.db_bytes_limit) || 524_288_000,
        storageBytesUsed: Number(data.storage_bytes_used) || 0,
        storageBytesLimit: Number(data.storage_bytes_limit) || 1_073_741_824,
        mauCount: Number(data.mau_count) || 0,
        mauLimit: Number(data.mau_limit) || 50_000,
        egressBytesMonth: Number(data.egress_bytes_month) || 0,
        egressBytesLimit: Number(data.egress_bytes_limit) || 5_368_709_120,
        throttleActive: Boolean(data.throttle_active),
        throttleLevel: data.throttle_level || "none",
        lastCheckedAt: data.last_checked_at,
        lastError: data.last_error,
      });
    } catch (e) {
      setState({
        ...EMPTY,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000); // refresh every 60s
    return () => window.clearInterval(id);
  }, [load]);

  return { ...state, refresh: load };
};

// ─── Standalone throttle gate (used by zoeResponseCache.ts) ──────────────────
// Reads the singleton state directly without admin check (service-role-readable
// fields are safe; RLS would block non-admins from reading anyway, in which
// case we fail-open for app behavior — never block writes due to gate failure).
let _throttleCache: { level: string; checkedAt: number } = { level: "none", checkedAt: 0 };
const THROTTLE_TTL_MS = 60_000;

export const getZoeInfinityThrottleLevel = async (): Promise<string> => {
  const now = Date.now();
  if (now - _throttleCache.checkedAt < THROTTLE_TTL_MS) return _throttleCache.level;

  try {
    const { data } = await (supabase as any)
      .from("zoe_infinity_quota_state")
      .select("throttle_level")
      .limit(1)
      .maybeSingle();
    const level = data?.throttle_level || "none";
    _throttleCache = { level, checkedAt: now };
    return level;
  } catch {
    return "none"; // fail-open
  }
};
