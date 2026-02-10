-- Rename comments table to post_comments to match code
ALTER TABLE comments RENAME TO post_comments;

-- Fix friendship RLS policies - need to check both directions
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;

CREATE POLICY "Users can create friendships" 
ON friendships
FOR INSERT 
WITH CHECK (
  (auth.uid() = user1_id) OR (auth.uid() = user2_id)
);