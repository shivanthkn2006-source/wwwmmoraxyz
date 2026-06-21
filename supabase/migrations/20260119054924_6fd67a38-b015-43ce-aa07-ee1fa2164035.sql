-- Add assistant naming & user profile fields for conversational onboarding
-- Users can rename Zoe (stored per-user), full DOB stored

-- Add assistant_name to profiles (default 'Zoe', user can rename)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS assistant_name TEXT DEFAULT 'Zoe';

-- Add assistant_voice_preference ('female' or 'male')
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS assistant_voice_preference TEXT DEFAULT 'female';

-- Add full date of birth (nullable until user provides)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add user real name (conversationally gathered, separate from display_name)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS real_name TEXT;

-- Add onboarding_step to track voice onboarding progress
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'name';

-- Add pending_tasks (JSON array for shopping, events, etc.)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pending_tasks JSONB DEFAULT '[]'::jsonb;

-- Create index for faster profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_genesis 
ON public.profiles(user_id, zoe_genesis_complete);