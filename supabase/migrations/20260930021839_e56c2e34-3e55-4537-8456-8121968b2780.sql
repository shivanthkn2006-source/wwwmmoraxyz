INSERT INTO public.edge_cron_tokens(name) VALUES ('dhf-compass-dispatch'), ('dhf-link-health') ON CONFLICT DO NOTHING;
DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobid, jobname FROM cron.job WHERE jobname IN ('dhf-compass-dispatch','dhf-link-health-nightly') LOOP
    IF j.jobname = 'dhf-compass-dispatch' THEN
      PERFORM cron.alter_job(j.jobid, command := $c$SELECT net.http_post(
        url := 'https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/dhf-compass-dispatch',
        headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select token from public.edge_cron_tokens where name='dhf-compass-dispatch')),
        body := '{"trigger":"cron","source":"pg_cron"}'::jsonb) AS request_id$c$);
    ELSE
      PERFORM cron.alter_job(j.jobid, command := $c$SELECT net.http_post(
        url := 'https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/dhf-link-health',
        headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select token from public.edge_cron_tokens where name='dhf-link-health')),
        body := '{"source":"cron"}'::jsonb)$c$);
    END IF;
  END LOOP;
END $$;