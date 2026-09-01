-- ═══ SENTINEL: admin-only threat surveillance ═══════════════════════════════
CREATE TABLE IF NOT EXISTS public.sentinel_threat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_token text,
  threat_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  ip_address text,
  country text,
  region text,
  city text,
  device_fingerprint text,
  device jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_url text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sentinel_threat_events TO authenticated;
GRANT ALL ON public.sentinel_threat_events TO service_role;
ALTER TABLE public.sentinel_threat_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read threat events"
  ON public.sentinel_threat_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_sentinel_threat_created ON public.sentinel_threat_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentinel_threat_user ON public.sentinel_threat_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentinel_threat_fp ON public.sentinel_threat_events (device_fingerprint, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sentinel_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  device_fingerprint text,
  ip_address text,
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'high',
  active boolean NOT NULL DEFAULT true,
  released_by uuid,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sentinel_blocks TO authenticated;
GRANT UPDATE ON public.sentinel_blocks TO authenticated;
GRANT ALL ON public.sentinel_blocks TO service_role;
ALTER TABLE public.sentinel_blocks ENABLE ROW LEVEL SECURITY;

-- Admins see the whole block list; a member may only see their own block.
CREATE POLICY "Admins read blocks"
  ON public.sentinel_blocks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Admins release blocks"
  ON public.sentinel_blocks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_sentinel_blocks_user_active
  ON public.sentinel_blocks (user_id) WHERE active AND user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sentinel_blocks_fp_active
  ON public.sentinel_blocks (device_fingerprint) WHERE active AND device_fingerprint IS NOT NULL;

CREATE TRIGGER sentinel_blocks_touch
  BEFORE UPDATE ON public.sentinel_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Hardware / presence details for the live-user board.
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS device_fingerprint text,
  ADD COLUMN IF NOT EXISTS hardware jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_token_unique ON public.user_sessions (session_token);

-- Tells the caller whether they (or the device they are on) are blocked.
CREATE OR REPLACE FUNCTION public.sentinel_is_blocked(_fingerprint text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sentinel_blocks b
    WHERE b.active
      AND (
        (b.user_id IS NOT NULL AND b.user_id = auth.uid())
        OR (_fingerprint IS NOT NULL AND b.device_fingerprint = _fingerprint)
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.sentinel_is_blocked(text) TO authenticated, anon;