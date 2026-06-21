import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { getTimeBasedGreeting } from '@/utils/greetingHelpers';
import { getWeatherInfo, getUserLocation } from '@/utils/weatherHelpers';
import { getWeatherRecommendations, getHumorousWeatherComment } from '@/utils/weatherRecommendations';
import { getImportantDayForDate } from '@/data/worldImportantDays';
import { getTrafficInfo } from '@/utils/trafficHelpers';

interface MorningBriefingData {
  profoundInsight: string;
  actionItem: string;
  tone: string;
}

interface GreetingData {
  greeting: string;
  userName: string;
  weather?: string;
  weatherRecommendations?: string[];
  weatherHumor?: string;
  traffic?: string;
  notifications: number;
  reminders: any[];
  upcomingDates: any[];
  todayActivity?: string;
  friendsActivity: string[];
  huddleActivity?: string;
  unreadChats: number;
  priorityMessages: any[];
  newArchitectCreations: number;
  friendArchitectCreations: string[];
  worldImportantDay?: {
    name: string;
    message?: string;
  };
  morningBriefing?: MorningBriefingData;
}

export const useProactiveGreeting = () => {
  const { user } = useAuth();
  const [greetingData, setGreetingData] = useState<GreetingData | null>(null);
  const [morningBriefing, setMorningBriefing] = useState<MorningBriefingData | null>(null);
  const [hasGreeted, setHasGreeted] = useState(() => {
    // Check if greeting was shown today
    if (!user) return false;
    const lastGreetingDate = localStorage.getItem(`greeting_shown_${user.id}`);
    const today = new Date().toDateString();
    return lastGreetingDate === today;
  });

  useEffect(() => {
    if (user && !hasGreeted) {
      const lastGreetingDate = localStorage.getItem(`greeting_shown_${user.id}`);
      const today = new Date().toDateString();
      
      if (lastGreetingDate !== today) {
        fetchGreetingData();
      }
    }
  }, [user, hasGreeted]);

  const fetchGreetingData = async () => {
    if (!user) return;

    try {
      // Check for Morning Briefing from the Ready Queue (Dreamer's premonition)
      const briefingStartDate = new Date();
      briefingStartDate.setHours(0, 0, 0, 0);
      
      const { data: briefingData } = await supabase
        .from('behavioral_events')
        .select('metadata')
        .eq('user_id', user.id)
        .eq('event_type', 'morning_briefing_ready')
        .gte('created_at', briefingStartDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (briefingData && briefingData.length > 0) {
        const metadata = briefingData[0].metadata as Record<string, any>;
        if (metadata?.briefing && metadata?.readyForDelivery) {
          setMorningBriefing({
            profoundInsight: metadata.briefing.profoundInsight,
            actionItem: metadata.briefing.actionItem,
            tone: metadata.briefing.tone
          });
        }
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, city')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch weather and traffic information
      let weatherInfo = null;
      let weatherRecommendations: string[] = [];
      let weatherHumor = '';
      let trafficInfo = null;
      try {
        const position = await getUserLocation();
        const weather = await getWeatherInfo(position.coords.latitude, position.coords.longitude);
        if (weather) {
          weatherInfo = `${weather.temperature}°C with ${weather.condition} in ${weather.location}`;
          const recs = getWeatherRecommendations(weather.temperature, weather.condition);
          weatherRecommendations = recs.map(r => r.message);
          weatherHumor = getHumorousWeatherComment(weather.temperature, weather.condition);
        }
        
        // Fetch traffic info
        const traffic = await getTrafficInfo(position.coords.latitude, position.coords.longitude);
        if (traffic) {
          trafficInfo = traffic.summary;
        }
      } catch (error) {
        console.log('Weather/Traffic fetch skipped:', error);
      }

      // Check for world important day
      const currentDate = new Date();
      const worldDay = getImportantDayForDate(currentDate);
      const worldImportantDay = worldDay ? {
        name: worldDay.name,
        message: worldDay.greetingMessage
      } : undefined;

      // Fetch unread notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      // Fetch upcoming reminders (today and tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .lte('reminder_time', tomorrow.toISOString())
        .order('reminder_time', { ascending: true });

      // Fetch upcoming important dates (next 7 days)
      const { data: upcomingDates } = await supabase
        .rpc('get_upcoming_important_dates', { 
          user_uuid: user.id,
          days_ahead: 7 
        });

      // Fetch recent posts count (today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: postsToday } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      // Fetch friends' recent activity
      const friendIds = await getFriendIds(user.id);
      const { data: friendsActivity } = await supabase
        .from('posts')
        .select('id, content, profiles!inner(display_name)')
        .in('user_id', friendIds)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch Huddle activity (profile views and location searches)
      const { data: huddleViews } = await supabase
        .from('user_activity_patterns')
        .select('last_huddle_visit')
        .eq('user_id', user.id)
        .maybeSingle();
      
      let huddleActivity = '';
      if (huddleViews?.last_huddle_visit) {
        const lastVisit = new Date(huddleViews.last_huddle_visit);
        const hoursSince = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60));
        if (hoursSince < 24) {
          const { count: onlineFriendsCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .in('user_id', friendIds)
            .eq('status', 'online');
          if (onlineFriendsCount && onlineFriendsCount > 0) {
            huddleActivity = `${onlineFriendsCount} of your friends ${onlineFriendsCount === 1 ? 'is' : 'are'} online on Huddle`;
          }
        }
      }

      // Fetch unread chat messages
      const { count: unreadChatsCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);

      // Fetch priority messages from frequently contacted friends
      const { data: messageFrequency } = await supabase
        .from('messages')
        .select('sender_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      const frequencyMap: { [key: string]: number } = {};
      (messageFrequency || []).forEach(msg => {
        const friendId = msg.sender_id === user.id ? msg.sender_id : msg.sender_id;
        if (friendId !== user.id) {
          frequencyMap[friendId] = (frequencyMap[friendId] || 0) + 1;
        }
      });
      
      const topFriendIds = Object.entries(frequencyMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id);
      
      const { data: priorityMessages } = topFriendIds.length > 0 ? await supabase
        .from('messages')
        .select('content, sender_id, profiles!inner(display_name)')
        .in('sender_id', topFriendIds)
        .eq('receiver_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(3) : { data: [] };

      // Fetch new Zoe Architect creations from localStorage
      const draftsData = localStorage.getItem('webdrop_drafts');
      const drafts = draftsData ? JSON.parse(draftsData) : [];
      const newCreationsCount = drafts.filter((d: any) => {
        const createdDate = new Date(d.timestamp);
        return createdDate >= today;
      }).length;

      // Fetch friends' Zoe Architect creations (posts with specific content pattern)
      const { data: friendCreations } = await supabase
        .from('posts')
        .select('content, profiles!inner(display_name)')
        .in('user_id', friendIds)
        .gte('created_at', today.toISOString())
        .or('content.ilike.%architect%,content.ilike.%production plan%')
        .order('created_at', { ascending: false })
        .limit(3);

      const greeting = getTimeBasedGreeting();
      const data: GreetingData = {
        greeting,
        userName: profile?.display_name || 'there',
        weather: weatherInfo,
        weatherRecommendations,
        weatherHumor,
        traffic: trafficInfo,
        notifications: notifications?.length || 0,
        reminders: reminders || [],
        upcomingDates: upcomingDates || [],
        todayActivity: postsToday ? `You've created ${postsToday} post${postsToday !== 1 ? 's' : ''} today` : undefined,
        friendsActivity: (friendsActivity || []).map(p => 
          `${(p as any).profiles?.display_name} posted: "${p.content?.substring(0, 50)}..."`
        ),
        huddleActivity,
        unreadChats: unreadChatsCount || 0,
        priorityMessages: (priorityMessages || []).map(m => ({
          from: (m as any).profiles?.display_name,
          content: m.content?.substring(0, 50)
        })),
        newArchitectCreations: newCreationsCount,
        friendArchitectCreations: (friendCreations || []).map(c => 
          `${(c as any).profiles?.display_name} created something new`
        ),
        worldImportantDay,
      };

      setGreetingData(data);
      setHasGreeted(true);
      
      // Mark greeting as shown today
      const todayStr = new Date().toDateString();
      localStorage.setItem(`greeting_shown_${user.id}`, todayStr);
    } catch (error) {
      console.error('Error fetching greeting data:', error);
    }
  };

  const getFriendIds = async (userId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('friendships')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    return (data || []).map(f => 
      f.user1_id === userId ? f.user2_id : f.user1_id
    );
  };

  const buildGreetingMessage = (): string => {
    if (!greetingData) return '';

    let message = `${greetingData.greeting} ${greetingData.userName}! `;

    // Add day significance
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    message += `Happy ${dayName}! `;

    // Add world important day greeting
    if (greetingData.worldImportantDay) {
      if (greetingData.worldImportantDay.message) {
        message += `${greetingData.worldImportantDay.message} `;
      } else {
        message += `Today is ${greetingData.worldImportantDay.name}! `;
      }
    }

    // Add weather information
    if (greetingData.weather) {
      message += `The weather is ${greetingData.weather}. `;
      
      // Add weather humor
      if (greetingData.weatherHumor) {
        message += `${greetingData.weatherHumor} `;
      }
      
      // Add weather recommendations
      if (greetingData.weatherRecommendations && greetingData.weatherRecommendations.length > 0) {
        message += greetingData.weatherRecommendations[0] + ' ';
      }
    }

    // Add traffic information
    if (greetingData.traffic) {
      message += `Traffic update: ${greetingData.traffic}. `;
    }

    // Add notifications
    if (greetingData.notifications > 0) {
      message += `You have ${greetingData.notifications} new notification${greetingData.notifications !== 1 ? 's' : ''}. `;
    }

    // Add reminders
    if (greetingData.reminders.length > 0) {
      message += `You have ${greetingData.reminders.length} reminder${greetingData.reminders.length !== 1 ? 's' : ''} coming up. `;
    }

    // Add important dates
    if (greetingData.upcomingDates.length > 0) {
      const firstDate = greetingData.upcomingDates[0];
      if (firstDate.days_until === 0) {
        message += `Today is ${firstDate.title}! `;
      } else if (firstDate.days_until === 1) {
        message += `Tomorrow is ${firstDate.title}. `;
      } else {
        message += `${firstDate.title} is in ${firstDate.days_until} days. `;
      }
    }

    // Add today's activity
    if (greetingData.todayActivity) {
      message += `${greetingData.todayActivity}. `;
    }

    // Add friends' activity
    if (greetingData.friendsActivity.length > 0) {
      message += `Your friends have been active today. `;
      if (greetingData.friendsActivity.length === 1) {
        message += `${greetingData.friendsActivity[0]}. `;
      }
    }

    // Add Huddle activity
    if (greetingData.huddleActivity) {
      message += `${greetingData.huddleActivity}. `;
    }

    // Add chat messages
    if (greetingData.unreadChats > 0) {
      message += `You have ${greetingData.unreadChats} unread chat message${greetingData.unreadChats !== 1 ? 's' : ''}. `;
    }

    // Add priority messages
    if (greetingData.priorityMessages.length > 0) {
      const firstPriority = greetingData.priorityMessages[0];
      message += `Priority message from ${firstPriority.from}: "${firstPriority.content}...". `;
    }

    // Add Zoe Architect creations
    if (greetingData.newArchitectCreations > 0) {
      message += `You have ${greetingData.newArchitectCreations} new creation${greetingData.newArchitectCreations !== 1 ? 's' : ''} in Zoe Architect. `;
    }

    // Add friends' Architect creations
    if (greetingData.friendArchitectCreations.length > 0) {
      message += `${greetingData.friendArchitectCreations[0]}. `;
    }

    // Add Morning Briefing insight (from Dreamer's premonition)
    if (morningBriefing?.profoundInsight) {
      message += `While you slept, I reflected on your day: ${morningBriefing.profoundInsight} `;
      if (morningBriefing.actionItem) {
        message += `Today's focus: ${morningBriefing.actionItem} `;
      }
    } else {
      // Add encouraging message
      message += 'What would you like to do today?';
    }

    return message;
  };

  return {
    greetingData,
    hasGreeted,
    morningBriefing,
    greetingMessage: buildGreetingMessage(),
    resetGreeting: () => setHasGreeted(false),
  };
};