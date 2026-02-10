-- Create function to cleanup stale "active" sessions (older than 2 hours with no activity)
CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Mark sessions as inactive if:
  -- 1. They're marked active but have no activity in the last 2 hours
  -- 2. OR they were started more than 24 hours ago and never ended
  UPDATE user_sessions
  SET 
    is_active = false,
    ended_at = COALESCE(last_activity_at, started_at)
  WHERE is_active = true
    AND (
      -- No activity in 2 hours
      (last_activity_at IS NOT NULL AND last_activity_at < NOW() - INTERVAL '2 hours')
      OR
      -- No activity recorded and session is older than 2 hours
      (last_activity_at IS NULL AND started_at < NOW() - INTERVAL '2 hours')
      OR
      -- Session running for more than 24 hours (likely abandoned)
      (started_at < NOW() - INTERVAL '24 hours')
    );
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

-- Add index to improve cleanup query performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_cleanup 
ON user_sessions (is_active, last_activity_at, started_at) 
WHERE is_active = true;

-- Add index for session token lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_token 
ON user_sessions (session_token);

-- Add index for user session lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active 
ON user_sessions (user_id, is_active, started_at DESC) 
WHERE is_active = true;