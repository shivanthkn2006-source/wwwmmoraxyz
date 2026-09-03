GRANT SELECT, INSERT ON public.platform_error_logs TO authenticated;
GRANT UPDATE (status, admin_note) ON public.platform_error_logs TO authenticated;
GRANT ALL ON public.platform_error_logs TO service_role;