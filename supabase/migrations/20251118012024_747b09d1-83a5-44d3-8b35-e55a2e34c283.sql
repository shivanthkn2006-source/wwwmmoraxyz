-- Create saved_searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  search_name TEXT NOT NULL,
  search_query TEXT NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_saved_searches_user_id ON public.saved_searches(user_id);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own saved searches"
  ON public.saved_searches
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved searches"
  ON public.saved_searches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches"
  ON public.saved_searches
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches"
  ON public.saved_searches
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trending_searches view (aggregates last 24h searches)
CREATE OR REPLACE VIEW public.trending_searches AS
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

-- Grant access to the view
GRANT SELECT ON public.trending_searches TO authenticated;