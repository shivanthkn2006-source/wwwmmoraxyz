/**
 * ZOE SYNTHETIC CRAWLER — nightly walk over every registered menu/route.
 *
 * For each row in `public.platform_routes` (kept in sync with the generated
 * route registry) the crawler issues a real HTTP GET against the published
 * origin, records status + latency, and flags:
 *   • dead_link   — non-2xx/3xx response or network failure
 *   • slow_route  — response slower than the latency budget
 *   • anomaly     — DHF tables that are still completely empty (orphaned data)
 *
 * Callable by an authenticated admin, or by cron with the shared crawler secret.
 * Results land in `zoe_crawl_runs` / `zoe_crawl_findings`.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-crawler-secret',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const DEFAULT_ORIGIN = 'https://wwwmmoraxyz.lovable.app';
const SLOW_MS = 2500;
const REQUEST_TIMEOUT_MS = 12_000;
const CONCURRENCY = 6;

/** DHF tables that must never be empty once the platform is live. */
const DHF_TABLES = [
  'dhf_profiles',
  'dhf_daily_posts',
  'dhf_videos',
  'dhf_soul_codex',
  'dhf_stack_sessions',
  'dhf_consciousness_memory',
  'dhf_video_dispatch_runs',
  'dhf_lineage_ledger',
];

interface Finding {
  route: string | null;
  finding_type: string;
  severity: string;
  http_status: number | null;
  duration_ms: number | null;
  detail: string;
}

async function probeRoute(origin: string, path: string): Promise<Finding | null> {
  const url = `${origin}${path}`;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    const duration = Date.now() - started;
    if (res.status >= 400) {
      return { route: path, finding_type: 'dead_link', severity: 'critical', http_status: res.status, duration_ms: duration, detail: `HTTP ${res.status} for ${url}` };
    }
    if (duration > SLOW_MS) {
      return { route: path, finding_type: 'slow_route', severity: 'warning', http_status: res.status, duration_ms: duration, detail: `${duration}ms exceeds ${SLOW_MS}ms budget` };
    }
    return null;
  } catch (e) {
    return {
      route: path,
      finding_type: 'dead_link',
      severity: 'critical',
      http_status: null,
      duration_ms: Date.now() - started,
      detail: `request failed: ${String((e as Error)?.message ?? e).slice(0, 200)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const cronSecret = Deno.env.get('CRAWLER_SECRET') ?? '';
    const headerSecret = req.headers.get('x-crawler-secret') ?? '';
    const isCron = !!cronSecret && headerSecret === cronSecret;

    let trigger = isCron ? 'cron' : 'manual';

    if (!isCron) {
      const authHeader = req.headers.get('Authorization') ?? '';
      if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
      const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await caller.auth.getUser();
      const callerId = userData?.user?.id;
      if (!callerId) return json({ error: 'Unauthorized' }, 401);
      const { data: isAdmin } = await caller.rpc('has_role', { _user_id: callerId, _role: 'admin' });
      if (!isAdmin) return json({ error: 'Admin access required' }, 403);
      trigger = typeof body.trigger === 'string' ? body.trigger : 'manual';
    }

    const origin = (typeof body.origin === 'string' && body.origin.startsWith('https://')
      ? body.origin
      : Deno.env.get('SITE_URL') || DEFAULT_ORIGIN).replace(/\/$/, '');

    const { data: routeRows, error: routeErr } = await service
      .from('platform_routes')
      .select('path')
      .eq('dynamic', false)
      .order('path');
    if (routeErr) return json({ error: `route load failed: ${routeErr.message}` }, 500);

    const routes = (routeRows ?? []).map((r: { path: string }) => r.path).filter((p) => p.startsWith('/'));
    if (routes.length === 0) return json({ error: 'platform_routes is empty — sync the route registry first' }, 409);

    const { data: run, error: runErr } = await service
      .from('zoe_crawl_runs')
      .insert({ trigger, status: 'running' })
      .select('id')
      .single();
    if (runErr || !run) return json({ error: `run create failed: ${runErr?.message}` }, 500);

    const findings: Finding[] = [];
    for (let i = 0; i < routes.length; i += CONCURRENCY) {
      const batch = routes.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map((p) => probeRoute(origin, p)));
      for (const r of results) if (r) findings.push(r);
    }

    // Orphaned-data anomalies: DHF tables with zero rows.
    for (const table of DHF_TABLES) {
      const { count, error } = await service.from(table).select('id', { count: 'exact', head: true });
      if (error) {
        findings.push({ route: null, finding_type: 'anomaly', severity: 'warning', http_status: null, duration_ms: null, detail: `${table}: count failed (${error.message})` });
      } else if ((count ?? 0) === 0) {
        findings.push({ route: null, finding_type: 'anomaly', severity: 'warning', http_status: null, duration_ms: null, detail: `${table} is empty — data point orphaned` });
      }
    }

    if (findings.length > 0) {
      await service.from('zoe_crawl_findings').insert(findings.map((f) => ({ ...f, run_id: run.id })));
    }

    const summary = {
      origin,
      dead_links: findings.filter((f) => f.finding_type === 'dead_link').length,
      slow_routes: findings.filter((f) => f.finding_type === 'slow_route').length,
      anomalies: findings.filter((f) => f.finding_type === 'anomaly').length,
    };

    await service
      .from('zoe_crawl_runs')
      .update({ finished_at: new Date().toISOString(), routes_checked: routes.length, findings_count: findings.length, status: 'complete', summary })
      .eq('id', run.id);

    return json({ ok: true, runId: run.id, routesChecked: routes.length, findings: findings.length, summary });
  } catch (e) {
    console.error('[zoe-synthetic-crawler]', e);
    return json({ error: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
