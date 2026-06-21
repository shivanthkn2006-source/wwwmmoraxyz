
-- Change 5: Performance indexes for 500-user scaling
CREATE INDEX IF NOT EXISTS idx_zoe_messages_user_created 
  ON zoe_infinity_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_zoe_memories_user 
  ON zoe_infinity_memories(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_zoe_conversations_user 
  ON zoe_infinity_conversations(user_id, created_at DESC);

-- Change 3: Response cache table
CREATE TABLE IF NOT EXISTS public.zoe_response_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  hit_count INTEGER NOT NULL DEFAULT 0
);

-- Index for fast cache lookups
CREATE INDEX idx_zoe_cache_lookup ON public.zoe_response_cache(user_id, query_hash);
CREATE INDEX idx_zoe_cache_expiry ON public.zoe_response_cache(expires_at);

-- RLS
ALTER TABLE public.zoe_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cache"
  ON public.zoe_response_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cache"
  ON public.zoe_response_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cache"
  ON public.zoe_response_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cache"
  ON public.zoe_response_cache FOR DELETE
  USING (auth.uid() = user_id);

-- Cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.zoe_response_cache
  WHERE expires_at < now();
END;
$$;
