SELECT cron.unschedule('growth-reconcile') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'growth-reconcile');

SELECT cron.schedule(
  'growth-reconcile',
  '20 */6 * * *',
  $$
  SELECT net.http_post(
    url:='https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/growth-dispatch',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dWZpcWtlb3l2cWFzaW1jbWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjU3MDQsImV4cCI6MjA4NjI0MTcwNH0.NEdVnsGHar8SmxQt1jofMFd9r65kkDuadYPXRQjtHow"}'::jsonb,
    body:='{"action": "reconcile", "source": "pg_cron"}'::jsonb
  ) AS request_id;
  $$
);