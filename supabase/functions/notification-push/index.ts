// Sends a member's in-app alert to their phone(s) by Web Push.
// Called by the database right after an alert is saved (x-cron-token), or by the admin
// with { action: "test" } to push a test alert to the admin's own devices.
// Respects the admin switches: "All platform notifications", "Phone push", and the alert's own switch.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { z } from "npm:zod@3.23.8";
import { requireCronOrAdmin } from "../_shared/caller-guard.ts";

const Body = z.union([
  z.object({ id: z.string().uuid() }),
  z.object({ action: z.literal("test") }),
]);
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function pushTo(userId: string, payload: Record<string, unknown>) {
  const { data: devices } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  if (!devices?.length) return { delivered: 0, reason: "no_devices" };
  let delivered = 0;
  const stale: string[] = [];
  for (const d of devices) {
    try {
      await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "normal" });
      delivered += 1;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error(`[notification-push] failed [${status}]`, (e as Error).message);
      if (status === 404 || status === 410) stale.push(d.id);
    }
  }
  if (stale.length) await db.from("push_subscriptions").delete().in("id", stale);
  return { delivered, devices: devices.length, removed: stale.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const caller = await requireCronOrAdmin(req, "notification-push");
  if (caller instanceof Response) return caller;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid body" }, 400);

  const pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return json({ error: "push_not_configured" }, 503);
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@mmora.xyz", pub, priv);

  const { data: ch } = await db.from("notification_channel_settings").select("channel, enabled").in("channel", ["all", "push"]);
  const off = (ch ?? []).some((c: { enabled: boolean }) => !c.enabled);

  if ("action" in parsed.data) {
    if (caller.kind !== "user") return json({ error: "admin only" }, 403);
    if (off) return json({ delivered: 0, reason: "push_switched_off" });
    const r = await pushTo((caller as { userId: string }).userId, { title: "M'Mora test alert", body: "Phone push is working.", url: "/admin/notifications", tag: "mmora-test" });
    return json(r);
  }

  if (off) return json({ delivered: 0, reason: "push_switched_off" });
  const { data: n } = await db.from("notifications").select("id, user_id, type, context_data").eq("id", parsed.data.id).maybeSingle();
  if (!n) return json({ delivered: 0, reason: "not_found" });
  if (n.type === "e2e_test" || n.type === "incoming_call") return json({ delivered: 0, reason: "skipped_kind" });
  const { data: kind } = await db.from("notification_kinds").select("enabled").eq("kind", n.type).maybeSingle();
  if (kind && !kind.enabled) return json({ delivered: 0, reason: "kind_switched_off" });
  const c = (n.context_data ?? {}) as Record<string, unknown>;
  const title = String(c.title ?? "M'Mora").slice(0, 80);
  const body = String(c.message ?? c.body ?? "You have a new notification").slice(0, 180);
  const url = typeof c.link === "string" && c.link.startsWith("/") ? c.link : "/notification-history";
  return json(await pushTo(n.user_id, { title, body, url, tag: `mmora-${n.type}` }));
});
