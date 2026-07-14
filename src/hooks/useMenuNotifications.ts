import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface MenuNotifications {
  home: number; // global/friends/loops posts
  camera: number; // new filters, features
  chat: number; // messages, replies, likes
  huddle: number; // activity, friends online, location
  webdrop: number; // interpretive AI, architect, creations
  timeline: number; // universal timeline updates
  dreams: number; // dreams AI notifications
  solar: number; // solar system features
}

export const useMenuNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<MenuNotifications>({
    home: 0,
    camera: 0,
    chat: 0,
    huddle: 0,
    webdrop: 0,
    timeline: 0,
    dreams: 0,
    solar: 0,
  });

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      try {
        // Fetch unread notifications by type
        const { data: notifs } = await supabase
          .from('notifications')
          .select('type, id')
          .eq('user_id', user.id)
          .eq('read', false);

        // Fetch unread messages
        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .eq('receiver_id', user.id)
          .eq('read', false);

        // Fetch new posts from friends (last 24h)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: friendPosts } = await supabase
          .from('posts')
          .select('id')
          .gte('created_at', yesterday)
          .neq('user_id', user.id);

        // Count by category
        const counts: MenuNotifications = {
          home: 0,
          camera: 0,
          chat: 0,
          huddle: 0,
          webdrop: 0,
          timeline: 0,
          dreams: 0,
          solar: 0,
        };

        // Home: posts, likes, comments
        counts.home = friendPosts?.length || 0;

        // Camera: promotional notifications for filters
        const cameraFeatures = localStorage.getItem('camera-new-features');
        counts.camera = cameraFeatures ? 0 : 2; // Show 2 for new features

        // Chat: messages, replies, mentions
        counts.chat = messages?.length || 0;

        // Huddle: friend requests, online friends, matches
        if (notifs) {
          notifs.forEach(n => {
            if (['friend_request', 'friend_accepted', 'new_match'].includes(n.type)) {
              counts.huddle++;
            }
            if (['like', 'comment', 'mention', 'reply'].includes(n.type)) {
              counts.home++;
            }
          });
        }

        // WebDrop: interpretive AI, architect features
        const webdropFeatures = localStorage.getItem('webdrop-features-seen');
        counts.webdrop = webdropFeatures ? 0 : 3;

        // Timeline: new content, updates
        const timelineFeatures = localStorage.getItem('timeline-features-seen');
        counts.timeline = timelineFeatures ? 0 : 1;

        // Dreams AI: new analysis features
        const dreamsFeatures = localStorage.getItem('dreams-features-seen');
        counts.dreams = dreamsFeatures ? 0 : 1;

        // Solar: heliosphere features
        const solarFeatures = localStorage.getItem('solar-features-seen');
        counts.solar = solarFeatures ? 0 : 1;

        setNotifications(counts);
      } catch (error) {
        console.error('Error fetching menu notifications:', error);
      }
    };

    fetchNotifications();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`menu-notifications:${user.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetchNotifications();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markFeatureSeen = (feature: string) => {
    localStorage.setItem(`${feature}-features-seen`, 'true');
    setNotifications(prev => ({
      ...prev,
      [feature]: 0,
    }));
  };

  return { notifications, markFeatureSeen };
};
