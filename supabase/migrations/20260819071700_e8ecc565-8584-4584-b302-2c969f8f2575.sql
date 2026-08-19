GRANT SELECT ON public.astro_predictions TO authenticated;
GRANT ALL ON public.astro_predictions TO service_role;
GRANT SELECT ON public.astro_feed_posts TO authenticated;
GRANT ALL ON public.astro_feed_posts TO service_role;
GRANT SELECT ON public.astro_profiles TO authenticated;
GRANT ALL ON public.astro_profiles TO service_role;
GRANT SELECT, INSERT ON public.astro_mood_logs TO authenticated;
GRANT ALL ON public.astro_mood_logs TO service_role;
GRANT ALL ON public.astro_dispatch_state TO service_role;