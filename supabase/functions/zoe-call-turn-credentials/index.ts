import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const encodeBase64 = (bytes: ArrayBuffer): string => {
  const array = new Uint8Array(bytes);
  let binary = '';
  array.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return json({ error: 'Unauthorized' }, 401);

  const turnUrl = Deno.env.get('MMORA_TURN_URL')?.trim();
  const sharedSecret = Deno.env.get('MMORA_TURN_SHARED_SECRET');
  if (!turnUrl || !sharedSecret || !/^turns?:/i.test(turnUrl)) {
    return json({ configured: false, iceServers: [] });
  }

  const ttlSeconds = 3_600;
  const expiresAt = Math.floor(Date.now() / 1_000) + ttlSeconds;
  const username = `${expiresAt}:${user.id}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(sharedSecret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const credential = encodeBase64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(username)));

  return json({
    configured: true,
    expiresAt,
    iceServers: [{ urls: turnUrl, username, credential }],
  });
});