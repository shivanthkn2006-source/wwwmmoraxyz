-- Fix the cron job with invalid JSON syntax
-- First, unschedule the broken job
SELECT cron.unschedule(2);

-- Recreate with proper JSON formatting (no string concatenation)
SELECT cron.schedule(
  'zoe-sovereign-heartbeat',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gpxuuydvlnuajqkroobp.supabase.co/functions/v1/zoe-sovereign-heartbeat',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweHV1eWR2bG51YWpxa3Jvb2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzkyODEsImV4cCI6MjA3NTA1NTI4MX0.UhnjhgaPa4dXfJg66Rz9QzoyyDyS7xInTO5e2mqwEKo"}'::jsonb,
    body := '{"mode": "scheduled"}'::jsonb
  ) AS request_id;
  $$
);