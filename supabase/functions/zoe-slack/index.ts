/**
 * zoe-slack — Zoe's read/write window into the connected Slack workspace.
 *
 * The Slack connection is gateway-backed: SLACK_API_KEY is a connection key
 * for the Lovable connector gateway, never a Slack token, so every call goes
 * through the gateway with both credentials. Slack answers HTTP 200 with
 * { ok:false, error } on failure, so both layers are checked and surfaced.
 *
 * Actions: channels | history | search | post
 */
import { publicGuard } from '../_shared/public-guard.ts';

// deno-lint-ignore no-explicit-any
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY = 'https://connector-gateway.lovable.dev/slack/api';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function slack(method: string, payload?: Record<string, unknown>) {
  const connectionKey = Deno.env.get('SLACK_API_KEY');
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!connectionKey || !lovableKey) {
    return { ok: false as const, error: 'slack_not_connected', status: 503 };
  }

  const res = await fetch(`${GATEWAY}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': connectionKey,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload ?? {}),
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`[zoe-slack] ${method} gateway ${res.status}: ${text.slice(0, 300)}`);
    return { ok: false as const, error: `gateway_${res.status}`, detail: text.slice(0, 300), status: res.status };
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false as const, error: 'non_json_response', detail: text.slice(0, 200), status: 502 };
  }
  if (body.ok === false) {
    console.error(`[zoe-slack] ${method} slack error: ${body.error}`);
    return { ok: false as const, error: String(body.error ?? 'slack_error'), status: 400 };
  }
  return { ok: true as const, body };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const guard = await publicGuard(req, { name: 'zoe-slack', limit: 30, windowSeconds: 60 });
  if (guard.response) return guard.response;

  try {
    const { action = 'channels', channel, query, text, limit = 20 } = await req.json().catch(() => ({}));

    if (action === 'channels') {
      const r = await slack('conversations.list', { limit: Math.min(limit, 200), types: 'public_channel' });
      if (!r.ok) return json(r, r.status);
      // deno-lint-ignore no-explicit-any
      const channels = ((r.body.channels as any[]) ?? []).map((c) => ({ id: c.id, name: c.name, members: c.num_members }));
      return json({ ok: true, channels });
    }

    if (action === 'history') {
      if (!channel) return json({ ok: false, error: 'channel_required' }, 400);
      const r = await slack('conversations.history', { channel, limit: Math.min(limit, 50) });
      if (!r.ok) return json(r, r.status);
      // deno-lint-ignore no-explicit-any
      const messages = ((r.body.messages as any[]) ?? []).map((m) => ({ user: m.user, text: m.text, ts: m.ts }));
      return json({ ok: true, messages });
    }

    if (action === 'search') {
      if (!query) return json({ ok: false, error: 'query_required' }, 400);
      const r = await slack('assistant.search.context', {
        query,
        content_types: ['messages', 'channels'],
        channel_types: ['public_channel', 'private_channel', 'im', 'mpim'],
        include_context_messages: true,
        limit: Math.min(limit, 20),
      });
      if (!r.ok) return json(r, r.status);
      return json({ ok: true, results: r.body.results ?? r.body });
    }

    if (action === 'post') {
      if (!channel || !text) return json({ ok: false, error: 'channel_and_text_required' }, 400);
      const r = await slack('chat.postMessage', { channel, text });
      if (!r.ok) return json(r, r.status);
      return json({ ok: true, ts: r.body.ts });
    }

    return json({ ok: false, error: 'unknown_action' }, 400);
  } catch (err) {
    console.error('[zoe-slack] threw', err);
    return json({ ok: false, error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
