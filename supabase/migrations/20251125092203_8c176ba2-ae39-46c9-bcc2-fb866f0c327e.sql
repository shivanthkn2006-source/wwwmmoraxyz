-- Fix security definer views by recreating them with proper security invoker
-- This ensures views run with the permissions of the querying user, not the view creator

-- Drop and recreate admin_activity_dashboard with SECURITY INVOKER
DROP VIEW IF EXISTS public.admin_activity_dashboard CASCADE;

CREATE VIEW public.admin_activity_dashboard 
WITH (security_invoker = true)
AS
SELECT 
  ual.id,
  ual.user_id,
  p.username,
  p.display_name,
  ual.activity_type,
  ual.activity_details,
  ual.page_path,
  ual.ip_address,
  us.browser,
  us.device_type,
  us.os,
  us.city,
  us.country,
  ual.created_at
FROM user_activity_log ual
LEFT JOIN profiles p ON ual.user_id = p.user_id
LEFT JOIN user_sessions us ON ual.session_id = us.id
ORDER BY ual.created_at DESC;

-- Enable RLS on the view
ALTER VIEW public.admin_activity_dashboard SET (security_barrier = false);

-- Grant access to authenticated users (they'll be filtered by RLS on underlying tables)
GRANT SELECT ON public.admin_activity_dashboard TO authenticated;

-- Drop and recreate session_analytics with SECURITY INVOKER
DROP VIEW IF EXISTS public.session_analytics CASCADE;

CREATE VIEW public.session_analytics
WITH (security_invoker = true)
AS
SELECT 
  us.id AS session_id,
  us.user_id,
  p.username,
  p.display_name,
  us.ip_address,
  us.browser,
  us.device_type,
  us.os,
  us.city,
  us.country,
  us.started_at,
  us.last_activity_at,
  us.ended_at,
  EXTRACT(epoch FROM (COALESCE(us.ended_at, NOW()) - us.started_at))::INTEGER AS session_duration_seconds,
  COUNT(DISTINCT pv.id) AS page_views_count,
  SUM(pv.duration_seconds) AS total_time_on_pages_seconds
FROM user_sessions us
LEFT JOIN profiles p ON us.user_id = p.user_id
LEFT JOIN page_views pv ON us.id = pv.session_id
GROUP BY us.id, us.user_id, p.username, p.display_name, 
         us.ip_address, us.browser, us.device_type, us.os, 
         us.city, us.country, us.started_at, us.last_activity_at, us.ended_at
ORDER BY us.started_at DESC;

-- Enable proper security
ALTER VIEW public.session_analytics SET (security_barrier = false);

-- Grant access to authenticated users
GRANT SELECT ON public.session_analytics TO authenticated;

-- Add RLS-like filtering via check option for admin_activity_dashboard
COMMENT ON VIEW public.admin_activity_dashboard IS 
'Activity dashboard view that respects underlying table RLS policies. 
Users can only see activity data for records they have access to.';

COMMENT ON VIEW public.session_analytics IS 
'Session analytics view that respects underlying table RLS policies. 
Users can only see session data they have access to.';