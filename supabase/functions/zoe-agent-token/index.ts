// ═══════════════════════════════════════════════════════════════════════════
// ZOE AGENT TOKEN
// Mints a short-lived Deepgram grant token so the browser can open the
// realtime Voice Agent WebSocket without ever seeing DEEPGRAM_API_KEY.
// Session-gated: an anonymous caller can never burn Deepgram minutes.
// ═══════════════════════════════════════════════════════════════════════════
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'invalid session' }, 401);

    const key = Deno.env.get('DEEPGRAM_API_KEY');
    if (!key) return json({ error: 'DEEPGRAM_API_KEY is not configured' }, 503);

    const res = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl_seconds: 60 }),
    });

    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Deepgram grant failed [${res.status}]: ${text}` }, 502);
    }

    const grant = await res.json();
    return json({
      token: grant.access_token,
      expiresIn: grant.expires_in ?? 60,
      email: userData.user.email ?? null,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'token mint failed' }, 500);
  }
});
