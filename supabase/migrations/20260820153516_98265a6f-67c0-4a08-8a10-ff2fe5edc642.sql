GRANT SELECT ON public.zoe_universal_index TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoe_universal_index TO authenticated;
GRANT ALL ON public.zoe_universal_index TO service_role;