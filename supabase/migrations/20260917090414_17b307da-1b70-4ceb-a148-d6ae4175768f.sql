INSERT INTO public.music_reactions (user_id, track_id, track_title, track_artist, reaction)
VALUES ('43f3a0d9-c2ec-4166-9c18-c81bc9e0a7b0', 'qa:vr-social-check', 'VR Social Check', 'QA Friend', 'loved')
ON CONFLICT DO NOTHING;

INSERT INTO public.music_listens (user_id, track_id, track_title, track_artist, track_source)
VALUES ('86a57749-010a-4667-b9b7-bfce0de9241b', 'qa:vr-social-check', 'VR Social Check', 'QA Friend', 'audius');