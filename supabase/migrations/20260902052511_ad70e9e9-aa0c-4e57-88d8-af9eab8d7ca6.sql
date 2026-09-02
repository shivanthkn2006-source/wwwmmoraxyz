SELECT cron.unschedule('dhf-link-health-nightly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dhf-link-health-nightly');

SELECT cron.schedule(
  'dhf-link-health-nightly',
  '35 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/dhf-link-health',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{"source":"cron"}'::jsonb
  );
  $$
);