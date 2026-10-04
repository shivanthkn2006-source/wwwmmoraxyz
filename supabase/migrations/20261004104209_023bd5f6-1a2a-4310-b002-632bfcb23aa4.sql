INSERT INTO public.notification_kinds(kind, feature, label, enabled) VALUES
 ('vr_doorway','vr','Walked through the doorway into M''Mora World',true),
 ('vr_relic_found','vr','Street relic found on the real map',true),
 ('vr_player_met','vr','Met another member in VR World',true)
ON CONFLICT (kind) DO NOTHING;

ALTER TABLE public.notification_settings ALTER COLUMN share_real_location SET DEFAULT true;
UPDATE public.notification_settings SET share_real_location = true WHERE share_real_location IS DISTINCT FROM true;