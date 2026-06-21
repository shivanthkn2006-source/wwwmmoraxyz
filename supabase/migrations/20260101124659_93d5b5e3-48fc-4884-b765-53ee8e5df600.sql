-- ═══════════════════════════════════════════════════════════════════════════════
-- ZOE BLACK BOX LEDGER - Immutable Flight Recorder (WORM Storage)
-- Write Once, Read Many - Cannot be deleted or updated by anyone
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create the Black Box Ledger table
CREATE TABLE IF NOT EXISTS public.zoe_black_box_ledger (
  event_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'security',
  encrypted_payload JSONB NOT NULL DEFAULT '{}',
  genesis_signature TEXT NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'zoe_core',
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'critical', 'emp')),
  metadata JSONB DEFAULT '{}',
  integrity_hash TEXT NOT NULL
);

-- Add comment describing the table's purpose
COMMENT ON TABLE public.zoe_black_box_ledger IS 
  'Immutable flight recorder for Zoe. WORM storage - Write Once, Read Many. Cannot be deleted or updated.';

-- Create indexes for efficient querying (read-only operations)
CREATE INDEX IF NOT EXISTS idx_black_box_timestamp ON public.zoe_black_box_ledger(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_black_box_user_id ON public.zoe_black_box_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_black_box_event_type ON public.zoe_black_box_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_black_box_severity ON public.zoe_black_box_ledger(severity);
CREATE INDEX IF NOT EXISTS idx_black_box_category ON public.zoe_black_box_ledger(event_category);

-- Enable RLS
ALTER TABLE public.zoe_black_box_ledger ENABLE ROW LEVEL SECURITY;

-- WORM Policy 1: Allow INSERT for authenticated users
CREATE POLICY "zoe_black_box_insert_policy" 
ON public.zoe_black_box_ledger 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- WORM Policy 2: Allow INSERT for service role (edge functions)
CREATE POLICY "zoe_black_box_service_insert" 
ON public.zoe_black_box_ledger 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- WORM Policy 3: Allow SELECT for authenticated users (read their own records)
CREATE POLICY "zoe_black_box_select_own" 
ON public.zoe_black_box_ledger 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- WORM Policy 4: Allow SELECT for service role (read all)
CREATE POLICY "zoe_black_box_service_select" 
ON public.zoe_black_box_ledger 
FOR SELECT 
TO service_role
USING (true);

-- CRITICAL: NO UPDATE POLICY - Updates are forbidden (WORM)
-- CRITICAL: NO DELETE POLICY - Deletes are forbidden (WORM)

-- Create trigger to prevent any bypass attempts using a function
CREATE OR REPLACE FUNCTION public.prevent_black_box_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'BLACK BOX LEDGER: Modification forbidden - WORM storage policy violation';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to block UPDATE attempts
CREATE TRIGGER black_box_prevent_update
BEFORE UPDATE ON public.zoe_black_box_ledger
FOR EACH ROW
EXECUTE FUNCTION public.prevent_black_box_modification();

-- Trigger to block DELETE attempts  
CREATE TRIGGER black_box_prevent_delete
BEFORE DELETE ON public.zoe_black_box_ledger
FOR EACH ROW
EXECUTE FUNCTION public.prevent_black_box_modification();

-- Enable realtime for audit trail monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.zoe_black_box_ledger;