-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX RLS POLICIES FOR ZOE CORE TABLES
-- Ensures authenticated users can insert their own data
-- ═══════════════════════════════════════════════════════════════════════════════

-- First, drop conflicting policies for behavioral_events
DROP POLICY IF EXISTS "Owner only - insert behavioral events" ON public.behavioral_events;
DROP POLICY IF EXISTS "Users can insert their own behavioral events" ON public.behavioral_events;
DROP POLICY IF EXISTS "Users can insert their own events" ON public.behavioral_events;
DROP POLICY IF EXISTS "Users can insert own behavioral events" ON public.behavioral_events;

-- Create a single unified insert policy for behavioral_events
CREATE POLICY "authenticated_insert_behavioral_events"
ON public.behavioral_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix zoe_settings insert policies
DROP POLICY IF EXISTS "Users can insert own zoe settings" ON public.zoe_settings;
DROP POLICY IF EXISTS "Users can insert their own Lisa settings" ON public.zoe_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.zoe_settings;
DROP POLICY IF EXISTS "Users can insert their own zoe settings" ON public.zoe_settings;

-- Create a single unified insert policy for zoe_settings
CREATE POLICY "authenticated_insert_zoe_settings"
ON public.zoe_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create upsert-friendly policy for zoe_settings
CREATE POLICY "authenticated_upsert_zoe_settings"
ON public.zoe_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix zoe_black_box_ledger policies
DROP POLICY IF EXISTS "Users can insert own black box entries" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "zoe_black_box_insert_policy" ON public.zoe_black_box_ledger;

-- Create unified insert policy for black box ledger (allows null user_id for system events)
CREATE POLICY "authenticated_insert_black_box"
ON public.zoe_black_box_ledger
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Ensure update policy exists for black box
CREATE POLICY "authenticated_update_black_box"
ON public.zoe_black_box_ledger
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);