-- Storage: avatar ownership (files are stored flat as "<uid>.jpg" / "<uid>-<ts>.png")
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '%');

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '%')
WITH CHECK (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '%');

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '%');

-- Storage: message media must land in the sender's own folder
DROP POLICY IF EXISTS "Users can upload message media" ON storage.objects;
CREATE POLICY "Users can upload message media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'messages' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Profiles: remove duplicate/overlapping SELECT policies, keep one clear rule set
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users see own full profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_view" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles with PII protection" ON public.profiles;

CREATE POLICY "profiles_select_self_friends_or_public"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (f.user1_id = auth.uid() AND f.user2_id = profiles.user_id)
       OR (f.user2_id = auth.uid() AND f.user1_id = profiles.user_id)
  )
  OR profile_visibility = 'public'
  OR profile_visibility IS NULL
);