import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

const PROBE_TIMEOUT_MS = 6000;
const CONCURRENCY = 12;

/**
 * Synthetic probe of every deployed edge function.
 *
 * Each function is called with an empty JSON body and the anon key. A healthy
 * function answers 200 (public), 401 (auth required) or 400 (validation) — all
 * three prove the function booted and handled the request. 5xx / network
 * failures mean the function is dead or crashing and get flagged.
 */
function classify(status: number): { ok: boolean; category: string } {
  if (status === 0) return { ok: false, category: 'unreachable' };
  if (status === 504 || status === 408) return { ok: false, category: 'timeout' };
  if (status >= 500) return { ok: false, category: 'server_error' };
  if (status === 401 || status === 403) return { ok: true, category: 'auth_required' };
  if (status === 429) return { ok: true, category: 'rate_limited' };
  if (status >= 400) return { ok: true, category: 'validation' };
  return { ok: true, category: 'ok' };
}

async function probeOne(fn: string) {
  const started = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ANON}`,
        apikey: ANON,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const text = (await res.text()).slice(0, 300);
    const { ok, category } = classify(res.status);
    return { fn, status: res.status, ok, category, note: text, duration_ms: Date.now() - started };
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return {
      fn,
      status: timedOut ? 504 : 0,
      ok: false,
      category: timedOut ? 'timeout' : 'unreachable',
      note: err instanceof Error ? err.message.slice(0, 300) : 'unknown',
      duration_ms: Date.now() - started,
    };
  }
}

async function runPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const { data: userData } = await admin.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) return json({ ok: false, error: 'sign in required' }, 401);

    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) return json({ ok: false, error: 'admin only' }, 403);

    const body = await req.json().catch(() => ({}));
    const functions: string[] = Array.isArray(body?.functions) && body.functions.length > 0
      ? body.functions.filter((f: unknown) => typeof f === 'string')
      : [];

    if (functions.length === 0) {
      return json({ ok: false, error: 'functions[] is required' }, 400);
    }

    const results = await runPool(functions, CONCURRENCY, probeOne);
    const checkedAt = new Date().toISOString();

    await admin.from('edge_function_probes').insert(
      results.map((r) => ({ ...r, checked_at: checkedAt })),
    );

    const failing = results.filter((r) => !r.ok);
    return json({
      ok: true,
      checkedAt,
      total: results.length,
      healthy: results.length - failing.length,
      failing: failing.length,
      results,
    });
  } catch (error) {
    console.error('[platform-selftest]', error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'selftest failed' }, 500);
  }
});
