-- Harden user uploads in the existing posts bucket: users may only write under their own folder
-- and may not write the reserved backend auto-poster path.
DROP POLICY IF EXISTS "Users can upload posts media" ON storage.objects;
CREATE POLICY "Users can upload posts media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'posts'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND name !~ '^auto-posters/'
);

DROP POLICY IF EXISTS "Users can update their posts media" ON storage.objects;
CREATE POLICY "Users can update their posts media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'posts'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND name !~ '^auto-posters/'
)
WITH CHECK (
  bucket_id = 'posts'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND name !~ '^auto-posters/'
);

-- Private bucket: clients can only create signed read URLs for auto-posters
-- attached to posts they are already allowed to view through posts RLS.
DROP POLICY IF EXISTS "Authorized clients can read auto posters" ON storage.objects;
CREATE POLICY "Authorized clients can read auto posters"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'post-auto-posters'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.media_preview_url = ('private://post-auto-posters/' || storage.objects.name)
  )
);

-- No authenticated INSERT/UPDATE/DELETE policy is created for post-auto-posters;
-- service_role bypasses RLS and remains the only writer for backend-generated posters.