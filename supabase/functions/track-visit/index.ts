// Platform visit + sign-in/out tracker. Writes with the service role; only the sole admin can read.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const str = (n: number) => z.string().max(n).optional().nullable();
const Start = z.object({
  action: z.literal("start"),
  visitor_id: z.string().min(8).max(64),
  path: z.string().min(1).max(300),
  referrer: str(500),
  device_type: str(20), os: str(40), browser: str(40),
  screen: str(30), language: str(20), timezone: str(60),
  ref_code: z.string().regex(/^M[0-9A-F]{8}$/).optional().nullable(),
  load_ms: z.number().int().min(0).max(120000).optional().nullable(),
  hardware: z.record(z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).optional(),
});
const Ping = z.object({
  action: z.literal("ping"),
  id: z.string().uuid(),
  visitor_id: z.string().min(8).max(64),
  duration_seconds: z.number().int().min(0).max(86400),
});
const Auth = z.object({
  action: z.literal("auth"),
  event: z.enum(["login", "logout"]),
  device_type: str(20), os: str(40), browser: str(40),
  ref_code: z.string().regex(/^M[0-9A-F]{8}$/).optional().nullable(),
});
const Mine = z.object({ action: z.literal("my_referrals") });
const Events = z.object({
  action: z.literal("events"),
  visitor_id: z.string().min(8).max(64),
  device_type: str(20),
  events: z.array(z.object({ kind: z.enum(["tap", "error"]), name: z.string().min(1).max(80), path: z.string().max(300).optional().nullable() })).min(1).max(50),
});
const Activity = z.object({
  action: z.literal("activity"),
  visitor_id: z.string().min(8).max(64),
  kind: z.enum(["page_not_found", "admin_probe", "vr_enter", "vr_collect", "vr_purchase"]),
  name: z.string().min(1).max(120),
  path: z.string().max(300).optional().nullable(),
  device_type: str(20),
});
const Body = z.discriminatedUnion("action", [Start, Ping, Auth, Mine, Events, Activity]);

// Live-monitoring alert per activity kind, plus how long to wait before repeating the same alert for one visitor.
const ACTIVITY: Record<string, { type: string; title: string; quietMs: number }> = {
  page_not_found: { type: "analytics_page_not_found", title: "Address not found", quietMs: 10 * 60_000 },
  admin_probe: { type: "analytics_admin_probe", title: "Admin address tried", quietMs: 10 * 60_000 },
  vr_enter: { type: "analytics_vr_enter", title: "VR World opened", quietMs: 30 * 60_000 },
  vr_collect: { type: "analytics_vr_collect", title: "VR item collected", quietMs: 20_000 },
  vr_purchase: { type: "analytics_vr_purchase", title: "VR shop unlock", quietMs: 0 },
};

const codeFor = (id: string) => "M" + id.replace(/-/g, "").slice(0, 8).toUpperCase();

async function creditReferral(code: string, user: { id: string; createdAt: string }) {
  if (Date.now() - new Date(user.createdAt).getTime() > 2 * 86400_000) return; // only genuine new sign-ups
  if (codeFor(user.id) === code) return;
  const prefix = code.slice(1).toLowerCase();
  const { data: refs } = await admin.from("profiles").select("user_id")
    .gte("user_id", `${prefix}-0000-0000-0000-000000000000`).lte("user_id", `${prefix}-ffff-ffff-ffff-ffffffffffff`).limit(2);
  if (!refs || refs.length !== 1) return false;
  const { data } = await admin.from("dhf_referrals").upsert(
    { referrer_id: refs[0].user_id, referred_id: user.id, code, source: "member_link" },
    { onConflict: "referred_id", ignoreDuplicates: true },
  ).select("referred_id");
  return (data?.length ?? 0) > 0;
}

// Admin-only analytics alerts; the notification_kinds switch (admin page) gates delivery in the DB.
async function notifyAdmins(type: string, fromUser: string | null, ctx: Record<string, unknown>) {
  try {
    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    if (!admins?.length) return;
    await admin.from("notifications").insert(admins.map((a: { user_id: string }) => ({
      user_id: a.user_id, from_user_id: fromUser ?? a.user_id, type, context_data: { ...ctx, feature: "analytics" },
    })));
  } catch { /* never block tracking */ }
}

