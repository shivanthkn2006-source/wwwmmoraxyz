CREATE TABLE IF NOT EXISTS public.edge_cron_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.edge_cron_tokens FROM anon, authenticated;
GRANT ALL ON public.edge_cron_tokens TO service_role;
ALTER TABLE public.edge_cron_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.edge_cron_tokens(name) VALUES ('astro-dispatch') ON CONFLICT DO NOTHING;

DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobid, jobname, schedule FROM cron.job WHERE jobname IN ('astro-dispatch-quarter-hourly','astro-audit-nightly') LOOP
    PERFORM cron.alter_job(j.jobid, command := CASE WHEN j.jobname = 'astro-dispatch-quarter-hourly' THEN
      $c$select net.http_post(
        url := 'https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/astro-dispatch',
        headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select token from public.edge_cron_tokens where name='astro-dispatch')),
        body := '{"action":"run","source":"cron"}'::jsonb)$c$
    ELSE
      $c$select net.http_post(
        url := 'https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/astro-dispatch',
        headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select token from public.edge_cron_tokens where name='astro-dispatch')),
        body := concat('{"action":"audit","source":"nightly","correlationId":"cron_', to_char(now(),'YYYYMMDDHH24MISS'), '"}')::jsonb)$c$
    END);
  END LOOP;
END $$;