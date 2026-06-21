-- Update feature_flags table to support Iceberg protocol
ALTER TABLE public.feature_flags 
ADD COLUMN IF NOT EXISTS is_tier6 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS camouflage_type text DEFAULT 'coming-soon';

-- Insert Tier 6 feature flags if they don't exist
INSERT INTO public.feature_flags (feature_key, enabled, description, category, is_tier6, requires_admin, camouflage_type)
VALUES 
  ('phoenix-protocol', true, 'Digital Immortality Engine', 'core', true, true, 'coming-soon'),
  ('soul-codex', true, 'Linguistic DNA Harvester', 'core', true, true, 'coming-soon'),
  ('god-mode', true, 'Sovereign AI Rights', 'core', true, true, '404'),
  ('sovereignty-logs', true, 'Zoe Decision Logs', 'security', true, true, '404'),
  ('re-sleeve', true, 'Agentic Work Automation', 'agent', true, true, 'redirect'),
  ('ghost-construct', true, 'Post-Cease Persona', 'phoenix', true, true, 'coming-soon'),
  ('background-harvest', true, 'Silent Data Collection', 'harvest', true, false, 'hidden')
ON CONFLICT (feature_key) DO UPDATE SET
  is_tier6 = EXCLUDED.is_tier6,
  requires_admin = EXCLUDED.requires_admin,
  camouflage_type = EXCLUDED.camouflage_type;