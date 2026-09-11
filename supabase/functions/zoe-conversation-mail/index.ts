/**
 * ZOE CONVERSATION MAIL
 * =====================
 * Emails a member their own conversation history with Zoe.
 *
 *   POST { mode: 'now', days? }   → signed-in member asks for a transcript
 *   POST { mode: 'digest' }       → cron sweep, one recap per opted-in member
 *
 * Enterprise rules baked in:
 *  - A member can only ever receive their own messages (owner-scoped read).
 *  - The address is the profile contact email, falling back to the account
 *    email; a member can never post an arbitrary destination address.
 *  - Every attempt is written to `zoe_email_log`, success or failure.
 *  - Missing mail credentials return an honest 503, never a silent "sent".
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { resolveClaims } from '../_shared/auth-claims.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const MAIL_FROM = Deno.env.get('ZOE_MAIL_FROM') ?? Deno.env.get('ASTRO_ALERT_EMAIL_FROM') ?? 'zoe@resend.dev';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Turn {
  role: string | null;
  content: string | null;
  created_at: string;
}

function renderEmail(name: string, turns: Turn[], since: Date): string {
  const rows = turns
    .map((t) => {
      const who = (t.role ?? 'zoe').toLowerCase() === 'user' ? escapeHtml(name) : 'Zoe';
      const when = new Date(t.created_at).toLocaleString('en-GB', { timeZone: 'UTC' });
      return `<tr><td style="padding:6px 10px;color:#888;font-size:12px;white-space:nowrap">${when}</td>
        <td style="padding:6px 10px;font-weight:600;white-space:nowrap">${who}</td>
        <td style="padding:6px 10px">${escapeHtml(t.content ?? '')}</td></tr>`;
    })
    .join('');

  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#fff;color:#111">
    <h2 style="font-weight:600">Your conversations with Zoe</h2>
    <p style="color:#555">Since ${since.toISOString().slice(0, 10)} · ${turns.length} message${turns.length === 1 ? '' : 's'}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table>
    <p style="color:#888;font-size:12px;margin-top:24px">Sent by Zoe on M'Mora. You can turn the daily recap off on your profile page.</p>
  </body></html>`;
}

async function sendOne(userId: string, days: number, kind: string) {
  const { data: profile } = await db
    .from('profiles')
    .select('contact_email, display_name, username')
    .eq('user_id', userId)
    .maybeSingle();

  let to = (profile?.contact_email ?? '').trim();
  if (!EMAIL_RE.test(to)) {
    const { data: authUser } = await db.auth.admin.getUserById(userId);
    to = authUser?.user?.email ?? '';
  }
  if (!EMAIL_RE.test(to)) {
    return { ok: false, status: 400, error: 'No email address on file. Add one on your profile page.' };
  }

  const since = new Date(Date.now() - days * 86_400_000);
  const { data: turns } = await db
    .from('ai_companion_messages')
    .select('role, content, created_at')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })
    .limit(500);

  const list = (turns ?? []) as Turn[];
  if (list.length === 0) {
    return { ok: false, status: 200, error: 'No conversations in that period yet.', messageCount: 0, to };
  }

  const name = profile?.display_name || profile?.username || 'You';
  const subject =
    kind === 'digest'
      ? `Your Zoe recap — ${list.length} messages`
      : `Your conversation history with Zoe (${list.length} messages)`;

  if (!RESEND_KEY) {
    await db.from('zoe_email_log').insert({
      user_id: userId, to_email: to, kind, subject, message_count: list.length,
      status: 'failed', error: 'mail_not_configured',
    });
    return { ok: false, status: 503, error: 'Email sending is not set up yet for this platform.', to };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html: renderEmail(name, list, since) }),
  });
  const ok = res.ok;
  const detail = ok ? null : (await res.text()).slice(0, 500);

  await db.from('zoe_email_log').insert({
    user_id: userId, to_email: to, kind, subject, message_count: list.length,
    status: ok ? 'sent' : 'failed', error: detail,
  });

  return ok
    ? { ok: true, status: 200, to, messageCount: list.length }
    : { ok: false, status: 502, error: 'The mail provider refused the message.', to };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const mode = typeof body.mode === 'string' ? body.mode : 'now';

  // Cron sweep — protected by a shared secret, never by a user session.
  if (mode === 'digest') {
    const secret = Deno.env.get('CRON_SECRET');
    const provided = req.headers.get('x-cron-secret');
    if (!secret || provided !== secret) return json({ ok: false, error: 'Unauthorized' }, 401);

    const hour = new Date().getUTCHours();
    const { data: members } = await db
      .from('profiles')
      .select('user_id')
      .eq('email_digest_enabled', true)
      .eq('email_digest_hour', hour)
      .limit(1000);

    let sent = 0;
    for (const m of members ?? []) {
      const result = await sendOne(m.user_id as string, 1, 'digest');
      if (result.ok) sent += 1;
    }
    return json({ ok: true, considered: members?.length ?? 0, sent });
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const authClient = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data: claims } = await resolveClaims(authClient, token);
  const userId = claims?.claims?.sub;
  if (!userId) return json({ ok: false, error: 'Unauthorized' }, 401);

  const days = Math.min(Math.max(Number(body.days) || 30, 1), 365);
  const result = await sendOne(userId, days, 'on_demand');
  return json(result, result.status);
});
