SELECT cron.unschedule('dhf-compass-dispatch')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dhf-compass-dispatch');

SELECT cron.schedule(
  'dhf-compass-dispatch',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/dhf-compass-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
    ),
    body := '{"trigger":"cron","source":"pg_cron"}'::jsonb
  ) AS request_id;
  $$
);

ALTER TABLE public.dhf_daily_posts
  ALTER COLUMN powered_by_badge SET DEFAULT 'Powered by Zoe''s DHF';

UPDATE public.dhf_daily_posts
SET powered_by_badge = 'Powered by Zoe''s DHF'
WHERE powered_by_badge ILIKE '%Swiss%Ephemeris%';