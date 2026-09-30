DELETE FROM public.selfie_city_pins WHERE image_url LIKE 'https://upload.wikimedia.org/%' AND created_at = '2026-09-30 11:36:55.556134+00';

CREATE TABLE public.member_live_locations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  place text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_live_locations TO authenticated;
GRANT ALL ON public.member_live_locations TO service_role;
ALTER TABLE public.member_live_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see recent live locations" ON public.member_live_locations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR updated_at > now() - interval '30 minutes');
CREATE POLICY "Members share own location" ON public.member_live_locations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members update own location" ON public.member_live_locations FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members remove own location" ON public.member_live_locations FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Round to ~1 km so exact home addresses are never shared
CREATE OR REPLACE FUNCTION public.round_live_location() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.lat := round(NEW.lat::numeric, 2); NEW.lng := round(NEW.lng::numeric, 2); NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER round_live_location BEFORE INSERT OR UPDATE ON public.member_live_locations FOR EACH ROW EXECUTE FUNCTION public.round_live_location();

ALTER PUBLICATION supabase_realtime ADD TABLE public.member_live_locations;