async function isAdminUser(id: string | undefined | null): Promise<boolean> {
  if (!id) return false;
  const { data } = await admin.from("user_roles").select("user_id").eq("user_id", id).eq("role", "admin").limit(1);
  return !!data?.length;
}

type Geo = {
  country?: string; country_code?: string; region?: string; city?: string; district?: string;
  isp?: string; lat?: number; lon?: number; is_vpn?: boolean; is_hosting?: boolean; is_mobile_network?: boolean;
};
const geoCache = new Map<string, { at: number; geo: Geo }>();

function clientIp(req: Request): string | null {
  const h = req.headers;
  const ip = h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}

async function lookupGeo(ip: string | null): Promise<Geo> {
  if (!ip) return {};
  const hit = geoCache.get(ip);
  if (hit && hit.geo.lat != null && Date.now() - hit.at < 6 * 3600_000) return hit.geo;
  // Reuse a lookup stored in the last day for the same address.
  const { data: prev } = await admin.from("platform_visits")
    .select("country,country_code,region,city,district,isp,lat,lon,is_vpn,is_hosting,is_mobile_network")
    .eq("ip_address", ip).not("country", "is", null).not("lat", "is", null)
    .gte("entered_at", new Date(Date.now() - 86400_000).toISOString())
    .limit(1).maybeSingle();
  if (prev) { geoCache.set(ip, { at: Date.now(), geo: prev as Geo }); return prev as Geo; }
  try {
    const r = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,district,isp,lat,lon,proxy,hosting,mobile`,
      { signal: AbortSignal.timeout(2500) },
    );
    const d = await r.json();
    if (d.status !== "success") return {};
    const geo: Geo = {
      country: d.country, country_code: d.countryCode, region: d.regionName, city: d.city,
      district: d.district || null, isp: d.isp, lat: d.lat, lon: d.lon, is_vpn: !!d.proxy, is_hosting: !!d.hosting,
      is_mobile_network: !!d.mobile,
    };
    geoCache.set(ip, { at: Date.now(), geo });
    return geo;
  } catch {
    return {};
  }
}

async function userFrom(req: Request): Promise<{ id: string; name: string | null; createdAt: string } | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data?.user) return null;
  const m = data.user.user_metadata || {};
  return { id: data.user.id, name: (m.full_name || m.name || m.display_name || data.user.email || null) as string | null, createdAt: data.user.created_at };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const b = parsed.data;

  try {
    if (b.action === "ping") {
      await admin.from("platform_visits")
        .update({ last_seen_at: new Date().toISOString(), duration_seconds: b.duration_seconds })
        .eq("id", b.id).eq("visitor_id", b.visitor_id);
      return json({ ok: true });
    }

    if (b.action === "events") {
      const user = await userFrom(req);
      await admin.from("platform_events").insert(b.events.map((e) => ({
        visitor_id: b.visitor_id, user_id: user?.id ?? null, kind: e.kind, name: e.name, path: e.path ?? null, device_type: b.device_type ?? null,
      })));
      return json({ ok: true });
    }

    if (b.action === "activity") {
      const user = await userFrom(req);
      const cfg = ACTIVITY[b.kind];
      if (await isAdminUser(user?.id)) return json({ ok: true, skipped: "admin" });
      const name = b.name.replace(/\s+/g, " ").trim().slice(0, 120);
      if (cfg.quietMs > 0) {
        const { count } = await admin.from("platform_events").select("id", { count: "exact", head: true })
          .eq("visitor_id", b.visitor_id).eq("kind", b.kind).eq("name", name)
          .gte("created_at", new Date(Date.now() - cfg.quietMs).toISOString());
        if (count) return json({ ok: true, throttled: true });
      }
      await admin.from("platform_events").insert({ visitor_id: b.visitor_id, user_id: user?.id ?? null, kind: b.kind, name, path: b.path ?? null, device_type: b.device_type ?? null });
      const ip = clientIp(req);
      const geo = b.kind === "page_not_found" || b.kind === "admin_probe" ? await lookupGeo(ip) : {};
      const who = user?.name ?? "A visitor";
      const where = geo.country ? ` from ${[geo.city, geo.country].filter(Boolean).join(", ")}` : "";
      await notifyAdmins(cfg.type, user?.id ?? null, { title: cfg.title, message: `${who}${where}: ${name}`, path: b.path ?? null, live: true });
      return json({ ok: true });
    }

    if (b.action === "my_referrals") {
      const user = await userFrom(req);
      if (!user) return json({ error: "sign in required" }, 401);
      const code = codeFor(user.id);
      const [{ data: v }, { data: r }] = await Promise.all([
        admin.from("platform_visits").select("visitor_id,entered_at").eq("ref_code", code).limit(10000),
        admin.from("dhf_referrals").select("referred_id,created_at").eq("referrer_id", user.id).order("created_at", { ascending: false }),
      ]);
      const visitors = new Set((v || []).map((x) => x.visitor_id)).size;
      return json({ code, visits: (v || []).length, visitors, signups: (r || []).length, recent: (r || []).slice(0, 20).map((x) => x.created_at) });
    }

    const ip = clientIp(req);
    const [user, geo] = await Promise.all([userFrom(req), lookupGeo(ip)]);

    if (b.action === "auth") {
      if (!user) return json({ ok: true, skipped: "signed_out" });
      if (b.event === "login" && Date.now() - new Date(user.createdAt).getTime() < 2 * 86400_000) {
        const { count } = await admin.from("platform_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("kind", "signup");
        if (!count) {
          await admin.from("platform_events").insert({ visitor_id: "server", user_id: user.id, kind: "signup", name: "account_created", device_type: b.device_type ?? null });
          await notifyAdmins("analytics_new_member", user.id, { title: "New member", message: `${user.name ?? "Someone"} just joined${geo.country ? ` from ${geo.country}` : ""}` });
        }
      }
      if (b.event === "login" && b.ref_code) {
        const credited = await creditReferral(b.ref_code, user).catch(() => false);
        if (credited) await notifyAdmins("analytics_referral", user.id, { title: "Referral credited", message: `${user.name ?? "A new member"} joined via referral ${b.ref_code}` });
      }
      if (b.event === "login" && (geo.is_vpn || geo.is_hosting)) {
        await notifyAdmins("analytics_vpn_signin", user.id, { title: "VPN sign-in", message: `${user.name ?? "A member"} signed in through a VPN/hosting network${geo.country ? ` (${geo.country})` : ""}` });
      }
      await admin.from("platform_auth_events").insert({
        user_id: user.id, event: b.event, display_name: user.name,
        device_type: b.device_type, os: b.os, browser: b.browser,
        ip_address: ip, country: geo.country ?? null, city: geo.city ?? null, is_vpn: geo.is_vpn ?? null,
      });
      return json({ ok: true });
    }

    let referrer_host: string | null = null;
    try { if (b.referrer) referrer_host = new URL(b.referrer).hostname || null; } catch { /* ignore */ }
    let site_host: string | null = null;
    try { const o = req.headers.get("origin") || req.headers.get("referer"); if (o) site_host = new URL(o).hostname.slice(0, 120) || null; } catch { /* ignore */ }
    // First visit of this browser to a web address in 6 hours → one live "domain visit" alert.
    if (site_host) {
      const { count } = await admin.from("platform_visits").select("id", { count: "exact", head: true })
        .eq("visitor_id", b.visitor_id).eq("site_host", site_host)
        .gte("entered_at", new Date(Date.now() - 6 * 3600_000).toISOString());
      if (!count && !(await isAdminUser(user?.id))) {
        const where = geo.country ? ` from ${[geo.city, geo.country].filter(Boolean).join(", ")}` : "";
        await notifyAdmins("analytics_domain_visit", user?.id ?? null, {
          title: `Visit to ${site_host}`, message: `${user?.name ?? "A visitor"}${where} opened ${site_host}${b.path}`, path: b.path, live: true,
        });
      }
    }
    const { data, error } = await admin.from("platform_visits").insert({
      visitor_id: b.visitor_id, user_id: user?.id ?? null, path: b.path, referrer_host, site_host,
      device_type: b.device_type, os: b.os, browser: b.browser, screen: b.screen,
      language: b.language, timezone: b.timezone, hardware: b.hardware ?? {},
      ip_address: ip, ref_code: b.ref_code ?? null, load_ms: b.load_ms ?? null, ...geo,
    }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    // Backfill map position on earlier visits from the same address that were stored before positions existed.
    if (ip && geo.lat != null) {
      await admin.from("platform_visits").update({ lat: geo.lat, lon: geo.lon }).eq("ip_address", ip).is("lat", null);
    }
    return json({ id: data.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
