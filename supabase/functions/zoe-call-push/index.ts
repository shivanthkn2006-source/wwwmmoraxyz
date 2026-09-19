// Rings the person being called, even when their phone is asleep, using Web Push.
// Only a signed-in caller may trigger a ring, and only for someone else.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  receiverId: z.string().uuid(),
  callerName: z.string().min(1).max(120).optional(),
  withVideo: z.boolean().optional(),
});

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { receiverId, callerName, withVideo } = parsed.data;
    if (receiverId === userData.user.id) return json({ error: 'cannot_ring_self' }, 400);

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@example.com';
    if (!publicKey || !privateKey) return json({ error: 'push_not_configured' }, 503);

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: devices, error: devicesError } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', receiverId);

    if (devicesError) return json({ error: devicesError.message }, 500);
    if (!devices || devices.length === 0) return json({ delivered: 0, reason: 'no_devices' });

    const payload = JSON.stringify({
      title: `${callerName ?? 'Someone'} is calling`,
      body: withVideo ? 'Incoming video call' : 'Incoming audio call',
      url: '/calls',
      tag: 'mmora-call',
    });

    let delivered = 0;
    const stale: string[] = [];

    for (const device of devices) {
      try {
        await webpush.sendNotification(
          { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
          payload,
          { TTL: 45, urgency: 'high' },
        );
        delivered += 1;
      } catch (pushError) {
        const status = (pushError as { statusCode?: number }).statusCode;
        console.error(`[zoe-call-push] push failed [${status}]`, (pushError as Error).message);
        if (status === 404 || status === 410) stale.push(device.id);
      }
    }

    if (stale.length > 0) await admin.from('push_subscriptions').delete().in('id', stale);

    return json({ delivered, removed: stale.length });
  } catch (error) {
    console.error('[zoe-call-push] failed', error);
    return json({ error: (error as Error).message }, 500);
  }
});
