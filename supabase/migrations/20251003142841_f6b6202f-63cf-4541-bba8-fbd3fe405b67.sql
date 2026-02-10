-- Drop the view and create a real table instead
DROP VIEW IF EXISTS public.public_profiles;

CREATE TABLE public.public_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  profile_photo_url TEXT,
  bio TEXT
);

-- Enable RLS on the table
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Allow everyone (including anonymous users) to view public profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON public.public_profiles
FOR SELECT
USING (true);

-- Create function to sync data from profiles to public_profiles
CREATE OR REPLACE FUNCTION sync_public_profiles()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.public_profiles (user_id, username, display_name, profile_photo_url, bio)
    VALUES (NEW.user_id, NEW.username, NEW.display_name, NEW.profile_photo_url, NEW.bio);
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.public_profiles
    SET 
      username = NEW.username,
      display_name = NEW.display_name,
      profile_photo_url = NEW.profile_photo_url,
      bio = NEW.bio
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE user_id = OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-sync profiles to public_profiles
CREATE TRIGGER sync_public_profiles_trigger
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION sync_public_profiles();

-- Populate existing data
INSERT INTO public.public_profiles (user_id, username, display_name, profile_photo_url, bio)
SELECT user_id, username, display_name, profile_photo_url, bio
FROM profiles
ON CONFLICT (user_id) DO NOTHING;