-- Fix security issue: Restrict post_likes table to authenticated users only
-- This prevents public exposure of user behavior and preferences

DROP POLICY IF EXISTS "Users can view post likes" ON post_likes;

CREATE POLICY "Authenticated users can view post likes"
ON post_likes
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);