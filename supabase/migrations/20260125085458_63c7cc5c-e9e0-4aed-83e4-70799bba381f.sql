-- Create a security definer function to check if user is a root admin
CREATE OR REPLACE FUNCTION public.is_root_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
BEGIN
  SELECT username INTO v_username
  FROM public.profiles
  WHERE user_id = check_user_id;
  
  -- Check against known root admins (case-insensitive)
  RETURN LOWER(v_username) IN ('moksh50', 'justmkbhd', 'john', 'shivanth_kn');
END;
$$;

-- Add policy for admins to view ALL user sessions
CREATE POLICY "Admins can view all sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (public.is_root_admin(auth.uid()));

-- Add policy for admins to view ALL page views
CREATE POLICY "Admins can view all page views"
ON public.page_views
FOR SELECT
TO authenticated
USING (public.is_root_admin(auth.uid()));

-- Add policy for admins to view ALL user activity logs
CREATE POLICY "Admins can view all activity logs"
ON public.user_activity_log
FOR SELECT
TO authenticated
USING (public.is_root_admin(auth.uid()));