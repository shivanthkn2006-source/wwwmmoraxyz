CREATE OR REPLACE FUNCTION public.can_read_message_media(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.receiver_id = auth.uid()
      AND m.media_url LIKE '%/messages/' || _name || '?%'
  )
$$;
CREATE POLICY "Recipients can view message media sent to them"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'messages' AND public.can_read_message_media(name));