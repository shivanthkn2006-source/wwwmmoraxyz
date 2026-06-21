
-- ============================================================
-- 1. FIX zoe_sovereign_memory
-- ============================================================
-- Drop the dangerous public-role policy
DROP POLICY IF EXISTS "Service role full access" ON public.zoe_sovereign_memory;

-- Drop duplicate user policies (keep only one set)
DROP POLICY IF EXISTS "Users can create own memories" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Users can delete own memories" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Users can update own memories" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Users can view own memories" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "sovereign_memory_read_own" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "sovereign_memory_unified_insert" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "zsm_own_insert" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "zsm_own_select" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "zsm_own_update" ON public.zoe_sovereign_memory;

-- Keep owner-only policies
-- (Owner only - view/insert/update/delete sovereign memory already exist, keep those)

-- Add proper service_role policy
CREATE POLICY "Service role zsm access"
ON public.zoe_sovereign_memory
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- 2. FIX face_login_attempts
-- ============================================================
DROP POLICY IF EXISTS "Service role can read face login attempts" ON public.face_login_attempts;

CREATE POLICY "Service role reads face logins"
ON public.face_login_attempts
FOR SELECT
TO service_role
USING (true);

-- ============================================================
-- 3. FIX zoe_synthetic_scenarios
-- ============================================================
DROP POLICY IF EXISTS "Service role can manage all scenarios" ON public.zoe_synthetic_scenarios;

CREATE POLICY "Service role manages scenarios"
ON public.zoe_synthetic_scenarios
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- 4. FIX exodus_players - restrict leaderboard to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Users can view all players for leaderboard" ON public.exodus_players;

CREATE POLICY "Authenticated can view leaderboard"
ON public.exodus_players
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 5. FIX storage bucket policies - add ownership checks
-- ============================================================

-- Fix avatars INSERT
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix avatars UPDATE
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix posts INSERT
DROP POLICY IF EXISTS "Users can upload posts media" ON storage.objects;
CREATE POLICY "Users can upload posts media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'posts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix posts UPDATE
DROP POLICY IF EXISTS "Users can update their posts media" ON storage.objects;
CREATE POLICY "Users can update their posts media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'posts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
