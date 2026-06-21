-- Drop existing global posts policy if it exists
DROP POLICY IF EXISTS "Global posts are viewable by everyone" ON public.posts;

-- Create new policy that explicitly allows authenticated users to view global posts
CREATE POLICY "Global posts are viewable by authenticated users"
  ON public.posts
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND visibility = 'global'
  );