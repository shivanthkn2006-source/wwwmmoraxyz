-- Secure the materialized view by revoking public API access
-- The leaderboard_stats materialized view should not be directly queryable via the API
REVOKE ALL ON public.leaderboard_stats FROM anon, authenticated;

-- Create a function to safely access leaderboard data
CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  username text,
  profile_photo_url text,
  total_points integer,
  current_tier text,
  badge_count bigint,
  completed_achievements bigint,
  features_discovered bigint,
  challenge_points bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refresh materialized view first
  REFRESH MATERIALIZED VIEW public.leaderboard_stats;
  
  -- Return leaderboard data
  RETURN QUERY
  SELECT 
    ls.user_id,
    ls.display_name,
    ls.username,
    ls.profile_photo_url,
    ls.total_points,
    ls.current_tier,
    ls.badge_count,
    ls.completed_achievements,
    ls.features_discovered,
    ls.challenge_points
  FROM public.leaderboard_stats ls
  ORDER BY ls.total_points DESC
  LIMIT limit_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_leaderboard(INTEGER) TO authenticated;

-- Add comment explaining the security model
COMMENT ON FUNCTION public.get_leaderboard(INTEGER) IS 
'Safely retrieves leaderboard data without exposing the materialized view directly to the API. 
Refreshes the view before returning data to ensure freshness.';