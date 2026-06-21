
-- Fix SECURITY DEFINER view issue on admin_session_overview
-- Recreate with SECURITY INVOKER to use querying user's permissions
DROP VIEW IF EXISTS public.admin_session_overview;

CREATE VIEW public.admin_session_overview
WITH (security_invoker = true)
AS
SELECT 
  id, user_id, browser, device_type, os,
  country, region, city,
  started_at, last_activity_at, ended_at, is_active, created_at
FROM public.user_sessions;
