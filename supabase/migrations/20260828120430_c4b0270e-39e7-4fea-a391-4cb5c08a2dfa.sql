GRANT DELETE ON public.growth_feed_items TO authenticated;
DROP POLICY IF EXISTS "growth_items_owner_delete" ON public.growth_feed_items;
CREATE POLICY "growth_items_owner_delete" ON public.growth_feed_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);