import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, UserPlus, Sparkles, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useNavigate } from 'react-router-dom';
import StatusIconBadge from '@/components/StatusIconBadge';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';

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
  hobbies: string[];
  commonInterests: string[];
  is_friend?: boolean;
  status?: string;
  event_date?: string;
  event_recurring?: boolean;
}

interface CategoryRecommendations {
  [category: string]: RecommendedUser[];
}

const InterestRecommendations = () => {
  const { user } = useAuth();
  const { sendFriendRequest } = useFriendRequests();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<CategoryRecommendations>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userFriends, setUserFriends] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRecommendations();
  }, [user]);

  const fetchRecommendations = async () => {
    if (!user) return;

    setLoading(true);

    // Fetch current user's profile
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('hobbies')
      .eq('user_id', user.id)
      .single();

    if (!currentProfile?.hobbies || currentProfile.hobbies.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch current user's friends
    const { data: friendships } = await supabase
      .from('friendships')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    const friendIds = new Set(
      friendships?.map(f => f.user1_id === user.id ? f.user2_id : f.user1_id) || []
    );
    setUserFriends(friendIds);

    // Fetch all users with public profiles (excluding current user and friends)
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, profile_photo_url, hobbies, status, event_date, event_recurring')
      .neq('user_id', user.id);

    if (!allUsers) {
      setLoading(false);
      return;
    }

    // Calculate recommendations per category
    const categoryRecs: CategoryRecommendations = {};

    Object.entries(INTERESTS_CATEGORIES).forEach(([category, categoryInterests]) => {
      const userCategoryInterests = currentProfile.hobbies.filter(h => 
        categoryInterests.includes(h)
      );

      if (userCategoryInterests.length === 0) return;

      const categoryUsers: RecommendedUser[] = [];

      allUsers.forEach(otherUser => {
        if (!otherUser.hobbies || otherUser.hobbies.length === 0) return;

        const commonInterests = otherUser.hobbies.filter(h => 
          categoryInterests.includes(h) && userCategoryInterests.includes(h)
        );

        if (commonInterests.length >= 3) {
          categoryUsers.push({
            user_id: otherUser.user_id,
            display_name: otherUser.display_name,
            username: otherUser.username,
            profile_photo_url: otherUser.profile_photo_url,
            hobbies: otherUser.hobbies,
            commonInterests,
            is_friend: friendIds.has(otherUser.user_id),
            status: otherUser.status,
            event_date: otherUser.event_date,
            event_recurring: otherUser.event_recurring
          });
        }
      });

      if (categoryUsers.length > 0) {
        categoryRecs[category] = categoryUsers.sort((a, b) => 
          b.commonInterests.length - a.commonInterests.length
        );
      }
    });

    setRecommendations(categoryRecs);
    setLoading(false);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleAddFriend = async (userId: string) => {
    await sendFriendRequest(userId);
    await fetchRecommendations(); // Refresh to update friend status
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleSendMessage = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/chat?user=${userId}`);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        People who might share similar interests
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading recommendations...</p>
        </div>
      ) : (
        <>
          {Object.keys(INTERESTS_CATEGORIES).map((category) => {
            const users = recommendations[category] || [];
            return (
              <Card key={category} className="bg-card border-border overflow-hidden">
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
                  onClick={() => toggleCategory(category)}
                >
                  <span className="font-medium text-foreground">{category}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-border">
                      {users.length}
                    </Badge>
                    <ChevronUp
                      className={`w-4 h-4 transition-transform ${
                        expandedCategories.has(category) ? '' : 'rotate-180'
                      }`}
                    />
                  </div>
                </Button>

                {expandedCategories.has(category) && (
                  <div className="p-4 pt-0 space-y-3">
                    {users.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground text-sm">
                          No matches found in this category yet
                        </p>
                      </div>
                    ) : (
                      users.map(user => {
                        const hasEvent = useEventGlow(user.event_date, user.event_recurring);
                        const glowClass = getAvatarGlowClass(hasEvent, user.status);
                        
                        return (
                          <Card
                            key={user.user_id}
                            className="p-4 bg-background border-border hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div 
                                className="flex items-start gap-3 flex-1 cursor-pointer"
                                onClick={() => handleProfileClick(user.user_id)}
                              >
                                <div className="relative">
                                  <Avatar className={`w-12 h-12 ${glowClass}`}>
                                    <AvatarImage src={user.profile_photo_url} />
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                      {user.display_name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <StatusIconBadge status={user.status} size="sm" />
                                </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground">{user.display_name}</p>
                                <p className="text-sm text-muted-foreground">@{user.username}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {user.is_friend ? (
                                <Button
                                  size="sm"
                                  onClick={(e) => handleSendMessage(user.user_id, e)}
                                  className="shrink-0"
                                >
                                  <ChevronUp className="w-4 h-4 rotate-90" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddFriend(user.user_id);
                                  }}
                                  className="shrink-0"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Common Interests Section */}
                          {user.commonInterests.length > 0 && (
                            <div className="border-t border-border pt-3 mt-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                <p className="text-xs text-muted-foreground font-medium">
                                  {user.commonInterests.length} Common Interest{user.commonInterests.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {user.commonInterests.map((interest) => (
                                  <Badge
                                    key={interest}
                                    className="bg-gradient-to-r from-blue-600/30 to-cyan-500/30 text-cyan-200 border-2 border-cyan-400/50 text-xs px-2.5 py-1 font-semibold hover:from-blue-600/40 hover:to-cyan-500/40 transition-all shadow-lg"
                                  >
                                    <Award className="w-3 h-3 mr-1 inline text-cyan-300" />
                                    {interest}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                      })
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
};

export default InterestRecommendations;
