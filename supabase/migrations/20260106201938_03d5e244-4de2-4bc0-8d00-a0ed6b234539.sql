-- Fix ECN history RLS policies for proper insert access
DROP POLICY IF EXISTS "Owner only - insert ECN history" ON public.ecn_history;

CREATE POLICY "Users can insert their own ECN history"
ON public.ecn_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Also add UPDATE and DELETE for completeness
DROP POLICY IF EXISTS "Owner only - update ECN history" ON public.ecn_history;
CREATE POLICY "Users can update their own ECN history"
ON public.ecn_history
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner only - delete ECN history" ON public.ecn_history;
CREATE POLICY "Users can delete their own ECN history"
ON public.ecn_history
FOR DELETE
USING (auth.uid() = user_id);