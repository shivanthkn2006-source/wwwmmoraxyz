-- Drop the existing view
DROP VIEW IF EXISTS public.trending_searches;

-- Recreate with SECURITY INVOKER to fix security issue
CREATE OR REPLACE VIEW public.trending_searches 
WITH (security_invoker = true)
AS
SELECT 
  search_query,
  COUNT(*) as search_count,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as last_searched_at
FROM public.search_history
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND search_query IS NOT NULL
  AND search_query != ''
GROUP BY search_query
ORDER BY search_count DESC
LIMIT 20;