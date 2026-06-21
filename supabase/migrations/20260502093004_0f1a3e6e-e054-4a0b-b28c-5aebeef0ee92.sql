-- Zoe Infinity Quota Sovereign — admin-only quota tracking
-- Hard isolation: namespaced zoe_infinity_quota_*

CREATE TABLE IF NOT EXISTS public.zoe_infinity_quota_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'team', 'enterprise')),
  db_bytes_used BIGINT NOT NULL DEFAULT 0,
  db_bytes_limit BIGINT NOT NULL DEFAULT 524288000, -- 500 MB
  storage_bytes_used BIGINT NOT NULL DEFAULT 0,
  storage_bytes_limit BIGINT NOT NULL DEFAULT 1073741824, -- 1 GB
  mau_count INTEGER NOT NULL DEFAULT 0,
  mau_limit INTEGER NOT NULL DEFAULT 50000,
  egress_bytes_month BIGINT NOT NULL DEFAULT 0,
  egress_bytes_limit BIGINT NOT NULL DEFAULT 5368709120, -- 5 GB
  db_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  storage_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  mau_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  egress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  throttle_active BOOLEAN NOT NULL DEFAULT false,
  throttle_level TEXT NOT NULL DEFAULT 'none' CHECK (throttle_level IN ('none','cache_off','memory_light','hard')),
  last_error TEXT,
  last_checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Always exactly ONE row (singleton state). Use a unique constant for that.
CREATE UNIQUE INDEX IF NOT EXISTS zoe_infinity_quota_state_singleton
  ON public.zoe_infinity_quota_state ((true));

CREATE TABLE IF NOT EXISTS public.zoe_infinity_quota_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  db_bytes_used BIGINT NOT NULL,
  storage_bytes_used BIGINT NOT NULL,
  mau_count INTEGER NOT NULL,
  egress_bytes_month BIGINT NOT NULL,
  db_percent NUMERIC(5,2) NOT NULL,
  storage_percent NUMERIC(5,2) NOT NULL,
  throttle_level TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zoe_infinity_quota_history_recorded_at
  ON public.zoe_infinity_quota_history (recorded_at DESC);

-- Enable RLS
ALTER TABLE public.zoe_infinity_quota_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_infinity_quota_history ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT (uses existing is_root_admin function)
CREATE POLICY "Root admins can view quota state"
  ON public.zoe_infinity_quota_state
  FOR SELECT
  TO authenticated
  USING (public.is_root_admin(auth.uid()));

CREATE POLICY "Root admins can view quota history"
  ON public.zoe_infinity_quota_history
  FOR SELECT
  TO authenticated
  USING (public.is_root_admin(auth.uid()));

-- No user-facing INSERT/UPDATE/DELETE policies — only service role can write.
-- Service role bypasses RLS automatically.

-- Trigger for updated_at on state
CREATE TRIGGER update_zoe_infinity_quota_state_updated_at
  BEFORE UPDATE ON public.zoe_infinity_quota_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a single initial row so the UI never shows empty
INSERT INTO public.zoe_infinity_quota_state (tier) VALUES ('free')
ON CONFLICT DO NOTHING;