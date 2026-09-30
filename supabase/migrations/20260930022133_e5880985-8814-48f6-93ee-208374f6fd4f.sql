INSERT INTO public.edge_cron_tokens(name) VALUES ('growth-dispatch') ON CONFLICT DO NOTHING;
DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobid, jobname FROM cron.job WHERE jobname IN ('growth-dispatch','growth-reconcile') LOOP
    PERFORM cron.alter_job(j.jobid, command := format($c$SELECT net.http_post(
      url := 'https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/growth-dispatch',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select token from public.edge_cron_tokens where name='growth-dispatch')),
      body := '{"action": "%s", "source": "pg_cron"}'::jsonb) AS request_id$c$,
      CASE WHEN j.jobname = 'growth-dispatch' THEN 'run' ELSE 'reconcile' END));
  END LOOP;
END $$;