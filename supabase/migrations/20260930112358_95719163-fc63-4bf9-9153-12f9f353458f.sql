-- lovable-cron-fallback-reviewed: time-based reminder delivery; 15-min max delay
INSERT INTO public.edge_cron_tokens(name, token) VALUES ('check-reminders', encode(extensions.gen_random_bytes(32),'hex')) ON CONFLICT (name) DO NOTHING;
SELECT cron.schedule('check-reminders', '*/15 * * * *', $$SELECT net.http_post(
  url := 'https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/check-reminders',
  headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select token from public.edge_cron_tokens where name='check-reminders')),
  body := '{"source":"cron"}'::jsonb)$$);