CREATE OR REPLACE FUNCTION public.get_admin_operational_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role)
      THEN jsonb_build_object('authorized', false)
    ELSE jsonb_build_object(
      'authorized', true,
      'users', (SELECT count(*) FROM public.profiles),
      'active_sessions', (SELECT count(*) FROM public.online_sessions WHERE status = 'active' AND last_heartbeat >= now() - interval '2 minutes'),
      'recent_sessions', (SELECT count(*) FROM public.online_sessions WHERE last_heartbeat >= now() - interval '24 hours'),
      'activity_events', (SELECT count(*) FROM public.user_activity_log WHERE created_at >= now() - interval '24 hours'),
      'planner_events', (SELECT count(*) FROM public.important_dates WHERE date_value >= current_date),
      'active_reminders', (SELECT count(*) FROM public.reminders WHERE is_completed = false),
      'generated_at', now()
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_operational_metrics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_operational_metrics() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_operational_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_operational_metrics() TO service_role;