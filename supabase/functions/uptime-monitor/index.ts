/**
 * UPTIME MONITOR — scheduled availability watchdog.
 *
 * Probes the database and the critical edge services, records the result in
 * platform_health_logs, and raises a notification to every administrator when
 * something is down. Alerts are de-duplicated: an admin is not re-alerted for
 * the same failing target within the cooldown window.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const ALERT_COOLDOWN_MINUTES = 60;
const PROBE_TIMEOUT_MS = 12_000;

/** Edge services whose failure means members feel it immediately. */
const TARGETS = [
  { name: 'zoe-chat', path: 'zoe-chat', body: { message: 'uptime probe', probe: true }, timeoutMs: 15_000 },
  // Fans out to every third-party provider, so it is legitimately slow.
  { name: 'zoe-api-status', path: 'zoe-api-status', body: {}, timeoutMs: 40_000 },
  { name: 'beta-invite', path: 'beta-invite', body: { action: 'validate', code: 'UPTIME-PROBE' }, timeoutMs: 12_000 },
];

interface ProbeResult {
  target: string;
  ok: boolean;
  status: number | null;
  ms: number;
  error?: string;
}

async function probe(url: string, key: string, target: typeof TARGETS[number]): Promise<ProbeResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/functions/v1/${target.path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify(target.body),
      signal: controller.signal,
    });
    // 4xx from a guarded endpoint still proves the service is alive.
    const ok = res.status < 500;
    return { target: target.name, ok, status: res.status, ms: Date.now() - started };
  } catch (error) {
    return {
      target: target.name,
      ok: false,
      status: null,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : 'probe failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const results: ProbeResult[] = [];

  // Database reachability
  const dbStarted = Date.now();
  const { error: dbError } = await db.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
  results.push({
    target: 'database',
    ok: !dbError,
    status: dbError ? null : 200,
    ms: Date.now() - dbStarted,
    error: dbError?.message,
  });

  for (const target of TARGETS) {
    results.push(await probe(url, serviceKey, target));
  }

  const failing = results.filter((r) => !r.ok);
  const score = Math.round(((results.length - failing.length) / results.length) * 100);

  await db.from('platform_health_logs').insert({
    score,
    status: failing.length === 0 ? 'healthy' : failing.length === results.length ? 'down' : 'degraded',
    issues_count: failing.length,
    critical_issues: failing.filter((f) => f.target === 'database').length,
    scan_data: { source: 'uptime-monitor', checked_at: new Date().toISOString(), results },
  });

  let alerted = 0;

  if (failing.length > 0) {
    const since = new Date(Date.now() - ALERT_COOLDOWN_MINUTES * 60_000).toISOString();
    const { data: recent } = await db
      .from('notifications')
      .select('context_data')
      .eq('type', 'uptime_alert')
      .gte('created_at', since);

    const alreadyAlerted = new Set(
      (recent ?? []).flatMap((row: { context_data: Record<string, unknown> | null }) =>
        Array.isArray(row.context_data?.targets) ? (row.context_data!.targets as string[]) : []),
    );

    const fresh = failing.filter((f) => !alreadyAlerted.has(f.target));

    if (fresh.length > 0) {
      const { data: admins } = await db.from('user_roles').select('user_id').eq('role', 'admin');
      const rows = (admins ?? []).map((admin: { user_id: string }) => ({
        user_id: admin.user_id,
        from_user_id: admin.user_id,
        type: 'uptime_alert',
        priority: 9,
        context_data: {
          title: 'Service down',
          message: `${fresh.map((f) => f.target).join(', ')} not responding`,
          targets: fresh.map((f) => f.target),
          details: fresh,
          checked_at: new Date().toISOString(),
        },
      }));
      if (rows.length > 0) {
        const { error } = await db.from('notifications').insert(rows);
        if (!error) alerted = rows.length;
      }
    }
  }

  return json({ ok: true, score, results, failing: failing.map((f) => f.target), alerted });
});
