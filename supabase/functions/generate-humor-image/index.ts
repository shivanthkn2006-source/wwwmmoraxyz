import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const Body = z.object({ title: z.string().trim().min(1).max(80), text: z.string().trim().min(1).max(1200) });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign in required' }, 401);
  const auth = createClient(URL, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await auth.auth.getUser(token);
  if (!user) return json({ error: 'Invalid session' }, 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const prompt = `Bright funny editorial cartoon that literally depicts this exact member joke. Title context: ${parsed.data.title}. Joke scene and action: ${parsed.data.text}. Show the people, objects, action, setting, and facial expressions described. Warm cinematic color, expressive, family friendly, square composition, no written words, no letters, no captions, no logos, no brands, no watermark.`;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 40_000);
  try {
    const source = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${crypto.randomUUID()}`;
    const response = await fetch(source, { signal: ctrl.signal, headers: { Accept: 'image/*' } });
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!response.ok || !contentType.startsWith('image/')) return json({ error: 'Image unavailable' }, 502);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 1024 || bytes.length > 5 * 1024 * 1024) return json({ error: 'Invalid image' }, 502);
    const db = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const path = `members/${user.id}/${crypto.randomUUID()}.${ext}`;
    const uploaded = await db.storage.from('humor-images').upload(path, bytes, { contentType, upsert: false });
    if (uploaded.error) return json({ error: 'Image save failed' }, 500);
    const signed = await db.storage.from('humor-images').createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed.data?.signedUrl ? json({ image_url: signed.data.signedUrl }) : json({ error: 'Image link failed' }, 500);
  } catch { return json({ error: 'Image unavailable' }, 502); }
  finally { clearTimeout(timeout); }
});