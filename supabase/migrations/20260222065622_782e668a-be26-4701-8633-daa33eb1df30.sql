
-- Dedup index using only immutable functions
CREATE INDEX IF NOT EXISTS idx_zoe_infinity_messages_dedup 
ON zoe_infinity_messages (user_id, role, md5(content));

-- Create conversation_sessions table for organizing messages into sessions
CREATE TABLE IF NOT EXISTS public.zoe_infinity_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  summary TEXT,
  topics TEXT[],
  emotional_arc TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.zoe_infinity_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.zoe_infinity_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.zoe_infinity_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.zoe_infinity_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Add session_id to messages for grouping (nullable for backward compat)
ALTER TABLE public.zoe_infinity_messages 
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.zoe_infinity_sessions(id);

-- Index for fast session-based queries
CREATE INDEX IF NOT EXISTS idx_zoe_infinity_messages_session 
ON zoe_infinity_messages (session_id) WHERE session_id IS NOT NULL;

-- Index for fast user history loading
CREATE INDEX IF NOT EXISTS idx_zoe_infinity_messages_user_created 
ON zoe_infinity_messages (user_id, created_at DESC);
