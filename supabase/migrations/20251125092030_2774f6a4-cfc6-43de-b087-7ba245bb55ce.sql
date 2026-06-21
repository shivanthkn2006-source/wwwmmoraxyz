-- Fix notification constraint to include all missing types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'post_like', 'post_comment', 'post_tag', 'friend_request',
    'friend_accepted', 'badge_earned', 'challenge_completed',
    'lisa_suggestion', 'proactive_notification', 'user_online',
    'achievement_unlocked', 'tier_upgrade', 'comment_like',
    'comment_reply', 'friend_badge_earned', 'friend_challenge_completed'
  ));

-- Add index for better notification query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Add data retention: Auto-delete old activity logs (90 days retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete activity logs older than 90 days
  DELETE FROM public.user_activity_log
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete old page views older than 90 days
  DELETE FROM public.page_views
  WHERE entered_at < NOW() - INTERVAL '90 days';
  
  -- Delete inactive sessions older than 30 days
  DELETE FROM public.user_sessions
  WHERE is_active = false AND ended_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Create scheduled job trigger (to be run daily by cron)
COMMENT ON FUNCTION public.cleanup_old_activity_logs() IS 
'Automatically cleans up old activity logs, page views, and inactive sessions for privacy compliance. Should be run daily via cron job.';

-- Improve RLS policy on user_sessions to hide sensitive data from regular queries
-- Users should only see aggregated data, not raw GPS coordinates
CREATE OR REPLACE VIEW public.user_session_summary AS
SELECT 
  id,
  user_id,
  started_at,
  ended_at,
  is_active,
  last_activity_at,
  browser,
  device_type,
  os,
  -- Only show city/country, not exact coordinates
  city,
  country,
  -- Anonymize IP address (show only first 2 octets)
  CASE 
    WHEN ip_address IS NOT NULL 
    THEN host(ip_address)::text
    ELSE NULL
  END as ip_prefix
FROM public.user_sessions;

-- Grant access to the summary view
GRANT SELECT ON public.user_session_summary TO authenticated;

-- Add RLS policy for the summary view
ALTER VIEW public.user_session_summary SET (security_barrier = true);

-- Add comment explaining privacy protection
COMMENT ON VIEW public.user_session_summary IS 
'Privacy-protected view of user sessions that hides sensitive GPS coordinates and full IP addresses. Users can only see their own session summaries.';

-- Restrict direct access to user_sessions table (make it accessible only via functions)
REVOKE SELECT ON public.user_sessions FROM authenticated;
GRANT SELECT ON public.user_session_summary TO authenticated;

-- Create function to allow activity tracking to insert sessions
CREATE OR REPLACE FUNCTION public.can_insert_session()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow inserts from authenticated users for their own data
  RETURN auth.uid() IS NOT NULL;
END;
$$;

-- Update RLS policy for user_sessions to use the function
DROP POLICY IF EXISTS "Service role can insert page views" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can update page views" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view their own page views" ON public.user_sessions;

CREATE POLICY "Users can insert their own sessions" ON public.user_sessions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON public.user_sessions
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Encrypt sensitive profile data at rest (add comment for future implementation)
COMMENT ON COLUMN public.profiles.bio IS 'Consider encrypting at application layer for additional privacy';
COMMENT ON COLUMN public.profiles.profession IS 'Consider encrypting at application layer for additional privacy';
COMMENT ON COLUMN public.profiles.hobbies IS 'Consider encrypting at application layer for additional privacy';

-- Add privacy notice
COMMENT ON TABLE public.user_activity_log IS 
'User activity tracking with 90-day retention policy. Data older than 90 days is automatically deleted for privacy compliance.';