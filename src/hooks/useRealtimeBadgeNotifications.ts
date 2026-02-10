import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export const useRealtimeBadgeNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Listen for friend badge notifications
    const badgeChannel = supabase
      .channel('friend-badge-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const notification = payload.new;
          
          if (notification.type === 'friend_badge_earned') {
            const contextData = notification.context_data as any;
            
            // Fetch friend info
            const { data: friend } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', notification.from_user_id)
              .single();

            toast({
              title: '🎉 Friend Achievement!',
              description: `${friend?.display_name || 'A friend'} earned ${contextData?.badge_icon} ${contextData?.badge_name}!`,
              duration: 5000,
            });
          }

          if (notification.type === 'friend_challenge_completed') {
            // Fetch friend info and challenge info
            const { data: friend } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', notification.from_user_id)
              .single();

            toast({
              title: '🏆 Challenge Complete!',
              description: `${friend?.display_name || 'A friend'} completed a challenge!`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(badgeChannel);
    };
  }, [user, toast]);
};
