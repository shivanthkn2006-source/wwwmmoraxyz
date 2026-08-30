CREATE TABLE IF NOT EXISTS public.user_dhf_profiles (
  id UUID PRIMARY KEY,
  dob DATE,
  birth_time TIME,
  birth_place TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  dhf_life_phase INTEGER DEFAULT 1,
  referral_code TEXT UNIQUE,
  reward_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_dhf_profiles TO authenticated;
GRANT ALL ON public.user_dhf_profiles TO service_role;

ALTER TABLE public.user_dhf_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their own DHF profile"
ON public.user_dhf_profiles FOR ALL TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.dhf_daily_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  category TEXT NOT NULL DEFAULT 'Daily Compass',
  headline TEXT NOT NULL,
  short_summary TEXT NOT NULL,
  full_story_content TEXT NOT NULL,
  image_url TEXT NOT NULL,
  powered_by_badge TEXT NOT NULL DEFAULT 'mmora / Zoe • Swiss Ephemeris',
  referral_cta TEXT NOT NULL DEFAULT '',
  astrological_context TEXT,
  source TEXT NOT NULL DEFAULT 'model',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_date, slot_time)
);

GRANT SELECT ON public.dhf_daily_posts TO authenticated;
GRANT ALL ON public.dhf_daily_posts TO service_role;

ALTER TABLE public.dhf_daily_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own DHF daily posts"
ON public.dhf_daily_posts FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_dhf_daily_posts_user_date_slot
  ON public.dhf_daily_posts (user_id, post_date, slot_time);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_user_dhf_profiles_updated_at ON public.user_dhf_profiles;
CREATE TRIGGER update_user_dhf_profiles_updated_at
BEFORE UPDATE ON public.user_dhf_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();