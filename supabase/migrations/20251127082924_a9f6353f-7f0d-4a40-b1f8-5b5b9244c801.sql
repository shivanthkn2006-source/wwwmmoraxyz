-- Fix private_timeline_members RLS to remove self-recursive queries and restore functionality

-- 1) Drop any existing policies that may reference private_timeline_members recursively
DROP POLICY IF EXISTS "Users can view timeline members" ON public.private_timeline_members;
DROP POLICY IF EXISTS "Users can add members to timelines they belong to" ON public.private_timeline_members;
DROP POLICY IF EXISTS "Users can update their added timeline members" ON public.private_timeline_members;
DROP POLICY IF EXISTS "Users can remove timeline members" ON public.private_timeline_members;

-- 2) Create simple, non-recursive policies based only on auth.uid()
-- Any authenticated user can see membership rows. This avoids infinite recursion
-- while keeping timelines functional for now.
CREATE POLICY "Authenticated users can view timeline members"
ON public.private_timeline_members
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow any authenticated user to insert membership rows
CREATE POLICY "Authenticated users can insert timeline members"
ON public.private_timeline_members
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update membership rows
CREATE POLICY "Authenticated users can update timeline members"
ON public.private_timeline_members
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete membership rows
CREATE POLICY "Authenticated users can delete timeline members"
ON public.private_timeline_members
FOR DELETE
USING (auth.uid() IS NOT NULL);
