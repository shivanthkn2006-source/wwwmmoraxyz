-- Fix notification constraint to include all types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'post_like', 'post_comment', 'post_tag', 'friend_request',
    'friend_accepted', 'badge_earned', 'challenge_completed',
    'lisa_suggestion', 'proactive_notification', 'user_online',
    'achievement_unlocked', 'tier_upgrade', 'comment_like',
    'comment_reply', 'friend_badge_earned', 'friend_challenge_completed'
  ));

-- Create user sessions table for tracking login sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  browser TEXT,
  browser_version TEXT,
  device_type TEXT,
  device_vendor TEXT,
  device_model TEXT,
  os TEXT,
  os_version TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  timezone TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create page views table for tracking page navigation
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user activity log for detailed tracking
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_details JSONB,
  page_path TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_session_id ON user_activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at DESC);

-- Enable RLS on all tracking tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_sessions
CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update sessions"
  ON user_sessions FOR UPDATE
  USING (true);

-- RLS policies for page_views
CREATE POLICY "Users can view their own page views"
  ON page_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert page views"
  ON page_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update page views"
  ON page_views FOR UPDATE
  USING (true);

-- RLS policies for user_activity_log
CREATE POLICY "Users can view their own activity logs"
  ON user_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert activity logs"
  ON user_activity_log FOR INSERT
  WITH CHECK (true);

-- Create view for easy backend log viewing
CREATE OR REPLACE VIEW admin_activity_dashboard AS
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

-- Create view for session analytics
CREATE OR REPLACE VIEW session_analytics AS
SELECT 
  us.id as session_id,
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
  EXTRACT(EPOCH FROM (COALESCE(us.ended_at, NOW()) - us.started_at))::INTEGER as session_duration_seconds,
  COUNT(DISTINCT pv.id) as page_views_count,
  SUM(pv.duration_seconds) as total_time_on_pages_seconds
FROM user_sessions us
LEFT JOIN profiles p ON us.user_id = p.user_id
LEFT JOIN page_views pv ON us.id = pv.session_id
GROUP BY us.id, us.user_id, p.username, p.display_name, us.ip_address, 
         us.browser, us.device_type, us.os, us.city, us.country,
         us.started_at, us.last_activity_at, us.ended_at
ORDER BY us.started_at DESC;

-- Create function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(p_user_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  total_sessions INTEGER,
  total_page_views INTEGER,
  total_time_spent_seconds INTEGER,
  unique_pages_visited INTEGER,
  most_visited_page TEXT,
  most_used_device TEXT,
  most_used_browser TEXT,
  countries_visited TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT us.id)::INTEGER as total_sessions,
    COUNT(DISTINCT pv.id)::INTEGER as total_page_views,
    SUM(pv.duration_seconds)::INTEGER as total_time_spent_seconds,
    COUNT(DISTINCT pv.page_path)::INTEGER as unique_pages_visited,
    (SELECT page_path FROM page_views WHERE user_id = p_user_id 
     AND entered_at >= NOW() - (p_days || ' days')::INTERVAL
     GROUP BY page_path ORDER BY COUNT(*) DESC LIMIT 1) as most_visited_page,
    (SELECT device_type FROM user_sessions WHERE user_id = p_user_id 
     AND started_at >= NOW() - (p_days || ' days')::INTERVAL
     GROUP BY device_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device,
    (SELECT browser FROM user_sessions WHERE user_id = p_user_id 
     AND started_at >= NOW() - (p_days || ' days')::INTERVAL
     GROUP BY browser ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
    ARRAY_AGG(DISTINCT us.country) FILTER (WHERE us.country IS NOT NULL) as countries_visited
  FROM user_sessions us
  LEFT JOIN page_views pv ON us.id = pv.session_id
  WHERE us.user_id = p_user_id
    AND us.started_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$;