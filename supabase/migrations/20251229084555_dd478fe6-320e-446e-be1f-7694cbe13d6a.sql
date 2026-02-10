-- ==========================================
-- Fix: Auto-create profiles row on user signup
-- ==========================================

-- 1. Create function to auto-insert profiles row from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    display_name,
    username,
    bio,
    profile_photo_url,
    profile_visibility
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text from 1 for 8)),
    NULL,
    NULL,
    'public'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 2. Create trigger on auth.users INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill existing auth.users who don't have profiles rows
INSERT INTO public.profiles (
  user_id,
  display_name,
  username,
  bio,
  profile_photo_url,
  profile_visibility
)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'display_name', 'User'),
  COALESCE(au.raw_user_meta_data->>'username', 'user_' || substring(au.id::text from 1 for 8)),
  NULL,
  NULL,
  'public'
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;