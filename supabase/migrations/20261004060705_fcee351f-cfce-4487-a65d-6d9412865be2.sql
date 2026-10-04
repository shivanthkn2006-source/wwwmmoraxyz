CREATE TABLE public.vr_bag_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (char_length(item_type) <= 40),
  rarity text NOT NULL CHECK (rarity IN ('common','uncommon','rare','epic','legendary')),
  collected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vr_bag_items_user_idx ON public.vr_bag_items(user_id, collected_at DESC);
GRANT SELECT, INSERT, DELETE ON public.vr_bag_items TO authenticated;
GRANT ALL ON public.vr_bag_items TO service_role;
ALTER TABLE public.vr_bag_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see their own bag" ON public.vr_bag_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members add to their own bag" ON public.vr_bag_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members remove from their own bag" ON public.vr_bag_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.vr_quest_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id text NOT NULL CHECK (char_length(quest_id) <= 40),
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 1000),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_id)
);
GRANT SELECT, INSERT, UPDATE ON public.vr_quest_progress TO authenticated;
GRANT ALL ON public.vr_quest_progress TO service_role;
ALTER TABLE public.vr_quest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see their own quests" ON public.vr_quest_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members start their own quests" ON public.vr_quest_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members update their own quests" ON public.vr_quest_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.notification_kinds(kind, feature, label) VALUES
  ('vr_quest_complete', 'vr', 'VR quest completed')
ON CONFLICT (kind) DO NOTHING;