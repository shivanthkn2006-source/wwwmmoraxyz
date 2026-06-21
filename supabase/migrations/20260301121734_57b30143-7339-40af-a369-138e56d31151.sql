
-- =====================================================
-- FIX 1: selfie_city_pins - restrict GPS/photo access to authenticated users only
-- =====================================================

-- Drop overly permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can view selfie pins" ON public.selfie_city_pins;
DROP POLICY IF EXISTS "Users can view all pins" ON public.selfie_city_pins;

-- Authenticated users can view pins (social discovery requires auth)
CREATE POLICY "Authenticated users can view pins"
ON public.selfie_city_pins FOR SELECT TO authenticated
USING (true);

-- Drop duplicate INSERT policy
DROP POLICY IF EXISTS "Users can insert own pins" ON public.selfie_city_pins;

-- =====================================================
-- FIX 2: zoe_black_box_ledger - restrict to owner + admin only
-- =====================================================

-- Drop all overly permissive and duplicate policies
DROP POLICY IF EXISTS "zoe_black_box_service_select" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "black_box_read_own" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "zoe_black_box_select_own" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "Users can read own black box entries" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "Admin can view all ledger entries" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "System can insert ledger entries" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "authenticated_insert_black_box" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "authenticated_update_black_box" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "zoe_black_box_service_insert" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "black_box_unified_insert" ON public.zoe_black_box_ledger;

-- Owner can read own entries
CREATE POLICY "Owner reads own ledger"
ON public.zoe_black_box_ledger FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all entries via has_role
CREATE POLICY "Admins read all ledger"
ON public.zoe_black_box_ledger FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert their own entries
CREATE POLICY "Users insert own ledger"
ON public.zoe_black_box_ledger FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- =====================================================
-- FIX 3: handle_new_user - add search_path protection
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$;
