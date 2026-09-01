CREATE TABLE IF NOT EXISTS public.sentinel_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  user_id uuid,
  ip_address text,
  user_agent text,
  browser text,
  browser_version text,
  device_type text,
  device_vendor text,
  device_model text,
  os text,
  os_version text,
  country text,
  region text,
  city text,
  latitude numeric,
  longitude numeric,
  timezone text,
  device_fingerprint text,
  hardware jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

GRANT SELECT ON public.sentinel_sessions TO authenticated;
GRANT ALL ON public.sentinel_sessions TO service_role;
ALTER TABLE public.sentinel_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sentinel sessions"
  ON public.sentinel_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_sentinel_sessions_activity
  ON public.sentinel_sessions (last_activity_at DESC);