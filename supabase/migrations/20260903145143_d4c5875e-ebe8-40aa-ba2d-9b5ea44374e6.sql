-- lovable-cron-fallback-reviewed: 288 runs/day while a backlog exists, then it removes itself; reason: 700+ queued items must be embedded through an edge function (HTTP), the job self-unschedules the moment the queue drains, and an hourly backstop handles steady-state.
CREATE OR REPLACE FUNCTION public.zoe_drain_search_index()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  pending_count INT;
BEGIN
  SELECT count(*) INTO pending_count
  FROM public.zoe_search_index_queue
  WHERE status IN ('pending', 'failed') AND available_at <= now();

  IF pending_count = 0 THEN
    -- Nothing to do: stop the fast catch-up sweeper until it is armed again.
    PERFORM cron.unschedule('zoe-search-index-catchup')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'zoe-search-index-catchup');
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/zoe-search-indexer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', current_setting('app.settings.anon_key', true),
      'x-index-drain-secret', current_setting('app.settings.zoe_index_drain_secret', true)
    ),
    body := jsonb_build_object('limit', 25)
  );
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.zoe_drain_search_index() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zoe_drain_search_index() TO service_role;