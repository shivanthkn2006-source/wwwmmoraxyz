-- Create feature_flags table for dynamic VR/platform feature states
CREATE TABLE public.feature_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  category text DEFAULT 'general',
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Service role can manage all flags
CREATE POLICY "Service role full access feature_flags"
ON public.feature_flags FOR ALL
USING (true)
WITH CHECK (true);

-- All authenticated users can read flags
CREATE POLICY "Authenticated users can read feature_flags"
ON public.feature_flags FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert default VR feature flags
INSERT INTO public.feature_flags (feature_key, enabled, description, category) VALUES
  ('omega_world', true, 'VR OMEGA World 3D Memory Palace', 'vr'),
  ('cinematic_pipeline', true, 'Ready Player One Cinematic Post-Processing', 'vr'),
  ('gaussian_splats', true, 'Gaussian Splatting Photorealistic Renderer', 'vr'),
  ('procedural_city', true, 'Procedural Cyber City The Stacks', 'vr'),
  ('multiplayer', true, 'Enterprise Multiplayer Layer', 'vr');

-- Create trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();