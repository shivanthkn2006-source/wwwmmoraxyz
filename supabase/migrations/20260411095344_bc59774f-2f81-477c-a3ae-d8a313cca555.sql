
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zoe_genesis_memory jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.zoe_genesis_memory IS 'Genesis onboarding memory box: stores user name, age, DOB, location, country, region, life stage, and Zoe assistant name for relationship persistence';
