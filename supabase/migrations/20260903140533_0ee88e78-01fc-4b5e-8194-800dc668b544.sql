REVOKE ALL ON FUNCTION public.prune_platform_telemetry() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_platform_telemetry() TO service_role, postgres;