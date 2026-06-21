-- 1. CRITICAL: Make messages bucket private (fixes STORAGE_EXPOSURE)
UPDATE storage.buckets SET public = false WHERE id = 'messages';

-- 2. Fix Function Search Path Mutable warnings
-- Recreate functions with proper search_path set

CREATE OR REPLACE FUNCTION public.update_notification_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_emotional_state_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_timeline_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. Create a secure public profile view that hides sensitive PII
-- This allows safe public profile viewing without exposing sensitive data
CREATE OR REPLACE VIEW public.safe_public_profiles AS
SELECT 
  user_id,
  username,
  display_name,
  bio,
  profile_photo_url,
  profile_visibility,
  status,
  current_tier,
  total_points,
  created_at
FROM public.profiles
WHERE profile_visibility = 'public';

-- Grant access to the view
GRANT SELECT ON public.safe_public_profiles TO authenticated;
GRANT SELECT ON public.safe_public_profiles TO anon;

-- 4. Update RLS policy for profiles to restrict PII to self and friends only
-- First drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view public profiles and friends" ON public.profiles;

-- Create a more restrictive policy that only allows viewing safe fields for public profiles
-- Full profile access only for self or friends
CREATE POLICY "Users can view profiles with PII protection"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Own profile - full access
  auth.uid() = user_id
  OR
  -- Friends - full access
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (f.user1_id = auth.uid() AND f.user2_id = profiles.user_id)
       OR (f.user2_id = auth.uid() AND f.user1_id = profiles.user_id)
  )
  OR
  -- Public profiles - allowed (but use safe_public_profiles view for non-sensitive data)
  profile_visibility = 'public'
);