
CREATE POLICY "astro_posters_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'astro-posters' AND (storage.foldername(name))[1] = auth.uid()::text);
