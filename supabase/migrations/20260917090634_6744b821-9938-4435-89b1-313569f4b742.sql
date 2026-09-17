DELETE FROM public.notifications WHERE type = 'friend_music_listen' AND context_data->>'track_id' = 'qa:vr-social-check';
DELETE FROM public.music_listens WHERE track_id = 'qa:vr-social-check';
DELETE FROM public.music_reactions WHERE track_id = 'qa:vr-social-check';