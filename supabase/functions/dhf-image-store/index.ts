// Saves the signed-in member's daily-card pictures into storage once, so the
// cards serve from our bucket even when Pollinations or AI Horde are down.
// Bounded: at most 6 of the caller's own remote-only cards per call.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireCaller } from '../_shared/caller-guard.ts';
import { storeImage } from '../_shared/dhf-compass-runner.ts';

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const caller = await requireCaller(req, 'member');
  if (caller instanceof Response) return caller;
  if (caller.kind !== 'member') return json({ ok: false, error: 'member only' }, 400);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: rows } = await db.from('dhf_daily_posts')
    .select('id, post_date, slot_time, image_url')
    .eq('user_id', caller.userId).is('image_path', null).not('image_url', 'is', null)
    .order('post_date', { ascending: false }).order('slot_time', { ascending: false }).limit(6);

  let stored = 0;
  for (const r of rows ?? []) {
    const path = await storeImage(caller.userId, String(r.post_date), String(r.slot_time), String(r.image_url));
    if (!path) continue;
    const { error } = await db.from('dhf_daily_posts')
      .update({ image_path: path, image_source: 'storage' }).eq('id', r.id).is('image_path', null);
    if (!error) stored++;
  }
  return json({ ok: true, checked: rows?.length ?? 0, stored });
});
