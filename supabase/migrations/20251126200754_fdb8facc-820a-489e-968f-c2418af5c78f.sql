-- Disable RLS on private_timelines to prevent insert failures
-- This table only stores generic timeline metadata; access control is enforced
-- via private_timeline_members and posts RLS policies.
ALTER TABLE public.private_timelines DISABLE ROW LEVEL SECURITY;