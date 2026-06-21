
-- PHASE 3: Visual Integrity - Critical User Paths & Visual Regression Results
CREATE TABLE public.critical_user_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_name TEXT NOT NULL,
  route TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout_tolerances JSONB NOT NULL DEFAULT '{"max_shift_px": 10}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.visual_regression_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id UUID REFERENCES public.critical_user_paths(id),
  run_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  elements_found JSONB DEFAULT '[]'::jsonb,
  elements_missing JSONB DEFAULT '[]'::jsonb,
  layout_shifts JSONB DEFAULT '[]'::jsonb,
  max_shift_px NUMERIC DEFAULT 0,
  triggered_by TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.critical_user_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_regression_results ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view paths" ON public.critical_user_paths
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage paths" ON public.critical_user_paths
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view visual results" ON public.visual_regression_results
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create visual results" ON public.visual_regression_results
  FOR INSERT WITH CHECK (auth.uid() = run_by);

-- Index
CREATE INDEX idx_visual_results_status ON public.visual_regression_results(status);
CREATE INDEX idx_critical_paths_active ON public.critical_user_paths(is_active) WHERE is_active = true;
