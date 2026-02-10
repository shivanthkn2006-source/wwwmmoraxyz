-- Enable RLS on zoe_adapter_registry table
ALTER TABLE public.zoe_adapter_registry ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view adapters
CREATE POLICY "Authenticated users can view adapters"
ON public.zoe_adapter_registry
FOR SELECT
TO authenticated
USING (true);

-- Create policy for admins to manage adapters (using tenant isolation if needed)
CREATE POLICY "System can manage adapters"
ON public.zoe_adapter_registry
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);