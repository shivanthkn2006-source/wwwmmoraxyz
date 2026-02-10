import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface DivineNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  campaign_id: string | null;
  deal_id: string | null;
  brand_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  distance_meters: number | null;
  reward_offered: number | null;
  sent_at: string;
  expires_at: string | null;
  was_clicked: boolean;
  was_converted: boolean;
}

export const useDivineNotifications = (enabled: boolean = true) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<DivineNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastCheckRef = useRef<number>(0);
  const CHECK_INTERVAL = 30000; // Check every 30 seconds minimum

  // Fetch user's notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('divine_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching divine notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Check for nearby opportunities
  const checkLocation = useCallback(async (lat: number, lng: number) => {
    if (!user) return;

    const now = Date.now();
    if (now - lastCheckRef.current < CHECK_INTERVAL) {
      return; // Rate limit location checks
    }
    lastCheckRef.current = now;

    try {
      const { data, error } = await supabase.functions.invoke('divine-notification', {
        body: { user_id: user.id, lat, lng }
      });

      if (error) throw error;

      if (data?.notifications_sent > 0) {
        // Show toast for new notifications
        data.notifications.forEach((n: any) => {
          toast(n.title, {
            description: n.message,
            duration: 8000,
            action: {
              label: 'View',
              onClick: () => {
                // Could navigate to the location on the map
                console.log('View notification location');
              }
            }
          });
        });

        // Refresh notifications list
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error checking location for notifications:', err);
    }
  }, [user, fetchNotifications]);

  // Mark notification as clicked
  const markAsClicked = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('divine_notifications')
        .update({ was_clicked: true, clicked_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, was_clicked: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as clicked:', err);
    }
  }, [user]);

  // Mark notification as converted (user completed the action)
  const markAsConverted = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('divine_notifications')
        .update({ was_converted: true, converted_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, was_converted: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as converted:', err);
    }
  }, [user]);

  // Start watching location
  useEffect(() => {
    if (!enabled || !user) return;

    fetchNotifications();

    // Watch user's location for passive income mode
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLastLocation({ lat: latitude, lng: longitude });
          checkLocation(latitude, longitude);
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 10000
        }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled, user, fetchNotifications, checkLocation]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('divine-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'divine_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as DivineNotification;
          setNotifications(prev => [newNotification, ...prev]);

          // Show toast
          toast(newNotification.title, {
            description: newNotification.message,
            duration: 8000
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    notifications,
    isLoading,
    lastLocation,
    markAsClicked,
    markAsConverted,
    refreshNotifications: fetchNotifications
  };
};
