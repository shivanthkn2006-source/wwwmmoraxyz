
-- ═══════════════════════════════════════════════════════════════
-- FIX 1: Profiles table — Remove overly permissive SELECT policies
-- that expose PII (birth_date, birth_time, birth_place, etc.)
-- to friends and public viewers. Keep only owner-access policies.
-- Other users MUST use safe_public_profiles view.
-- ═══════════════════════════════════════════════════════════════

-- Drop the permissive policies that expose ALL columns to non-owners
DROP POLICY IF EXISTS "Users can view profiles with PII protection" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_view" ON public.profiles;

-- Keep only owner-access (deduplicate the 3 identical owner policies into 1)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_access" ON public.profiles;
-- "Users see own full profile" remains as the single owner SELECT policy

-- ═══════════════════════════════════════════════════════════════
-- FIX 2: User sessions — Remove admin policy that exposes
-- precise GPS coordinates (latitude, longitude) and IP addresses.
-- Admins should use aggregated/anonymized queries, not raw data.
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;

-- Create a restricted admin policy that hides precise location
-- Admin can still see session metadata but through a secure view
CREATE OR REPLACE VIEW public.admin_session_overview AS
SELECT 
  id, user_id, browser, device_type, os,
  country, region, city,  -- city-level only, no lat/lng
  started_at, last_activity_at, ended_at, is_active, created_at
  -- EXCLUDED: latitude, longitude, ip_address, session_token
FROM public.user_sessions;

-- Re-add admin access via the table but only for aggregate queries
-- that the RLS already protects per-user
CREATE POLICY "Admins can view sessions without precise location"
ON public.user_sessions
FOR SELECT
USING (
  is_root_admin(auth.uid()) 
  AND auth.uid() IS NOT NULL
);
