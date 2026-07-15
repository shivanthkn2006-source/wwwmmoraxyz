import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Subscribe to real-time INSERTs on `posts` and show an on-screen toast
 * when another user publishes a new post or loop video.
 *
 * - Skips posts authored by the current user.
 * - Fetches the author's display name for a friendlier message.
 * - Dispatches `mmora:new-post` so other UI (e.g. feed refresh) can react.
 */
export const useNewPostNotifications = (currentUserId?: string | null) => {
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`new-posts-notifier-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          try {
            const row: any = payload.new;
            if (!row || row.user_id === currentUserId) return;

            let author = 'Someone';
            try {
              const { data } = await supabase
                .from('profiles')
                .select('display_name, username')
                .eq('user_id', row.user_id)
                .maybeSingle();
              if (data?.display_name) author = data.display_name;
              else if (data?.username) author = data.username;
            } catch {
              /* non-fatal */
            }

            const isVideo = typeof row.media_type === 'string' && row.media_type.startsWith('video');
            const label = isVideo ? 'shared a new loop video' : 'shared a new post';

            toast(`${author} ${label}`, {
              description: (typeof row.content === 'string' && row.content.trim()) || undefined,
              duration: 5000,
              action: {
                label: 'View',
                onClick: () => {
                  window.dispatchEvent(new CustomEvent('mmora:new-post-view', { detail: row }));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                },
              },
            });

            window.dispatchEvent(new CustomEvent('mmora:new-post', { detail: row }));
          } catch (e) {
            console.warn('[useNewPostNotifications] handler failed', e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);
};
