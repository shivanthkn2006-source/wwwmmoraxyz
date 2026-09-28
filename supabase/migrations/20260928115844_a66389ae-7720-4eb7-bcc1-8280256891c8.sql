CREATE TABLE public.zoe_voice_traits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cues jsonb NOT NULL DEFAULT '{}'::jsonb,
  topics jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.zoe_voice_traits TO authenticated;
GRANT ALL ON public.zoe_voice_traits TO service_role;
ALTER TABLE public.zoe_voice_traits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own traits select" ON public.zoe_voice_traits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own traits insert" ON public.zoe_voice_traits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own traits update" ON public.zoe_voice_traits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.zoe_frequent_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoe_frequent_answers TO authenticated;
GRANT ALL ON public.zoe_frequent_answers TO service_role;
ALTER TABLE public.zoe_frequent_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own answers all" ON public.zoe_frequent_answers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);