import React, { useState, useEffect, useRef } from 'react';
import { X, Map as MapIcon, Grid3x3, Home, Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useNavigate, useLocation } from 'react-router-dom';
import UserRecommendationCard from '@/components/UserRecommendationCard';
import { OpenStreetMapView } from './OpenStreetMapView';
import { Button } from './ui/button';
import HuddleSearchIcon from './HuddleSearchIcon';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { motion, AnimatePresence } from 'framer-motion';
import { WorldRegionSelector } from './WorldRegionSelector';
import { toast } from 'sonner';
import { useHuddleZoeCommands } from '@/hooks/useHuddleZoeCommands';
import { AdvancedFiltersButton } from './AdvancedFiltersButton';
import { useZoePersonalization } from '@/hooks/useZoePersonalization';
import { type UserNotificationData } from '@/hooks/useUserNotifications';

const INTERESTS_CATEGORIES = {
  'Creative & Artistic': ['Art', 'Painting', 'Design', 'Writing', 'Photography', 'Filmmaking', 'Music', 'Dance', 'Fashion', 'Calligraphy'],
  'Intellectual & Academic': ['Reading', 'Philosophy', 'Psychology', 'History', 'Languages', 'Literature', 'Science', 'Astronomy', 'Education', 'Research'],
  'Tech & Digital': ['Technology', 'Coding', 'Gaming', 'AI', 'Robotics', 'Blogging', 'Podcasts', 'Editing', 'Crypto', 'Design (UI/UX)'],
  'Active & Physical': ['Sports', 'Fitness', 'Yoga', 'Hiking', 'Cycling', 'Running', 'Skateboarding', 'Swimming', 'Dancing', 'Martial Arts'],
  'Lifestyle & Social': ['Travel', 'Cooking', 'Baking', 'Gardening', 'Volunteering', 'Fashion', 'Minimalism', 'Collecting', 'Cars', 'Architecture']
};

interface RecommendedUser {
  user_id: string;
  display_name: string;
  username: string;
  profile_photo_url?: string;
  city?: string;
  hobbies: string[];
  commonInterests: string[];
  is_friend?: boolean;
  status?: string;
  event_date?: string;
  event_recurring?: boolean;
  notifications?: UserNotificationData[];
}

interface CategoryRecommendations {
  [category: string]: RecommendedUser[];
}

