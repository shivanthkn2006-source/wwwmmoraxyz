ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS email_digest_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_digest_hour smallint NOT NULL DEFAULT 8;

CREATE TABLE IF NOT EXISTS public.zoe_cache (
  cache_key text PRIMARY KEY,
  scope text NOT NULL DEFAULT 'global',
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.zoe_cache TO service_role;
ALTER TABLE public.zoe_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "zoe_cache service only" ON public.zoe_cache;
CREATE POLICY "zoe_cache service only" ON public.zoe_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS zoe_cache_expires_idx ON public.zoe_cache (expires_at);

CREATE TABLE IF NOT EXISTS public.zoe_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  to_email text NOT NULL,
  kind text NOT NULL,
  subject text,
  message_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.zoe_email_log TO authenticated;
GRANT ALL ON public.zoe_email_log TO service_role;
ALTER TABLE public.zoe_email_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own email log" ON public.zoe_email_log;
CREATE POLICY "own email log" ON public.zoe_email_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS zoe_email_log_user_idx ON public.zoe_email_log (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.zoe_life_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  fact_key text NOT NULL,
  fact_value text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.6,
  source text NOT NULL DEFAULT 'conversation',
  source_id text,
  occurred_on date,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, fact_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoe_life_context TO authenticated;
GRANT ALL ON public.zoe_life_context TO service_role;
ALTER TABLE public.zoe_life_context ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own life context" ON public.zoe_life_context;
CREATE POLICY "own life context" ON public.zoe_life_context FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS zoe_life_context_user_idx ON public.zoe_life_context (user_id, category, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS posts_created_at_desc_idx ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_user_created_idx ON public.posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feed_events_user_created_idx ON public.feed_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_companion_messages_user_created_idx ON public.ai_companion_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS online_sessions_heartbeat_idx ON public.online_sessions (last_heartbeat DESC);