-- Add RLS policy for deleting private timelines
CREATE POLICY "Timeline creators can delete their timeline"
ON private_timelines
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM private_timeline_members
    WHERE timeline_id = private_timelines.id
    AND user_id = auth.uid()
    AND added_by_user_id = auth.uid()
  )
);

-- Add cascade delete for timeline members when timeline is deleted
ALTER TABLE private_timeline_members
DROP CONSTRAINT IF EXISTS private_timeline_members_timeline_id_fkey;

ALTER TABLE private_timeline_members
ADD CONSTRAINT private_timeline_members_timeline_id_fkey
FOREIGN KEY (timeline_id)
REFERENCES private_timelines(id)
ON DELETE CASCADE;

-- Add cascade delete for posts when timeline is deleted
ALTER TABLE posts
DROP CONSTRAINT IF EXISTS posts_private_timeline_id_fkey;

ALTER TABLE posts
ADD CONSTRAINT posts_private_timeline_id_fkey
FOREIGN KEY (private_timeline_id)
REFERENCES private_timelines(id)
ON DELETE SET NULL;