CREATE TABLE IF NOT EXISTS public.dhf_heartbeats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  device_signature text,
  app_version text DEFAULT '1.0.0',
  metadata jsonb DEFAULT '{}'::jsonb
);

GRANT INSERT, SELECT ON public.dhf_heartbeats TO authenticated;
GRANT ALL ON public.dhf_heartbeats TO service_role;

ALTER TABLE public.dhf_heartbeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_insert_own_heartbeats" ON public.dhf_heartbeats;
CREATE POLICY "users_insert_own_heartbeats"
  ON public.dhf_heartbeats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_read_own_heartbeats" ON public.dhf_heartbeats;
CREATE POLICY "users_read_own_heartbeats"
  ON public.dhf_heartbeats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_dhf_heartbeats_user_timestamp
  ON public.dhf_heartbeats (user_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS public.zoe_adaptive_learning (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  pattern_type text NOT NULL DEFAULT 'general',
  pattern_key text NOT NULL,
  pattern_value text NOT NULL,
  confidence_score numeric NOT NULL DEFAULT 0.5,
  usage_count integer NOT NULL DEFAULT 1,
  source text DEFAULT 'conversation',
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, pattern_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoe_adaptive_learning TO authenticated;
GRANT ALL ON public.zoe_adaptive_learning TO service_role;

ALTER TABLE public.zoe_adaptive_learning ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own learning data" ON public.zoe_adaptive_learning;
CREATE POLICY "Users can view own learning data"
  ON public.zoe_adaptive_learning
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own learning data" ON public.zoe_adaptive_learning;
CREATE POLICY "Users can insert own learning data"
  ON public.zoe_adaptive_learning
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own learning data" ON public.zoe_adaptive_learning;
CREATE POLICY "Users can update own learning data"
  ON public.zoe_adaptive_learning
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own learning data" ON public.zoe_adaptive_learning;
CREATE POLICY "Users can delete own learning data"
  ON public.zoe_adaptive_learning
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_zoe_adaptive_learning_user
  ON public.zoe_adaptive_learning (user_id, pattern_type, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_zoe_adaptive_learning_key
  ON public.zoe_adaptive_learning (user_id, pattern_key);

DROP TRIGGER IF EXISTS update_zoe_adaptive_learning_updated_at ON public.zoe_adaptive_learning;
CREATE TRIGGER update_zoe_adaptive_learning_updated_at
  BEFORE UPDATE ON public.zoe_adaptive_learning
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.zoe_infinity_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_start timestamp with time zone NOT NULL DEFAULT now(),
  session_end timestamp with time zone,
  message_count integer DEFAULT 0,
  summary text,
  topics text[],
  emotional_arc text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.zoe_infinity_sessions TO authenticated;
GRANT ALL ON public.zoe_infinity_sessions TO service_role;

ALTER TABLE public.zoe_infinity_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON public.zoe_infinity_sessions;
CREATE POLICY "Users can view own sessions"
  ON public.zoe_infinity_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.zoe_infinity_sessions;
CREATE POLICY "Users can insert own sessions"
  ON public.zoe_infinity_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.zoe_infinity_sessions;
CREATE POLICY "Users can update own sessions"
  ON public.zoe_infinity_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_zoe_infinity_sessions_user_start
  ON public.zoe_infinity_sessions (user_id, session_start DESC);

ALTER TABLE public.zoe_infinity_messages
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.zoe_infinity_sessions(id);

CREATE INDEX IF NOT EXISTS idx_zoe_infinity_messages_session
  ON public.zoe_infinity_messages (session_id) WHERE session_id IS NOT NULL;

ALTER TABLE public.dhf_soul_codex
  ADD COLUMN IF NOT EXISTS voice_preference text,
  ADD COLUMN IF NOT EXISTS genesis_completed boolean DEFAULT false;