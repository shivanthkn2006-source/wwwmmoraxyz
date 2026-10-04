INSERT INTO public.notification_kinds(kind, feature, label, enabled) VALUES
 ('vr_invite','vr','A friend invited you to meet at the VR World portal',true)
ON CONFLICT (kind) DO NOTHING;