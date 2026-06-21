
-- PHASE 1: THE GOLDEN RECORD - Regression Snapshots
CREATE TABLE public.regression_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL,
  test_input JSONB NOT NULL DEFAULT '{}'::jsonb,
  expected_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  screenshot_url TEXT,
  is_baseline BOOLEAN NOT NULL DEFAULT false,
  captured_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  version_tag TEXT
);

-- Enable RLS
ALTER TABLE public.regression_snapshots ENABLE ROW LEVEL SECURITY;

-- Policies: Only authenticated users can manage snapshots
CREATE POLICY "Users can view all snapshots" ON public.regression_snapshots
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create snapshots" ON public.regression_snapshots
  FOR INSERT WITH CHECK (auth.uid() = captured_by);

CREATE POLICY "Users can update own snapshots" ON public.regression_snapshots
  FOR UPDATE USING (auth.uid() = captured_by);

CREATE POLICY "Users can delete own snapshots" ON public.regression_snapshots
  FOR DELETE USING (auth.uid() = captured_by);

-- Index for fast lookups
CREATE INDEX idx_regression_snapshots_feature ON public.regression_snapshots(feature_name);
CREATE INDEX idx_regression_snapshots_baseline ON public.regression_snapshots(is_baseline) WHERE is_baseline = true;