const Huddle = () => {
  const { user } = useAuth();
  const { sendFriendRequest } = useFriendRequests();
  const navigate = useNavigate();
  const location = useLocation();
  const { onlineUsers, isUserOnline } = useOnlinePresence();
  const { trackHuddleInteraction } = useZoePersonalization();
  
  // Initialize Zoe command integration
  useHuddleZoeCommands();

  const [recommendations, setRecommendations] = useState<CategoryRecommendations>({});
  const [allUsers, setAllUsers] = useState<RecommendedUser[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userFriends, setUserFriends] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('map');
  const [displayMode, setDisplayMode] = useState<'all' | 'recommendations'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableInterests, setAvailableInterests] = useState<string[]>([]);
  const [userCity, setUserCity] = useState<string>('');
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [nearbyRadius, setNearbyRadius] = useState<number>(0);
  const [userNotificationsMap, setUserNotificationsMap] = useState<Map<string, UserNotificationData[]>>(new Map());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('search-active', { detail: { active: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent('search-active', { detail: { active: false } }));
    };
  }, []);

  useEffect(() => {
    fetchRecommendations();
    fetchUserProfile();
    fetchUserNotifications();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('city, hobbies')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      setUserCity(profile.city || '');
      setUserInterests(profile.hobbies || []);
    }
  };

  const fetchUserNotifications = async () => {
    if (!user) return;
    
    try {
      const notificationsMap = new Map();
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id');

      if (!profiles) return;

      const userIds = profiles.map(p => p.user_id);
      
      const { data: messagesData } = await supabase
        .from('messages')
        .select('receiver_id')
        .in('receiver_id', userIds)
        .eq('read', false);

      const { data: postsData } = await supabase
        .from('posts')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', last24Hours.toISOString());

      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('user_id')
        .in('user_id', userIds)
        .gte('earned_at', last24Hours.toISOString());

      const { data: friendRequestsData } = await supabase
        .from('friend_requests')
        .select('receiver_id')
        .in('receiver_id', userIds)
        .eq('status', 'pending');

      userIds.forEach(userId => {
        const notifications: UserNotificationData[] = [];

        const messageCount = messagesData?.filter(m => m.receiver_id === userId).length || 0;
        if (messageCount > 0) {
          notifications.push({ symbolId: 'message', count: messageCount, timestamp: now });
        }

        const postCount = postsData?.filter(p => p.user_id === userId).length || 0;
        if (postCount > 0) {
          notifications.push({ symbolId: 'new_post', count: postCount, timestamp: now });
        }

        const badgeCount = badgesData?.filter(b => b.user_id === userId).length || 0;
        if (badgeCount > 0) {
          notifications.push({ symbolId: 'badge_earned', count: badgeCount, timestamp: now });
        }

        const requestCount = friendRequestsData?.filter(r => r.receiver_id === userId).length || 0;
        if (requestCount > 0) {
          notifications.push({ symbolId: 'friend_request', count: requestCount, timestamp: now });
        }

        if (notifications.length > 0) {
          notificationsMap.set(userId, notifications);
        }
      });

      setUserNotificationsMap(notificationsMap);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!user) return;

    setLoading(true);

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, profile_photo_url, city, hobbies, status')
      .eq('user_id', user.id)
      .single();

    const { data: friendships } = await supabase
      .from('friendships')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    const friendIds = new Set(
      friendships?.map(f => f.user1_id === user.id ? f.user2_id : f.user1_id) || []
    );
    setUserFriends(friendIds);

    const { data: allUsersData } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, profile_photo_url, city, hobbies, status, event_date, event_recurring')
      .neq('user_id', user.id);

    if (!allUsersData) {
      setLoading(false);
      return;
    }

    const allUsersList: RecommendedUser[] = allUsersData.map(otherUser => {
      const commonInterests = currentProfile?.hobbies && otherUser.hobbies 
        ? otherUser.hobbies.filter((h: string) => currentProfile.hobbies.includes(h))
        : [];
      
      return {
        user_id: otherUser.user_id,
        display_name: otherUser.display_name,
        username: otherUser.username,
        profile_photo_url: otherUser.profile_photo_url,
        city: otherUser.city,
        hobbies: otherUser.hobbies || [],
        commonInterests,
        is_friend: friendIds.has(otherUser.user_id),
        status: otherUser.status,
        event_date: otherUser.event_date,
        event_recurring: otherUser.event_recurring
      };
    });
    
    if (currentProfile) {
      allUsersList.unshift({
        user_id: currentProfile.user_id,
        display_name: currentProfile.display_name,
        username: currentProfile.username,
        profile_photo_url: currentProfile.profile_photo_url,
        city: currentProfile.city,
        hobbies: currentProfile.hobbies || [],
        commonInterests: [],
        is_friend: false,
        status: currentProfile.status,
        event_date: undefined,
        event_recurring: undefined
      });
    }
    
    setAllUsers(allUsersList);
    setLoading(false);
  };

  const handleProfileClick = (userId: string) => {
    trackHuddleInteraction('user_clicked', { userId });
    navigate(`/profile/${userId}`);
  };

  const handleAddFriend = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await sendFriendRequest(userId);
    trackHuddleInteraction('friend_request_sent', { userId });
  };

  const handleSendMessage = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    trackHuddleInteraction('message_initiated', { userId });
    navigate('/chat', { state: { selectedUserId: userId } });
  };

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = searchQuery === '' || 
      u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.hobbies.some(h => h.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesOnline = !showOnlineOnly || isUserOnline(u.user_id) || u.user_id === user?.id;
    const matchesFriends = !showFriendsOnly || u.is_friend || u.user_id === user?.id;
    const matchesCity = !selectedCity || u.city === selectedCity;
    const matchesInterests = selectedInterests.length === 0 || 
      selectedInterests.some(interest => u.hobbies.includes(interest));
    const matchesStatus = !selectedStatus || u.status === selectedStatus;

    return matchesSearch && matchesOnline && matchesFriends && matchesCity && matchesInterests && matchesStatus;
  });

  return (
    <div className="h-screen overflow-hidden">
      {viewMode === 'map' ? (
        <div className="w-full h-full relative">
          {/* Navigation Controls at Bottom-Left - Stacked Layout */}
          <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-3">
            {/* Top Row: Advanced Filters & Search Icon (swapped) */}
            <div className="flex gap-3">
              <AdvancedFiltersButton 
                isOpen={showAdvancedFilters}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              />
              <HuddleSearchIcon />
            </div>
            
            {/* Bottom Row: Home & Grid View Switch */}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/home')}
                className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all"
                style={{
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                }}
              >
                <Home className="h-5 w-5 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all"
                style={{
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                }}
              >
                <Grid3x3 className="h-5 w-5 text-white" />
              </Button>
            </div>
          </div>
          

          {/* Advanced Filters Panel - Old Design Restored */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-20 left-4 z-[999] w-80 rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.98) 100%)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-white" />
                      <h3 className="text-base font-semibold text-white">Advanced Filters</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowAdvancedFilters(false)}
                      className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Save Preset */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-lg">💾</span>
                      <span className="text-sm font-medium">Save Preset</span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full bg-slate-700/80 border-slate-600 text-white hover:bg-slate-600 text-sm"
                      onClick={() => toast.success('Filter preset saved!')}
                    >
                      <span className="mr-2">📁</span>
                      Save Current Filters as Preset
                    </Button>
                  </div>

                  {/* Quick Filters */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-lg">⚡</span>
                      <span className="text-sm font-medium">Quick Filters</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={nearbyRadius > 0 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNearbyRadius(nearbyRadius > 0 ? 0 : 50)}
                        className={`flex-1 ${nearbyRadius > 0 ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-600/80 hover:bg-purple-700 text-white border-0'}`}
                      >
                        <span className="mr-1">📍</span>
                        Nearby
                      </Button>
                      <Button
                        variant={showOnlineOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowOnlineOnly(!showOnlineOnly)}
                        className={`flex-1 ${showOnlineOnly ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-600/80 hover:bg-green-700 text-white border-0'}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-green-400 mr-1.5"></span>
                        Online
                      </Button>
                      <Button
                        variant={selectedInterests.length > 0 ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (selectedInterests.length > 0) {
                            setSelectedInterests([]);
                          } else {
                            setSelectedInterests(userInterests);
                          }
                        }}
                        className={`flex-1 ${selectedInterests.length > 0 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600/80 hover:bg-red-700 text-white border-0'}`}
                      >
                        <span className="mr-1">❤️</span>
                        Shared
                      </Button>
                    </div>
                  </div>

                  {/* Distance Filter */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-lg">🏷️</span>
                      <span className="text-sm font-medium">Distance Filter</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/80">Radius</span>
                        <span className="text-white font-medium">{nearbyRadius > 0 ? `${nearbyRadius} km` : 'Off'}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        value={nearbyRadius}
                        onChange={(e) => setNearbyRadius(Number(e.target.value))}
                        disabled={!selectedCity && !userCity}
                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
                      />
                      {!selectedCity && !userCity && (
                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                          <span>⚠️</span>
                          <span>Select a city first</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Status */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-lg">👥</span>
                      <span className="text-sm font-medium">User Status</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={showOnlineOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowOnlineOnly(!showOnlineOnly)}
                        className={`flex-1 ${showOnlineOnly ? 'bg-slate-600 text-white' : 'bg-slate-700/80 border-slate-600 text-white hover:bg-slate-600'}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-green-400 mr-1.5"></span>
                        Online
                      </Button>
                      <Button
                        variant={showFriendsOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowFriendsOnly(!showFriendsOnly)}
                        className={`flex-1 ${showFriendsOnly ? 'bg-slate-600 text-white' : 'bg-slate-700/80 border-slate-600 text-white hover:bg-slate-600'}`}
                      >
                        Friends
                      </Button>
                    </div>
                    {/* Online count */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/60 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                      <span className="text-sm text-white">
                        {allUsers.filter(u => isUserOnline(u.user_id)).length} user{allUsers.filter(u => isUserOnline(u.user_id)).length !== 1 ? 's' : ''} online now
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <OpenStreetMapView
            users={filteredUsers
              .filter(u => u.city)
              .map(u => ({
                user_id: u.user_id,
                display_name: u.display_name + (u.user_id === user?.id ? ' (You)' : ''),
                username: u.username,
                profile_photo_url: u.profile_photo_url,
                city: u.city,
                hobbies: u.hobbies || [],
                status: u.user_id === user?.id ? 'online' : u.status,
                notifications: userNotificationsMap.get(u.user_id) || [],
              }))}
            onUserClick={handleProfileClick}
            onAddFriend={handleAddFriend}
            onSendMessage={handleSendMessage}
            isUserOnline={isUserOnline}
            currentUserId={user?.id}
          />
        </div>
      ) : (
        <div className="h-full overflow-y-auto">
          <div className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Huddle</h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('map')}
              >
                <MapIcon className="h-5 w-5" />
              </Button>
            </div>

            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
          </div>

          <div className="pt-32 p-4 space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              filteredUsers.map(u => (
                <div key={u.user_id} className="p-4 bg-card rounded-lg cursor-pointer" onClick={() => handleProfileClick(u.user_id)}>
                  <p className="font-semibold">{u.display_name}</p>
                  <p className="text-sm text-muted-foreground">@{u.username}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Huddle;
