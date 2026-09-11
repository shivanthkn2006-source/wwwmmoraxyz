/**
 * SENTINEL GUARD — server side of the admin-only surveillance board.
 *
 * Three actions, all written with the service role so a member can never
 * forge or read another member's telemetry:
 *
 *   heartbeat  — upsert the caller's live session row (IP + geo resolved
 *                server-side from request headers, never trusted from the
 *                client) together with the device/hardware snapshot.
 *   threat     — record a suspicious action (devtools, source view, scrape…)
 *                and auto-block the account/device once the severity budget
 *                is spent.
 *   end        — close the session when the tab goes away.
 *
 * The client is never told anything about the platform internals: every
 * response is a bare `{ ok }` (plus `blocked`), so a hostile visitor learns
 * nothing from probing this endpoint.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { guardRequest } from '../_shared/waf.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Severity weights — a block trips once the rolling score crosses the budget. */
const WEIGHT: Record<string, number> = { low: 1, medium: 3, high: 6, critical: 12 };
const BLOCK_SCORE = 12;
const WINDOW_MINUTES = 30;

interface GeoInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

/** Best-effort geo lookup; never blocks the write path. */
async function resolveGeo(ip: string | null, headerCountry: string | null): Promise<GeoInfo> {
  const base: GeoInfo = headerCountry ? { country: headerCountry } : {};
  if (!ip || ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('::1') || ip.startsWith('192.168.')) return base;

  const get = async (url: string): Promise<Record<string, unknown> | null> => {
    const ctrl = new AbortController();
    // Keep the abort armed until the body is fully read — a slow/stalled body
    // read is what previously kept the whole request alive to the 150s ceiling.
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  // Primary: ipwho.is (no key, generous limits). Fallback: ipapi.co.
  const w = await get(`https://ipwho.is/${ip}`);
  if (w && w.success === true) {
    const tz = w.timezone as { id?: string } | string | undefined;
    return {
      country: (w.country as string) ?? base.country,
      region: (w.region as string) ?? undefined,
      city: (w.city as string) ?? undefined,
      timezone: typeof tz === 'string' ? tz : tz?.id,
      latitude: typeof w.latitude === 'number' ? w.latitude : undefined,
      longitude: typeof w.longitude === 'number' ? w.longitude : undefined,
    };
  }

  const g = await get(`https://ipapi.co/${ip}/json/`);
  if (g && !g.error) {
    return {
      country: (g.country_name as string) ?? base.country,
      region: (g.region as string) ?? undefined,
      city: (g.city as string) ?? undefined,
      timezone: (g.timezone as string) ?? undefined,
      latitude: typeof g.latitude === 'number' ? g.latitude : undefined,
      longitude: typeof g.longitude === 'number' ? g.longitude : undefined,
    };
  }

  return base;
}


function clientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // WAF: shape + burst guard. Telemetry is chatty and offices share one NAT
  // address, so the ceiling is generous — it only catches a flood.
  const guard = await guardRequest(req, {
    name: 'sentinel-guard',
    limit: 600,
    windowSeconds: 60,
    maxBodyBytes: 16 * 1024,
    allowRichText: true,
  });
  if (guard.response) return guard.response;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const body = guard.body as Record<string, unknown>;
    const action = String(body.action ?? '');
    const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken.slice(0, 128) : '';
    const fingerprint = typeof body.fingerprint === 'string' ? body.fingerprint.slice(0, 128) : null;


    // Resolve the caller from their JWT — anonymous callers stay anonymous.
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && !/Bearer (null|undefined)/.test(authHeader)) {
      try {
        const asUser = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data } = await asUser.auth.getUser();
        userId = data?.user?.id ?? null;
      } catch {
        userId = null;
      }
    }

    // Already blocked? Say so and do no further work.
    const { data: existingBlock } = await admin
      .from('sentinel_blocks')
      .select('id')
      .eq('active', true)
      .or(
        [userId ? `user_id.eq.${userId}` : null, fingerprint ? `device_fingerprint.eq.${fingerprint}` : null]
          .filter(Boolean)
          .join(',') || 'id.is.null',
      )
      .maybeSingle();
    if (existingBlock) return json({ ok: true, blocked: true });

    if (action === 'end') {
      if (sessionToken) {
        await admin
          .from('sentinel_sessions')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('session_token', sessionToken);
      }
      return json({ ok: true, blocked: false });
    }

    const ip = clientIp(req);
    const device = (body.device ?? {}) as Record<string, unknown>;

    if (action === 'heartbeat') {
      if (!sessionToken) return json({ ok: false }, 400);
      const geo = await resolveGeo(ip, req.headers.get('cf-ipcountry'));
      const now = new Date().toISOString();
      await admin.from('sentinel_sessions').upsert(
        {
          session_token: sessionToken,
          user_id: userId,
          ip_address: ip,
          user_agent: String(device.userAgent ?? '').slice(0, 500) || null,
          browser: (device.browser as string) ?? null,
          browser_version: (device.browserVersion as string) ?? null,
          device_type: (device.deviceType as string) ?? null,
          device_vendor: (device.gpuVendor as string) ?? null,
          device_model: (device.gpuModel as string) ?? null,
          os: (device.os as string) ?? null,
          os_version: (device.osVersion as string) ?? null,
          country: geo.country ?? null,
          region: geo.region ?? null,
          city: geo.city ?? null,
          latitude: geo.latitude ?? null,
          longitude: geo.longitude ?? null,
          timezone: geo.timezone ?? (device.timezone as string) ?? null,
          device_fingerprint: fingerprint,
          hardware: device,
          is_active: true,
          last_activity_at: now,
        },
        { onConflict: 'session_token' },
      );
      return json({ ok: true, blocked: false });
    }

    if (action === 'threat') {
      const threatType = String(body.threatType ?? 'unknown').slice(0, 64);
      const severity = ['low', 'medium', 'high', 'critical'].includes(String(body.severity))
        ? String(body.severity)
        : 'medium';
      const geo = await resolveGeo(ip, req.headers.get('cf-ipcountry'));

      // Rolling score over the recent window decides whether this is a block.
      const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
      let recent: Array<{ severity: string }> = [];
      if (userId || fingerprint) {
        const { data } = await admin
          .from('sentinel_threat_events')
          .select('severity')
          .gte('created_at', since)
          .or(
            [userId ? `user_id.eq.${userId}` : null, fingerprint ? `device_fingerprint.eq.${fingerprint}` : null]
              .filter(Boolean)
              .join(','),
          )
          .limit(100);
        recent = data ?? [];
      }
      const score =
        recent.reduce((sum, r) => sum + (WEIGHT[r.severity] ?? 1), 0) + (WEIGHT[severity] ?? 1);
      const shouldBlock = score >= BLOCK_SCORE && (!!userId || !!fingerprint);

      await admin.from('sentinel_threat_events').insert({
        user_id: userId,
        session_token: sessionToken || null,
        threat_type: threatType,
        severity,
        ip_address: ip,
        country: geo.country ?? null,
        region: geo.region ?? null,
        city: geo.city ?? null,
        device_fingerprint: fingerprint,
        device,
        page_url: String(body.pageUrl ?? '').slice(0, 500) || null,
        details: (body.details ?? {}) as Record<string, unknown>,
        blocked: shouldBlock,
      });

      if (shouldBlock) {
        // Partial unique indexes cannot be used as upsert targets, so the
        // "already blocked?" check above is our idempotency guard here.
        await admin.from('sentinel_blocks').insert({
          user_id: userId,
          device_fingerprint: fingerprint,
          ip_address: ip,
          reason: `Automatic block after repeated ${threatType} attempts (score ${score}).`,
          severity: 'critical',
          active: true,
        });
        if (sessionToken) {
          await admin
            .from('sentinel_sessions')
            .update({ is_active: false, ended_at: new Date().toISOString() })
            .eq('session_token', sessionToken);
        }
      }

      return json({ ok: true, blocked: shouldBlock });
    }

    return json({ ok: false }, 400);
  } catch {
    // Never leak internals to the caller.
    return json({ ok: false }, 500);
  }
});
