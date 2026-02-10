-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: BLACK BOX LEDGER RLS POLICY FOR 500 SPARTANS
-- 
-- The current policy requires auth.uid() = user_id, but:
-- 1. System events have NULL user_id
-- 2. Some events happen before auth is available
-- 3. Genesis cron runs with service role (no auth.uid())
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop the conflicting policies
DROP POLICY IF EXISTS "authenticated_insert" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own records" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "Allow users to insert their own records" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "System can insert any record" ON public.zoe_black_box_ledger;

-- Create unified insert policy that handles:
-- 1. Authenticated users inserting their own records (user_id = auth.uid())
-- 2. System events with NULL user_id (allowed for logging)
-- 3. Service role access (for cron jobs)
CREATE POLICY "black_box_unified_insert" 
ON public.zoe_black_box_ledger 
FOR INSERT 
WITH CHECK (
  -- Allow if user_id matches authenticated user
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  -- OR allow if user_id is NULL (system events)
  OR user_id IS NULL
);

-- Ensure select policy exists for users to read their own records
DROP POLICY IF EXISTS "Users can read their own records" ON public.zoe_black_box_ledger;
CREATE POLICY "black_box_read_own" 
ON public.zoe_black_box_ledger 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR user_id IS NULL
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: ZOE_SOVEREIGN_MEMORY for batch cursor (system user UUID)
-- Allow inserts for the system user ID used by genesis batch processor
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "sovereign_memory_insert" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own records" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "authenticated_insert" ON public.zoe_sovereign_memory;

CREATE POLICY "sovereign_memory_unified_insert"
ON public.zoe_sovereign_memory
FOR INSERT
WITH CHECK (
  -- Allow if user_id matches authenticated user
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  -- OR allow system user ID for batch processing
  OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
);

-- Ensure users can read their own sovereign memory
DROP POLICY IF EXISTS "Users can read their own memory" ON public.zoe_sovereign_memory;
CREATE POLICY "sovereign_memory_read_own"
ON public.zoe_sovereign_memory
FOR SELECT
USING (
  auth.uid() = user_id
  OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
);