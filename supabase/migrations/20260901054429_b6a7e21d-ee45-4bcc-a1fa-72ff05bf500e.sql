-- ============================================================
-- Telemetry retention: feed_diagnostics_log (187MB) and
-- platform_health_logs (136MB) were 323MB of the 513MB database.
-- These are debug/telemetry tables, not user content.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prune_platform_telemetry()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d_feed bigint := 0;
  d_health bigint := 0;
  d_behavior bigint := 0;
BEGIN
  DELETE FROM public.feed_diagnostics_log WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS d_feed = ROW_COUNT;

  DELETE FROM public.platform_health_logs WHERE created_at < now() - interval '14 days';
  GET DIAGNOSTICS d_health = ROW_COUNT;

  DELETE FROM public.behavioral_events WHERE created_at < now() - interval '60 days';
  GET DIAGNOSTICS d_behavior = ROW_COUNT;

  RETURN jsonb_build_object(
    'feed_diagnostics_log', d_feed,
    'platform_health_logs', d_health,
    'behavioral_events', d_behavior,
    'pruned_at', now()
  );
END;
$$;

-- Internal maintenance only: never callable from the Data API.
REVOKE ALL ON FUNCTION public.prune_platform_telemetry() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prune_platform_telemetry() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_platform_telemetry() TO service_role;

-- Reclaim the space that has already accumulated.
SELECT public.prune_platform_telemetry();

-- Nightly, so the tables can never grow back into the storage cap.
SELECT cron.unschedule('prune-platform-telemetry')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-platform-telemetry');

SELECT cron.schedule(
  'prune-platform-telemetry',
  '15 3 * * *',
  $cron$ SELECT public.prune_platform_telemetry(); $cron$
);