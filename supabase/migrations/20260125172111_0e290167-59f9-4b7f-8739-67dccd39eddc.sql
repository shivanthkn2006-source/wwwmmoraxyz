-- Fix biometric_auth_events RLS policy for INSERT
-- Currently failing with "new row violates row-level security policy"

-- First check existing policies and add proper INSERT policy
CREATE POLICY "Users can insert own biometric auth events"
ON public.biometric_auth_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Also add SELECT policy so users can read their own events
CREATE POLICY "Users can view own biometric auth events"
ON public.biometric_auth_events
FOR SELECT
USING (auth.uid() = user_id);