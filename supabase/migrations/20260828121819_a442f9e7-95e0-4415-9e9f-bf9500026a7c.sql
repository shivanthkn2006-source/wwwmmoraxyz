-- 1. Per-member notification controls
ALTER TABLE public.growth_preferences
  ADD COLUMN IF NOT EXISTS notify_push boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_digest text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS last_digest_at timestamptz,
  ADD COLUMN IF NOT EXISTS push_subscription jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'growth_preferences_notify_digest_check'
  ) THEN
    ALTER TABLE public.growth_preferences
      ADD CONSTRAINT growth_preferences_notify_digest_check
      CHECK (notify_digest IN ('instant', 'daily', 'off'));
  END IF;
END $$;

-- 2. Feature flags for gradual rollout / instant rollback
CREATE TABLE IF NOT EXISTS public.growth_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  rollout_percent smallint NOT NULL DEFAULT 0,
  allow_user_ids uuid[] NOT NULL DEFAULT '{}',
  block_user_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT growth_feature_flags_rollout_range CHECK (rollout_percent BETWEEN 0 AND 100)
);

GRANT SELECT ON public.growth_feature_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_feature_flags TO authenticated;
GRANT ALL ON public.growth_feature_flags TO service_role;
ALTER TABLE public.growth_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "growth_flags_read" ON public.growth_feature_flags;
CREATE POLICY "growth_flags_read" ON public.growth_feature_flags
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "growth_flags_admin_write" ON public.growth_feature_flags;
CREATE POLICY "growth_flags_admin_write" ON public.growth_feature_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS growth_feature_flags_touch ON public.growth_feature_flags;
CREATE TRIGGER growth_feature_flags_touch
  BEFORE UPDATE ON public.growth_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.growth_feature_flags (flag_key, description, enabled, rollout_percent)
VALUES
  ('growth_engine', 'Master switch for the personal growth engine', true, 100),
  ('growth_card_alerts', 'Top-of-screen alert when a new insight card is generated', true, 100),
  ('growth_push_notifications', 'Device push notifications for new insights', false, 0),
  ('growth_email_notifications', 'Email alerts / digests for new insights', false, 0),
  ('growth_export', 'Self-service export of growth data', true, 100)
ON CONFLICT (flag_key) DO NOTHING;

-- 3. Admin backfill / bulk-retry jobs
CREATE TABLE IF NOT EXISTS public.growth_backfill_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  from_date date NOT NULL,
  to_date date NOT NULL,
  slots text[] NOT NULL DEFAULT '{}',
  user_ids uuid[] NOT NULL DEFAULT '{}',
  max_items integer NOT NULL DEFAULT 50,
  throttle_ms integer NOT NULL DEFAULT 400,
  dry_run boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'queued',
  processed integer NOT NULL DEFAULT 0,
  written integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  errors text[] NOT NULL DEFAULT '{}',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT growth_backfill_jobs_status_check
    CHECK (status IN ('queued', 'running', 'done', 'failed')),
  CONSTRAINT growth_backfill_jobs_range_check CHECK (to_date >= from_date),
  CONSTRAINT growth_backfill_jobs_limits_check
    CHECK (max_items BETWEEN 1 AND 500 AND throttle_ms BETWEEN 0 AND 5000)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_backfill_jobs TO authenticated;
GRANT ALL ON public.growth_backfill_jobs TO service_role;
ALTER TABLE public.growth_backfill_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "growth_backfill_admin_all" ON public.growth_backfill_jobs;
CREATE POLICY "growth_backfill_admin_all" ON public.growth_backfill_jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS growth_backfill_jobs_touch ON public.growth_backfill_jobs;
CREATE TRIGGER growth_backfill_jobs_touch
  BEFORE UPDATE ON public.growth_backfill_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS growth_backfill_jobs_created_idx
  ON public.growth_backfill_jobs (created_at DESC);