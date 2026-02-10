-- Persist Zoe Infinity onboarding across sessions/devices
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS zoe_genesis_complete boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS zoe_genesis_completed_at timestamp with time zone;

-- Helpful index for faster lookups (optional but safe)
CREATE INDEX IF NOT EXISTS idx_profiles_user_zoe_genesis ON public.profiles (user_id, zoe_genesis_complete);
