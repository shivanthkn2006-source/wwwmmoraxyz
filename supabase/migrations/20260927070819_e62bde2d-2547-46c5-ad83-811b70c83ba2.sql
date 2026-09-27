CREATE OR REPLACE FUNCTION public.recently_active_member_ids(p_days integer DEFAULT 5)
RETURNS TABLE(user_id uuid, last_active timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  WITH signals AS (
    SELECT s.user_id, max(coalesce(s.refreshed_at, s.updated_at, s.created_at)) AS seen FROM auth.sessions s GROUP BY s.user_id
    UNION ALL
    SELECT u.id, u.last_sign_in_at FROM auth.users u WHERE u.last_sign_in_at IS NOT NULL
    UNION ALL
    SELECT us.user_id, max(us.last_activity_at) FROM public.user_sessions us GROUP BY us.user_id
  )
  SELECT sg.user_id, max(sg.seen) AS last_active
  FROM signals sg
  WHERE sg.user_id IS NOT NULL
  GROUP BY sg.user_id
  HAVING max(sg.seen) >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 5), 30)))
$$;
REVOKE ALL ON FUNCTION public.recently_active_member_ids(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recently_active_member_ids(integer) TO service_role;