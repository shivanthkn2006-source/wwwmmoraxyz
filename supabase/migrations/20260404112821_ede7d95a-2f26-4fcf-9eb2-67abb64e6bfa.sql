
-- 3. FIX private_timeline_members: Replace permissive policies with scoped ones
DROP POLICY IF EXISTS "Authenticated users can view timeline members" ON public.private_timeline_members;
DROP POLICY IF EXISTS "Authenticated users can add timeline members" ON public.private_timeline_members;
DROP POLICY IF EXISTS "Authenticated users can update timeline members" ON public.private_timeline_members;
DROP POLICY IF EXISTS "Authenticated users can remove timeline members" ON public.private_timeline_members;

CREATE POLICY "Members see own timeline memberships"
ON public.private_timeline_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR timeline_id IN (
    SELECT ptm.timeline_id FROM public.private_timeline_members ptm WHERE ptm.user_id = auth.uid()
  )
);

CREATE POLICY "Timeline owners add members"
ON public.private_timeline_members
FOR INSERT
TO authenticated
WITH CHECK (
  timeline_id IN (
    SELECT pt.id FROM public.private_timelines pt WHERE pt.user_id = auth.uid()
  )
);

CREATE POLICY "Timeline owners remove members"
ON public.private_timeline_members
FOR DELETE
TO authenticated
USING (
  timeline_id IN (
    SELECT pt.id FROM public.private_timelines pt WHERE pt.user_id = auth.uid()
  )
);

-- 5. FIX privilege escalation: Prevent username changes to reserved admin names
CREATE OR REPLACE FUNCTION public.prevent_admin_username_hijack()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF LOWER(NEW.username) IN ('moksh50', 'justmkbhd', 'john', 'shivanth_kn') THEN
    IF OLD.username IS NULL OR LOWER(OLD.username) != LOWER(NEW.username) THEN
      RAISE EXCEPTION 'This username is reserved and cannot be claimed.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_admin_username_hijack_trigger ON public.profiles;
CREATE TRIGGER prevent_admin_username_hijack_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_username_hijack();

-- 6. FIX cortex_logic: Restrict to admin-only reads
DROP POLICY IF EXISTS "Authenticated users can view cortex logic" ON public.cortex_logic;
DROP POLICY IF EXISTS "Anyone can view active cortex" ON public.cortex_logic;

CREATE POLICY "Only admins read cortex logic"
ON public.cortex_logic
FOR SELECT
TO authenticated
USING (public.is_root_admin(auth.uid()));
