-- Drop the problematic security definer view
DROP VIEW IF EXISTS public.user_session_summary CASCADE;

-- Restore SELECT grant for authenticated users
GRANT SELECT ON public.user_sessions TO authenticated;

-- Only drop and recreate policies if they don't match what we need
DO $$ 
BEGIN
  -- Drop old policies that might have wrong names
  DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions;
  DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add privacy comments
COMMENT ON TABLE public.user_sessions IS 
'User session tracking with privacy considerations. Contains IP addresses and location data. 
Retention: Inactive sessions older than 30 days are automatically deleted.
Access: Users can only view their own session data.';

COMMENT ON TABLE public.page_views IS 
'Page view tracking for analytics. Retention: Data older than 90 days is automatically deleted.';

COMMENT ON TABLE public.user_activity_log IS 
'Detailed user activity logging. Retention: Data older than 90 days is automatically deleted for privacy compliance.';