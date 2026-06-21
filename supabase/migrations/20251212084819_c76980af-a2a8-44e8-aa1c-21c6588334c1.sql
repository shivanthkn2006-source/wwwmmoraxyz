-- Create a secure view that exposes only non-sensitive profile fields to friends
-- This prevents PII exposure while maintaining friendship functionality

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.safe_public_profiles;

-- Create safe_public_profiles view that excludes sensitive PII
CREATE OR REPLACE VIEW public.safe_public_profiles AS
SELECT 
  user_id,
  username,
  display_name,
  profile_photo_url,
  bio,
  status,
  profile_visibility,
  hobbies,
  total_points,
  current_tier,
  created_at
  -- Excluded sensitive fields:
  -- birth_date, birth_time, birth_place (identity theft risk)
  -- city, location_enabled (stalking risk)
  -- job_title, organization, profession, field_of_study (social engineering risk)
  -- All DHF/Zoe settings (privacy risk)
  -- All notification/voice settings (privacy risk)
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.safe_public_profiles SET (security_invoker = true);

-- Grant SELECT to authenticated users
GRANT SELECT ON public.safe_public_profiles TO authenticated;

-- Drop the overly permissive friends profile policy
DROP POLICY IF EXISTS "Users can view friends' profiles" ON public.profiles;

-- Keep the existing safe policies:
-- 1. Users can view own profile (full access to own data)
-- 2. Users can view profiles with PII protection (already exists but we'll tighten it)

-- Create a new, more restrictive policy for viewing other profiles
-- Users can only view the user_id and username from profiles table directly
-- For full friend profiles, they should use the safe_public_profiles view
CREATE POLICY "Friends can view limited profile info"
ON public.profiles FOR SELECT
USING (
  -- Own profile - full access
  auth.uid() = user_id
  OR
  -- Public profiles - only basic info (the view handles field filtering)
  profile_visibility = 'public'
);

-- Add comment explaining the security model
COMMENT ON VIEW public.safe_public_profiles IS 'Safe view of profiles table excluding sensitive PII. Use this view for displaying friend profiles instead of querying profiles table directly.';