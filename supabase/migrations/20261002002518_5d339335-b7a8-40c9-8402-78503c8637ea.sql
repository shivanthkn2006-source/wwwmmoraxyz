ALTER TABLE public.platform_visits ADD COLUMN IF NOT EXISTS ref_code text;
CREATE INDEX IF NOT EXISTS platform_visits_ref_code_idx ON public.platform_visits(ref_code) WHERE ref_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS dhf_referrals_referred_unique ON public.dhf_referrals(referred_id);
GRANT SELECT ON public.dhf_referrals TO authenticated;
GRANT ALL ON public.dhf_referrals TO service_role;