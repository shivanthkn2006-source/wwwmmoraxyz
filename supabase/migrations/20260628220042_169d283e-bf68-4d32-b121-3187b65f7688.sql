CREATE TABLE IF NOT EXISTS public.zoe_genesis_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'ASK_NAME',
  name TEXT,
  nickname TEXT,
  age INTEGER,
  dob DATE,
  location JSONB,
  life_stage TEXT,
  zoe_name TEXT,
  zoe_gender TEXT,
  completed_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoe_genesis_memory TO authenticated;
GRANT ALL ON public.zoe_genesis_memory TO service_role;

ALTER TABLE public.zoe_genesis_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own genesis memory"
  ON public.zoe_genesis_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.zoe_genesis_memory_touch()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER zoe_genesis_memory_touch_trg
  BEFORE UPDATE ON public.zoe_genesis_memory
  FOR EACH ROW EXECUTE FUNCTION public.zoe_genesis_memory_touch();