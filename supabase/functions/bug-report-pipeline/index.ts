import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface ReportRow {
  id: string;
  user_id: string | null;
  route: string | null;
  category: string | null;
  severity: string | null;
  status: string | null;
  user_message: string | null;
  admin_note: string | null;
  device_info: Record<string, unknown> | null;
}

/** Ask the Lovable AI gateway for a root-cause diagnosis + concrete fix plan. */
async function analyse(report: ReportRow): Promise<{ summary: string; suggestion: string }> {
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

  const prompt = [
    'You are the automated triage engine for a React + Vite + Supabase platform.',
    'Given a user bug report, respond with strict JSON:',
    '{"summary": "<=280 chars root-cause hypothesis", "suggestion": "concrete fix steps, files/areas to touch, max 900 chars"}',
    '',
    `Route: ${report.route ?? 'unknown'}`,
    `Category: ${report.category ?? 'bug'} | Severity: ${report.severity ?? 'normal'}`,
    `Device: ${JSON.stringify(report.device_info ?? {}).slice(0, 800)}`,
    `Report: ${report.user_message ?? '(no description)'}`,
  ].join('\n');

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI gateway ${res.status}: ${body.slice(0, 400)}`);
  }
  const data = await res.json();
  const raw = String(data?.choices?.[0]?.message?.content ?? '');
  const match = raw.match(/\{[\s\S]*\}/);
  try {
    const parsed = JSON.parse(match ? match[0] : raw);
    return {
      summary: String(parsed.summary ?? '').slice(0, 500) || 'No summary produced.',
      suggestion: String(parsed.suggestion ?? '').slice(0, 2000) || raw.slice(0, 2000),
    };
  } catch {
    return { summary: raw.slice(0, 400) || 'No summary produced.', suggestion: raw.slice(0, 2000) };
  }
}

async function sendReporterEmail(
  to: string,
  report: ReportRow,
  status: string,
  note: string | null,
): Promise<{ sent: boolean; error?: string }> {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('BUG_REPORT_EMAIL_FROM') ?? Deno.env.get('ASTRO_ALERT_EMAIL_FROM') ?? 'alerts@resend.dev';
  if (!key) return { sent: false, error: 'email not configured' };
  const label = status.replace('_', ' ');
  const text = [
    `Your report is now: ${label.toUpperCase()}`,
    '',
    `Report: ${report.user_message ?? '(no description)'}`,
    report.route ? `Page: ${report.route}` : '',
    '',
    note ? `Latest note from the team:\n${note}` : 'No additional notes yet.',
    '',
    'You can follow the full history on the Report a problem page.',
  ]
    .filter(Boolean)
    .join('\n');
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `Bug report update — ${label}`, text }),
    });
    if (!r.ok) return { sent: false, error: `${r.status}: ${(await r.text()).slice(0, 300)}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: String(e) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const { data: userData } = await admin.auth.getUser(token);
    const actorId = userData?.user?.id;
    if (!actorId) return json({ ok: false, error: 'sign in required' }, 401);
    const actorLabel = userData?.user?.email ?? actorId;
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: actorId, _role: 'admin' });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? 'triage');
    const reportId = String(body?.report_id ?? '');
    if (!reportId) return json({ ok: false, error: 'report_id required' }, 400);

    const { data: report, error: loadErr } = await admin
      .from('platform_error_logs')
      .select('id, user_id, route, category, severity, status, user_message, admin_note, device_info')
      .eq('id', reportId)
      .maybeSingle();
    if (loadErr) return json({ ok: false, error: loadErr.message }, 500);
    if (!report) return json({ ok: false, error: 'report not found' }, 404);

    const row = report as ReportRow;
    const isOwner = row.user_id === actorId;
    if (!isAdmin && !isOwner) return json({ ok: false, error: 'not allowed' }, 403);

    if (action === 'triage') {
      await admin.from('platform_error_logs').update({ autofix_state: 'analyzing' }).eq('id', reportId);
      try {
        const { summary, suggestion } = await analyse(row);
        await admin
          .from('platform_error_logs')
          .update({
            autofix_state: 'proposed',
            autofix_summary: summary,
            autofix_suggestion: suggestion,
            autofix_at: new Date().toISOString(),
            status: row.status === 'open' ? 'triaged' : row.status,
          })
          .eq('id', reportId);
        await admin.from('bug_report_audit_log').insert({
          report_id: reportId,
          actor_id: null,
          actor_label: 'auto-triage',
          action: 'auto_triage',
          from_status: row.status,
          to_status: row.status === 'open' ? 'triaged' : row.status,
          note: summary,
        });
        return json({ ok: true, summary, suggestion });
      } catch (e) {
        await admin
          .from('platform_error_logs')
          .update({ autofix_state: 'failed', autofix_summary: String(e).slice(0, 400) })
          .eq('id', reportId);
        return json({ ok: false, error: String(e) }, 502);
      }
    }

    if (action === 'admin_action') {
      if (!isAdmin) return json({ ok: false, error: 'admin only' }, 403);
      const nextStatus = body?.status ? String(body.status) : null;
      const note = body?.admin_note !== undefined ? String(body.admin_note).slice(0, 1000) : null;
      const patch: Record<string, unknown> = {};
      if (nextStatus) patch.status = nextStatus;
      if (note !== null) patch.admin_note = note;
      if (Object.keys(patch).length === 0) return json({ ok: false, error: 'nothing to change' }, 400);

      const { error: upErr } = await admin.from('platform_error_logs').update(patch).eq('id', reportId);
      if (upErr) return json({ ok: false, error: upErr.message }, 500);

      await admin.from('bug_report_audit_log').insert({
        report_id: reportId,
        actor_id: actorId,
        actor_label: actorLabel,
        action: nextStatus && note !== null ? 'status_and_note' : nextStatus ? 'status_change' : 'note',
        from_status: row.status,
        to_status: nextStatus ?? row.status,
        note: note ?? row.admin_note,
      });

      let email: { sent: boolean; error?: string } = { sent: false, error: 'no status change' };
      if (nextStatus && nextStatus !== row.status && row.user_id) {
        const { data: reporter } = await admin.auth.admin.getUserById(row.user_id);
        const to = reporter?.user?.email;
        email = to
          ? await sendReporterEmail(to, row, nextStatus, note ?? row.admin_note)
          : { sent: false, error: 'reporter has no email' };
      }
      return json({ ok: true, email });
    }

    return json({ ok: false, error: `unknown action ${action}` }, 400);
  } catch (e) {
    console.error('[bug-report-pipeline] failed', e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
