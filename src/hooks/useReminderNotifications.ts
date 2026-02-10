import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';

// Generate custom notification sounds for each category using Web Audio API
const playCategorySound = (category: string) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Different frequencies and patterns for each category
    const soundProfiles: Record<string, { freq: number[]; duration: number[] }> = {
      work: { freq: [800, 600], duration: [0.1, 0.1] }, // Professional beep
      personal: { freq: [523, 659], duration: [0.15, 0.15] }, // Friendly chime
      health: { freq: [440, 523, 659], duration: [0.2, 0.2, 0.2] }, // Calming sequence
      social: { freq: [659, 784], duration: [0.1, 0.15] }, // Cheerful ping
      finance: { freq: [698, 587], duration: [0.12, 0.12] }, // Important tone
      other: { freq: [587], duration: [0.2] }, // Simple notification
    };

    const profile = soundProfiles[category] || soundProfiles.other;
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    
    let currentTime = audioContext.currentTime;
    profile.freq.forEach((freq, index) => {
      oscillator.frequency.setValueAtTime(freq, currentTime);
      currentTime += profile.duration[index];
      gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime);
      if (index < profile.freq.length - 1) {
        gainNode.gain.setValueAtTime(0.3, currentTime);
      }
    });
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(currentTime);
  } catch (e) {
    console.log('Web Audio API not available:', e);
  }
};

export const useReminderNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const checkDueReminders = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);

    const { data: dueReminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .eq('is_sent', false)
      .lte('reminder_time', now.toISOString())
      .gte('reminder_time', fiveMinutesAgo.toISOString());

    if (error) {
      console.error('Error checking reminders:', error);
      return;
    }

    if (dueReminders && dueReminders.length > 0) {
      for (const reminder of dueReminders) {
        // Show toast notification
        toast({
          title: '🔔 Reminder',
          description: reminder.title,
          duration: 10000,
        });

        // Play category-specific notification sound
        const category = reminder.category || 'other';
        playCategorySound(category);

        // Mark as sent
        await supabase
          .from('reminders')
          .update({ is_sent: true })
          .eq('id', reminder.id);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;

    // Check immediately
    checkDueReminders();

    // Check every minute
    const interval = setInterval(checkDueReminders, 60000);

    // Listen for new reminders
    const channel = supabase
      .channel('reminder-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reminders',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          checkDueReminders();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, checkDueReminders]);

  return { checkDueReminders };
};
