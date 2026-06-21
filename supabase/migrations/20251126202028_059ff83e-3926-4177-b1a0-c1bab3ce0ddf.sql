-- Add foreign key relationship from private_timeline_members to profiles
-- This enables proper join queries for member profile data
ALTER TABLE public.private_timeline_members
ADD CONSTRAINT private_timeline_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key relationship for the user who added the member
ALTER TABLE public.private_timeline_members
ADD CONSTRAINT private_timeline_members_added_by_user_id_fkey
FOREIGN KEY (added_by_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;