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
  d_heartbeats bigint := 0;
  d_search bigint := 0;
  d_assets bigint := 0;
BEGIN
  DELETE FROM public.feed_diagnostics_log WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS d_feed = ROW_COUNT;

  -- Health snapshots are now sampled client-side; 7 days of history is ample
  -- for the admin panels and keeps the table from dominating the database.
  DELETE FROM public.platform_health_logs WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS d_health = ROW_COUNT;

  DELETE FROM public.behavioral_events WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS d_behavior = ROW_COUNT;

  DELETE FROM public.dhf_heartbeats WHERE "timestamp" < now() - interval '14 days';
  GET DIAGNOSTICS d_heartbeats = ROW_COUNT;

  DELETE FROM public.zoe_search_events WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS d_search = ROW_COUNT;

  DELETE FROM public.dhf_asset_logs WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS d_assets = ROW_COUNT;

  RETURN jsonb_build_object(
    'feed_diagnostics_log', d_feed,
    'platform_health_logs', d_health,
    'behavioral_events', d_behavior,
    'dhf_heartbeats', d_heartbeats,
    'zoe_search_events', d_search,
    'dhf_asset_logs', d_assets,
    'pruned_at', now()
  );
END;
$$;