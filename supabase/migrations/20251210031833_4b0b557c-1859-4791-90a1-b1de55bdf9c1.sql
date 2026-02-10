-- Fix ECN Analysis Queue security: Ensure users can only view their own analysis data
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Service role manages ECN queue" ON ecn_analysis_queue;

-- Create proper INSERT policy for authenticated users
CREATE POLICY "Users can insert their own ECN analysis"
ON ecn_analysis_queue
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Keep existing SELECT policy for users to view their own data
-- The existing policy "Users can view their own analysis" is already correct