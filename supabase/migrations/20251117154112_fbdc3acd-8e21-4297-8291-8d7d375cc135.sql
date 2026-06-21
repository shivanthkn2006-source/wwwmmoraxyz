-- Fix security warning: Set search_path for cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  DELETE FROM public.notifications
  WHERE expires_at IS NOT NULL 
  AND expires_at < now();
END;
$func$;