-- Fix ecn_history INSERT RLS policy (add WITH CHECK clause)
DROP POLICY IF EXISTS "Users can insert their own ECN history" ON public.ecn_history;

CREATE POLICY "Users can insert their own ECN history" 
ON public.ecn_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);