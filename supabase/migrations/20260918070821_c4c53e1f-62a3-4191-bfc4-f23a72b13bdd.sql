ALTER TABLE public.dhf_daily_posts
  ADD COLUMN IF NOT EXISTS image_prompt TEXT,
  ADD COLUMN IF NOT EXISTS image_prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS image_prompt_hash TEXT;

COMMENT ON COLUMN public.dhf_daily_posts.image_prompt IS 'Exact content-grounded visual brief used to generate the card image.';
COMMENT ON COLUMN public.dhf_daily_posts.image_prompt_version IS 'Version of the Zoe DHF image composition contract.';
COMMENT ON COLUMN public.dhf_daily_posts.image_prompt_hash IS 'Deterministic fingerprint of the image prompt for mismatch audits.';