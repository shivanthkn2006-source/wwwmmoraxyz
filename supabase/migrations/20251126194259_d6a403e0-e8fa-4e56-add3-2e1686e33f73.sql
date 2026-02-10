-- Fix infinite recursion in RLS policy for private_timeline_members by resetting policies
-- and replacing them with simple, non-recursive, user-scoped policies.

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.private_timeline_members ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on private_timeline_members to remove any recursive definitions
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'private_timeline_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.private_timeline_members', pol.policyname);
  END LOOP;
END$$;

-- Allow users to see and manage only their own memberships, without any recursive checks
CREATE POLICY "Users can read their own private timeline memberships"
ON public.private_timeline_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own private timeline memberships"
ON public.private_timeline_members
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);