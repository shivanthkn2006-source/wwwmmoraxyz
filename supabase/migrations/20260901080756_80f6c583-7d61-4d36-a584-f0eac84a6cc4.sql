GRANT SELECT ON public.sentinel_sessions TO authenticated;
GRANT SELECT ON public.sentinel_threat_events TO authenticated;
GRANT SELECT, UPDATE ON public.sentinel_blocks TO authenticated;
GRANT ALL ON public.sentinel_sessions TO service_role;
GRANT ALL ON public.sentinel_threat_events TO service_role;
GRANT ALL ON public.sentinel_blocks TO service_role;