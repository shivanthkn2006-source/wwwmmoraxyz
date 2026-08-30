CREATE TABLE IF NOT EXISTS public.dhf_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL,
  referrer_points INTEGER NOT NULL DEFAULT 0,
  referred_points INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'dhf_daily_compass',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dhf_referrals TO authenticated;
GRANT ALL ON public.dhf_referrals TO service_role;

ALTER TABLE public.dhf_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read referrals they are part of" ON public.dhf_referrals;
CREATE POLICY "Members read referrals they are part of"
ON public.dhf_referrals FOR SELECT TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE INDEX IF NOT EXISTS idx_dhf_referrals_referrer ON public.dhf_referrals (referrer_id);

CREATE TABLE IF NOT EXISTS public.dhf_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  post_date DATE,
  trigger TEXT NOT NULL DEFAULT 'client',
  action TEXT NOT NULL DEFAULT 'ensure',
  worker_version TEXT,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  slots_existing INTEGER NOT NULL DEFAULT 0,
  slots_generated INTEGER NOT NULL DEFAULT 0,
  vault_used INTEGER NOT NULL DEFAULT 0,
  rate_limited INTEGER NOT NULL DEFAULT 0,
  images_stored INTEGER NOT NULL DEFAULT 0,
  image_failures INTEGER NOT NULL DEFAULT 0,
  circuit_break_status INTEGER,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.dhf_generation_runs TO service_role;
GRANT SELECT ON public.dhf_generation_runs TO authenticated;

ALTER TABLE public.dhf_generation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read DHF generation runs" ON public.dhf_generation_runs;
CREATE POLICY "Admins read DHF generation runs"
ON public.dhf_generation_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_dhf_generation_runs_created ON public.dhf_generation_runs (created_at DESC);

ALTER TABLE public.dhf_daily_posts ADD COLUMN IF NOT EXISTS image_source TEXT NOT NULL DEFAULT 'remote';
ALTER TABLE public.dhf_daily_posts ADD COLUMN IF NOT EXISTS image_path TEXT;

DROP POLICY IF EXISTS "Members read their own DHF compass images" ON storage.objects;
CREATE POLICY "Members read their own DHF compass images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dhf-compass' AND (storage.foldername(name))[1] = auth.uid()::text);