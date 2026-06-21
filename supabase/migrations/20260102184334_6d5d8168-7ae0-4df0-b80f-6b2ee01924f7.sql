-- ===============================================
-- SECURITY FIX: RLS Policy Hardening
-- ===============================================

-- 1. FIX DHF_LEARNING_HISTORY - Remove service role bypass, keep only owner policies
-- Drop the permissive service role policy that allows true (all access)
DROP POLICY IF EXISTS "Service role can manage DHF learning" ON public.dhf_learning_history;
DROP POLICY IF EXISTS "Users can view DHF learning with tenant isolation" ON public.dhf_learning_history;

-- 2. FIX INVITE_CODES - Restrict enumeration attack surface
-- Remove the overly permissive "Anyone can validate" policy
DROP POLICY IF EXISTS "Anyone can validate active invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Public can validate active invite codes" ON public.invite_codes;

-- Create a more restricted policy - only allow validation via RPC function
-- Users should only be able to check if a SPECIFIC code is valid, not enumerate all
CREATE POLICY "Validate single invite code only"
ON public.invite_codes FOR SELECT
USING (
  -- Admins can see all
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.username = ANY (ARRAY['moksh50', 'Justmkbhd'])
  )
  OR
  -- Service role bypass for backend validation
  auth.role() = 'service_role'
);

-- 3. FIX PROFILES - Restrict public profile visibility to safe fields only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Friends can view limited profile info" ON public.profiles;

-- Create restrictive policies
-- Policy 1: Users can always see their own full profile
CREATE POLICY "Users see own full profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Friends can view ONLY safe fields via safe_public_profiles view
-- Direct table access is restricted to own profile only
-- Note: The safe_public_profiles view should be used for viewing other profiles

-- 4. Create a secure function for invite code validation (no enumeration)
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Only return if valid - don't leak info about invalid codes
  SELECT jsonb_build_object(
    'valid', true,
    'tier', tier,
    'remaining_uses', CASE 
      WHEN max_uses IS NULL THEN 999
      ELSE max_uses - COALESCE(current_uses, 0)
    END
  ) INTO v_result
  FROM public.invite_codes
  WHERE code = p_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR COALESCE(current_uses, 0) < max_uses);
  
  -- Return false for any invalid/missing code (no info leakage)
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  
  RETURN v_result;
END;
$$;

-- Grant execute to public for validation during signup
GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO authenticated;