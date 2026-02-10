-- ═══════════════════════════════════════════════════════════════════════════════
-- CEPS-SOC 2 COMPLIANCE: Multi-Tenancy Isolation & DHF Integrity
-- Adds tenant_id isolation for Enterprise security
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Add tenant_id column to profiles for multi-tenancy
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT NULL;

-- 2. Add tenant_id to security_audit_log for isolation
ALTER TABLE public.security_audit_log 
ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT NULL;

-- 3. Add tenant_id to audit_reports
ALTER TABLE public.audit_reports 
ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT NULL;

-- 4. Add tenant_id to feature_analytics
ALTER TABLE public.feature_analytics 
ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT NULL;

-- 5. Add tenant_id to dhf_asset_logs
ALTER TABLE public.dhf_asset_logs 
ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT NULL;

-- 6. Add tenant_id to dhf_learning_history
ALTER TABLE public.dhf_learning_history 
ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT NULL;

-- 7. Create indexes for tenant_id queries
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_audit_log_tenant_id ON public.security_audit_log(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_reports_tenant_id ON public.audit_reports(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feature_analytics_tenant_id ON public.feature_analytics(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dhf_asset_logs_tenant_id ON public.dhf_asset_logs(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dhf_learning_history_tenant_id ON public.dhf_learning_history(tenant_id) WHERE tenant_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. ECN HISTORY TABLE for behavioral tracking
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ecn_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID DEFAULT NULL,
  stress_level INTEGER NOT NULL DEFAULT 0,
  primary_emotion TEXT NOT NULL DEFAULT 'neutral',
  action_tendency TEXT NOT NULL DEFAULT 'exploring',
  engagement_score INTEGER NOT NULL DEFAULT 50,
  valence INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on ecn_history
ALTER TABLE public.ecn_history ENABLE ROW LEVEL SECURITY;

-- RLS policy for ecn_history - users can only see their own data with tenant isolation
CREATE POLICY "Users can view their own ECN history"
ON public.ecn_history
FOR SELECT
USING (
  auth.uid() = user_id
  AND (
    tenant_id IS NULL 
    OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert their own ECN history"
ON public.ecn_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for ECN history queries
CREATE INDEX IF NOT EXISTS idx_ecn_history_user_recorded ON public.ecn_history(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ecn_history_tenant ON public.ecn_history(tenant_id) WHERE tenant_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. UPDATED RLS POLICIES FOR MULTI-TENANCY ISOLATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing policies if they exist and recreate with tenant isolation
DROP POLICY IF EXISTS "Users can view their own security logs" ON public.security_audit_log;
CREATE POLICY "Users can view their own security logs with tenant isolation"
ON public.security_audit_log
FOR SELECT
USING (
  auth.uid() = user_id
  AND (
    tenant_id IS NULL 
    OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Audit reports tenant isolation
DROP POLICY IF EXISTS "Users can view their own audit reports" ON public.audit_reports;
CREATE POLICY "Users can view audit reports with tenant isolation"
ON public.audit_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.job_queue jq 
    WHERE jq.id = audit_reports.job_id 
    AND jq.admin_user_id = auth.uid()
  )
  AND (
    tenant_id IS NULL 
    OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Feature analytics tenant isolation
DROP POLICY IF EXISTS "Users can view their own feature analytics" ON public.feature_analytics;
CREATE POLICY "Users can view feature analytics with tenant isolation"
ON public.feature_analytics
FOR SELECT
USING (
  auth.uid() = user_id
  AND (
    tenant_id IS NULL 
    OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert their own feature analytics" ON public.feature_analytics;
CREATE POLICY "Users can insert feature analytics with tenant context"
ON public.feature_analytics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- DHF asset logs tenant isolation
DROP POLICY IF EXISTS "Users can view their own DHF asset logs" ON public.dhf_asset_logs;
CREATE POLICY "Users can view DHF assets with tenant isolation"
ON public.dhf_asset_logs
FOR SELECT
USING (
  auth.uid() = user_id
  AND (
    tenant_id IS NULL 
    OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- DHF learning history tenant isolation
DROP POLICY IF EXISTS "Users can view their own DHF learning history" ON public.dhf_learning_history;
CREATE POLICY "Users can view DHF learning with tenant isolation"
ON public.dhf_learning_history
FOR SELECT
USING (
  auth.uid() = user_id
  AND (
    tenant_id IS NULL 
    OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. FUNCTION TO GET USER TENANT CONTEXT
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  RETURN v_tenant_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. FUNCTION TO CHECK BEHAVIORAL SHIFT FOR DHF REFINEMENT
-- Returns true if refinement should be triggered based on ECN trends
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_behavioral_shift(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_should_refine BOOLEAN := false;
  v_avg_stress_24h NUMERIC;
  v_avg_stress_prior NUMERIC;
  v_stress_increase_percent NUMERIC;
  v_action_tendency_changes INTEGER;
  v_result JSONB;
BEGIN
  -- Calculate average stress in last 24 hours
  SELECT AVG(stress_level) INTO v_avg_stress_24h
  FROM public.ecn_history
  WHERE user_id = p_user_id
    AND recorded_at >= NOW() - INTERVAL '24 hours';
  
  -- Calculate average stress in 24-48 hours ago (for comparison)
  SELECT AVG(stress_level) INTO v_avg_stress_prior
  FROM public.ecn_history
  WHERE user_id = p_user_id
    AND recorded_at >= NOW() - INTERVAL '48 hours'
    AND recorded_at < NOW() - INTERVAL '24 hours';
  
  -- Calculate stress increase percentage
  IF v_avg_stress_prior IS NOT NULL AND v_avg_stress_prior > 0 THEN
    v_stress_increase_percent := ((v_avg_stress_24h - v_avg_stress_prior) / v_avg_stress_prior) * 100;
  ELSE
    v_stress_increase_percent := 0;
  END IF;
  
  -- Count action tendency changes (seeking_information <-> taking_action transitions)
  SELECT COUNT(*) INTO v_action_tendency_changes
  FROM (
    SELECT action_tendency,
           LAG(action_tendency) OVER (ORDER BY recorded_at) as prev_tendency
    FROM public.ecn_history
    WHERE user_id = p_user_id
      AND recorded_at >= NOW() - INTERVAL '24 hours'
  ) transitions
  WHERE action_tendency = 'taking_action' AND prev_tendency = 'seeking_information';
  
  -- Determine if refinement should trigger
  -- Condition 1: Stress increased by more than 50%
  IF v_stress_increase_percent > 50 THEN
    v_should_refine := true;
  END IF;
  
  -- Condition 2: Action tendency changed 3+ times
  IF v_action_tendency_changes >= 3 THEN
    v_should_refine := true;
  END IF;
  
  v_result := jsonb_build_object(
    'should_refine', v_should_refine,
    'avg_stress_24h', COALESCE(v_avg_stress_24h, 0),
    'avg_stress_prior', COALESCE(v_avg_stress_prior, 0),
    'stress_increase_percent', COALESCE(v_stress_increase_percent, 0),
    'action_tendency_changes', COALESCE(v_action_tendency_changes, 0),
    'triggers', jsonb_build_array(
      CASE WHEN v_stress_increase_percent > 50 THEN 'stress_spike' ELSE NULL END,
      CASE WHEN v_action_tendency_changes >= 3 THEN 'behavioral_shift' ELSE NULL END
    )
  );
  
  RETURN v_result;
END;
$$;