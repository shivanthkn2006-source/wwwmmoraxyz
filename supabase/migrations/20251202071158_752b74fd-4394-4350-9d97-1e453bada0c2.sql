-- Insert admin role for @moksh50 (using text type)
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'
FROM public.profiles
WHERE username = 'moksh50'
ON CONFLICT (user_id, role) DO NOTHING;

-- Insert admin role for @Justmkbhd
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'
FROM public.profiles
WHERE username = 'Justmkbhd'
ON CONFLICT (user_id, role) DO NOTHING;

-- Add RLS policy for platform_health_logs (admin only)
DROP POLICY IF EXISTS "Only admins can view health logs" ON public.platform_health_logs;
CREATE POLICY "Only admins can view health logs"
ON public.platform_health_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Only admins can insert health logs" ON public.platform_health_logs;
CREATE POLICY "Only admins can insert health logs"
ON public.platform_health_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);