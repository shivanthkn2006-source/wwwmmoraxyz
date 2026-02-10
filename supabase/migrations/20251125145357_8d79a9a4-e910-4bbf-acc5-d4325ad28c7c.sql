-- Fix messages storage bucket SELECT policy to require authentication
-- Drop the existing public policy
DROP POLICY IF EXISTS "Users can view message media" ON storage.objects;

-- Create new authenticated-only policy with user path restrictions
CREATE POLICY "Users can view their own message media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'messages' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);