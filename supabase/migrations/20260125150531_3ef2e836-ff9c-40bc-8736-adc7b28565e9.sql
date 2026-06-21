-- Fix cron jobs with invalid JSON body concatenation
-- Problem: body:='{"trigger": "cron", "timestamp": "' || now()::text || '"}'::jsonb fails because 
-- string concatenation happens BEFORE casting to jsonb, but now()::text returns timestamp with spaces

-- Delete and recreate job 5 (zoe-genesis-cron at 5,10,15,20 hours)
SELECT cron.unschedule(5);

SELECT cron.schedule(
  'zoe-genesis-cron',
  '0 5,10,15,20 * * *',
  $$
  SELECT net.http_post(
    url:='https://gpxuuydvlnuajqkroobp.supabase.co/functions/v1/zoe-genesis-cron',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweHV1eWR2bG51YWpxa3Jvb2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzkyODEsImV4cCI6MjA3NTA1NTI4MX0.UhnjhgaPa4dXfJg66Rz9QzoyyDyS7xInTO5e2mqwEKo"}'::jsonb,
    body:='{"trigger": "cron", "source": "pg_cron"}'::jsonb
  ) as request_id;
  $$
);

-- Delete and recreate job 6 (zoe-genesis-cron-batch at 4 AM)
SELECT cron.unschedule(6);

SELECT cron.schedule(
  'zoe-genesis-cron-batch',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url:='https://gpxuuydvlnuajqkroobp.supabase.co/functions/v1/zoe-genesis-cron-batch',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweHV1eWR2bG51YWpxa3Jvb2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzkyODEsImV4cCI6MjA3NTA1NTI4MX0.UhnjhgaPa4dXfJg66Rz9QzoyyDyS7xInTO5e2mqwEKo"}'::jsonb,
    body:='{"batchMode": true, "trigger": "nightly_cron"}'::jsonb
  ) as request_id;
  $$
);

-- Delete and recreate job 8 (storage-cleaner at 3 AM)
SELECT cron.unschedule(8);

SELECT cron.schedule(
  'storage-cleaner',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url:='https://gpxuuydvlnuajqkroobp.supabase.co/functions/v1/storage-cleaner',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweHV1eWR2bG51YWpxa3Jvb2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzkyODEsImV4cCI6MjA3NTA1NTI4MX0.UhnjhgaPa4dXfJg66Rz9QzoyyDyS7xInTO5e2mqwEKo"}'::jsonb,
    body:='{"trigger": "cron", "source": "pg_cron"}'::jsonb
  ) AS request_id;
  $$
);