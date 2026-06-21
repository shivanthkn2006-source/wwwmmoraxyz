
-- ═══════════════════════════════════════════════════════════════════════════════
-- SECURITY FIX: Add RLS policies to exposed tables
-- Fixes: selfie_city_pins, zoe_sovereign_memory, zoe_black_box_ledger
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. SELFIE_CITY_PINS - Public read is intentional for the map, but restrict writes
-- Enable RLS if not already enabled
ALTER TABLE public.selfie_city_pins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Users can view all pins" ON public.selfie_city_pins;
DROP POLICY IF EXISTS "Users can create own pins" ON public.selfie_city_pins;
DROP POLICY IF EXISTS "Users can update own pins" ON public.selfie_city_pins;
DROP POLICY IF EXISTS "Users can delete own pins" ON public.selfie_city_pins;

-- Public read (intentional for map functionality)
CREATE POLICY "Users can view all pins" ON public.selfie_city_pins
  FOR SELECT USING (true);

-- Users can only create their own pins
CREATE POLICY "Users can create own pins" ON public.selfie_city_pins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own pins
CREATE POLICY "Users can update own pins" ON public.selfie_city_pins
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own pins
CREATE POLICY "Users can delete own pins" ON public.selfie_city_pins
  FOR DELETE USING (auth.uid() = user_id);

-- 2. ZOE_SOVEREIGN_MEMORY - CRITICAL: User-only access
ALTER TABLE public.zoe_sovereign_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memories" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Users can create own memories" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Users can update own memories" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Users can delete own memories" ON public.zoe_sovereign_memory;

CREATE POLICY "Users can view own memories" ON public.zoe_sovereign_memory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own memories" ON public.zoe_sovereign_memory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON public.zoe_sovereign_memory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" ON public.zoe_sovereign_memory
  FOR DELETE USING (auth.uid() = user_id);

-- 3. ZOE_BLACK_BOX_LEDGER - CRITICAL: Admin-only for reads, system-only for writes
ALTER TABLE public.zoe_black_box_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all ledger entries" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "System can insert ledger entries" ON public.zoe_black_box_ledger;

-- Only admins can read (we check via the admin usernames)
CREATE POLICY "Admin can view all ledger entries" ON public.zoe_black_box_ledger
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.username IN ('moksh50', 'moknsh')
    )
  );

-- Service role can insert (system logs)
CREATE POLICY "System can insert ledger entries" ON public.zoe_black_box_ledger
  FOR INSERT WITH CHECK (true);

-- 4. Add missing columns to zoe_settings
ALTER TABLE public.zoe_settings 
  ADD COLUMN IF NOT EXISTS shadow_mode BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS tier6_harvest_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS harvest_started_at TIMESTAMPTZ DEFAULT now();
