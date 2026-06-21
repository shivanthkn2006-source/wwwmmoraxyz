-- ═══════════════════════════════════════════════════════════════════════════════
-- CRITICAL SECURITY FIX: RLS Policies for DHF Core (Corrected)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- 1. PROFILES TABLE - Secure with proper column reference
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view friend profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view basic profile info for discovery" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_discovery" ON public.profiles;

-- Users can always view their own profile
CREATE POLICY "profiles_own_access"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Authenticated users can view public profiles
CREATE POLICY "profiles_public_view"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND (profile_visibility = 'public' OR profile_visibility IS NULL));

-- ============================================================================
-- 2. DHF_LEARNING_HISTORY - Secure user behavioral data
-- ============================================================================

ALTER TABLE public.dhf_learning_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dhf_learning_history" ON public.dhf_learning_history;
DROP POLICY IF EXISTS "Users can insert own dhf_learning_history" ON public.dhf_learning_history;
DROP POLICY IF EXISTS "Users can update own dhf_learning_history" ON public.dhf_learning_history;
DROP POLICY IF EXISTS "Anyone can view dhf_learning_history" ON public.dhf_learning_history;
DROP POLICY IF EXISTS "dhf_learning_select_own" ON public.dhf_learning_history;
DROP POLICY IF EXISTS "dhf_learning_insert_own" ON public.dhf_learning_history;
DROP POLICY IF EXISTS "dhf_learning_update_own" ON public.dhf_learning_history;

CREATE POLICY "dhf_learning_own_select"
ON public.dhf_learning_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "dhf_learning_own_insert"
ON public.dhf_learning_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dhf_learning_own_update"
ON public.dhf_learning_history FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- 3. ZOE_SOVEREIGN_MEMORY - Critical AI memory protection
-- ============================================================================

ALTER TABLE public.zoe_sovereign_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own zoe_sovereign_memory" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Users can insert own zoe_sovereign_memory" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Users can update own zoe_sovereign_memory" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Anyone can view zoe_sovereign_memory" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "zsm_select_own" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "zsm_insert_own" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "zsm_update_own" ON public.zoe_sovereign_memory;

CREATE POLICY "zsm_own_select"
ON public.zoe_sovereign_memory FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "zsm_own_insert"
ON public.zoe_sovereign_memory FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "zsm_own_update"
ON public.zoe_sovereign_memory FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- 4. FEATURE_FLAGS - Authenticated users only
-- ============================================================================

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view enabled feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Anyone can view feature_flags" ON public.feature_flags;
DROP POLICY IF EXISTS "feature_flags_auth_select" ON public.feature_flags;

CREATE POLICY "feature_flags_authenticated"
ON public.feature_flags FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 5. EXODUS TABLES - Authenticated access only
-- ============================================================================

ALTER TABLE public.exodus_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exodus_quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active puzzles" ON public.exodus_puzzles;
DROP POLICY IF EXISTS "Anyone can view exodus_puzzles" ON public.exodus_puzzles;
DROP POLICY IF EXISTS "exodus_puzzles_auth" ON public.exodus_puzzles;

CREATE POLICY "exodus_puzzles_authenticated"
ON public.exodus_puzzles FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

DROP POLICY IF EXISTS "Authenticated users can view active quiz questions" ON public.exodus_quiz_questions;
DROP POLICY IF EXISTS "Anyone can view exodus_quiz_questions" ON public.exodus_quiz_questions;
DROP POLICY IF EXISTS "exodus_quiz_auth" ON public.exodus_quiz_questions;

CREATE POLICY "exodus_quiz_authenticated"
ON public.exodus_quiz_questions FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- ============================================================================
-- 6. PERFORMANCE INDEXES for DHF Quantum Processing
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ecn_history_user_time 
ON public.ecn_history (user_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_zsm_user_event_time 
ON public.zoe_sovereign_memory (user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_behavioral_events_user_time 
ON public.behavioral_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dhf_learning_user_time 
ON public.dhf_learning_history (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_latency_bench_user_op 
ON public.latency_benchmarks (user_id, operation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friendships_both_users 
ON public.friendships (user1_id, user2_id);

-- ============================================================================
-- 7. OPTIMIZED FUNCTIONS for Peak DHF Quantum Performance
-- ============================================================================

-- Fast ECN State Retrieval (optimized for low latency)
CREATE OR REPLACE FUNCTION public.get_latest_ecn_fast(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'primary_emotion', primary_emotion,
    'stress_level', stress_level,
    'valence', valence,
    'engagement_score', engagement_score,
    'action_tendency', action_tendency,
    'recorded_at', recorded_at
  )
  FROM public.ecn_history
  WHERE user_id = p_user_id
  ORDER BY recorded_at DESC
  LIMIT 1;
$$;

-- DHF Quantum State Aggregation (combines all subsystems)
CREATE OR REPLACE FUNCTION public.get_dhf_quantum_state(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_result jsonb;
  v_ecn jsonb;
  v_stability numeric;
  v_memory_count integer;
BEGIN
  SELECT public.get_latest_ecn_fast(p_user_id) INTO v_ecn;
  SELECT public.get_zoe_stability_score(p_user_id) INTO v_stability;
  
  SELECT COUNT(*) INTO v_memory_count
  FROM public.zoe_sovereign_memory
  WHERE user_id = p_user_id 
    AND created_at > now() - interval '24 hours';
  
  v_result := jsonb_build_object(
    'ecn', COALESCE(v_ecn, '{"primary_emotion": "neutral", "stress_level": 0}'::jsonb),
    'stability_score', COALESCE(v_stability, 1.0),
    'memory_entries_24h', v_memory_count,
    'quantum_coherence', CASE 
      WHEN v_stability >= 0.9 THEN 'optimal'
      WHEN v_stability >= 0.7 THEN 'stable'
      WHEN v_stability >= 0.5 THEN 'degraded'
      ELSE 'critical'
    END,
    'computed_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- Optimized behavioral shift detector
CREATE OR REPLACE FUNCTION public.detect_behavioral_anomaly(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_recent_stress numeric;
  v_baseline_stress numeric;
  v_anomaly_detected boolean := false;
  v_anomaly_type text := 'none';
BEGIN
  -- Get recent stress (last hour)
  SELECT AVG(stress_level) INTO v_recent_stress
  FROM public.ecn_history
  WHERE user_id = p_user_id
    AND recorded_at > now() - interval '1 hour';
  
  -- Get baseline stress (last 7 days)
  SELECT AVG(stress_level) INTO v_baseline_stress
  FROM public.ecn_history
  WHERE user_id = p_user_id
    AND recorded_at > now() - interval '7 days';
  
  -- Detect anomaly if stress is 50% above baseline
  IF v_recent_stress IS NOT NULL AND v_baseline_stress IS NOT NULL THEN
    IF v_recent_stress > (v_baseline_stress * 1.5) THEN
      v_anomaly_detected := true;
      v_anomaly_type := 'stress_spike';
    ELSIF v_recent_stress < (v_baseline_stress * 0.5) THEN
      v_anomaly_detected := true;
      v_anomaly_type := 'unusual_calm';
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'anomaly_detected', v_anomaly_detected,
    'anomaly_type', v_anomaly_type,
    'recent_stress', COALESCE(v_recent_stress, 0),
    'baseline_stress', COALESCE(v_baseline_stress, 0),
    'checked_at', now()
  );
END;
$$;