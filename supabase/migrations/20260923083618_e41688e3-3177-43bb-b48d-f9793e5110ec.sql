-- 1. Widen the safe discovery directory
ALTER TABLE public.public_profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS hobbies text[],
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS event_recurring boolean,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS field_of_study text,
  ADD COLUMN IF NOT EXISTS location_enabled boolean;

CREATE OR REPLACE FUNCTION public.sync_public_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;

  INSERT INTO public.public_profiles (
    user_id, username, display_name, profile_photo_url, bio, profile_visibility,
    city, hobbies, status, event_date, event_recurring, profession, field_of_study, location_enabled
  ) VALUES (
    NEW.user_id, NEW.username, NEW.display_name, NEW.profile_photo_url, NEW.bio, NEW.profile_visibility,
    NEW.city, NEW.hobbies, NEW.status, NEW.event_date, NEW.event_recurring, NEW.profession, NEW.field_of_study, NEW.location_enabled
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    profile_photo_url = EXCLUDED.profile_photo_url,
    bio = EXCLUDED.bio,
    profile_visibility = EXCLUDED.profile_visibility,
    city = EXCLUDED.city,
    hobbies = EXCLUDED.hobbies,
    status = EXCLUDED.status,
    event_date = EXCLUDED.event_date,
    event_recurring = EXCLUDED.event_recurring,
    profession = EXCLUDED.profession,
    field_of_study = EXCLUDED.field_of_study,
    location_enabled = EXCLUDED.location_enabled;

  RETURN NEW;
END;
$function$;

-- Backfill the new directory columns from existing profiles
UPDATE public.public_profiles pp
SET city = p.city,
    hobbies = p.hobbies,
    status = p.status,
    event_date = p.event_date,
    event_recurring = p.event_recurring,
    profession = p.profession,
    field_of_study = p.field_of_study,
    location_enabled = p.location_enabled,
    username = p.username,
    display_name = p.display_name,
    profile_photo_url = p.profile_photo_url,
    bio = p.bio,
    profile_visibility = p.profile_visibility
FROM public.profiles p
WHERE p.user_id = pp.user_id;

INSERT INTO public.public_profiles (
  user_id, username, display_name, profile_photo_url, bio, profile_visibility,
  city, hobbies, status, event_date, event_recurring, profession, field_of_study, location_enabled
)
SELECT p.user_id, p.username, p.display_name, p.profile_photo_url, p.bio, p.profile_visibility,
       p.city, p.hobbies, p.status, p.event_date, p.event_recurring, p.profession, p.field_of_study, p.location_enabled
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.public_profiles pp WHERE pp.user_id = p.user_id)
ON CONFLICT (user_id) DO NOTHING;

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT ALL ON public.public_profiles TO service_role;

-- 2. Full profiles become self + accepted friends + root admin only
DROP POLICY IF EXISTS "profiles_select_self_friends_or_public" ON public.profiles;

CREATE POLICY "profiles_select_self_or_friends"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (f.user1_id = auth.uid() AND f.user2_id = profiles.user_id)
       OR (f.user2_id = auth.uid() AND f.user1_id = profiles.user_id)
  )
);

-- 3. Root admin record management
CREATE POLICY "Root admin can manage profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (private.is_root_admin(auth.uid()))
  WITH CHECK (private.is_root_admin(auth.uid()));

CREATE POLICY "Root admin can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (private.is_root_admin(auth.uid()));

CREATE POLICY "Root admin can read sessions" ON public.user_sessions
  FOR SELECT TO authenticated USING (private.is_root_admin(auth.uid()));
CREATE POLICY "Root admin can update sessions" ON public.user_sessions
  FOR UPDATE TO authenticated
  USING (private.is_root_admin(auth.uid())) WITH CHECK (private.is_root_admin(auth.uid()));
CREATE POLICY "Root admin can delete sessions" ON public.user_sessions
  FOR DELETE TO authenticated USING (private.is_root_admin(auth.uid()));

CREATE POLICY "Root admin can read activity events" ON public.user_activity_log
  FOR SELECT TO authenticated USING (private.is_root_admin(auth.uid()));
CREATE POLICY "Root admin can update activity events" ON public.user_activity_log
  FOR UPDATE TO authenticated
  USING (private.is_root_admin(auth.uid())) WITH CHECK (private.is_root_admin(auth.uid()));
CREATE POLICY "Root admin can delete activity events" ON public.user_activity_log
  FOR DELETE TO authenticated USING (private.is_root_admin(auth.uid()));

CREATE POLICY "Root admin can update planner events" ON public.important_dates
  FOR UPDATE TO authenticated
  USING (private.is_root_admin(auth.uid())) WITH CHECK (private.is_root_admin(auth.uid()));
CREATE POLICY "Root admin can delete planner events" ON public.important_dates
  FOR DELETE TO authenticated USING (private.is_root_admin(auth.uid()));
CREATE POLICY "Root admin can insert planner events" ON public.important_dates
  FOR INSERT TO authenticated WITH CHECK (private.is_root_admin(auth.uid()));

CREATE POLICY "Root admin can read reminders" ON public.reminders
  FOR SELECT TO authenticated USING (private.is_root_admin(auth.uid()));
CREATE POLICY "Root admin can update reminders" ON public.reminders
  FOR UPDATE TO authenticated
  USING (private.is_root_admin(auth.uid())) WITH CHECK (private.is_root_admin(auth.uid()));
CREATE POLICY "Root admin can delete reminders" ON public.reminders
  FOR DELETE TO authenticated USING (private.is_root_admin(auth.uid()));
CREATE POLICY "Root admin can insert reminders" ON public.reminders
  FOR INSERT TO authenticated WITH CHECK (private.is_root_admin(auth.uid()));