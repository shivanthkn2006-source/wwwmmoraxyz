import { supabase } from "@/integrations/supabase/client";

export type ActivityKind =
  | "time_spent" | "feature_use" | "walking" | "running"
  | "cycling" | "workout" | "riding" | "vr_talk";

/** Earn capped karma for an activity. Amounts and daily caps live on the server. */
export async function earnKarma(kind: ActivityKind, units = 1): Promise<number> {
  const { data, error } = await supabase.rpc("earn_activity_karma" as never, { p_kind: kind, p_units: units } as never);
  if (error) return 0;
  const n = Number(data) || 0;
  if (n > 0) window.dispatchEvent(new CustomEvent("karma-changed"));
  return n;
}

export async function getKarmaBalance(): Promise<number> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return 0;
  const { data } = await supabase
    .from("exodus_players").select("resonance_points").eq("user_id", u.user.id).maybeSingle();
  return Number(data?.resonance_points) || 0;
}

export async function spendKarmaVR(itemId: string): Promise<{ ok: boolean; balance?: number; error?: string }> {
  const { data, error } = await supabase.rpc("spend_karma_vr" as never, { p_item: itemId } as never);
  if (error) return { ok: false, error: error.message };
  window.dispatchEvent(new CustomEvent("karma-changed"));
  return { ok: true, balance: Number(data) };
}

export async function giftKarma(to: string, amount: number): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("gift_karma" as never, { p_to: to, p_amount: amount } as never);
  if (error) return { ok: false, error: error.message };
  window.dispatchEvent(new CustomEvent("karma-changed"));
  return { ok: true };
}
