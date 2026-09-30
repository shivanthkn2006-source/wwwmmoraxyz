INSERT INTO public.edge_cron_tokens (name, token)
SELECT n, encode(extensions.gen_random_bytes(32),'hex') FROM unnest(array['dhf-video-dispatch','uptime-monitor','zoe-motivation']) n
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE j record; fn text;
BEGIN
  FOR j IN SELECT jobid, jobname, command FROM cron.job WHERE jobname IN ('dhf-video-dispatch','uptime-monitor','zoe-motivation-hourly') LOOP
    fn := CASE j.jobname WHEN 'zoe-motivation-hourly' THEN 'zoe-motivation' ELSE j.jobname END;
    PERFORM cron.alter_job(j.jobid, command := format($c$SELECT net.http_post(
      url := 'https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/%s',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select token from public.edge_cron_tokens where name=%L)),
      body := %L::jsonb)$c$, fn, fn, CASE WHEN fn='zoe-motivation' THEN '{"action":"run"}' ELSE '{}' END));
  END LOOP;
END $$;