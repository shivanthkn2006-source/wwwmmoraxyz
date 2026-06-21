-- =============================================
-- SECURITY FIX: Comprehensive RLS Policy Updates
-- =============================================

-- 1. Create a proper has_role function that uses SECURITY DEFINER to prevent recursion
-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.has_role(text);

-- Create app_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create the SECURITY DEFINER function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role::text
  )
$$;

-- 2. Drop and recreate user_roles RLS policies to fix infinite recursion
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Create new non-recursive policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- For admin access, use the SECURITY DEFINER function
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix profiles table RLS to respect privacy settings
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;

-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can view public profiles or profiles of friends
CREATE POLICY "Users can view public profiles and friends"
ON public.profiles FOR SELECT
TO authenticated
USING (
  profile_visibility = 'public'
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (f.user1_id = auth.uid() AND f.user2_id = user_id)
       OR (f.user2_id = auth.uid() AND f.user1_id = user_id)
  )
);

-- 4. Fix user_sessions table INSERT/UPDATE policies
DROP POLICY IF EXISTS "Service role can insert sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can update sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;

-- Only allow users to insert/update their own sessions
CREATE POLICY "Users can insert own sessions"
ON public.user_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON public.user_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Fix job_queue and audit_reports to use the new has_role function
DROP POLICY IF EXISTS "Admins can view job queue" ON public.job_queue;
DROP POLICY IF EXISTS "Admins can insert jobs" ON public.job_queue;
DROP POLICY IF EXISTS "Admins can update jobs" ON public.job_queue;
DROP POLICY IF EXISTS "Admins can view audit reports" ON public.audit_reports;

CREATE POLICY "Admins can view job queue"
ON public.job_queue FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert jobs"
ON public.job_queue FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update jobs"
ON public.job_queue FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view audit reports"
ON public.audit_reports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));