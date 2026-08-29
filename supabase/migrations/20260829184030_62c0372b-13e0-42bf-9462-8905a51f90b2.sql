
-- 1. Seed admin role for current username-based admins
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'
FROM public.profiles p
WHERE lower(p.username) IN ('moksh50','justmkbhd','john','shivanth_kn','moknsh','saraswathi')
  AND p.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2. Role-based root admin
CREATE OR REPLACE FUNCTION public.is_root_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(check_user_id, 'admin'::app_role);
$function$;

-- 3. Replace username-based policies
DROP POLICY IF EXISTS "Admins can manage platform health logs" ON public.platform_health_logs;
CREATE POLICY "Admins can manage platform health logs" ON public.platform_health_logs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update any session" ON public.online_sessions;
CREATE POLICY "Admins can update any session" ON public.online_sessions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.online_sessions;
CREATE POLICY "Admins can view all sessions" ON public.online_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Admin can view all ledger entries" ON public.zoe_black_box_ledger;
CREATE POLICY "Admin can view all ledger entries" ON public.zoe_black_box_ledger
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Admins can create invite codes" ON public.invite_codes;
CREATE POLICY "Admins can create invite codes" ON public.invite_codes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update invite codes" ON public.invite_codes;
CREATE POLICY "Admins can update invite codes" ON public.invite_codes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all invite codes" ON public.invite_codes;
CREATE POLICY "Admins can view all invite codes" ON public.invite_codes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Validate single invite code only" ON public.invite_codes;
CREATE POLICY "Validate single invite code only" ON public.invite_codes
  FOR SELECT USING (public.has_role(auth.uid(),'admin'::app_role) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can view all system health logs" ON public.system_health_logs;
CREATE POLICY "Admins can view all system health logs" ON public.system_health_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all breaches" ON public.security_breaches;
CREATE POLICY "Admins can view all breaches" ON public.security_breaches
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- 4. Private timeline membership scoping
CREATE OR REPLACE FUNCTION public.is_timeline_owner(_timeline_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.private_timelines t
    WHERE t.id = _timeline_id AND t.user_id = _user_id
  );
$function$;

DROP POLICY IF EXISTS "Authenticated users can view timeline members" ON public.private_timeline_members;
DROP POLICY IF EXISTS "Authenticated users can insert timeline members" ON public.private_timeline_members;
DROP POLICY IF EXISTS "Authenticated users can update timeline members" ON public.private_timeline_members;
DROP POLICY IF EXISTS "Authenticated users can delete timeline members" ON public.private_timeline_members;

CREATE POLICY "Owner and members can view timeline members" ON public.private_timeline_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_timeline_owner(timeline_id, auth.uid())
    OR public.is_timeline_member(timeline_id, auth.uid())
  );

CREATE POLICY "Owner can add timeline members" ON public.private_timeline_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_timeline_owner(timeline_id, auth.uid()));

CREATE POLICY "Owner can update timeline members" ON public.private_timeline_members
  FOR UPDATE TO authenticated
  USING (public.is_timeline_owner(timeline_id, auth.uid()))
  WITH CHECK (public.is_timeline_owner(timeline_id, auth.uid()));

CREATE POLICY "Owner or self can remove timeline members" ON public.private_timeline_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_timeline_owner(timeline_id, auth.uid()));
