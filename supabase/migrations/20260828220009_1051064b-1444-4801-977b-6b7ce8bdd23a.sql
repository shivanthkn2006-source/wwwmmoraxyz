CREATE TABLE public.post_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_preview_url text,
  media_type text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_attachments_media_type_chk CHECK (media_type IN ('image','video','pdf')),
  CONSTRAINT post_attachments_file_size_chk CHECK (file_size >= 0),
  CONSTRAINT post_attachments_unique_order UNIQUE (post_id, sort_order)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_attachments TO authenticated;
GRANT ALL ON public.post_attachments TO service_role;
ALTER TABLE public.post_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_attachments_visible_read" ON public.post_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_attachments.post_id
        AND (
          p.user_id = auth.uid()
          OR p.visibility = 'global'
          OR (p.visibility = 'personal' AND (
            p.user_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.friendships f
              WHERE (f.user1_id = auth.uid() AND f.user2_id = p.user_id)
                 OR (f.user2_id = auth.uid() AND f.user1_id = p.user_id)
            )
          ))
        )
    )
  );
CREATE POLICY "post_attachments_owner_insert" ON public.post_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_attachments.post_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "post_attachments_owner_update" ON public.post_attachments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_attachments.post_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "post_attachments_owner_delete" ON public.post_attachments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX post_attachments_post_order_idx
  ON public.post_attachments (post_id, sort_order);
CREATE INDEX post_attachments_user_created_idx
  ON public.post_attachments (user_id, created_at DESC);