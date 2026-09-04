SELECT cron.schedule(
  'zoe-synthetic-crawler-nightly',
  '50 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/zoe-synthetic-crawler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-crawler-secret', coalesce(current_setting('app.settings.crawler_secret', true), '')
    ),
    body := '{"trigger":"cron"}'::jsonb
  );
  $$
);