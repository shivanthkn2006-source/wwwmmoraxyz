ALTER TABLE public.humor_drops DROP CONSTRAINT IF EXISTS humor_drops_drop_date_slot_metal_key;
CREATE UNIQUE INDEX IF NOT EXISTS humor_drops_zoe_slot_unique
  ON public.humor_drops (drop_date, slot, metal)
  WHERE origin = 'zoe';