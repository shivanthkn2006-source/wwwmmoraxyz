/**
 * ZOE ASSET JOB
 * =============
 * Background asset work Zoe can start mid-conversation and report on later.
 *
 * Honesty rule: this function never pretends. If no 3D generation provider is
 * configured, the job is closed as `unavailable` with the reason, and the status
 * card says so instead of spinning forever. When `MESHY_API_KEY` is present the
 * job is genuinely submitted to Meshy text-to-3D and polled for real progress.
 *
 * POST { mode: 'create', kind: '3d', prompt }   → { ok, job }
 * POST { mode: 'status', jobId }                → { ok, job }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { resolveClaims } from '../_shared/auth-claims.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const MESHY_KEY = Deno.env.get('MESHY_API_KEY') ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function submitToMeshy(prompt: string): Promise<{ id: string } | { error: string }> {
  try {
    const res = await fetch('https://api.meshy.ai/openapi/v2/text-to-3d', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MESHY_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'preview', prompt, art_style: 'realistic' }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: `provider responded ${res.status}` };
    const id = body?.result ?? body?.id;
    return id ? { id: String(id) } : { error: 'provider returned no job id' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'provider unreachable' };
  }
}

async function pollMeshy(providerJobId: string) {
  const res = await fetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${providerJobId}`, {
    headers: { Authorization: `Bearer ${MESHY_KEY}` },
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  if (!body) return null;
  const state = String(body.status || '').toUpperCase();
  return {
    progress: Number(body.progress ?? 0),
    status: state === 'SUCCEEDED' ? 'succeeded' : state === 'FAILED' ? 'failed' : 'running',
    resultUrl: body?.model_urls?.glb ?? null,
    detail: body?.task_error?.message ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const authClient = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data: claims } = await resolveClaims(authClient, token);
  const userId = claims?.claims?.sub;
  if (!userId) return json({ ok: false, error: 'Unauthorized' }, 401);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const mode = typeof body.mode === 'string' ? body.mode : 'create';

  if (mode === 'status') {
    const jobId = String(body.jobId || '');
    if (!jobId) return json({ ok: false, error: 'jobId is required' }, 400);
    const { data: job, error } = await db
      .from('zoe_asset_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !job) return json({ ok: false, error: 'Job not found' }, 404);

    // Live provider poll only while the job is genuinely in flight.
    if (job.provider === 'meshy' && job.provider_job_id && MESHY_KEY && (job.status === 'queued' || job.status === 'running')) {
      const live = await pollMeshy(job.provider_job_id).catch(() => null);
      if (live) {
        const { data: updated } = await db
          .from('zoe_asset_jobs')
          .update({
            status: live.status,
            progress: Math.max(0, Math.min(100, Math.round(live.progress))),
            result_url: live.resultUrl,
            detail: live.detail,
          })
          .eq('id', jobId)
          .select('*')
          .maybeSingle();
        return json({ ok: true, job: updated ?? job });
      }
    }
    return json({ ok: true, job });
  }

  const kind = typeof body.kind === 'string' ? body.kind : '3d';
  const prompt = String(body.prompt || '').trim().slice(0, 500);
  if (!prompt) return json({ ok: false, error: 'A description is required' }, 400);
  if (!['3d', 'image', 'video', 'document'].includes(kind)) {
    return json({ ok: false, error: 'Unsupported asset kind' }, 400);
  }

  const { data: job, error } = await db
    .from('zoe_asset_jobs')
    .insert({ user_id: userId, kind, prompt, status: 'queued', progress: 0 })
    .select('*')
    .single();
  if (error || !job) return json({ ok: false, error: error?.message ?? 'Could not create the job' }, 500);

  if (kind === '3d') {
    if (!MESHY_KEY) {
      const { data: closed } = await db
        .from('zoe_asset_jobs')
        .update({
          status: 'unavailable',
          detail: 'No 3D generation provider is connected yet, so nothing was generated.',
        })
        .eq('id', job.id)
        .select('*')
        .maybeSingle();
      return json({ ok: true, job: closed ?? job });
    }
    const submitted = await submitToMeshy(prompt);
    const patch =
      'id' in submitted
        ? { status: 'running', provider: 'meshy', provider_job_id: submitted.id, progress: 1 }
        : { status: 'failed', provider: 'meshy', detail: submitted.error };
    const { data: updated } = await db
      .from('zoe_asset_jobs')
      .update(patch)
      .eq('id', job.id)
      .select('*')
      .maybeSingle();
    return json({ ok: true, job: updated ?? job });
  }

  return json({ ok: true, job });
});
