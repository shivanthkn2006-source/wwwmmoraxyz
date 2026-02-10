
-- Fix HIGH-RISK permissive RLS policies for user data tables

-- 1. Fix private_timelines - add user_id column first (design flaw fix)
ALTER TABLE public.private_timelines 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policy
DROP POLICY IF EXISTS "Users can create private timelines" ON public.private_timelines;

-- Create proper policy requiring user_id match
CREATE POLICY "Users can create own private timelines" 
ON public.private_timelines 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add SELECT policy for users to view their own timelines
CREATE POLICY "Users can view own private timelines" 
ON public.private_timelines 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Add UPDATE policy for users to update their own timelines
CREATE POLICY "Users can update own private timelines" 
ON public.private_timelines 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Add DELETE policy for users to delete their own timelines
CREATE POLICY "Users can delete own private timelines" 
ON public.private_timelines 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- 2. Fix brand_sponsorship_alerts
DROP POLICY IF EXISTS "System can insert sponsorship alerts" ON public.brand_sponsorship_alerts;
CREATE POLICY "Users can receive own sponsorship alerts" 
ON public.brand_sponsorship_alerts 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can update sponsorship alerts" ON public.brand_sponsorship_alerts;
CREATE POLICY "Users can update own sponsorship alerts" 
ON public.brand_sponsorship_alerts 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- 3. Fix divine_notifications
DROP POLICY IF EXISTS "Service can insert notifications" ON public.divine_notifications;
CREATE POLICY "Users can receive own notifications" 
ON public.divine_notifications 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Fix phoenix_legacy_messages
DROP POLICY IF EXISTS "Service can insert legacy messages" ON public.phoenix_legacy_messages;
CREATE POLICY "Users can create own legacy messages" 
ON public.phoenix_legacy_messages 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);
